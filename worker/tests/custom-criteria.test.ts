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
      const addedRows=await db.prepare(`SELECT id,name,text_good,text_ok,text_needs_work,default_level,homework FROM comment_criteria
        WHERE workspace_id=? ORDER BY position`).bind(addedWorkspaceId).all<any>();
      expect(addedRows.results).toEqual(DEFAULT_CRITERIA.map(x=>({id:x.id,name:x.name,text_good:x.texts.good,text_ok:x.texts.ok,
        text_needs_work:x.texts.needs_work,default_level:x.default_level,homework:Number(x.homework)})));
      expect(await db.prepare('SELECT version FROM criteria_sets WHERE workspace_id=?').bind(addedWorkspaceId).first<any>()).toEqual({version:1});
      // Run the migration's literal seed statements against a pre-existing workspace fixture.
      await db.batch([db.prepare('DELETE FROM comment_criteria WHERE workspace_id=?').bind(addedWorkspaceId),
        db.prepare('DELETE FROM criteria_sets WHERE workspace_id=?').bind(addedWorkspaceId)]);
      const setStart=migrationSql.indexOf('INSERT INTO criteria_sets');
      const setEnd=migrationSql.indexOf(';',setStart)+1;
      const criteriaStart=migrationSql.indexOf('INSERT INTO comment_criteria');
      const seedStatements=[migrationSql.slice(setStart,setEnd),migrationSql.slice(criteriaStart,migrationSql.lastIndexOf(';')+1)];
      await db.prepare(seedStatements[0]!.replace('FROM workspaces;', 'FROM workspaces WHERE id=?;')).bind(addedWorkspaceId).run();
      const criteriaSeed=seedStatements[1]!.replace(') seed;', ') seed WHERE w.id=?;');
      await db.prepare(criteriaSeed).bind(addedWorkspaceId).run();
      const migratedRows=await db.prepare(`SELECT id,name,text_good,text_ok,text_needs_work,default_level,homework,deleted_at,position FROM comment_criteria
        WHERE workspace_id=? ORDER BY position`).bind(addedWorkspaceId).all<any>();
      expect(migratedRows.results).toEqual(DEFAULT_CRITERIA.map((x,position)=>({id:x.id,name:x.name,text_good:x.texts.good,text_ok:x.texts.ok,
        text_needs_work:x.texts.needs_work,default_level:x.default_level,homework:Number(x.homework),deleted_at:null,position})));
      expect(await db.prepare('SELECT version FROM criteria_sets WHERE workspace_id=?').bind(addedWorkspaceId).first<any>()).toEqual({version:1});
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
      const offDefaults=await api(false,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.send',payload:{session_id:offSession,student_ids:[f.student],defaults:[{student_id:f.student,criteria_levels:[{id:'a',name:'A',level:'good'}],comment:'Test'}]},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(offDefaults.body.results[0].error.code).toBe('feature_disabled');
    const offSnapshot=await api(false,`/v1/sync/snapshot?membership_id=${f.admin.membershipId}`,{},f.admin.token);
    expect(offSnapshot.body).not.toHaveProperty('criteria_set_version');
    const offPull=await api(false,`/v1/sync/pull?membership_id=${f.admin.membershipId}&cursor=0&epoch=1`,{},f.admin.token);
    expect(offPull.body).not.toHaveProperty('criteria_set_version');
    expect((await api(true,'/v1/criteria-set',{},f.teacherToken)).status).toBe(200);
      expect((await api(true,'/v1/criteria-set',{},f.assistantToken)).status).toBe(200);
      expect((await api(true,'/v1/criteria-set',{},f.parentToken)).status).toBe(403);
      await db.prepare("UPDATE role_permissions SET level='none' WHERE role_id=(SELECT role_id FROM memberships WHERE id=?) AND perm_group='comments_reports'").bind(f.teacherMid).run();
      expect((await api(true,'/v1/criteria-set',{},f.teacherToken)).status).toBe(403);
      expect((await api(true,`/v1/sync/snapshot?membership_id=${f.teacherMid}`,{},f.teacherToken)).body).not.toHaveProperty('criteria_set_version');
      expect((await api(true,`/v1/sync/pull?membership_id=${f.teacherMid}&cursor=0&epoch=1`,{},f.teacherToken)).body).not.toHaveProperty('criteria_set_version');
      expect((await api(true,'/v1/criteria-set',put(bodyFor([item('Assistant')])) ,f.assistantToken)).status).toBe(403);
      await db.prepare("UPDATE role_permissions SET level='read' WHERE role_id=(SELECT role_id FROM memberships WHERE id=?) AND perm_group='comments_reports'").bind(f.teacherMid).run();
      const isolated=await registerWorkspace(fakePhone(),'Isolated criteria');
      expect((await api(true,'/v1/criteria-set',{},isolated.token)).body.criteria[0].name).toBe(DEFAULT_CRITERIA[0]!.name);
      await api(true,'/v1/criteria-set',put(bodyFor([item('Private criterion')])),f.admin.token);
      expect((await api(true,'/v1/criteria-set',{},isolated.token)).body.criteria[0].name).toBe(DEFAULT_CRITERIA[0]!.name);
    const snapshot=await api(true,`/v1/sync/snapshot?membership_id=${f.admin.membershipId}`,{},f.admin.token);
    expect(snapshot.body.criteria_set_version).toBe(2);
      const pull=await api(true,`/v1/sync/pull?membership_id=${f.admin.membershipId}&cursor=0&epoch=1`,{},f.admin.token);
      expect(pull.body.criteria_set_version).toBe(2);
      expect((await api(true,`/v1/sync/snapshot?membership_id=${f.teacherMid}`,{},f.teacherToken)).body.criteria_set_version).toBe(2);
      expect((await api(true,`/v1/sync/snapshot?membership_id=${f.assistantMid}`,{},f.assistantToken)).body.criteria_set_version).toBe(2);
      expect((await api(true,`/v1/sync/pull?membership_id=${f.teacherMid}&cursor=0&epoch=1`,{},f.teacherToken)).body.criteria_set_version).toBe(2);
      expect((await api(true,`/v1/sync/pull?membership_id=${f.assistantMid}&cursor=0&epoch=1`,{},f.assistantToken)).body.criteria_set_version).toBe(2);
      const guardian=await api(true,`/v1/sync/snapshot?membership_id=${f.parentMid}`,{},f.parentToken);
      expect(guardian.body).not.toHaveProperty('criteria_set_version');
      expect((await api(true,`/v1/sync/pull?membership_id=${f.parentMid}&cursor=0&epoch=1`,{},f.parentToken)).body).not.toHaveProperty('criteria_set_version');
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
      expect(response.body.version).toBe(3);expect(response.body.criteria.map((x:any)=>x.name)).toEqual(reordered.map(x=>x.name));
    const oldId=ids[2];
    expect((await db.prepare('SELECT deleted_at FROM comment_criteria WHERE workspace_id=? AND id=?').bind(f.admin.workspaceId,oldId).first<any>()).deleted_at).toBeNull();
    await api(true,'/v1/criteria-set',put(bodyFor([item('One')],3)),f.admin.token);
    expect((await db.prepare('SELECT deleted_at FROM comment_criteria WHERE workspace_id=? AND id=?').bind(f.admin.workspaceId,oldId).first<any>()).deleted_at).not.toBeNull();
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('Stale')],1)),f.admin.token)).body.error.details.reason).toBe('version_conflict');
    for(const count of [0,9]) expect((await api(true,'/v1/criteria-set',put(bodyFor(Array.from({length:count},(_,i)=>item(`Tên ${i}`)),4)),f.admin.token)).status).toBe(422);
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('Tên mới',oldId)],4)),f.admin.token)).body.error.details.reason).toBe('unknown_criterion');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('a'.repeat(41))],4)),f.admin.token)).body.error.details.reason).toBe('name_length');
      expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('Tên có dấu'),name:'ê'.repeat(40),texts:{good:'Đ'.repeat(200),ok:'Đạt',needs_work:'Cố gắng'}}],4)),f.admin.token)).status).toBe(200);
    response=await get();
    expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('Tên có dấu'),name:'ê'.repeat(41)}],response.body.version)),f.admin.token)).body.error.details.reason).toBe('name_length');
    response=await get();
    expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('Tên có dấu'),texts:{good:'T'.repeat(201),ok:'Đạt',needs_work:'Cố gắng'}}],response.body.version)),f.admin.token)).body.error.details.reason).toBe('text_length');
    response=await get();
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('Trùng'),item('trùng')],response.body.version)),f.admin.token)).body.error.details.reason).toBe('name_duplicate');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('A'),homework:true},{...item('B'),homework:true}],response.body.version)),f.admin.token)).body.error.details.reason).toBe('homework_multiple');
    expect((await api(true,'/v1/criteria-set',put(bodyFor([item('x','deleted-id')],response.body.version)),f.admin.token)).body.error.details.reason).toBe('unknown_criterion');
      expect((await api(true,'/v1/criteria-set',put(bodyFor([item('x','focus'),item('y','focus')],response.body.version)),f.admin.token)).body.error.details.reason).toBe('id_duplicate');
      expect((await api(true,'/v1/criteria-set',put({criteria:[item('Missing base')]}),f.admin.token)).body.error.details.reason).toBe('base_version');
      expect((await api(true,'/v1/criteria-set',put({base_version:'4',criteria:[item('Wrong base type')]}),f.admin.token)).body.error.details.reason).toBe('base_version');
      expect((await api(true,'/v1/criteria-set',put(bodyFor([item('   ')],response.body.version)),f.admin.token)).body.error.details.reason).toBe('name_length');
      expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('Invalid default'),default_level:'great'}],response.body.version)),f.admin.token)).body.error.details.reason).toBe('default_level');
      const normalized=await api(true,'/v1/criteria-set',put(bodyFor([{...item(' Cafe\u0301 '),texts:{good:' e\u0301 ',ok:'😀',needs_work:'ổn'}}],response.body.version)),f.admin.token);
      expect(normalized.body.criteria[0]).toMatchObject({name:'Café',texts:{good:'é',ok:'😀',needs_work:'ổn'}});
      expect((await api(true,'/v1/criteria-set',put(bodyFor([{...item('Emoji'),texts:{good:'😀'.repeat(200)+'😀',ok:'Đạt',needs_work:'Ổn'}}],normalized.body.version)),f.admin.token)).body.error.details.reason).toBe('text_length');
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

  it('guards every row mutation with the winning request CAS marker',async()=>{
    const f=await setup();
    const winnerCandidate=[item('A focus','focus'),item('A new'),item('A notes','notes')];
    const loserCandidate=[item('B new'),item('B focus','focus')];
    const requests=[winnerCandidate,loserCandidate].map(criteria=>api(true,'/v1/criteria-set',put(bodyFor(criteria,1)),f.admin.token));
    const results=await Promise.all(requests);
    expect(results.map(x=>x.status).sort()).toEqual([200,409]);
    const won=results.find(x=>x.status===200)!,lost=results.find(x=>x.status===409)!;
    expect(lost.body.error.details.reason).toBe('version_conflict');
    const current=(await api(true,'/v1/criteria-set',{},f.admin.token)).body;
    expect(current).toEqual(won.body);
    const all=await db.prepare('SELECT id,position,name,deleted_at FROM comment_criteria WHERE workspace_id=? ORDER BY id').bind(f.admin.workspaceId).all<any>();
    expect(all.results.filter((x:any)=>x.deleted_at===null).map((x:any)=>[x.id,x.position,x.name]).sort((a:any,b:any)=>a[1]-b[1]))
      .toEqual(won.body.criteria.map((x:any,index:number)=>[x.id,index,x.name]));
    const wonIds=new Set(won.body.criteria.map((x:any)=>x.id));
    expect(all.results.filter((x:any)=>x.id.startsWith('c_')&&!wonIds.has(x.id))).toHaveLength(0);
    for(const row of all.results.filter((x:any)=>!wonIds.has(x.id))) expect(row.deleted_at).not.toBeNull();
    expect((await db.prepare('SELECT version FROM criteria_sets WHERE workspace_id=?').bind(f.admin.workspaceId).first<any>()).version).toBe(2);
  });

  it('returns one coherent GET revision when a PUT overlaps it',async()=>{
    const f=await setup();
    const [read,written]=await Promise.all([
      api(true,'/v1/criteria-set',{},f.admin.token),
      api(true,'/v1/criteria-set',put(bodyFor([item('New coherent revision','focus')],1)),f.admin.token),
    ]);
    expect(written.status).toBe(200);
    expect([[1,DEFAULT_CRITERIA[0]!.name],[2,'New coherent revision']]).toContainEqual([read.body.version,read.body.criteria[0].name]);
  });

  it('writes custom criterion snapshots for N=1,3,6,8, reads them safely and builds monthly previews',async()=>{
    const f=await setup();
      const levels=[1,3,6,8].map((n,index)=>Array.from({length:n},(_,i)=>({id:`crit-${n}-${i}`,name:`Tiêu chí ${i+1}`,level:i<[1,0,3,8][index]! ? 'good':'ok',
        text:`Mức kiểm thử ${i+1}`,...(i===n-1?{homework:true}:{})})));
    const sessions:string[]=[];
    for(const [index,criteria_levels] of levels.entries()) {
      const session=await insertSession(f.admin.workspaceId,f.cls,`2026-10-${String(index+10).padStart(2,'0')}`,f.admin.userId);
      sessions.push(session);await insertAttendance(f.admin.workspaceId,f.cls,session,f.student,'present',f.admin.userId);
        const submitted=criteria_levels.map((x,i)=>i===criteria_levels.length-1?{...x,extra:'discard me'}:x);
        const writeId=uid(),writeCommand={id:writeId,type:'slip.set',payload:{session_id:session,student_id:f.student,criteria_levels:submitted,criteria:0,stars:0,comment:'Câu tùy chỉnh.',note:'Ghi chú.'},base_version:0,created_at:new Date().toISOString()};
      const push=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        writeCommand,
      ]}),f.admin.token);
      expect(push.body.results[0].status).toBe('applied');
      const retry=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[writeCommand]}),f.admin.token);
      expect(retry.body.results[0]).toMatchObject({status:'duplicate',original_status:'applied'});
      const raw=await db.prepare('SELECT stars,scale,criteria,criteria_levels FROM session_comments WHERE session_id=? AND student_id=?').bind(session,f.student).first<any>();
      const goodCount=[1,0,3,8][index]!,stars=Math.floor(goodCount/criteria_levels.length*5+0.5);
      expect(raw).toMatchObject({stars,scale:5,criteria:(1<<stars)-1});
      const stored=JSON.parse(raw.criteria_levels);
      expect(stored).not.toHaveProperty('extra');
      expect(stored).toHaveLength(criteria_levels.length);
      expect((await db.prepare('SELECT levels,skill_levels FROM session_comments WHERE session_id=? AND student_id=?').bind(session,f.student).first<any>()))
        .toEqual({levels:null,skill_levels:null});
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
      const teacherSnapshot=await api(true,`/v1/sync/snapshot/slip?membership_id=${f.admin.membershipId}&limit=300`,{},f.admin.token);
      expect(teacherSnapshot.body.items.find((x:any)=>x.session_id===sessions[0]).criteria_levels).toEqual(levels[0]);
      const guardianSnapshot=await api(true,`/v1/sync/snapshot/slip?membership_id=${f.parentMid}&limit=300`,{},f.parentToken);
      expect(guardianSnapshot.body.items.find((x:any)=>x.session_id===sessions[0]).criteria_levels).toEqual(levels[0]);
      const pull=await api(true,`/v1/sync/pull?membership_id=${f.admin.membershipId}&cursor=0&epoch=1&limit=300`,{},f.admin.token);
      expect(pull.body.upserts.slip.find((x:any)=>x.session_id===sessions[0]).criteria_levels).toEqual(levels[0]);
      const guardianPull=await api(true,`/v1/sync/pull?membership_id=${f.parentMid}&cursor=0&epoch=1&limit=300`,{},f.parentToken);
      expect(guardianPull.body.upserts.slip.find((x:any)=>x.session_id===sessions[0]).criteria_levels).toEqual(levels[0]);
      const smallPage=await api(true,`/v1/sync/pull?membership_id=${f.admin.membershipId}&cursor=0&epoch=1&limit=1`,{},f.admin.token);
      expect(smallPage.body.criteria_set_version).toBe(1);
      expect(smallPage.body.has_more).toBe(true);
      let nextCursor=smallPage.body.cursor,more=smallPage.body.has_more,pageCount=1;
      while(more&&pageCount<100) {
        const page=await api(true,`/v1/sync/pull?membership_id=${f.admin.membershipId}&cursor=${nextCursor}&epoch=1&limit=1`,{},f.admin.token);
        expect(page.body.criteria_set_version).toBe(1);
        nextCursor=page.body.cursor;more=page.body.has_more;pageCount++;
      }
      expect(more).toBe(false);
      expect(pageCount).toBeGreaterThan(1);

    const noteOnly=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
      {id:uid(),type:'slip.set',payload:{session_id:sessions[0],student_id:f.student,note:'Sửa ghi chú.'},base_version:1,created_at:new Date().toISOString()},
    ]}),f.admin.token);
      expect(noteOnly.body.results[0].status).toBe('applied');
      expect((await db.prepare('SELECT criteria_levels FROM session_comments WHERE session_id=?').bind(sessions[0]).first<any>()).criteria_levels).toBe(JSON.stringify(levels[0]));
      const commentOnly=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.set',payload:{session_id:sessions[0],student_id:f.student,comment:'Chỉ sửa lời nhận xét.'},base_version:1,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(commentOnly.body.results[0].status).toBe('applied');
      const homeworkOnly=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.set',payload:{session_id:sessions[0],student_id:f.student,hw_manual:true},base_version:1,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(homeworkOnly.body.results[0].status).toBe('applied');
      expect((await db.prepare('SELECT criteria_levels FROM session_comments WHERE session_id=?').bind(sessions[0]).first<any>()).criteria_levels).toBe(JSON.stringify(levels[0]));
      for(const overwriteField of [{criteria:31},{stars:5},{levels:{focus:'good',participation:'good',mastery:'good',notes:'good',homework:'good'}}]) {
        const overwrite=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
          {id:uid(),type:'slip.set',payload:{session_id:sessions[0],student_id:f.student,...overwriteField,comment:'Cũ'},base_version:2,created_at:new Date().toISOString()},
        ]}),f.admin.token);
        expect(overwrite.body.results[0].error.details.reason).toBe('criteria_set_slip');
      }
      const sentSnapshot=(await db.prepare('SELECT criteria_levels FROM session_comments WHERE session_id=?').bind(sessions[0]).first<any>()).criteria_levels;
      const beforeEdit=(await api(true,'/v1/criteria-set',{},f.admin.token)).body;
      await api(true,'/v1/criteria-set',put(bodyFor([item('Changed and deleted custom set')],beforeEdit.version)),f.admin.token);
      expect((await db.prepare('SELECT criteria_levels FROM session_comments WHERE session_id=?').bind(sessions[0]).first<any>()).criteria_levels).toBe(sentSnapshot);

      const prototypeSession=await insertSession(f.admin.workspaceId,f.cls,'2026-10-31',f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,prototypeSession,f.student,'present',f.admin.userId);
      const prototype=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.set',payload:{session_id:prototypeSession,student_id:f.student,levels:{focus:'good',participation:'ok',mastery:'ok',notes:'good',homework:'good'},skill_levels:{grammar:'ok'},comment:'Prototype'},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(prototype.body.results[0].status).toBe('applied');
      const converted=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.set',payload:{session_id:prototypeSession,student_id:f.student,criteria_levels:[{id:'converted',name:'Converted',level:'good'}],comment:'Custom'},base_version:1,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(converted.body.results[0].status).toBe('applied');
      expect(await db.prepare('SELECT levels,skill_levels FROM session_comments WHERE session_id=?').bind(prototypeSession).first<any>()).toEqual({levels:null,skill_levels:null});

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
        {id:uid(),type:'slip.send',payload:{session_id:session,student_ids:[f.student],defaults:[{student_id:f.student,criteria_levels,criteria:0,levels:{focus:'bad'},skill_levels:{},comment:'Câu mặc định.'}]},base_version:0,created_at:new Date().toISOString()},
    ]}),f.admin.token);
    expect(sent.body.results[0].sent).toEqual([f.student]);
      expect((await db.prepare('SELECT criteria_levels,stars,criteria,scale FROM session_comments WHERE session_id=?').bind(session).first<any>()))
        .toMatchObject({criteria_levels:JSON.stringify(criteria_levels),stars:5,criteria:31,scale:5});
      const extraStudent=await insertStudent(f.admin.workspaceId,f.cls,'Second student',null,f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,session,extraStudent,'present',f.admin.userId);
      const existingDraft=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.set',payload:{session_id:session,student_id:extraStudent,criteria_levels:[{id:'saved',name:'Saved',level:'ok'}],comment:'Existing draft'},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(existingDraft.body.results[0].status).toBe('applied');
      const absentStudent=await insertStudent(f.admin.workspaceId,f.cls,'Absent student',null,f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,session,absentStudent,'absent',f.admin.userId);
      const sendExisting=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.send',payload:{session_id:session,student_ids:[f.student,extraStudent,absentStudent],defaults:[
          {student_id:f.student,criteria_levels:[{id:'new',name:'New',level:'good'}],comment:'Must skip existing sent'},
          {student_id:extraStudent,criteria_levels:[{id:'replacement',name:'Replacement',level:'good'}],comment:'Must preserve draft'},
        ]},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(sendExisting.body.results[0].sent).toContain(extraStudent);
      expect(sendExisting.body.results[0].skipped).toContainEqual({student_id:absentStudent,reason:'absent'});
      expect((await db.prepare('SELECT criteria_levels,comment FROM session_comments WHERE session_id=? AND student_id=?').bind(session,extraStudent).first<any>()))
        .toEqual({criteria_levels:'[{"id":"saved","name":"Saved","level":"ok"}]',comment:'Existing draft'});
      const noCommentSession=await insertSession(f.admin.workspaceId,f.cls,'2026-10-29',f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,noCommentSession,f.student,'present',f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,noCommentSession,extraStudent,'present',f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,noCommentSession,absentStudent,'absent',f.admin.userId);
      const noComment=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.send',payload:{session_id:noCommentSession,student_ids:[f.student],defaults:[{student_id:f.student,criteria_levels}]},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(noComment.body.results[0].error).toMatchObject({code:'validation_error',details:{reason:'comment_required'}});
      const incomplete=await insertSession(f.admin.workspaceId,f.cls,'2026-10-30',f.admin.userId);
      const incompleteWrite=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.set',payload:{session_id:incomplete,student_id:f.student,criteria_levels,comment:'Custom'},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(incompleteWrite.body.results[0].error.code).toBe('attendance_incomplete');
    const malformed:any[]=[null,[],[{id:'a',name:'A',level:'great'}],[{id:'a',name:'A',level:'good'},{id:'a',name:'B',level:'ok'}],
      Array.from({length:9},(_,i)=>({id:String(i),name:'x',level:'good'}))];
    for(const criteria_levels of malformed) {
        const other=await insertSession(f.admin.workspaceId,f.cls,`2026-10-${String(21+malformed.indexOf(criteria_levels)).padStart(2,'0')}`,f.admin.userId);
        await insertAttendance(f.admin.workspaceId,f.cls,other,f.student,'present',f.admin.userId);
        await insertAttendance(f.admin.workspaceId,f.cls,other,extraStudent,'present',f.admin.userId);
        await insertAttendance(f.admin.workspaceId,f.cls,other,absentStudent,'absent',f.admin.userId);
      const rejected=await api(true,'/v1/sync/push',post({membership_id:f.admin.membershipId,device_id:uid(),commands:[
        {id:uid(),type:'slip.set',payload:{session_id:other,student_id:f.student,criteria_levels,comment:'bad'},base_version:0,created_at:new Date().toISOString()},
      ]}),f.admin.token);
      expect(rejected.body.results[0]).toMatchObject({status:'rejected',error:{details:{reason:'invalid_criteria_levels'}}});
    }
      const mixed=await insertSession(f.admin.workspaceId,f.cls,'2026-10-27',f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,mixed,f.student,'present',f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,mixed,extraStudent,'present',f.admin.userId);
      await insertAttendance(f.admin.workspaceId,f.cls,mixed,absentStudent,'absent',f.admin.userId);
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
