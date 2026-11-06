import { beforeEach, describe, expect, it } from 'vitest';
import migrationSql from '../migrations/0017_custom_criteria.sql?raw';
import { DEFAULT_CRITERIA } from '../src/db/criteria-set';
import type { Env } from '../src/types';
import app from '../src/index';
import { call, db, fakePhone, insertAttendance, insertClass, insertGuardianMembership, insertMembership, insertSession, insertStudent, insertUser, post, put, registerWorkspace, testEnv } from './helpers';

beforeEach(async () => { await db.prepare('DELETE FROM auth_throttle').run(); });
const uid=()=>crypto.randomUUID();
async function setup() {
  const admin=await registerWorkspace(fakePhone(),'Custom criteria');
  const cls=await insertClass(admin.workspaceId,'C1',admin.userId);
  const student=await insertStudent(admin.workspaceId,cls,'Student fake',null,admin.userId);
  await db.prepare("UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'").bind(admin.roles.assistant).run();
  const teacherUser=await insertUser(fakePhone()), teacherMid=await insertMembership(admin.workspaceId,teacherUser,admin.roles.teacher!,[cls]);
  const assistantUser=await insertUser(fakePhone()), assistantMid=await insertMembership(admin.workspaceId,assistantUser,admin.roles.assistant!,[cls]);
  const parentUser=await insertUser(fakePhone()), parentMid=await insertGuardianMembership(admin.workspaceId,parentUser,admin.roles.guardian!,[student]);
  const teacherToken=(await call('/v1/auth/login',post({phone:(await db.prepare('SELECT phone FROM users WHERE id=?').bind(teacherUser).first<any>()).phone,password:'example-Pass-123'}))).body.token;
  const assistantToken=(await call('/v1/auth/login',post({phone:(await db.prepare('SELECT phone FROM users WHERE id=?').bind(assistantUser).first<any>()).phone,password:'example-Pass-123'}))).body.token;
  const parentToken=(await call('/v1/auth/login',post({phone:(await db.prepare('SELECT phone FROM users WHERE id=?').bind(parentUser).first<any>()).phone,password:'example-Pass-123'}))).body.token;
  return {admin,cls,student,teacherToken,assistantToken,parentToken,teacherMid,assistantMid,parentMid};
}
const flagged=(on:boolean):Env=>new Proxy(testEnv,{get:(target,key)=>key==='CRITERIA_LEVELS'?(on?'1':undefined):Reflect.get(target,key)});
async function api(on:boolean,path:string,init:RequestInit={},token?:string) {
  const headers=new Headers(init.headers);if(token)headers.set('authorization',`Bearer ${token}`);
  if(init.body!==undefined&&!headers.has('content-type'))headers.set('content-type','application/json');
  const res=await app.request(`https://api.test${path}`,{...init,headers},flagged(on));
  const text=await res.text();return {status:res.status,body:text?JSON.parse(text):null};
}
const bodyFor=(criteria:any[],base_version=1)=>({base_version,criteria});
const item=(name:string,id?:string)=>({...(id?{id}:{}),name,texts:{good:'Tốt cho câu kiểm thử.',ok:'Đạt cho câu kiểm thử.',needs_work:'Cần cố gắng cho câu kiểm thử.'},default_level:'good',homework:false});

describe('workspace custom criteria experiment',()=>{
  it('seeds exact default criteria and keeps migration literals aligned with the shared code seed',async()=>{
    const f=await setup();
    const rows=await db.prepare(`SELECT id,name,text_good,text_ok,text_needs_work,default_level,homework FROM comment_criteria WHERE workspace_id=? ORDER BY position`)
      .bind(f.admin.workspaceId).all<any>();
    expect(rows.results).toEqual(DEFAULT_CRITERIA.map(x=>({id:x.id,name:x.name,text_good:x.texts.good,text_ok:x.texts.ok,
      text_needs_work:x.texts.needs_work,default_level:x.default_level,homework:Number(x.homework)})));
    const added=await call('/v1/workspaces',post({workspace_name:'Workspace mới'}),f.admin.token);
    expect(added.status).toBe(201);
    const addedWorkspaceId=added.body.membership.workspace.id;
    expect((await db.prepare('SELECT count(*) count FROM comment_criteria WHERE workspace_id=?').bind(addedWorkspaceId).first<any>()).count).toBe(5);
    for(const x of DEFAULT_CRITERIA) for(const value of [x.id,x.name,x.texts.good,x.texts.ok,x.texts.needs_work])
      expect(migrationSql).toContain(`'${value.replaceAll("'","''")}'`);
  });

  it('gates writes, reads criteria by permission, and returns metadata to staff only when enabled',async()=>{
    const f=await setup();
    expect((await api(false,'/v1/criteria-set',{},f.admin.token)).status).toBe(200);
    expect((await api(false,'/v1/criteria-set',put(bodyFor([item('Disabled')])) ,f.admin.token)).body.error.details.reason).toBe('feature_disabled');
    const offSession=await insertSession(f.admin.workspaceId,f.cls,'2026-10-09',f.admin.userId);
    await insertAttendance(f.admin.workspaceId,f.cls,offSession,f.student,'present',f.admin.userId);
    const offWrite=await api(false,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
      {id:uid(),type:'slip.set',payload:{session_id:offSession,student_id:f.student,criteria_levels:[{id:'a',name:'A',level:'good'}],comment:'Test'},base_version:0,created_at:new Date().toISOString()},
    ]}),f.admin.token);
    expect(offWrite.body.results[0].error.code).toBe('feature_disabled');
    const offSnapshot=await api(false,`/v1/sync/snapshot?membership_id=${f.admin.membershipId}`,{},f.admin.token);
    expect(offSnapshot.body).not.toHaveProperty('criteria_set_version');
    const offPull=await api(false,`/v1/sync/pull?membership_id=${f.admin.membershipId}&cursor=0&epoch=1`,{},f.admin.token);
    expect(offPull.body).not.toHaveProperty('criteria_set_version');
    expect((await api(true,'/v1/criteria-set',{},f.teacherToken)).status).toBe(200);
    expect((await api(true,'/v1/criteria-set',{},f.assistantToken)).status).toBe(200);
    expect((await api(true,'/v1/criteria-set',{},f.parentToken)).status).toBe(403);
    const snapshot=await api(true,`/v1/sync/snapshot?membership_id=${f.admin.membershipId}`,{},f.admin.token);
    expect(snapshot.body.criteria_set_version).toBe(1);
    const pull=await api(true,`/v1/sync/pull?membership_id=${f.admin.membershipId}&cursor=0&epoch=1`,{},f.admin.token);
    expect(pull.body.criteria_set_version).toBe(1);
    const guardian=await api(true,`/v1/sync/snapshot?membership_id=${f.parentMid}`,{},f.parentToken);
    expect(guardian.body).not.toHaveProperty('criteria_set_version');
  });

  it('replaces whole set with create, update, reorder and soft delete; checks validation and CAS',async()=>{
    const f=await setup();
    const get=()=>api(true,'/v1/criteria-set',{},f.admin.token);
    let response=await get();
    const six=[item('Độ tập trung','focus'),item('Tích cực tham gia','participation'),item('Ghi chép bài'),item('Phản xạ nói Tiếng Anh'),item('Nhớ từ và cấu trúc câu'),{...item('Làm bài tập về nhà','homework'),homework:true}];
    response=await api(true,'/v1/criteria-set',put(bodyFor(six)),f.admin.token);
    expect(response.status).toBe(200);expect(response.body.version).toBe(2);expect(response.body.criteria).toHaveLength(6);
    expect(response.body.criteria[0].id).toBe('focus');
    const ids=response.body.criteria.map((x:any)=>x.id);
    const reordered=[{...item('Học tập trung mới','focus')},...response.body.criteria.slice(1).reverse()];
    response=await api(true,'/v1/criteria-set',put(bodyFor(reordered,2)),f.admin.token);
    expect(response.body.version).toBe(3);expect(response.body.criteria[0].name).toBe('Học tập trung mới');
    const oldId=ids[2];
    expect((await db.prepare('SELECT deleted_at FROM comment_criteria WHERE workspace_id=? AND id=?').bind(f.admin.workspaceId,oldId).first<any>()).deleted_at).toBeNull();
    await api(true,'/v1/criteria-set',put(bodyFor([item('One')],3)),f.admin.token);
    expect((await db.prepare('SELECT deleted_at FROM comment_criteria WHERE workspace_id=? AND id=?').bind(f.admin.workspaceId,oldId).first<any>()).deleted_at).not.toBeNull();
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('Stale')],1)),f.admin.token)).body.error.details.reason).toBe('version_conflict');
    for(const count of [0,9]) expect((await api(true,'/v1/criteria-set',put(bodyFor(Array.from({length:count},(_,i)=>item(`Tên ${i}`)),4)),f.admin.token)).status).toBe(422);
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('Tên mới',oldId)],4)),f.admin.token)).body.error.details.reason).toBe('unknown_criterion');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('a'.repeat(41))],4)),f.admin.token)).body.error.details.reason).toBe('name_length');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('Tên có dấu'),name:'ê'.repeat(40),texts:{good:'T'.repeat(200),ok:'Đạt',needs_work:'Cố gắng'}}],4)),f.admin.token)).status).toBe(200);
    response=await get();
    expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('Tên có dấu'),name:'ê'.repeat(41)}],response.body.version)),f.admin.token)).body.error.details.reason).toBe('name_length');
    response=await get();
    expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('Tên có dấu'),texts:{good:'T'.repeat(201),ok:'Đạt',needs_work:'Cố gắng'}}],response.body.version)),f.admin.token)).body.error.details.reason).toBe('text_length');
    response=await get();
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('Trùng'),item('trùng')],response.body.version)),f.admin.token)).body.error.details.reason).toBe('name_duplicate');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('A'),homework:true},{...item('B'),homework:true}],response.body.version)),f.admin.token)).body.error.details.reason).toBe('homework_multiple');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('x','deleted-id')],response.body.version)),f.admin.token)).body.error.details.reason).toBe('unknown_criterion');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('x','focus'),item('y','focus')],response.body.version)),f.admin.token)).body.error.details.reason).toBe('id_duplicate');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('x','focus')]),),f.teacherToken)).body.error.details.reason).toBe('admin_required');
  });

  it('accepts the one and eight criterion boundaries and generates stable ids for new criteria',async()=>{
    const f=await setup();
    const eight=Array.from({length:8},(_,i)=>item(`Tiêu chí ${i+1}`));
    let response=await api(true,'/v1/criteria-set',put(bodyFor(eight)),f.admin.token);
    expect(response.status).toBe(200);expect(response.body.criteria).toHaveLength(8);
    expect(response.body.criteria.every((x:any)=>/^c_[0-9a-f-]{36}$/.test(x.id))).toBe(true);
    response=await api(true,'/v1/criteria-set',put(bodyFor([item('Một tiêu chí',response.body.criteria[0].id)],response.body.version)),f.admin.token);
    expect(response.status).toBe(200);expect(response.body.criteria).toHaveLength(1);expect(response.body.version).toBe(3);
  });

  it('uses compare-and-swap so simultaneous updates with one base version cannot overwrite each other',async()=>{
    const f=await setup();
    const requests=['Cập nhật A','Cập nhật B'].map(name=>api(true,'/v1/criteria-set',put(bodyFor([item(name,'focus')],1)),f.admin.token));
    const results=await Promise.all(requests);
    expect(results.map(x=>x.status).sort()).toEqual([200,409]);
    expect((await api(true,'/v1/criteria-set',{},f.admin.token)).body.version).toBe(2);
  });

  it('writes custom criterion snapshots for N=1,3,6,8, reads them safely and builds monthly previews',async()=>{
    const f=await setup();
    const levels=[1,3,6,8].map(n=>Array.from({length:n},(_,i)=>({id:`crit-${n}-${i}`,name:`Tiêu chí ${i+1}`,level:i===0?'good':'ok',
      text:`Mức kiểm thử ${i+1}`,...(i===n-1?{homework:true}:{})})));
    const sessions:string[]=[];
    for(const [index,criteria_levels] of levels.entries()) {
      const session=await insertSession(f.admin.workspaceId,f.cls,`2026-10-${String(index+10).padStart(2,'0')}`,f.admin.userId);
      sessions.push(session);await insertAttendance(f.admin.workspaceId,f.cls,session,f.student,'present',f.admin.userId);
      const writeId=uid(),writeCommand={id:writeId,type:'slip.set',payload:{session_id:session,student_id:f.student,criteria_levels,comment:'Câu tùy chỉnh.',note:'Ghi chú.'},base_version:0,created_at:new Date().toISOString()};
      const push=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        writeCommand,
      ]}),f.admin.token);
      expect(push.body.results[0].status).toBe('applied');
      const retry=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[writeCommand]}),f.admin.token);
      expect(retry.body.results[0]).toMatchObject({status:'duplicate',original_status:'applied'});
      const raw=await db.prepare('SELECT stars,scale,criteria,criteria_levels FROM session_comments WHERE session_id=? AND student_id=?').bind(session,f.student).first<any>();
      const goodCount=1,stars=Math.floor(goodCount/criteria_levels.length*5+0.5);
      expect(raw).toMatchObject({stars,scale:5,criteria:(1<<stars)-1,criteria_levels:JSON.stringify(criteria_levels)});
      const sent=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.send',payload:{session_id:session,student_ids:[f.student]},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(sent.body.results[0].sent).toEqual([f.student]);
    }
    const teacherRead=await api(true,`/v1/sessions/${sessions[0]}/slips`,{},f.teacherToken);
    expect(teacherRead.body.items[0].criteria_levels).toEqual(levels[0]);
    const guardianRead=await api(true,`/v1/sessions/${sessions[0]}/slips`,{},f.parentToken);
    expect(guardianRead.body.items[0].criteria_levels).toEqual(levels[0]);
    expect(guardianRead.body.items[0]).not.toHaveProperty('criteria');
    expect(guardianRead.body.items[0].comment).toBe('Câu tùy chỉnh.\nGhi chú.');

    const noteOnly=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
      {id:uid(),type:'slip.set',payload:{session_id:sessions[0],student_id:f.student,note:'Sửa ghi chú.'},base_version:1,created_at:new Date().toISOString()},
    ]}),f.admin.token);
    expect(noteOnly.body.results[0].status).toBe('applied');
    expect((await db.prepare('SELECT criteria_levels FROM session_comments WHERE session_id=?').bind(sessions[0]).first<any>()).criteria_levels).toBe(JSON.stringify(levels[0]));
    const overwrite=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
      {id:uid(),type:'slip.set',payload:{session_id:sessions[0],student_id:f.student,criteria:31,comment:'Cũ'},base_version:2,created_at:new Date().toISOString()},
    ]}),f.admin.token);
    expect(overwrite.body.results[0].error.details.reason).toBe('criteria_set_slip');

    const preview=await api(true,`/v1/students/${f.student}/report-preview?month=2026-10`,{},f.admin.token);
    expect(preview.status).toBe(200);expect(preview.body.stars5).toBeDefined();
    expect(Object.values(preview.body.stars5).reduce((sum:number,value:any)=>sum+value,0)).toBe(4);
    expect(preview.body).not.toHaveProperty('criteria_summary');
  });

  it('accepts criteria_levels in defaults and treats malformed custom snapshots as final rejects',async()=>{
    const f=await setup();
    const session=await insertSession(f.admin.workspaceId,f.cls,'2026-10-20',f.admin.userId);
    await insertAttendance(f.admin.workspaceId,f.cls,session,f.student,'present',f.admin.userId);
    const criteria_levels=[{id:'a',name:'Một',level:'good'}];
    const sent=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
      {id:uid(),type:'slip.send',payload:{session_id:session,student_ids:[f.student],defaults:[{student_id:f.student,criteria_levels,comment:'Câu mặc định.'}]},base_version:0,created_at:new Date().toISOString()},
    ]}),f.admin.token);
    expect(sent.body.results[0].sent).toEqual([f.student]);
    expect((await db.prepare('SELECT criteria_levels,stars,criteria,scale FROM session_comments WHERE session_id=?').bind(session).first<any>()))
      .toMatchObject({criteria_levels:JSON.stringify(criteria_levels),stars:5,criteria:31,scale:5});
    const malformed:any[]=[null,[],[{id:'a',name:'A',level:'great'}],[{id:'a',name:'A',level:'good'},{id:'a',name:'B',level:'ok'}],
      Array.from({length:9},(_,i)=>({id:String(i),name:'x',level:'good'}))];
    for(const criteria_levels of malformed) {
      const other=await insertSession(f.admin.workspaceId,f.cls,`2026-10-${String(21+malformed.indexOf(criteria_levels)).padStart(2,'0')}`,f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,other,f.student,'present',f.admin.userId);
      const rejected=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.set',payload:{session_id:other,student_id:f.student,criteria_levels,comment:'bad'},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(rejected.body.results[0]).toMatchObject({status:'rejected',error:{details:{reason:'invalid_criteria_levels'}}});
    }
    const mixed=await insertSession(f.admin.workspaceId,f.cls,'2026-10-27',f.admin.userId);
    await insertAttendance(f.admin.workspaceId,f.cls,mixed,f.student,'present',f.admin.userId);
    const mixedResult=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
      {id:uid(),type:'slip.set',payload:{session_id:mixed,student_id:f.student,criteria_levels:[{id:'mix',name:'Mục',level:'good'}],levels:{focus:'good'},comment:'Câu.'},base_version:0,created_at:new Date().toISOString()},
    ]}),f.admin.token);
    expect(mixedResult.body.results[0].error.details.reason).toBe('invalid_criteria_levels');
  });

  it('rejects custom-set writes on already sent legacy scale-three slips',async()=>{
    const f=await setup();const session=await insertSession(f.admin.workspaceId,f.cls,'2026-10-28',f.admin.userId);
    await insertAttendance(f.admin.workspaceId,f.cls,session,f.student,'present',f.admin.userId);
    await db.prepare(`INSERT INTO session_comments(workspace_id,class_id,session_id,student_id,stars,scale,criteria,comment,note,status,sent_at,version,created_at,updated_at)
      VALUES(?,?,?,?,2,3,NULL,NULL,'','sent','2026-01-01',1,'2026-01-01','2026-01-01')`).bind(f.admin.workspaceId,f.cls,session,f.student).run();
    const result=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
      {id:uid(),type:'slip.set',payload:{session_id:session,student_id:f.student,criteria_levels:[{id:'a',name:'A',level:'good'}],comment:'Câu.'},base_version:1,created_at:new Date().toISOString()},
    ]}),f.admin.token);
    expect(result.body.results[0].error.details.reason).toBe('legacy_scale');
  });
});
