import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, db, fakePhone, insertAttendance, insertClass, insertSession, insertStudent, post, registerWorkspace } from './helpers';

const uid=()=>crypto.randomUUID();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const command=(type:string,payload:any)=>({id:uid(),type,payload,base_version:0,created_at:new Date().toISOString()});
let bindCounts:number[]=[];
let statementSql=new WeakMap<object,string>();
let restorePrepare:(()=>void)|undefined;

beforeEach(async()=>{
  await db.prepare('DELETE FROM auth_throttle').run();
  bindCounts=[];
  statementSql=new WeakMap();
  const target=db as any;
  const original=target.prepare.bind(db);
    vi.spyOn(target,'prepare').mockImplementation((...args:unknown[])=>{
      const sql=String(args[0]);
      const statement=original(sql);
      statementSql.set(statement,sql);
      const bind=statement.bind.bind(statement);
      statement.bind=(...args:any[])=>{
        bindCounts.push(args.length);
        const bound=bind(...args);
        if(bound&&typeof bound==='object') statementSql.set(bound,sql);
        return bound;
      };
    return statement;
  });
  restorePrepare=()=>vi.restoreAllMocks();
});
afterEach(()=>restorePrepare?.());

async function setup(count:number){
  const owner=await registerWorkspace(fakePhone(),'Slip bind test');
  const classId=await insertClass(owner.workspaceId,'C1',owner.userId);
  const students:string[]=[];
  for(let n=0;n<count;n++) students.push(await insertStudent(owner.workspaceId,classId,`Student ${n+1}`,null,owner.userId));
  await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE workspace_id=?").bind(owner.workspaceId).run();
  const sessionId=await insertSession(owner.workspaceId,classId,today(),owner.userId);
  const push=(commands:any[])=>call('/v1/sync/push',post({membership_id:owner.membershipId,device_id:uid(),commands}),owner.token);
  const attendance=async(status:'present'|'late'|'absent'='present',except?:string)=>{
    await Promise.all(students.filter(student=>student!==except).map(student=>insertAttendance(owner.workspaceId,classId,sessionId,student,status,owner.userId)));
  };
  const defaults=students.map(student_id=>({student_id,criteria:31,comment:'Ready to share.'}));
  const drafts=()=>push(students.map(student=>command('slip.set',{session_id:sessionId,student_id:student,criteria:31,comment:'Draft ready.',note:''})));
  return {owner,classId,students,sessionId,push,attendance,defaults,drafts};
}
const startCapture=()=>{bindCounts=[];};
const expectBindLimit=()=>expect(Math.max(0,...bindCounts)).toBeLessThanOrEqual(100);

describe('slip.send D1 bind limit',()=>{
  it('sends 19 existing drafts with every statement at or below 100 binds and is idempotent',async()=>{
    const f=await setup(19);await f.attendance();await f.drafts();startCapture();
    const send=command('slip.send',{session_id:f.sessionId,student_ids:f.students});
    const first=await f.push([send]);
    expect(first.body.results[0]).toMatchObject({status:'applied',sent:f.students});expectBindLimit();
    startCapture();
    const retry=await f.push([send]);
    expect(retry.body.results[0]).toMatchObject({status:'duplicate',original_status:'applied'});expectBindLimit();
  });

  it('sends 19 defaults with every statement at or below 100 binds',async()=>{
    const f=await setup(19);await f.attendance();startCapture();
    const result=await f.push([command('slip.send',{session_id:f.sessionId,student_ids:f.students,defaults:f.defaults})]);
    expect(result.body.results[0]).toMatchObject({status:'applied',sent:f.students});expectBindLimit();
  });

  it('mixes drafts, defaults and absent students while skipping absent and existing defaults',async()=>{
    const f=await setup(19);const [draft,absent]=f.students;
    await f.attendance('present',absent);
    await insertAttendance(f.owner.workspaceId,f.classId,f.sessionId,absent!,'absent',f.owner.userId);
    await f.drafts();
    const selected=[...f.students];
    // Keep one draft, remove the remaining drafts so defaults are used only for missing slips.
    await db.prepare('DELETE FROM session_comments WHERE session_id=? AND student_id<>?').bind(f.sessionId,draft).run();
    startCapture();
    const result=await f.push([command('slip.send',{session_id:f.sessionId,student_ids:selected,defaults:f.defaults})]);
    expect(result.body.results[0]).toMatchObject({status:'applied',sent:f.students.filter(student=>student!==absent),skipped:[{student_id:absent,reason:'absent'}]});expectBindLimit();
    expect(await db.prepare('SELECT status FROM session_comments WHERE session_id=? AND student_id=?').bind(f.sessionId,draft).first()).toEqual({status:'sent'});
    expect(await db.prepare('SELECT 1 FROM session_comments WHERE session_id=? AND student_id=?').bind(f.sessionId,absent).first()).toBeNull();
  });

  it('sends 50 defaults with every statement at or below 100 binds',async()=>{
    const f=await setup(50);await f.attendance();startCapture();
    const result=await f.push([command('slip.send',{session_id:f.sessionId,student_ids:f.students,defaults:f.defaults})]);
    expect(result.body.results[0]).toMatchObject({status:'applied',sent:f.students});expectBindLimit();
  });

  it('applies 50 attendance commands across 50 sessions with every statement at or below 100 binds',async()=>{
    const f=await setup(50);
    const start=new Date(`${today()}T00:00:00Z`);
    const sessions:string[]=[];
    for(let n=0;n<50;n++) {
      const date=new Date(start);date.setUTCDate(date.getUTCDate()-50+n);
      sessions.push(await insertSession(f.owner.workspaceId,f.classId,date.toISOString().slice(0,10),f.owner.userId));
    }
    const commands=f.students.map((student,index)=>command('attendance.set',{session_id:sessions[index],student_id:student,status:'present'}));
    startCapture();
    const result=await f.push(commands);
    expect(result.status).toBe(200);expect(result.body.results[0].error).toBeUndefined();expect(result.body.results.map((item:any)=>item.status)).toEqual(Array(50).fill('applied'));expectBindLimit();
  });

  it('keeps stale-read guard CAS atomic before retrying the whole send',async()=>{
    const f=await setup(2);await f.attendance();await f.drafts();
    const target=db as any;
    const originalPrepare=target.prepare.bind(db);
    const originalBatch=target.batch.bind(db);
    let failedBatch:{finalizerChanges:number;statuses:string[]}|undefined;
    const batchSpy=vi.spyOn(target,'batch') as any;
    batchSpy.mockImplementation(async(...args:any[])=>{
      const statements=args[0] as any[];
      const sqls=statements.map(statement=>statementSql.get(statement)??'');
      const finalizerIndex=sqls.findIndex(sql=>sql.startsWith('UPDATE applied_commands SET result=result'));
      const hasGuard=sqls.some(sql=>sql.startsWith('DELETE FROM applied_commands WHERE command_id=?'));
      if(!failedBatch&&finalizerIndex>=0&&hasGuard) {
        await originalPrepare('UPDATE attendance SET version=version+1 WHERE session_id=? AND student_id=?').bind(f.sessionId,f.students[0]).run();
        const results=await originalBatch(...args);
        const rows=await originalPrepare('SELECT student_id,status FROM session_comments WHERE session_id=? ORDER BY student_id').bind(f.sessionId).all();
        failedBatch={finalizerChanges:results[finalizerIndex]!.meta.changes??0,statuses:(rows.results as any[]).map((row:any)=>row.status)};
        return results;
      }
      return originalBatch(...args);
    });
    startCapture();
    const result=await f.push([command('slip.send',{session_id:f.sessionId,student_ids:f.students})]);
    expect(failedBatch).toEqual({finalizerChanges:0,statuses:['draft','draft']});
    expect(result.body.results[0]).toMatchObject({status:'applied',sent:f.students});expectBindLimit();
  });

  it('rejects a class send if any default lacks a comment without creating slips',async()=>{
    const f=await setup(19);await f.attendance();
    const defaults=[...f.defaults];defaults[10]={student_id:f.students[10]!,criteria:31,comment:'   '};startCapture();
    const result=await f.push([command('slip.send',{session_id:f.sessionId,student_ids:f.students,defaults})]);
    expect(result.body.results[0].error.details.reason).toBe('comment_required');
    expect(await db.prepare('SELECT COUNT(*) AS n FROM session_comments WHERE session_id=?').bind(f.sessionId).first()).toEqual({n:0});expectBindLimit();
  });

  it('rejects a class send when attendance is incomplete without creating slips',async()=>{
    const f=await setup(19);await f.attendance('present',f.students[18]);startCapture();
    const result=await f.push([command('slip.send',{session_id:f.sessionId,student_ids:f.students,defaults:f.defaults})]);
    expect(result.body.results[0].error.code).toBe('attendance_incomplete');
    expect(await db.prepare('SELECT COUNT(*) AS n FROM session_comments WHERE session_id=?').bind(f.sessionId).first()).toEqual({n:0});expectBindLimit();
  });

  it('rejects a 51-ID command individually while applying a valid command in the same push',async()=>{
    const f=await setup(1);await f.attendance();startCapture();
    const bad=command('slip.send',{session_id:f.sessionId,student_ids:Array.from({length:51},uid)});
    const good=command('attendance.set',{session_id:f.sessionId,student_id:f.students[0],status:'late'});
    const result=await f.push([bad,good]);
    expect(result.status).toBe(200);
    expect(result.body.results[0]).toMatchObject({status:'rejected',error:{details:{reason:'invalid_student_ids'}}});
    expect(result.body.results[1].status).toBe('applied');expectBindLimit();
  });

  it('rejects 120 student IDs per command without exceeding the D1 bind limit',async()=>{
    const f=await setup(1);await f.attendance();const ids=Array.from({length:120},uid);startCapture();
    const result=await f.push([command('slip.send',{session_id:f.sessionId,student_ids:ids})]);
    expect(result.status).toBe(200);
    expect(result.body.results[0]).toMatchObject({status:'rejected',error:{details:{reason:'invalid_student_ids'}}});
    expectBindLimit();
  });
});
