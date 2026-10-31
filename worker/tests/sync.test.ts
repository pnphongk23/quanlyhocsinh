import { beforeEach,describe,it,expect } from 'vitest';
import { call,post,db,registerWorkspace,fakePhone,insertUser,insertMembership,insertClass,insertStudent,
  insertSession,insertTest,insertGuardianMembership,clubToken } from './helpers';

beforeEach(async()=>{await db.prepare('DELETE FROM auth_throttle').run();});
const uid=()=>crypto.randomUUID();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const command=(type:string,payload:any,base_version=0)=>({id:uid(),type,payload,base_version,created_at:new Date().toISOString()});
  async function setup() {
    const a=await registerWorkspace(fakePhone(),'Sync A');
    await db.prepare("UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'")
      .bind(a.roles.assistant).run();
  const cls=await insertClass(a.workspaceId,'C1',a.userId),other=await insertClass(a.workspaceId,'C2',a.userId);
  const s1=await insertStudent(a.workspaceId,cls,'S1',null,a.userId),s2=await insertStudent(a.workspaceId,cls,'S2',null,a.userId);
  const s3=await insertStudent(a.workspaceId,other,'S3',null,a.userId);
  await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE workspace_id=?").bind(a.workspaceId).run();
  const ses=await insertSession(a.workspaceId,cls,today(),a.userId),test=await insertTest(a.workspaceId,cls,a.userId,today());
  const teacherUser=await insertUser(fakePhone()),taUser=await insertUser(fakePhone()),p1User=await insertUser(fakePhone()),p2User=await insertUser(fakePhone());
  const teacher=await insertMembership(a.workspaceId,teacherUser,a.roles.teacher!,[cls]);
  const ta=await insertMembership(a.workspaceId,taUser,a.roles.assistant!,[cls]);
  const p1=await insertGuardianMembership(a.workspaceId,p1User,a.roles.guardian!,[s1]);
  const p2=await insertGuardianMembership(a.workspaceId,p2User,a.roles.guardian!,[s2]);
  const actors={admin:{token:a.token,mid:a.membershipId},teacher:{token:await clubToken(a.workspaceId,teacherUser,teacher),mid:teacher},
    ta:{token:await clubToken(a.workspaceId,taUser,ta),mid:ta},p1:{token:await clubToken(a.workspaceId,p1User,p1),mid:p1},p2:{token:await clubToken(a.workspaceId,p2User,p2),mid:p2}};
  const send=async(commands:any[],actor:keyof typeof actors='admin',device_id=uid())=>call('/v1/sync/push',post({membership_id:actors[actor].mid,device_id,commands}),actors[actor].token);
  const snap=async(actor:keyof typeof actors='admin')=>call(`/v1/sync/snapshot?membership_id=${actors[actor].mid}`,{},actors[actor].token);
  const page=async(entity:string,actor:keyof typeof actors='admin',extra='')=>call(`/v1/sync/snapshot/${entity}?membership_id=${actors[actor].mid}${extra}`,{},actors[actor].token);
  const pull=async(cursor=0,actor:keyof typeof actors='admin',epoch=1,limit=200)=>call(`/v1/sync/pull?membership_id=${actors[actor].mid}&cursor=${cursor}&epoch=${epoch}&limit=${limit}`,{},actors[actor].token);
  return {a,cls,other,s1,s2,s3,ses,test,actors,teacherUser,send,snap,page,pull};
}

describe('sync commands and recovery',()=>{
  it('retries an unacknowledged batch without changing history, log, or notifications twice',async()=>{
    const f=await setup();
    const commands=[command('attendance.set',{session_id:f.ses,student_id:f.s1,status:'present'}),command('score.set',{test_id:f.test,student_id:f.s1,value:0})];
    const first=await f.send(commands);expect(first.status).toBe(200);expect(first.body.results.map((r:any)=>r.status)).toEqual(['applied','applied']);
    const before=await db.prepare('SELECT COUNT(*) n FROM change_log WHERE workspace_id=?').bind(f.a.workspaceId).first<any>();
    const retry=await f.send(commands);expect(retry.body.results.map((r:any)=>[r.status,r.original_status])).toEqual([['duplicate','applied'],['duplicate','applied']]);
    expect(await db.prepare('SELECT COUNT(*) n FROM change_log WHERE workspace_id=?').bind(f.a.workspaceId).first()).toEqual(before);
    expect((await db.prepare('SELECT COUNT(*) n FROM notifications WHERE workspace_id=?').bind(f.a.workspaceId).first<any>())!.n).toBe(1);
    expect((await db.prepare('SELECT status FROM class_sessions WHERE id=?').bind(f.ses).first<any>())!.status).toBe('held');
  });
  it('applies a stale base_version instead of storing a conflict and still writes history',async()=>{
    const f=await setup();const payload={test_id:f.test,student_id:f.s1,value:10};
    expect((await f.send([command('score.set',payload)])).body.results[0].version).toBe(1);
    expect((await f.send([command('score.set',payload)])).body.results[0]).toMatchObject({status:'applied',version:1,noop:true});
    const later=await f.send([command('score.set',{...payload,value:12})]);
    expect(later.body.results[0]).toMatchObject({status:'applied',version:2});
    expect(await db.prepare('SELECT value,version FROM scores WHERE test_id=? AND student_id=?').bind(f.test,f.s1).first<any>())
      .toMatchObject({value:12,version:2});
    const history=await db.prepare('SELECT old_value,new_value FROM score_history WHERE test_id=? AND student_id=? ORDER BY id').bind(f.test,f.s1).all<any>();
    expect(history.results).toEqual([{old_value:10,new_value:12}]);
    expect((await db.prepare('SELECT COUNT(*) n FROM sync_conflicts WHERE workspace_id=?').bind(f.a.workspaceId).first<any>())!.n).toBe(0);
    const resolved=await f.send([command('conflict.resolve',{conflict_id:uid(),choice:'client'})]);
    expect(resolved.body.results[0]).toMatchObject({status:'rejected',error:{details:{reason:'conflicts_not_used'}}});
  });
  it('lets the later arrival win for every cell type and never records conflicts',async()=>{
    const f=await setup(),section=uid();
    await f.send([command('homework.assign',{session_id:f.ses,sections:[{id:section,kind:'reading'}]})]);
    for (const [type,base,other] of [
      ['attendance.set',{session_id:f.ses,student_id:f.s1,status:'present'},{status:'absent'}],
      ['slip.set',{session_id:f.ses,student_id:f.s1,stars:3,note:''},{stars:1}],
      ['homework.grade.set',{section_id:section,student_id:f.s1,level:'done'},{level:'not_done'}],
      ['score.set',{test_id:f.test,student_id:f.s1,value:4},{value:2}],
    ] as const) {
      expect((await f.send([command(type,base)])).body.results[0]).toMatchObject({status:'applied',version:1});
      expect((await f.send([command(type,{...base,...other},0)])).body.results[0]).toMatchObject({status:'applied',version:2});
    }
    expect(await db.prepare('SELECT status FROM attendance WHERE session_id=? AND student_id=?').bind(f.ses,f.s1).first<any>()).toMatchObject({status:'absent'});
    expect(await db.prepare('SELECT stars FROM session_comments WHERE session_id=? AND student_id=?').bind(f.ses,f.s1).first<any>()).toMatchObject({stars:1});
    expect(await db.prepare('SELECT level FROM homework_grades WHERE section_id=? AND student_id=?').bind(section,f.s1).first<any>()).toMatchObject({level:'not_done'});
    expect(await db.prepare('SELECT value FROM scores WHERE test_id=? AND student_id=?').bind(f.test,f.s1).first<any>()).toMatchObject({value:2});
    expect((await db.prepare('SELECT COUNT(*) n FROM sync_conflicts WHERE workspace_id=?').bind(f.a.workspaceId).first<any>())!.n).toBe(0);
  });
  it('applies two parallel writes to one cell in arrival order without losing either',async()=>{
    const f=await setup(),payload={test_id:f.test,student_id:f.s1,value:8};
    await f.send([command('score.set',payload)]);
    const updates=await Promise.all([f.send([command('score.set',{...payload,value:9},1)]),f.send([command('score.set',{...payload,value:10},1)])]);
    expect(updates.map(r=>r.body.results[0].status)).toEqual(['applied','applied']);
    const row=await db.prepare('SELECT value,version FROM scores WHERE test_id=? AND student_id=?').bind(f.test,f.s1).first<any>();
    expect([9,10]).toContain(row!.value);expect(row!.version).toBe(3);
    expect((await db.prepare('SELECT COUNT(*) n FROM score_history WHERE test_id=? AND student_id=?').bind(f.test,f.s1).first<any>())!.n).toBe(2);
    expect((await db.prepare('SELECT COUNT(*) n FROM sync_conflicts WHERE workspace_id=?').bind(f.a.workspaceId).first<any>())!.n).toBe(0);
  });
  it('accepts half-step scores end to end and rejects other fractions',async()=>{
    const f=await setup();
    const results=await f.send([
      command('score.set',{test_id:f.test,student_id:f.s1,value:7.5}),
      command('score.set',{test_id:f.test,student_id:f.s2,value:0.5}),
      command('score.set',{test_id:f.test,student_id:f.s1,value:15}),
      command('score.set',{test_id:f.test,student_id:f.s1,value:7.5}),
      command('score.set',{test_id:f.test,student_id:f.s1,value:7.3}),
      command('score.set',{test_id:f.test,student_id:f.s1,value:7.25}),
      command('score.set',{test_id:f.test,student_id:f.s1,value:1000.5}),
      command('score.set',{test_id:f.test,student_id:f.s1,value:-0.5}),
      command('score.set',{test_id:f.test,student_id:f.s1,value:'7.5'}),
    ]);
    expect(results.body.results.map((r:any)=>r.status)).toEqual([
      'applied','applied','applied','applied','rejected','rejected','rejected','rejected','rejected',
    ]);
    expect(results.body.results.slice(4).map((r:any)=>r.error.code)).toEqual([
      'validation_error','validation_error','validation_error','validation_error','validation_error',
    ]);
    expect(results.body.results.slice(4).map((r:any)=>r.error.details?.reason)).toEqual([
      'invalid_score_step','invalid_score_step','invalid_score','invalid_score','invalid_score',
    ]);

    const snapshot=await f.page('score');
    expect(snapshot.body.items).toContainEqual(expect.objectContaining({student_id:f.s1,value:7.5}));
    expect(snapshot.body.items).toContainEqual(expect.objectContaining({student_id:f.s2,value:0.5}));
    const pulled=await f.pull();
    expect(pulled.body.upserts.score).toContainEqual(expect.objectContaining({student_id:f.s1,value:7.5}));
    expect(pulled.body.upserts.score).toContainEqual(expect.objectContaining({student_id:f.s2,value:0.5}));
    const month=today().slice(0,7),report=await call(`/v1/students/${f.s1}/report-preview?month=${month}`,{},f.actors.admin.token);
    expect(report.status).toBe(200);
    expect(report.body.tests).toContainEqual(expect.objectContaining({test_id:f.test,value:7.5}));
  });
  it('commits valid commands around a rejected command, and creates dependencies in order',async()=>{
    const f=await setup(),test=uid();
    const r=await f.send([command('test.create',{id:test,class_id:f.cls,name:'T',date:today()}),
      command('attendance.set',{session_id:f.ses,student_id:f.s3,status:'present'}),command('score.set',{test_id:test,student_id:f.s1,value:15})]);
    expect(r.body.results.map((x:any)=>x.status)).toEqual(['applied','rejected','applied']);
    expect(await db.prepare('SELECT name FROM tests WHERE id=?').bind(test).first<any>()).toMatchObject({name:'T'});
  });
  it('validates expiration, ahead/missing versions, attendance dates and enrollment',async()=>{
    const f=await setup(),future=await insertSession(f.a.workspaceId,f.cls,'2099-01-01',f.a.userId);
    const payload={session_id:f.ses,student_id:f.s1,status:'present'};
    const expired=command('attendance.set',payload);expired.created_at='2000-01-01T00:00:00.000Z';
    const r=await f.send([expired,command('attendance.set',{...payload,session_id:future}),command('attendance.set',{...payload,status:'excused'}),
      command('score.set',{test_id:f.test,student_id:f.s1,value:1},1)]);
    expect(r.body.results.map((x:any)=>x.error.details?.reason ?? x.error.code)).toEqual(['command_expired','session_not_started','invalid_value','not_found']);
    await f.send([command('attendance.set',payload)]);
    expect((await f.send([command('attendance.set',payload,2)])).body.results[0].error.details.reason).toBe('base_version_ahead');
    await db.prepare("UPDATE students SET enrolled_at='2099-01-01' WHERE id=?").bind(f.s1).run();
    expect((await f.send([command('slip.set',{session_id:f.ses,student_id:f.s1,stars:3,note:''})])).body.results[0].error.details.reason).toBe('student_not_enrolled_on_date');
  });
  it('updates/deletes tests, ignores legacy max, archives zero, deletes null-only tests',async()=>{
    const f=await setup();
    await f.send([command('score.set',{test_id:f.test,student_id:f.s1,value:0})]);
    expect((await f.send([command('test.update',{id:f.test,name:'Updated',max:20},1)])).body.results[0].version).toBe(2);
    // A stale base_version still applies: the later command wins, no version_conflict.
    expect((await f.send([command('test.update',{id:f.test,name:'Updated again',max:20},1)])).body.results[0])
      .toMatchObject({status:'applied',version:3});
    expect((await f.send([command('test.update',{id:f.test,name:'Ahead'},9)])).body.results[0].error.details.reason).toBe('base_version_ahead');
    await f.send([command('score.set',{test_id:f.test,student_id:f.s1,value:18},1)]);
    expect((await f.send([command('test.update',{id:f.test,max:10},2)])).body.results[0]).toMatchObject({status:'applied',version:4});
    expect((await f.send([command('score.set',{test_id:f.test,student_id:f.s1,value:1000.5},2)])).body.results[0].error.details.reason).toBe('invalid_score');
    expect((await f.send([command('score.set',{test_id:f.test,student_id:f.s1,value:1000},2)])).body.results[0].status).toBe('applied');
    expect(await db.prepare('SELECT * FROM tests WHERE id=?').bind(f.test).first<any>()).not.toHaveProperty('max');
    expect(await db.prepare('SELECT name,version FROM tests WHERE id=?').bind(f.test).first<any>()).toMatchObject({name:'Updated again',version:4});
    expect((await f.send([command('test.delete',{id:f.test},2)])).body.results[0].outcome).toBe('archived');
    const test=await insertTest(f.a.workspaceId,f.cls,f.a.userId,today());
    await f.send([command('score.set',{test_id:test,student_id:f.s1,value:null})]);
    expect((await f.send([command('test.delete',{id:test},1)])).body.results[0].outcome).toBe('deleted');
  });
  it('assigns homework atomically, sends one inbox for all sections, updates without push and protects graded sections',async()=>{
    const f=await setup(),a=uid(),b=uid();
    const bad=await f.send([command('homework.assign',{session_id:f.ses,sections:[{id:a,kind:'reading'},{id:b,kind:'reading'}]})]);
    expect(bad.body.results[0].status).toBe('rejected');expect((await f.page('homework_section')).body.items).toEqual([]);
    const assign=command('homework.assign',{session_id:f.ses,sections:[{id:a,kind:'reading'},{id:b,kind:'speaking'}]});
    expect((await f.send([assign])).body.results[0].status).toBe('applied');await f.send([assign]);
    expect((await db.prepare('SELECT COUNT(*) n FROM notifications WHERE workspace_id=?').bind(f.a.workspaceId).first<any>())!.n).toBe(2);
    expect((await f.send([command('homework.section.upsert',{id:a,session_id:f.ses,kind:'reading',title:'Updated'},1)])).body.results[0].version).toBe(2);
    await f.send([command('homework.grade.set',{section_id:a,student_id:f.s1,level:'done'})]);
    expect((await f.send([command('homework.section.delete',{id:a},2)])).body.results[0].error.details.reason).toBe('section_has_grades');
    expect((await f.send([command('homework.section.delete',{id:b},1)])).body.results[0].status).toBe('applied');
    expect((await db.prepare('SELECT COUNT(*) n FROM notifications WHERE workspace_id=?').bind(f.a.workspaceId).first<any>())!.n).toBe(2);
  });
  it('applies object commands with a stale base_version and keeps business rejections',async()=>{
    const f=await setup(),section=uid();
    await f.send([command('homework.assign',{session_id:f.ses,sections:[{id:section,kind:'reading'}]})]);
    expect((await f.send([command('homework.section.upsert',{id:section,session_id:f.ses,kind:'reading',title:'First'},1)])).body.results[0])
      .toMatchObject({status:'applied',version:2});
    // Two devices, both editing from the version they had seen: the later one wins.
    expect((await f.send([command('homework.section.upsert',{id:section,session_id:f.ses,kind:'reading',title:'Later'},1)])).body.results[0])
      .toMatchObject({status:'applied',version:3});
    expect(await db.prepare('SELECT title,version FROM homework_sections WHERE id=?').bind(section).first<any>())
      .toMatchObject({title:'Later',version:3});
    // A base_version from the future is still rejected, and business rules still win over "later".
    expect((await f.send([command('homework.section.upsert',{id:section,session_id:f.ses,kind:'reading',title:'Ahead'},9)])).body.results[0])
      .toMatchObject({status:'rejected',error:{details:{reason:'base_version_ahead'}}});
    await f.send([command('homework.grade.set',{section_id:section,student_id:f.s1,level:'done'})]);
    expect((await f.send([command('homework.section.delete',{id:section},1)])).body.results[0].error.details.reason).toBe('section_has_grades');
    expect((await f.send([command('test.update',{id:uid()},1)])).body.results[0].error.code).toBe('not_found');
  });
  it('rolls back a partially executed assignment if a later section violates uniqueness',async()=>{
    const f=await setup(),a=uid();
    await f.send([command('homework.section.upsert',{id:uid(),session_id:f.ses,kind:'speaking'})]);
    const r=await f.send([command('homework.assign',{session_id:f.ses,sections:[{id:a,kind:'reading'},{id:uid(),kind:'speaking'}]})]);
    expect(r.body.results[0].status).toBe('rejected');expect(await db.prepare('SELECT id FROM homework_sections WHERE id=?').bind(a).first()).toBeNull();
  });
});

describe('sync scope and read protocol',()=>{
  it('checks every endpoint for unauthenticated requests',async()=>{
    for (const path of ['/sync/push','/sync/pull','/sync/snapshot','/sync/snapshot/student']) {
      expect((await call('/v1'+path,path.endsWith('push') ? post({}) : {})).status).toBe(401);
    }
  });
  it('checks push permission by role and resource scope for every command type',async()=>{
    const f=await setup();
    const commands=()=>[command('attendance.set',{session_id:f.ses,student_id:f.s1,status:'present'}),command('score.set',{test_id:f.test,student_id:f.s1,value:5}),
      command('test.create',{id:uid(),class_id:f.cls,name:'T',date:today()}),command('test.update',{id:f.test,name:'T'},1),command('test.delete',{id:f.test},1),
      command('slip.set',{session_id:f.ses,student_id:f.s1,stars:3,note:''}),command('slip.send',{session_id:f.ses,student_ids:[f.s1]}),
      command('homework.assign',{session_id:f.ses,sections:[{id:uid(),kind:'reading'}]}),command('homework.section.upsert',{id:uid(),session_id:f.ses,kind:'speaking'}),
      command('homework.section.delete',{id:uid()},1),command('homework.grade.set',{section_id:uid(),student_id:f.s1,level:'done'}),command('conflict.resolve',{conflict_id:uid(),choice:'server'})];
    for (const actor of ['p1','p2'] as const) expect((await f.send(commands(),actor)).body.results.every((r:any)=>r.error.code==='forbidden')).toBe(true);
    const ta=(await f.send(commands(),'ta')).body.results;expect(ta[0].status).toBe('applied');
    expect(ta.slice(1,9).every((r:any)=>r.error.code==='forbidden')).toBe(true);
    expect((await f.send([command('test.create',{id:uid(),class_id:f.other,name:'T',date:today()})],'teacher')).body.results[0].error.code).toBe('not_found');
    expect((await f.send([command('test.create',{id:uid(),class_id:f.cls,name:'T',date:today()})],'teacher')).body.results[0].status).toBe('applied');
  });
    it('filters snapshot/pull by each role and strips guardian-only fields',async()=>{
    const f=await setup();await f.send([command('score.set',{test_id:f.test,student_id:f.s1,value:1}),command('score.set',{test_id:f.test,student_id:f.s2,value:2})]);
    for (const actor of ['admin','teacher','ta','p1','p2'] as const) {
      const snap=await f.snap(actor);expect(snap.status).toBe(200);expect(snap.body.entities).toContain('student');
      const students=await f.page('student',actor);expect(students.status).toBe(200);
      const pulled=await f.pull(0,actor);expect(pulled.status).toBe(200);
      const expected=actor==='p1' ? [f.s1] : actor==='p2' ? [f.s2] : actor==='admin' ? [f.s1,f.s2,f.s3] : [f.s1,f.s2];
      expect(students.body.items.map((r:any)=>r.id).sort()).toEqual(expected.sort());
      expect(pulled.body.upserts.student.map((r:any)=>r.id).sort()).toEqual(expected.sort());
      if (actor==='p1'||actor==='p2') {
        expect(students.body.items[0]).not.toHaveProperty('parent_phone');
        expect((await f.page('class_session',actor)).body.items[0]).not.toHaveProperty('note');
        expect(snap.body.entities).not.toContain('report');expect(snap.body.entities).not.toContain('report_batch');expect(snap.body.entities).not.toContain('conflict');
        expect(pulled.body.upserts.score).toHaveLength(1);
        expect(pulled.body.upserts.class[0]).toMatchObject({weekdays:expect.any(Array),start_time:expect.any(String)});
        expect(pulled.body.upserts.class[0]).not.toHaveProperty('workspace_id');
      }
      }
    });
    it('includes teacher_name in guardian class snapshot and replays class updates after teacher name or assignment changes',async()=>{
      const f=await setup();
      await db.prepare("UPDATE users SET display_name='Cô Lan' WHERE id=?").bind(f.teacherUser).run();
      const snapshot=await f.snap('p1');
      const classPage=await f.page('class','p1');
      expect(classPage.body.items).toEqual([
        expect.objectContaining({id:f.cls,name:'C1',teacher_name:'Cô Lan'}),
      ]);
      expect(Object.keys(classPage.body.items[0]).sort()).toEqual(['id','name','start_time','status','teacher_name','version','weekdays']);
      expect(JSON.stringify(classPage.body.items)).not.toMatch(/phone|user_id|membership_id|teacher_id/i);

      await db.prepare("UPDATE users SET display_name='Cô Mai' WHERE id=?").bind(f.teacherUser).run();
      const renamed=await f.pull(snapshot.body.cursor,'p1',snapshot.body.epoch);
      expect(renamed.body.upserts.class).toContainEqual(expect.objectContaining({id:f.cls,teacher_name:'Cô Mai'}));

      const nextTeacher=await insertUser(fakePhone(),'Cô An');
      const nextMembership=await insertMembership(f.a.workspaceId,nextTeacher,f.a.roles.teacher!,[]);
      await db.prepare('INSERT INTO member_classes (workspace_id,membership_id,class_id,created_at) VALUES (?,?,?,?)')
        .bind(f.a.workspaceId,nextMembership,f.cls,'2025-01-01T00:00:00.000Z').run();
      const reassigned=await f.pull(renamed.body.cursor,'p1',snapshot.body.epoch);
      expect(reassigned.body.upserts.class).toContainEqual(expect.objectContaining({id:f.cls,teacher_name:'Cô An'}));
    });
  it('omits legacy PDF metadata from report publication snapshot pages and pulls',async()=>{
    const f=await setup(),reportId=uid(),publicationId=uid(),month=today().slice(0,7),now=new Date().toISOString();
    const batchId=uid();
    await db.prepare(`INSERT INTO report_batches(id,workspace_id,class_id,from_session_id,to_session_id,from_key,to_key,created_by,created_at,version)
      VALUES(?,?,?,NULL,NULL,?,?,?,?,1)`).bind(batchId,f.a.workspaceId,f.cls,`${month}-01 00:00`,`${month}-31 23:59`,f.a.userId,now).run();
    await db.prepare(`INSERT INTO reports(id,workspace_id,class_id,student_id,batch_id,month,status,general_comment,needs_republish,publication_count,published_at,version,created_at,updated_at,updated_by)
      VALUES(?,?,?,?,?,?,'published','',0,1,?,1,?,?,?)`).bind(reportId,f.a.workspaceId,f.cls,f.s1,batchId,month,now,now,now,f.a.userId).run();
    await db.prepare(`INSERT INTO report_publications(id,workspace_id,class_id,student_id,report_id,batch_id,month,publication_no,snapshot,pdf_key,pdf_bytes,published_by,published_at)
      VALUES(?,?,?,?,?,?,?,1,?,'legacy/reports.pdf',1234,?,?)`).bind(publicationId,f.a.workspaceId,f.cls,f.s1,reportId,batchId,month,JSON.stringify({student_id:f.s1,month}),f.a.userId,now).run();
    const page=await f.page('report_publication');
    expect(page.body.items).toContainEqual(expect.objectContaining({id:publicationId,snapshot:{student_id:f.s1,month}}));
    const pulled=await f.pull();
    expect(pulled.body.upserts.report_publication).toContainEqual(expect.objectContaining({id:publicationId,batch_id:batchId,snapshot:{student_id:f.s1,month}}));
    const batches=await f.page('report_batch');
    expect(batches.body.items).toContainEqual({id:batchId,class_id:f.cls,month:null,from_session_id:null,to_session_id:null,from_key:`${month}-01 00:00`,to_key:`${month}-31 23:59`,version:1});
    expect(pulled.body.upserts.report_batch).toContainEqual(expect.objectContaining({id:batchId}));
    expect((await f.page('report')).body.items).toContainEqual(expect.objectContaining({id:reportId,batch_id:batchId,month}));
    for (const item of [...page.body.items,...pulled.body.upserts.report_publication]) {
      expect(item).not.toHaveProperty('pdf_key');
      expect(item).not.toHaveProperty('pdf_bytes');
      expect(item).not.toHaveProperty('has_pdf');
    }
  });
  it('hides draft slips/grades, replays homework grades on send and removes archived tests/scores',async()=>{
    const f=await setup(),section=uid();
    const next=await insertSession(f.a.workspaceId,f.cls,'2099-01-01',f.a.userId);
    await f.send([command('homework.section.upsert',{id:section,session_id:f.ses,kind:'reading'}),
      command('homework.grade.set',{section_id:section,student_id:f.s1,level:'excellent'}),
      command('slip.set',{session_id:next,student_id:f.s1,stars:3,note:''}),command('score.set',{test_id:f.test,student_id:f.s1,value:0})]);
    const before=await f.pull(0,'p1');expect(before.body.upserts.slip).toBeUndefined();expect(before.body.upserts.homework_grade).toBeUndefined();expect(before.body.upserts.homework_section).toHaveLength(1);
    const sendCommand=command('slip.send',{session_id:next,student_ids:[f.s1,f.s2]});
    const sends=await Promise.all([f.send([sendCommand]),f.send([sendCommand])]);
    expect(sends.map(r=>r.body.results[0].status).sort()).toEqual(['applied','duplicate']);
    const sent=sends.find(r=>r.body.results[0].status==='applied')!;
    expect((await db.prepare('SELECT version FROM session_comments WHERE session_id=? AND student_id=?').bind(next,f.s1).first<any>())!.version).toBe(2);
    expect(sent.body.results[0]).toMatchObject({status:'applied',sent:[f.s1],skipped:[{student_id:f.s2,reason:'not_attended'}]});
    const after=await f.pull(before.body.cursor,'p1');expect(after.body.upserts.slip).toHaveLength(1);expect(after.body.upserts.homework_grade).toHaveLength(1);
    expect((await f.send([command('slip.set',{session_id:next,student_id:f.s1,stars:2,note:'Updated fixture'},2)])).body.results[0].status).toBe('applied');
    expect((await f.send([command('slip.set',{session_id:next,student_id:f.s1,stars:null,note:''},0)])).body.results[0].error.details.reason).toBe('stars_required');
    const edited=await f.pull(after.body.cursor,'p1');expect(edited.body.upserts.slip[0]).toMatchObject({status:'sent',stars:2,note:'Updated fixture'});
    const start=edited.body.cursor;await f.send([command('test.delete',{id:f.test},1)]);
    const archived=await f.pull(start,'p1');expect(archived.body.deleted).toContainEqual({entity:'test',k1:f.test,k2:''});
    expect(archived.body.deleted).toContainEqual({entity:'score',k1:f.test,k2:f.s1});
    // Score change-log keys must be replayed when test visibility changes.
    expect((await f.page('score','p1')).body.items).toEqual([]);
  });
  it('uses cursor pagination, snapshot keyset pagination, epochs and retention floors',async()=>{
    const f=await setup();let cursor=0,more=true;const all:any[]=[];
    while(more) {const r=await f.pull(cursor,'admin',1,2);expect(r.status).toBe(200);expect(r.body.cursor).toBeGreaterThan(cursor);cursor=r.body.cursor;more=r.body.has_more;all.push(r.body);}
    expect((await f.pull(cursor)).body.upserts).toEqual({});
    const first=await f.page('student','admin','&limit=1');expect(first.body.items).toHaveLength(1);expect(first.body.next_after).toBeTruthy();
    const second=await f.page('student','admin',`&limit=1&after=${encodeURIComponent(first.body.next_after)}`);expect(second.body.items[0].id).not.toBe(first.body.items[0].id);
    await db.prepare('UPDATE workspaces SET change_floor=? WHERE id=?').bind(cursor,f.a.workspaceId).run();
    expect((await f.pull(0)).body.error).toMatchObject({code:'snapshot_required',details:{reason:'log_truncated'}});
    await db.prepare('UPDATE memberships SET scope_epoch=scope_epoch+1 WHERE id=?').bind(f.actors.teacher.mid).run();
    expect((await f.pull(cursor,'teacher')).body.error.code).toBe('resync_required');expect((await f.snap()).body.cursor).toBeGreaterThanOrEqual(cursor);
  });
  it('rejects foreign memberships/workspaces and preserves the queued role after switching active role',async()=>{
    const f=await setup(),b=await registerWorkspace(fakePhone(),'B');
    for (const path of ['/sync/pull?cursor=0&epoch=1','/sync/snapshot','/sync/snapshot/student']) {
      const join=path.includes('?') ? '&' : '?';expect((await call(`/v1${path}${join}membership_id=${f.actors.p1.mid}`,{},b.token)).status).toBe(404);
    }
    expect((await call('/v1/sync/push',post({membership_id:f.a.membershipId,device_id:uid(),commands:[]}),b.token)).status).toBe(404);
    const foreign=await insertClass(b.workspaceId,'B',b.userId);
    expect((await f.send([command('test.create',{id:uid(),class_id:foreign,name:'T',date:today()})])).body.results[0].error.code).toBe('not_found');
    const guardian=await insertGuardianMembership(f.a.workspaceId,f.teacherUser,f.a.roles.guardian!,[f.s1]);
    await db.prepare('UPDATE auth_sessions SET membership_id=? WHERE user_id=?').bind(guardian,f.teacherUser).run();
    expect((await f.send([command('test.create',{id:uid(),class_id:f.cls,name:'T',date:today()})],'teacher')).body.results[0].status).toBe('applied');
    await db.prepare('DELETE FROM member_classes WHERE membership_id=?').bind(f.actors.teacher.mid).run();
    expect((await f.send([command('test.create',{id:uid(),class_id:f.cls,name:'T',date:today()})],'teacher')).body.results[0].error.code).toBe('not_found');
  });
  it('orders two devices by server arrival and pulls one final value, with duplicate UUIDs applied once',async()=>{
    const f=await setup(),deviceA=uid(),deviceB=uid();
    const older=new Date(Date.now()-60000).toISOString(),newer=new Date(Date.now()-30000).toISOString();
    // Device A reaches the server first, device B second: B wins on cell 1.
    const first=command('score.set',{test_id:f.test,student_id:f.s1,value:5});first.created_at=older;
    const second=command('score.set',{test_id:f.test,student_id:f.s1,value:11});second.created_at=newer;
    expect((await f.send([first],'admin',deviceA)).body.results[0]).toMatchObject({status:'applied',version:1});
    expect((await f.send([second],'admin',deviceB)).body.results[0]).toMatchObject({status:'applied',version:2});
    // Reversed order on cell 2: B arrives first even though A's command was created earlier, A still wins.
    const third=command('score.set',{test_id:f.test,student_id:f.s2,value:6});third.created_at=newer;
    const fourth=command('score.set',{test_id:f.test,student_id:f.s2,value:9});fourth.created_at=older;
    expect((await f.send([third],'admin',deviceB)).body.results[0]).toMatchObject({status:'applied',version:1});
    expect((await f.send([fourth],'admin',deviceA)).body.results[0]).toMatchObject({status:'applied',version:2});
    const cells=async(actor:'admin'|'teacher')=> (await f.pull(0,actor)).body.upserts.score
      .map((r:any)=>[r.student_id,r.value,r.version]).sort((a:any,b:any)=>a[0]<b[0]?-1:1);
    expect(await cells('admin')).toEqual([[f.s1,11,2],[f.s2,9,2]].sort((a:any,b:any)=>a[0]<b[0]?-1:1));
    expect(await cells('teacher')).toEqual(await cells('admin'));
    // The same UUID delivered twice is acknowledged once and applied once.
    const retry=await f.send([fourth],'admin',deviceA);
    expect(retry.body.results[0]).toMatchObject({status:'duplicate',original_status:'applied'});
    expect((await db.prepare('SELECT COUNT(*) n FROM score_history WHERE test_id=? AND student_id=?').bind(f.test,f.s2).first<any>())!.n).toBe(1);
    expect((await db.prepare('SELECT COUNT(*) n FROM sync_conflicts WHERE workspace_id=?').bind(f.a.workspaceId).first<any>())!.n).toBe(0);
  });
  it('uses current permissions and keeps rejected acknowledgements idempotent',async()=>{
    const f=await setup();
    await db.prepare("UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='scores'").bind(f.a.roles.teacher).run();
    const c=command('score.set',{test_id:f.test,student_id:f.s1,value:8});
    expect((await f.send([c],'teacher')).body.results[0]).toMatchObject({status:'rejected',error:{code:'forbidden'}});
    await db.prepare("UPDATE role_permissions SET level='write' WHERE role_id=? AND perm_group='scores'").bind(f.a.roles.teacher).run();
    expect((await f.send([c],'teacher')).body.results[0]).toMatchObject({status:'rejected',error:{code:'forbidden'}});
    expect((await f.send([command('score.set',c.payload)],'teacher')).body.results[0].status).toBe('applied');
    const other=await insertGuardianMembership(f.a.workspaceId,f.teacherUser,f.a.roles.guardian!,[f.s1]);
    await db.prepare('UPDATE auth_sessions SET membership_id=? WHERE user_id=?').bind(other,f.teacherUser).run();
    await db.prepare("UPDATE memberships SET status='disabled' WHERE id=?").bind(f.actors.teacher.mid).run();
    expect((await f.snap('teacher')).status).toBe(404);expect((await f.pull(0,'teacher')).status).toBe(404);
    expect((await f.send([],'teacher')).status).toBe(404);expect((await f.page('student','teacher')).status).toBe(404);
  });
  it('does not reveal command receipts across workspaces',async()=>{
    const f=await setup(),b=await registerWorkspace(fakePhone(),'Receipt isolation');
    const applied=command('attendance.set',{session_id:f.ses,student_id:f.s1,status:'present'});
    expect((await f.send([applied])).body.results[0].status).toBe('applied');
    const classId=await insertClass(b.workspaceId,'Receipt isolation',b.userId);
    const sessionId=await insertSession(b.workspaceId,classId,today(),b.userId);
    const crossWorkspace={...applied,payload:{session_id:sessionId,student_id:await insertStudent(b.workspaceId,classId,'Other student',null,b.userId),status:'present'}};
    const response=await call('/v1/sync/push',post({membership_id:b.membershipId,device_id:uid(),commands:[crossWorkspace]}),b.token);
    expect(response.body.results[0]).toMatchObject({status:'rejected',error:{code:'conflict',details:{reason:'retry'}}});
    expect(JSON.stringify(response.body)).not.toContain('command_id_used');
  });
  it('validates request shape, UUIDs, malformed cursors, snapshot entities and required password changes',async()=>{
    const f=await setup();
    expect((await call('/v1/sync/push',post({membership_id:f.a.membershipId,device_id:uid(),commands:Array.from({length:51},()=>command('slip.send',{}))}),f.a.token)).status).toBe(422);
    expect((await call('/v1/sync/push',post({membership_id:f.a.membershipId,device_id:uid(),commands:[],padding:'あ'.repeat(90000)}),f.a.token)).status).toBe(413);
    expect((await f.page('unknown')).status).toBe(404);expect((await f.page('student','admin','&after=bad')).status).toBe(422);
    expect((await call(`/v1/sync/pull?membership_id=${f.a.membershipId}&cursor=-1&epoch=1`,{},f.a.token)).status).toBe(422);
    await db.prepare('UPDATE users SET must_change_password=1 WHERE id=?').bind(f.a.userId).run();expect((await f.send([])).body.error.code).toBe('password_change_required');
  });
});
