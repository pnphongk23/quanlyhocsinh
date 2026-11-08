import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, db, fakePhone, insertClass, insertSession, insertStudent, post, registerWorkspace } from './helpers';

const uid=()=>crypto.randomUUID();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
/** Ngày cách hôm nay `days` ngày, cùng múi giờ Việt Nam. */
const daysAgo=(days:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(Date.now()-days*86400000));
const command=(type:string,payload:any,base_version=0)=>({id:uid(),type,payload,base_version,created_at:new Date().toISOString()});
/** Câu lệnh vi phạm CHECK của bảng attendance: dùng để làm một statement trong batch gộp lỗi thật. */
const POISON=`INSERT INTO attendance(workspace_id,class_id,session_id,student_id,status,version,created_at,updated_at)
  VALUES('0','0','0','0','bogus',1,'0','0')`;
/** Câu SELECT cursor chỉ có trong batch gộp cuối request, nên dùng nó để nhận ra batch đó. */
const isGroupBatch=(sqls:string[])=>sqls.some(sql=>sql.includes('change_floor) cursor FROM workspaces'));

/** Mỗi lần gọi D1 (first/run/all/raw/batch) là một round-trip; bind đo trần 100 tham số của D1. */
let stats:{trips:string[];maxBind:number};
/** Hook chèn trước một batch: đổi danh sách statement, hoặc throw để giả lập batch hỏng. */
let beforeBatch:((sqls:string[],statements:unknown[])=>unknown[]|void|Promise<unknown[]|void>)|null=null;
let sqlOf=new WeakMap<object,string>();
beforeEach(async()=>{
  await db.prepare('DELETE FROM auth_throttle').run();
  stats={trips:[],maxBind:0};beforeBatch=null;sqlOf=new WeakMap();
  const target=db as any;
  const prepare=target.prepare.bind(db),batch=target.batch.bind(db);
  const wrap=(s:any,sql:string)=>{
    sqlOf.set(s,sql);
    for(const m of ['first','run','all','raw']) {const f=s[m].bind(s);s[m]=(...a:any[])=>{stats.trips.push(sql.replace(/\s+/g,' ').slice(0,60));return f(...a);};}
    const bind=s.bind.bind(s);
    s.bind=(...a:any[])=>{stats.maxBind=Math.max(stats.maxBind,a.length);return wrap(bind(...a),sql);};
    return s;
  };
  vi.spyOn(target,'prepare').mockImplementation((sql:unknown)=>wrap(prepare(sql),String(sql)));
  vi.spyOn(target,'batch').mockImplementation(async(s:unknown)=>{
    const statements=s as unknown[];
    const sqls=statements.map(x=>sqlOf.get(x as object) ?? '');
    const replaced=beforeBatch ? await beforeBatch(sqls,statements) : undefined;
    const list=(replaced ?? statements) as unknown[];
    stats.trips.push(`batch(${list.length})`);
    return batch(list);
  });
});
afterEach(()=>vi.restoreAllMocks());

let devices=0;
const deviceId=()=>{devices+=1;return `00000000-0000-4000-8000-${String(devices).padStart(12,'0')}`;};

async function setup(count:number,sessionStatus:'planned'|'held'|'cancelled'='planned'){
  const owner=await registerWorkspace(fakePhone(),'Push batch');
  const classId=await insertClass(owner.workspaceId,'C1',owner.userId);
  const students:string[]=[];
  for(let n=0;n<count;n++) students.push(await insertStudent(owner.workspaceId,classId,`Student ${n+1}`,null,owner.userId));
  await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE workspace_id=?").bind(owner.workspaceId).run();
  const sessionId=await insertSession(owner.workspaceId,classId,today(),owner.userId,sessionStatus);
  const push=(commands:any[])=>call('/v1/sync/push',post({membership_id:owner.membershipId,device_id:deviceId(),commands}),owner.token);
  return {owner,classId,students,sessionId,push};
}
interface Cell { students:string[]; sessionId:string }
const attendanceCommands=(f:Cell,status='present',count=f.students.length)=>
  f.students.slice(0,count).map(student_id=>command('attendance.set',{session_id:f.sessionId,student_id,status}));
/** Trạng thái do các lệnh điểm danh tạo ra, để so đường gộp với đường tuần tự.
 * Khoá ô trong change_log được quy về vị trí học sinh trong request, vì hai workspace dùng id khác nhau. */
async function state(workspaceId:string,sessionId:string,students:string[]){
  const attendance=await db.prepare('SELECT student_id,status,version FROM attendance WHERE workspace_id=? AND session_id=? ORDER BY student_id')
    .bind(workspaceId,sessionId).all<any>();
  const session=await db.prepare('SELECT status,version FROM class_sessions WHERE workspace_id=? AND id=?').bind(workspaceId,sessionId).first<any>();
  const log=await db.prepare('SELECT entity,k2,op FROM change_log WHERE workspace_id=? ORDER BY seq').bind(workspaceId).all<any>();
  const receipts=await db.prepare('SELECT status FROM applied_commands WHERE workspace_id=?').bind(workspaceId).all<any>();
  return {attendance:attendance.results,session,
    log:log.results.map((r:any)=>({entity:r.entity,k:students.indexOf(r.k2),op:r.op})),
    receipts:receipts.results.map(r=>r.status)};
}

describe('sync push gộp lệnh ô',()=>{
  it('20 lệnh điểm danh đi trong một batch, version và change_log giống đường tuần tự',async()=>{
    const grouped=await setup(20);
    const commands=attendanceCommands(grouped);
    stats.trips=[];
    const res=await grouped.push(commands);
    expect(res.status).toBe(200);
    expect(res.body.results.map((r:any)=>r.status)).toEqual(commands.map(()=>'applied'));
    expect(res.body.results.map((r:any)=>r.version)).toEqual(commands.map(()=>1));
    expect(stats.trips.length).toBeLessThanOrEqual(4);
    const done=await state(grouped.owner.workspaceId,grouped.sessionId,grouped.students);
    expect(done.attendance).toHaveLength(20);
    expect(done.attendance.every((r:any)=>r.status==='present'&&r.version===1)).toBe(true);
    expect(done.session).toEqual({status:'held',version:2});
    expect(done.log.filter((r:any)=>r.entity==='attendance')).toHaveLength(20);
    // Buổi được tạo (1) rồi chuyển planned → held đúng một lần (1).
    expect(done.log.filter((r:any)=>r.entity==='class_session')).toHaveLength(2);
    expect(done.receipts).toHaveLength(20);

    // Cùng 20 lệnh nhưng batch gộp hỏng: mọi lệnh chạy lại một-lệnh-một-batch, kết quả phải y hệt.
    const sequential=await setup(20);
    beforeBatch=async(sqls)=>{
      if(!isGroupBatch(sqls)) return;
      beforeBatch=null;
      throw new Error('batch gộp hỏng');
    };
    const retried=await sequential.push(attendanceCommands(sequential));
    expect(retried.body.results.map((r:any)=>r.status)).toEqual(attendanceCommands(sequential).map(()=>'applied'));
    const replay=await state(sequential.owner.workspaceId,sequential.sessionId,sequential.students);
    expect(replay.attendance.map((r:any)=>({status:r.status,version:r.version})))
      .toEqual(done.attendance.map((r:any)=>({status:r.status,version:r.version})));
    expect(replay.session).toEqual(done.session);
    expect(replay.log).toEqual(done.log);
    expect(replay.receipts).toEqual(done.receipts);
  });

  it('gửi lại cùng request trả duplicate cho mọi lệnh và không ghi thêm',async()=>{
    const f=await setup(5);
    const commands=attendanceCommands(f);
    await f.push(commands);
    const before=await state(f.owner.workspaceId,f.sessionId,f.students);
    stats.trips=[];
    const retry=await f.push(commands);
    expect(retry.status).toBe(200);
    expect(retry.body.results.map((r:any)=>[r.status,r.original_status])).toEqual(commands.map(()=>['duplicate','applied']));
    expect(stats.trips.length).toBeLessThanOrEqual(4);
    expect(await state(f.owner.workspaceId,f.sessionId,f.students)).toEqual(before);
  });

  it('hai lệnh cùng một ô trong một request thì lệnh sau thắng, version tăng 2',async()=>{
    const f=await setup(1);
    const [student]=f.students;
    const res=await f.push([
      command('attendance.set',{session_id:f.sessionId,student_id:student,status:'present'}),
      command('attendance.set',{session_id:f.sessionId,student_id:student,status:'late'}),
    ]);
    expect(res.body.results.map((r:any)=>[r.status,r.version])).toEqual([['applied',1],['applied',2]]);
    expect(await db.prepare('SELECT status,version FROM attendance WHERE session_id=? AND student_id=?').bind(f.sessionId,student).first<any>())
      .toEqual({status:'late',version:2});
    expect(await db.prepare('SELECT status,version FROM class_sessions WHERE id=?').bind(f.sessionId).first<any>())
      .toEqual({status:'held',version:2});
    expect((await db.prepare('SELECT COUNT(*) n FROM change_log WHERE workspace_id=? AND entity=?').bind(f.owner.workspaceId,'attendance').first<any>())!.n).toBe(2);
  });

  it('lệnh bị từ chối trong batch gộp không chặn lệnh khác',async()=>{
    const f=await setup(3),cancelled=await insertSession(f.owner.workspaceId,f.classId,daysAgo(1),f.owner.userId,'cancelled');
    const bad=command('attendance.set',{session_id:cancelled,student_id:f.students[0],status:'present'});
    const res=await f.push([...attendanceCommands(f,'late',2),bad]);
    expect(res.body.results.map((r:any)=>r.status)).toEqual(['applied','applied','rejected']);
    expect(res.body.results[2].error.details.reason).toBe('session_cancelled');
    expect((await db.prepare('SELECT COUNT(*) n FROM attendance WHERE workspace_id=? AND session_id=?').bind(f.owner.workspaceId,f.sessionId).first<any>())!.n).toBe(2);
    expect((await db.prepare('SELECT status FROM applied_commands WHERE command_id=?').bind(bad.id).first<any>())!.status).toBe('rejected');
  });

  it('statement lỗi giữa batch thì D1 huỷ cả batch và lệnh chạy lại tuần tự đúng một lần',async()=>{
    const f=await setup(10);
    const commands=attendanceCommands(f);
    let poisoned=false;
    beforeBatch=async(sqls,statements)=>{
      if(poisoned || !isGroupBatch(sqls)) return;
      poisoned=true;
      // Batch gộp kèm một câu vi phạm CHECK: D1 abort và rollback toàn bộ batch vừa chạy.
      return [...statements,db.prepare(POISON)];
    };
    const res=await f.push(commands);
    expect(res.status).toBe(200);
    expect(res.body.results.map((r:any)=>r.status)).toEqual(commands.map(()=>'applied'));
    const after=await state(f.owner.workspaceId,f.sessionId,f.students);
    expect(after.attendance).toHaveLength(10);
    expect(after.attendance.every((r:any)=>r.version===1)).toBe(true);
    expect(after.session).toEqual({status:'held',version:2});
    expect(after.log.filter((r:any)=>r.entity==='attendance')).toHaveLength(10);
    expect(after.receipts).toHaveLength(10);
  });

  it('CAS thua vì hàng đổi giữa preload và commit thì lệnh đó chạy lại và vẫn applied',async()=>{
    const f=await setup(1);
    const [student]=f.students;
    let bumped=false;
    beforeBatch=async(sqls)=>{
      if(bumped || !isGroupBatch(sqls)) return;
      bumped=true;
      // Thiết bị khác mở buổi sau bước preload: version của class_sessions đổi trước khi batch gộp commit.
      await db.prepare('UPDATE class_sessions SET version=version+1 WHERE workspace_id=? AND id=?').bind(f.owner.workspaceId,f.sessionId).run();
    };
    const res=await f.push([command('attendance.set',{session_id:f.sessionId,student_id:student,status:'present'})]);
    expect(res.body.results[0]).toMatchObject({status:'applied',version:1});
    expect(await db.prepare('SELECT status,version FROM attendance WHERE session_id=? AND student_id=?').bind(f.sessionId,student).first<any>())
      .toEqual({status:'present',version:1});
    const session=await db.prepare('SELECT status,version FROM class_sessions WHERE id=?').bind(f.sessionId).first<any>();
    expect(session.status).toBe('held');
    expect(session.version).toBe(3);
  });

  it('request trộn lệnh đối tượng với lệnh ô giữ đúng thứ tự kết quả',async()=>{
    const f=await setup(2),testId=uid();
    const commands=[
      command('test.create',{id:testId,class_id:f.classId,name:'Kiểm tra 1',date:today()}),
      ...attendanceCommands(f),
      command('score.set',{test_id:testId,student_id:f.students[0],value:8}),
      command('slip.send',{session_id:f.sessionId,student_ids:f.students,
        defaults:f.students.map(student_id=>({student_id,criteria:31,comment:'Tốt'}))}),
    ];
    const res=await f.push(commands);
    expect(res.body.results.map((r:any)=>r.id)).toEqual(commands.map(c=>c.id));
    expect(res.body.results.map((r:any)=>r.status)).toEqual(['applied','applied','applied','applied','applied']);
    expect(res.body.results[4].sent).toEqual(f.students);
    expect((await db.prepare("SELECT COUNT(*) n FROM session_comments WHERE workspace_id=? AND status='sent'").bind(f.owner.workspaceId).first<any>())!.n).toBe(2);
    expect((await db.prepare('SELECT COUNT(*) n FROM change_log WHERE workspace_id=? AND entity=?').bind(f.owner.workspaceId,'score').first<any>())!.n).toBe(1);
  });

  it('slip.set sau attendance cùng buổi trong một request ra cùng kết quả như gửi từng request',async()=>{
    const slip=(f:Cell)=>command('slip.set',{session_id:f.sessionId,student_id:f.students[0],stars:2});
    const together=await setup(1);
    const same=await together.push([command('attendance.set',{session_id:together.sessionId,student_id:together.students[0],status:'present'}),slip(together)]);
    expect(same.body.results.map((r:any)=>[r.status,r.version])).toEqual([['applied',1],['applied',1]]);
    const separate=await setup(1);
    await separate.push([command('attendance.set',{session_id:separate.sessionId,student_id:separate.students[0],status:'present'})]);
    const after=await separate.push([slip(separate)]);
    expect(after.body.results.map((r:any)=>[r.status,r.version])).toEqual([['applied',1]]);

    // Thiếu điểm danh của em thứ hai thì phiếu bị từ chối như trước, dù attendance đi trước trong request.
    const partial=await setup(2);
    const rejected=await partial.push([command('attendance.set',{session_id:partial.sessionId,student_id:partial.students[0],status:'present'}),slip(partial)]);
    expect(rejected.body.results.map((r:any)=>r.status)).toEqual(['applied','rejected']);
    expect(rejected.body.results[1].error).toMatchObject({code:'attendance_incomplete',details:{missing_count:1}});
  });

  it('receipt của workspace khác vẫn bị từ chối conflict retry',async()=>{
    const f=await setup(1),other=await setup(1);
    const c=command('attendance.set',{session_id:f.sessionId,student_id:f.students[0],status:'present'});
    await db.prepare(`INSERT INTO applied_commands(command_id,workspace_id,membership_id,type,status,result,applied_at)
      VALUES(?,?,?,?,?,?,?)`).bind(c.id,other.owner.workspaceId,other.owner.membershipId,'attendance.set','applied',
      JSON.stringify({id:c.id,status:'applied',version:1}),new Date().toISOString()).run();
    const res=await f.push([c]);
    expect(res.body.results[0]).toMatchObject({status:'rejected',error:{code:'conflict',details:{reason:'retry'}}});
    expect((await db.prepare('SELECT COUNT(*) n FROM attendance WHERE workspace_id=?').bind(f.owner.workspaceId).first<any>())!.n).toBe(0);
  });

  it('mọi statement ≤100 bind khi push 50 lệnh',async()=>{
    const f=await setup(50);
    stats.maxBind=0;stats.trips=[];
    const res=await f.push(attendanceCommands(f));
    expect(res.body.results.every((r:any)=>r.status==='applied')).toBe(true);
    expect(stats.maxBind).toBeLessThanOrEqual(100);
    expect(stats.trips.length).toBeLessThanOrEqual(4);
  });
});
