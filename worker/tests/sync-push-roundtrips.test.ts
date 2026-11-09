import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, db, fakePhone, insertClass, insertSession, insertStudent, post, registerWorkspace } from './helpers';

const uid=()=>crypto.randomUUID();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const command=(type:string,payload:any)=>({id:uid(),type,payload,base_version:0,created_at:new Date().toISOString()});
/** Each awaited D1 call (first/run/all/raw/batch) is one network round trip from the Worker to D1. */
let trips:string[]=[];
beforeEach(async()=>{
  await db.prepare('DELETE FROM auth_throttle').run();
  const target=db as any;
  const prepare=target.prepare.bind(db),batch=target.batch.bind(db);
  const wrap=(s:any,sql:string)=>{
    for(const m of ['first','run','all','raw']) {const f=s[m].bind(s);s[m]=(...a:any[])=>{trips.push(sql.replace(/\s+/g,' ').slice(0,70));return f(...a);};}
    const bind=s.bind.bind(s);s.bind=(...a:any[])=>wrap(bind(...a),sql);
    return s;
  };
  vi.spyOn(target,'prepare').mockImplementation((sql:unknown)=>wrap(prepare(sql),String(sql)));
  vi.spyOn(target,'batch').mockImplementation((s:unknown)=>{const list=s as unknown[];trips.push(`batch(${list.length})`);return batch(list);});
});
afterEach(()=>vi.restoreAllMocks());

async function setup(count:number){
  const owner=await registerWorkspace(fakePhone(),'Push round trips');
  const classId=await insertClass(owner.workspaceId,'C1',owner.userId);
  const students:string[]=[];
  for(let n=0;n<count;n++) students.push(await insertStudent(owner.workspaceId,classId,`Student ${n+1}`,null,owner.userId));
  await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE workspace_id=?").bind(owner.workspaceId).run();
  const sessionId=await insertSession(owner.workspaceId,classId,today(),owner.userId);
  const push=(commands:any[])=>call('/v1/sync/push',post({membership_id:owner.membershipId,device_id:uid(),commands}),owner.token);
  return {owner,students,sessionId,push};
}

// Độ trễ D1 trên mạng thật ≈ số round-trip × 21 ms (số đo dev), nên chặn round-trip là chặn p95.
// Số round-trip phải là hằng số: không tăng theo số lệnh trong một lần push.
describe('sync push D1 round trips',()=>{
  for(const n of [1,5,20,50]) it(`attendance.set x${n} giữ nguyên số round-trip`,async()=>{
    const f=await setup(n);
    const commands=f.students.slice(0,n).map(student_id=>command('attendance.set',{session_id:f.sessionId,student_id,status:'present'}));
    trips=[];
    const res=await f.push(commands);
    expect(res.status).toBe(200);
    expect(res.body.results.map((r:any)=>r.status)).toEqual(commands.map(()=>'applied'));
    expect(trips.length).toBeLessThanOrEqual(4);
  });
});
