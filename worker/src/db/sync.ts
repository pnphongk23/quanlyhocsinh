import type { Identity, Permissions, PermGroup } from '../types';
import { ApiError, notFound, validationError, conflict, forbidden, errorBody, passwordChangeRequired } from '../lib/errors';
import { assertStaffWrite, requireAccess, mapTriggerError } from './authz';
import { assertSessionAttendanceComplete } from './attendance';

type Row = Record<string, any>;
type SyncIdentity = Identity & { syncState?: Map<string,Row|null>; attendanceCompleteness?: Map<string,number>; timezone?: string };
type SQL = { sql: string; args: any[] };
export interface Command { id: string; type: string; base_version: number; created_at: string; payload: Row }
type Result = { id: string; status: string; [key: string]: any };
type Plan = { result: Result; first?: SQL; rest: SQL[]; receiptOnly?: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const types = new Set(['attendance.set','score.set','slip.set','homework.grade.set',
  'test.create','test.update','test.delete','slip.send','homework.assign',
  'homework.section.upsert','homework.section.delete','conflict.resolve']);
const groups: Record<string, PermGroup> = { attendance:'sessions_attendance',score:'scores',
  slip:'comments_reports',homework_grade:'comments_reports' };
const cells: Record<string, { table: string; key: string; fields: string[]; parent: string }> = {
  attendance: {table:'attendance',key:'session_id',fields:['status'],parent:'class_sessions'},
  score: {table:'scores',key:'test_id',fields:['value'],parent:'tests'},
  slip: {table:'session_comments',key:'session_id',fields:['stars','scale','criteria','comment','note','hw_manual'],parent:'class_sessions'},
  homework_grade: {table:'homework_grades',key:'section_id',fields:['level'],parent:'homework_sections'},
};
const q = (sql: string, ...args: any[]): SQL => ({sql,args});
const stmt = (db: D1Database,s: SQL) => db.prepare(s.sql).bind(...s.args);
async function one(db: D1Database,sql: string,...args: any[]): Promise<Row | null> {
  return db.prepare(sql).bind(...args).first<Row>();
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw validationError(undefined,'invalid_id');
  return value;
}
function text(value: unknown,max: number,fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || value.length>max) throw validationError(undefined,'invalid_text');
  return value;
}
function date(value: unknown): string {
  const s=text(value,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0,10)!==s) throw validationError(undefined,'invalid_date');
  return s;
}
function memberOf(value: any,values: any[]): any {
  if (!values.includes(value)) throw validationError(undefined,'invalid_value');
  return value;
}
export function validatePush(body: Row): { membership_id: string; commands: Command[] } {
  const membership_id=id(body.membership_id); id(body.device_id);
  if (!Array.isArray(body.commands) || body.commands.length>50) throw validationError(undefined,'invalid_commands');
  for (const c of body.commands) {
    if (!c || typeof c!=='object' || Array.isArray(c)) throw validationError(undefined,'invalid_command');
    id(c.id);
    if (typeof c.type!=='string' || !types.has(c.type) || !c.payload || typeof c.payload!=='object' || Array.isArray(c.payload)
      || typeof c.created_at!=='string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(c.created_at) || !Number.isFinite(Date.parse(c.created_at))) throw validationError(undefined,'invalid_command');
    if (c.type!=='slip.send' && c.type!=='conflict.resolve' && (!Number.isSafeInteger(c.base_version) || c.base_version<0)) throw validationError(undefined,'invalid_base_version');
  }
  return {membership_id,commands:body.commands};
}
/** The queue's membership is independent of the currently selected role. */
export async function syncIdentity(db: D1Database,current: Identity,membershipId: unknown): Promise<Identity> {
  if (current.mustChangePassword) throw passwordChangeRequired();
  const m=await one(db,`SELECT m.*,r.name role_name,r.system_key,r.scope_kind,w.name workspace_name
    FROM memberships m JOIN roles r ON r.id=m.role_id JOIN workspaces w ON w.id=m.workspace_id
    WHERE m.id=? AND m.user_id=? AND m.status='active'`,id(membershipId),current.userId);
  if (!m) throw notFound();
  const guardian=m.scope_kind==='linked_students';
  const rows=await db.batch([
    db.prepare('SELECT perm_group,level FROM role_permissions WHERE role_id=?').bind(m.role_id),
    guardian ? db.prepare(`SELECT DISTINCT s.class_id FROM guardian_student g JOIN students s ON s.id=g.student_id
      WHERE g.workspace_id=? AND g.user_id=?`).bind(m.workspace_id,current.userId)
      : db.prepare('SELECT class_id FROM member_classes WHERE workspace_id=? AND membership_id=?').bind(m.workspace_id,m.id),
    db.prepare('SELECT student_id FROM guardian_student WHERE workspace_id=? AND user_id=?').bind(m.workspace_id,current.userId),
  ]);
  const permissions=Object.fromEntries(['classes','students','sessions_attendance','scores','lectures','comments_reports','send_comments'].map(g=>[g,'none'])) as Permissions;
  for (const r of rows[0]!.results as Row[]) permissions[r.perm_group as PermGroup]=r.level;
  return {...current,membershipId:m.id,workspaceId:m.workspace_id,workspaceName:m.workspace_name,
    roleId:m.role_id,roleName:m.role_name,roleSystemKey:m.system_key,scopeKind:m.scope_kind,
    scopeEpoch:m.scope_epoch,permissions,classIds:(rows[1]!.results as Row[]).map(r=>r.class_id),
    linkedStudentIds:guardian ? (rows[2]!.results as Row[]).map(r=>r.student_id) : []};
}
/** Read all known command targets together before writes. Dependencies created by earlier commands
 * and CAS retries use fresh reads; affected tables are evicted after every committed command. */
async function initialState(db:D1Database,i:SyncIdentity,commands:Command[]):Promise<void> {
  const targets=new Map<string,Set<string>>();
  const add=(table:string,value:any)=>{if(typeof value==='string' && uuid.test(value)) {if(!targets.has(table)) targets.set(table,new Set());targets.get(table)!.add(value);}};
  for(const c of commands) {
    const p=c.payload;
    add('students',p.student_id);
    if(Array.isArray(p.student_ids)) for(const sid of p.student_ids) add('students',sid);
    add('classes',p.class_id);add('class_sessions',p.session_id);add('tests',p.test_id);add('homework_sections',p.section_id);
    if(c.type.startsWith('test.')) add('tests',p.id);
    if(c.type.startsWith('homework.section.')) add('homework_sections',p.id);
    if(c.type==='homework.assign' && Array.isArray(p.sections)) for(const section of p.sections) add('homework_sections',section?.id);
  }
  const queries:SQL[]=[q('SELECT timezone FROM workspaces WHERE id=?',i.workspaceId)];
  const tables=[...targets.keys()];
  for(const table of tables) {
    const ids=[...targets.get(table)!];
    queries.push(q(`SELECT * FROM ${table} WHERE workspace_id=? AND id IN (${ids.map(()=>'?').join(',')})`,i.workspaceId,...ids));
  }
  const cellQueries:{table:string;k1:string;k2:string}[]=[];
  for(const c of commands) {
    const entity=c.type==='homework.grade.set' ? 'homework_grade' : c.type.split('.')[0]!;
    const def=cells[entity];if(!def || !c.type.endsWith('.set')) continue;
    const k1=c.payload[def.key],k2=c.payload.student_id;
    if(typeof k1!=='string'||!uuid.test(k1)||typeof k2!=='string'||!uuid.test(k2)) continue;
    cellQueries.push({table:def.table,k1,k2});
    queries.push(q(`SELECT * FROM ${def.table} WHERE workspace_id=? AND ${def.key}=? AND student_id=?`,i.workspaceId,k1,k2));
  }
  const results=await db.batch<Row>(queries.map(s=>stmt(db,s)));
  i.timezone=results[0]!.results[0]!.timezone;
  i.syncState=new Map();
  tables.forEach((table,idx)=>{
    for(const key of targets.get(table)!) i.syncState!.set(`${table}:${key}`,null);
    for(const row of results[idx+1]!.results) i.syncState!.set(`${table}:${row.id}`,row);
  });
  cellQueries.forEach((c,idx)=>i.syncState!.set(`${c.table}:${c.k1}:${c.k2}`,results[tables.length+idx+1]!.results[0]??null));
}
async function stateRow(db:D1Database,i:SyncIdentity,table:string,key:string,second?:string):Promise<Row|null> {
  const cacheKey=`${table}:${key}${second ? ':'+second : ''}`;
  if(i.syncState?.has(cacheKey)) return i.syncState.get(cacheKey)!;
  const def=Object.values(cells).find(c=>c.table===table);
  return second && def
    ? one(db,`SELECT * FROM ${table} WHERE workspace_id=? AND ${def.key}=? AND student_id=?`,i.workspaceId,key,second)
    : one(db,`SELECT * FROM ${table} WHERE workspace_id=? AND id=?`,i.workspaceId,key);
}
function evict(i:SyncIdentity,c:Command):void {
  const prefix=c.type.split('.')[0];
  if (prefix==='attendance' && typeof c.payload.session_id==='string') i.attendanceCompleteness?.delete(c.payload.session_id);
  if (prefix==='student' || prefix==='class') i.attendanceCompleteness?.clear();
  const tables=prefix==='attendance' ? ['attendance','class_sessions']
    : prefix==='score' ? ['scores'] : prefix==='test' ? ['tests','scores']
    : prefix==='slip' ? ['session_comments'] : prefix==='homework' ? ['homework_sections','homework_grades']
    : ['attendance','scores','session_comments','homework_grades','class_sessions'];
  for(const key of i.syncState?.keys() ?? []) if(tables.some(t=>key.startsWith(t+':'))) i.syncState!.delete(key);
}
async function resource(db:D1Database,i:SyncIdentity,table:string,key:unknown,group:PermGroup):Promise<Row> {
  const row=await stateRow(db,i,table,id(key));
  if (!row) throw notFound();
  requireAccess(i,group,'write',{classId:table==='classes' ? row.id : row.class_id});
  return row;
}
async function student(db:D1Database,i:SyncIdentity,studentId:unknown,parent:Row,onDate?:string):Promise<Row> {
  const s=await stateRow(db,i,'students',id(studentId));
  if (!s) throw notFound();
  if (s.class_id!==parent.class_id) throw validationError(undefined,'student_class_mismatch');
  if (onDate && (s.enrolled_at>onDate || (s.left_at!==null && s.left_at<onDate))) throw validationError(undefined,'student_not_enrolled_on_date');
  return s;
}
/** Object commands follow the same "later command wins" rule as cells: a stale base_version still
 * applies (the server bumps version from what it currently holds). Only a base_version from the
 * future is rejected; business rules (archived test, missing row…) still reject. */
function version(c:Command,row:Row):void {
  if (c.base_version>row.version) throw validationError(undefined,'base_version_ahead');
}
async function prior(db:D1Database,i:SyncIdentity,c:Command):Promise<Result|null> {
  const row=await one(db,'SELECT membership_id,workspace_id,result FROM applied_commands WHERE command_id=? AND workspace_id=?',c.id,i.workspaceId);
  if (!row) return null;
  if (row.membership_id!==i.membershipId) return {id:c.id,status:'rejected',error:{code:'conflict',message:'Conflict.',details:{reason:'retry'}}};
  const original=JSON.parse(row.result);
  if(original.status==='rejected')return original;
  return {...original,status:'duplicate',original_status:original.status};
}
async function foreignCommandIdUsed(db:D1Database,i:SyncIdentity,c:Command):Promise<boolean> {
  return (await one(db,'SELECT command_id FROM applied_commands WHERE command_id=? AND workspace_id<>?',c.id,i.workspaceId))!==null;
}
function marker(i:SyncIdentity,c:Command,r:Result,conditional:boolean):SQL {
  return q(`INSERT INTO applied_commands(command_id,workspace_id,membership_id,type,status,result,applied_at)
    SELECT ?,?,?,?,?,?,? ${conditional ? `WHERE changes()>0 OR EXISTS(SELECT 1 FROM applied_commands WHERE command_id='${c.id}')` : ''}`,
  c.id,i.workspaceId,i.membershipId,c.type,r.status,JSON.stringify(r),new Date().toISOString());
}
/** CAS + receipt + side effects are atomic for one command, never the whole HTTP batch. */
async function commit(db:D1Database,i:SyncIdentity,c:Command,plan:Plan):Promise<boolean> {
  const statements=plan.receiptOnly ? [plan.first!] : plan.first ? [plan.first,marker(i,c,plan.result,true)] : [marker(i,c,plan.result,false)];
  statements.push(...plan.rest);
  const results=await db.batch(statements.map(s=>stmt(db,s)));
  return (results[plan.first && !plan.receiptOnly ? 1 : 0]!.meta.changes ?? 0)>0;
}
// UUID has been validated before interpolation; only the command's committed receipt permits side effects.
function ack(c:Command):string { return `EXISTS(SELECT 1 FROM applied_commands WHERE command_id='${c.id}')`; }
function notifications(i:SyncIdentity,c:Command,kind:string,classId:string,studentId:string|null,sessionId:string|null,testId:string|null,now:string):SQL {
  const score=kind==='score_updated';
  return q(`INSERT INTO notifications(workspace_id,user_id,membership_id,kind,event_key,student_id,session_id,test_id,created_at,ready_at,group_key)
    SELECT s.workspace_id,m.user_id,m.id,?,?,s.id,?,?,?,?,${score ? "m.id||':'||s.id||':'||?" : 'NULL'}
    FROM students s JOIN guardian_student g ON g.student_id=s.id AND g.workspace_id=s.workspace_id
    JOIN memberships m ON m.user_id=g.user_id AND m.workspace_id=s.workspace_id AND m.status='active'
    JOIN roles r ON r.id=m.role_id AND r.scope_kind='linked_students'
    JOIN users u ON u.id=m.user_id AND u.status='active'
    JOIN role_permissions p ON p.role_id=r.id AND p.perm_group=? AND p.level IN ('read','write')
    WHERE s.workspace_id=? AND s.class_id=? AND ${studentId ? 's.id=?' : `s.enrolled_at<=(SELECT date FROM class_sessions WHERE id=?) AND (s.left_at IS NULL OR s.left_at>=(SELECT date FROM class_sessions WHERE id=?))`}
    AND ${ack(c)}
    ${score ? `ON CONFLICT(membership_id,group_key) WHERE group_key IS NOT NULL AND expansion_started_at IS NULL
      DO UPDATE SET ready_at=excluded.ready_at,event_version=notifications.event_version+1`
      : 'ON CONFLICT(membership_id,event_key) DO NOTHING'}`,
  kind,kind==='slip_sent' ? `slip:${sessionId}:${studentId}` : `${kind}:${c.id}`,sessionId,testId,now,
  score ? new Date(Date.parse(now)+300000).toISOString() : now,...(score ? [testId] : []),
  score ? 'scores' : 'comments_reports',i.workspaceId,classId,...(studentId ? [studentId] : [sessionId,sessionId]));
}
const CRITERIA_MASK=31;
// Attendance states that get a default slip when the teacher sends the whole class; easy to change.
const DEFAULT_SLIP_ATTENDANCE=['present','late'];
const bits=(n:number):number => { let c=0; for (let m=n;m;m&=m-1) c++; return c; };
/** Slip fields from a slip.set payload. Scale 5 slips carry criteria (stars = criteria met); a payload with
 * only stars writes or keeps a legacy scale 3 slip so installed clients keep working. */
function slipValues(p:Row,row:Row|null):Row {
  const note=p.note===undefined ? (row?.note ?? '') : typeof p.note==='string' ? p.note : (()=>{throw validationError(undefined,'invalid_text')})();
  if (p.hw_manual!==undefined && typeof p.hw_manual!=='boolean') throw validationError(undefined,'invalid_hw_manual');
  const hw_manual=p.hw_manual===undefined ? (row?.hw_manual ?? 0) : Number(p.hw_manual);
  if (p.criteria!==undefined) {
    if (typeof p.criteria!=='number' || !Number.isInteger(p.criteria) || p.criteria<0 || p.criteria>CRITERIA_MASK) throw validationError(undefined,'invalid_criteria');
    if (row?.scale===3 && row.status==='sent') throw validationError(undefined,'legacy_scale');
    if (p.comment!==undefined && p.comment!==null && typeof p.comment!=='string') throw validationError(undefined,'invalid_comment');
    const comment=typeof p.comment==='string' ? p.comment.trim() : '';
    if (!comment) throw validationError(undefined,'comment_required');
    return {stars:bits(p.criteria),scale:5,criteria:p.criteria,comment,note,hw_manual};
  }
  if (row && row.scale===5) {
    if (p.stars!==undefined) throw validationError(undefined,'criteria_required');
    if (p.comment!==undefined && typeof p.comment!=='string') throw validationError(undefined,'invalid_comment');
    const kept=p.comment===undefined ? row.comment : p.comment.trim();
    if (kept==='') throw validationError(undefined,'comment_required');
    return {stars:row.stars,scale:5,criteria:row.criteria,comment:kept,note,hw_manual};
  }
  return {stars:memberOf(p.stars,[null,1,2,3]),scale:3,criteria:null,comment:null,note,hw_manual};
}

async function cellPlan(db:D1Database,i:SyncIdentity,c:Command,entity:string):Promise<Plan> {
  const def=cells[entity]!,p=c.payload,now=new Date().toISOString();
  const parent=await resource(db,i,def.parent,p[def.key],groups[entity]!);
  const enrolled=await student(db,i,p.student_id,parent,entity==='attendance'||entity==='slip' ? parent.date : undefined);
  if (entity==='slip' && parent.status!=='cancelled') await assertSessionAttendanceComplete(db,i.workspaceId,parent.id,i.attendanceCompleteness);
  if (entity==='attendance') {
    if (parent.status==='cancelled') throw conflict('session_cancelled');
    const timezone=i.timezone ?? (await one(db,'SELECT timezone FROM workspaces WHERE id=?',i.workspaceId))!.timezone;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone}).format(new Date());
    if (parent.date>today) throw validationError(undefined,'session_not_started');
  }
  if (entity==='score' && parent.archived) throw notFound();
  let values:Row;
  if (entity==='attendance') {
      const status=memberOf(p.status,['present','late','absent']);
      values={status};
  } else if (entity==='score') {
    if (p.value!==null && (typeof p.value!=='number' || !Number.isFinite(p.value) || p.value<0 || p.value>1000)) throw validationError(undefined,'invalid_score');
    if (p.value!==null && !Number.isInteger(p.value*2)) throw validationError(undefined,'invalid_score_step');
    values={value:p.value};
  } else if (entity==='slip') values={};
  else values={level:memberOf(p.level,[null,'excellent','done','not_done'])};
  const row=await stateRow(db,i,def.table,parent.id,p.student_id);
  if (entity==='slip') values=slipValues(p,row);
  if (entity==='slip' && row?.status==='sent' && values.stars===null) throw validationError(undefined,'stars_required');
  const v=row?.version ?? 0;
  if (!row && c.base_version>0) throw notFound();
  if (c.base_version>v) throw validationError(undefined,'base_version_ahead');
  // Last write wins: a stale base_version is applied like any other write, because the order that
  // matters is the order the server received the commands, not the version the device had seen.
  // An identical value needs no write, no history row and no notification.
  const same=row && def.fields.every(f=>row[f]===values[f]);
  const result:Result={id:c.id,status:'applied',version:v+1};
  if (same) {
    result.version=v; result.noop=true;
    return {result,receiptOnly:true,rest:[],first:q(`INSERT INTO applied_commands(command_id,workspace_id,membership_id,type,status,result,applied_at)
      SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ${def.table} WHERE workspace_id=? AND ${def.key}=? AND student_id=? AND version=?)`,
    c.id,i.workspaceId,i.membershipId,c.type,'applied',JSON.stringify(result),now,i.workspaceId,parent.id,p.student_id,v)};
  }
  const fields=def.fields,args=fields.map(f=>values[f]);
  const first=row ? q(`UPDATE ${def.table} SET ${fields.map(f=>`${f}=?`).join(',')},version=version+1,updated_at=?,updated_by=? WHERE workspace_id=? AND ${def.key}=? AND student_id=? AND version=?`,...args,now,i.userId,i.workspaceId,parent.id,p.student_id,v)
    : q(`INSERT INTO ${def.table}(workspace_id,class_id,${def.key},student_id,${fields.join(',')},version,created_at,updated_at,updated_by)
      SELECT ?,?,?,?,${fields.map(()=>'?').join(',')},1,?,?,? WHERE NOT EXISTS(SELECT 1 FROM ${def.table} WHERE ${def.key}=? AND student_id=?)`,
    i.workspaceId,parent.class_id,parent.id,p.student_id,...args,now,now,i.userId,parent.id,p.student_id);
  first.sql+=` AND EXISTS(SELECT 1 FROM ${def.parent} WHERE workspace_id=? AND id=? AND version=?)`;
  first.args.push(i.workspaceId,parent.id,parent.version);
  first.sql+=` AND EXISTS(SELECT 1 FROM students WHERE workspace_id=? AND id=? AND version=?)`;
  first.args.push(i.workspaceId,enrolled.id,enrolled.version);
    const rest:SQL[]=[];
  if (entity==='attendance') rest.push(q(`UPDATE class_sessions SET status='held',version=version+1,updated_at=?,updated_by=? WHERE workspace_id=? AND id=? AND status='planned' AND ${ack(c)}`,now,i.userId,i.workspaceId,parent.id));
    if (entity==='score' && values.value!==null && (!row || row.value!==values.value)) rest.push(notifications(i,c,'score_updated',parent.class_id,p.student_id,null,parent.id,now));
    return {result,first,rest};
}
export async function push(db:D1Database,i:SyncIdentity,commands:Command[],requestId:string) {
  i={...i,attendanceCompleteness:new Map()};
  await initialState(db,i,commands);
  const results:Result[]=[];
  for (const c of commands) {
    let result:Result|null=await prior(db,i,c);
    if (result) {if(result.status==='rejected') result.error.request_id ??= requestId;results.push(result);continue;}
    for (let attempt=0;attempt<3;attempt++) {
      try {
        if (Date.parse(c.created_at)<Date.now()-90*86400000) throw validationError(undefined,'command_expired');
        assertStaffWrite(i);
        if (c.type === 'slip.send' && i.permissions.send_comments !== 'write') {
          throw forbidden();
        }
        const entity=c.type==='homework.grade.set' ? 'homework_grade' : c.type.split('.')[0]!;
        const plan=cells[entity] && c.type.endsWith('.set') ? await cellPlan(db,i,c,entity) : await objectPlan(db,i,c);
        if (plan.result.status==='rejected') plan.result.error.request_id=requestId;
        if (!await commit(db,i,c,plan)) {
          i.syncState?.clear();
          result=await prior(db,i,c);
          if (result) break;
          continue;
        }
        evict(i,c);
        result=plan.result; break;
        } catch (error) {
          const duplicate=await prior(db,i,c);
          if (duplicate) {result=duplicate;break;}
          if (await foreignCommandIdUsed(db,i,c)) {
            result={id:c.id,status:'rejected',error:{code:'conflict',message:'Conflict.',details:{reason:'retry'},request_id:requestId}};
            break;
          }
        const mapped=error instanceof ApiError ? error : mapTriggerError(error,new ApiError(409,'conflict','Conflict.',{reason:'constraint_failed'}));
        result={id:c.id,status:'rejected',error:errorBody(mapped,requestId).error};
        try {await commit(db,i,c,{result,rest:[]});} catch {result=await prior(db,i,c) ?? result;}
        break;
      }
    }
    if (!result) {
      result={id:c.id,status:'rejected',error:{code:'conflict',message:'Conflict.',details:{reason:'retry'},request_id:requestId}};
      try {await commit(db,i,c,{result,rest:[]});} catch {result=await prior(db,i,c) ?? result;}
    }
    if (result.status==='rejected') result.error.request_id ??= requestId;
    results.push(result);
  }
  const row=await one(db,`SELECT MAX(COALESCE((SELECT MAX(seq) FROM change_log WHERE workspace_id=?),0),change_floor) cursor FROM workspaces WHERE id=?`,i.workspaceId,i.workspaceId);
  return {epoch:i.scopeEpoch,cursor:row!.cursor,results};
}

async function objectPlan(db:D1Database,i:SyncIdentity,c:Command):Promise<Plan> {
  const p=c.payload,now=new Date().toISOString(),rest:SQL[]=[],result:Result={id:c.id,status:'applied'};
  if (c.type.startsWith('test.')) {
    if (c.type==='test.create') {
      if (c.base_version!==0) throw validationError(undefined,'invalid_base_version');
      const cls=await resource(db,i,'classes',p.class_id,'scores'); id(p.id);
      const name=text(p.name,100); if (!name.trim()) throw validationError({name:'required'});
      result.version=1;
      return {result,rest,first:q(`INSERT INTO tests(id,workspace_id,class_id,name,date,created_by,created_at,updated_at,updated_by)
        VALUES(?,?,?,?,?,?,?,?,?)`,p.id,i.workspaceId,cls.id,name,date(p.date),i.userId,now,now,i.userId)};
    }
    const row=await resource(db,i,'tests',p.id,'scores'); version(c,row);
    if (row.archived) throw notFound();
    result.version=row.version+1;
    if (c.type==='test.update') {
      const name=p.name===undefined ? row.name : text(p.name,100);
      if (!name.trim()) throw validationError({name:'required'});
      return {result,rest,first:q(`UPDATE tests SET name=?,date=?,version=version+1,updated_at=?,updated_by=? WHERE workspace_id=? AND id=? AND version=?`,
        name,p.date===undefined ? row.date : date(p.date),now,i.userId,i.workspaceId,row.id,row.version)};
    }
    const scores=await one(db,'SELECT COUNT(*) n FROM scores WHERE workspace_id=? AND test_id=? AND value IS NOT NULL',i.workspaceId,row.id);
    const archive=scores!.n>0; result.outcome=archive ? 'archived' : 'deleted';
    if (archive) rest.push(q(`INSERT INTO change_log(workspace_id,entity,k1,k2,op,class_id,student_id,created_at)
      SELECT workspace_id,'score',test_id,student_id,'upsert',class_id,student_id,unixepoch() FROM scores
      WHERE workspace_id=? AND test_id=? AND ${ack(c)}`,i.workspaceId,row.id));
    return {result,rest,first:archive
      ? q(`UPDATE tests SET archived=1,version=version+1,updated_at=?,updated_by=? WHERE workspace_id=? AND id=? AND version=?`,now,i.userId,i.workspaceId,row.id,row.version)
      : q(`DELETE FROM tests WHERE workspace_id=? AND id=? AND version=?`,i.workspaceId,row.id,row.version)};
  }
      if (c.type==='slip.send') {
        const session=await resource(db,i,'class_sessions',p.session_id,'comments_reports');
        if (session.status!=='cancelled') await assertSessionAttendanceComplete(db,i.workspaceId,session.id,i.attendanceCompleteness);
        if (!Array.isArray(p.student_ids) || p.student_ids.length>50) throw validationError(undefined,'invalid_student_ids');
        const selected=new Set<unknown>(p.student_ids);
        const classBatch=selected.size>1;
      const defaults=new Map<string,{criteria:number;comment:string}>();
      if (p.defaults!==undefined) {
        if (!Array.isArray(p.defaults)) throw validationError(undefined,'invalid_defaults');
        for (const item of p.defaults) {
          if (!item || typeof item!=='object' || Array.isArray(item) || typeof item.student_id!=='string' ||
              !selected.has(item.student_id) || defaults.has(item.student_id)) throw validationError(undefined,'invalid_defaults');
          if (typeof item.criteria!=='number' || !Number.isInteger(item.criteria) || item.criteria<0 || item.criteria>CRITERIA_MASK)
            throw validationError(undefined,'invalid_criteria');
          if (typeof item.comment!=='string') throw validationError(undefined,'invalid_comment');
          const comment=item.comment.trim();
          if (!comment) throw validationError(undefined,'comment_required');
          defaults.set(item.student_id,{criteria:item.criteria,comment});
        }
      }
      const sent:string[]=[],skipped:Row[]=[],guards:SQL[]=[];
      for (const sid of new Set(p.student_ids)) {
        await student(db,i,sid,session,session.date);
        const att=await one(db,'SELECT status,version FROM attendance WHERE workspace_id=? AND session_id=? AND student_id=?',i.workspaceId,session.id,sid);
        if (classBatch && att && !DEFAULT_SLIP_ATTENDANCE.includes(att.status)) {
          skipped.push({student_id:sid,reason:'absent'});
          continue;
        }
        const row=await one(db,'SELECT * FROM session_comments WHERE workspace_id=? AND session_id=? AND student_id=?',i.workspaceId,session.id,sid);
        if (row?.status==='sent') {skipped.push({student_id:sid,reason:'already_sent'});continue;}
          if (!row) {
              if (!att || !DEFAULT_SLIP_ATTENDANCE.includes(att.status)) {skipped.push({student_id:sid,reason:'not_attended'});continue;}
            const value=defaults.get(sid as string);
            if (!value) {skipped.push({student_id:sid,reason:'no_default'});continue;}
            sent.push(sid as string);
            guards.push(q('NOT EXISTS(SELECT 1 FROM session_comments WHERE workspace_id=? AND session_id=? AND student_id=?) AND EXISTS(SELECT 1 FROM attendance WHERE workspace_id=? AND session_id=? AND student_id=? AND status=? AND version=?)',i.workspaceId,session.id,sid,i.workspaceId,session.id,sid,att.status,att.version));
          rest.push(q(`INSERT INTO session_comments(workspace_id,class_id,session_id,student_id,stars,scale,criteria,comment,note,hw_manual,status,sent_at,version,created_at,updated_at,updated_by)
            SELECT ?,?,?,?,?,5,?,?, '',0,'sent',?,1,?,?,? WHERE ${ack(c)}
            AND NOT EXISTS(SELECT 1 FROM session_comments WHERE session_id=? AND student_id=?)
              AND EXISTS(SELECT 1 FROM attendance WHERE workspace_id=? AND session_id=? AND student_id=? AND status=? AND version=?)`,
            i.workspaceId,session.class_id,session.id,sid,bits(value.criteria),value.criteria,value.comment,now,now,now,i.userId,session.id,sid,i.workspaceId,session.id,sid,att.status,att.version));
          } else {
            const needsDefault=row.stars===null && row.scale===3;
            const value=needsDefault ? defaults.get(sid as string) : undefined;
            if (needsDefault && !value) {skipped.push({student_id:sid,reason:'no_default'});continue;}
          sent.push(sid as string);
            const commentGuard='EXISTS(SELECT 1 FROM session_comments WHERE workspace_id=? AND session_id=? AND student_id=? AND version=?)';
            const attendanceGuard=session.status==='cancelled' ? '' : ' AND EXISTS(SELECT 1 FROM attendance WHERE workspace_id=? AND session_id=? AND student_id=? AND status=? AND version=?)';
            guards.push(q(`${commentGuard}${attendanceGuard}`,
              i.workspaceId,session.id,sid,row.version,
              ...(session.status==='cancelled' ? [] : [i.workspaceId,session.id,sid,att!.status,att!.version])));
            if (value) rest.push(q(`UPDATE session_comments SET stars=?,scale=5,criteria=?,comment=?,hw_manual=0,status='sent',sent_at=?,updated_at=?,updated_by=?,version=version+1
              WHERE workspace_id=? AND session_id=? AND student_id=? AND ${ack(c)}`,bits(value.criteria),value.criteria,value.comment,now,now,i.userId,i.workspaceId,session.id,sid));
            else rest.push(q(`UPDATE session_comments SET status='sent',sent_at=?,updated_at=?,updated_by=?,version=version+1
              WHERE workspace_id=? AND session_id=? AND student_id=? AND ${ack(c)}`,now,now,i.userId,i.workspaceId,session.id,sid));
      }
      rest.push(notifications(i,c,'slip_sent',session.class_id,sid as string,session.id,null,now));
      rest.push(q(`INSERT INTO change_log(workspace_id,entity,k1,k2,op,class_id,student_id,created_at)
        SELECT g.workspace_id,'homework_grade',g.section_id,g.student_id,'upsert',g.class_id,g.student_id,unixepoch()
        FROM homework_grades g JOIN homework_sections hs ON hs.id=g.section_id JOIN class_sessions s ON s.id=hs.session_id
        WHERE g.workspace_id=? AND g.student_id=? AND ?=(SELECT n.id FROM class_sessions n WHERE n.class_id=s.class_id AND n.status<>'cancelled'
          AND (n.date>s.date OR (n.date=s.date AND n.start_time>s.start_time)) ORDER BY n.date,n.start_time LIMIT 1) AND ${ack(c)}`,i.workspaceId,sid,session.id));
    }
    result.sent=sent;result.skipped=skipped;
    // A guarded receipt is the CAS for this multi-row operation; all row versions must still match.
    const receipt=marker(i,c,result,false);
    receipt.sql+=` WHERE (${guards.length ? guards.map(g=>g.sql).join(' AND ') : '1'}) OR ${ack(c)}`;
    receipt.args.push(...guards.flatMap(g=>g.args));
    return {result,first:receipt,receiptOnly:true,rest};
  }
  if (c.type==='homework.assign' || c.type==='homework.section.upsert') {
    const session=await resource(db,i,'class_sessions',p.session_id,'comments_reports');
    if (session.status==='cancelled') throw conflict('session_cancelled');
    const sections=c.type==='homework.assign' ? p.sections : [p];
    if (!Array.isArray(sections) || sections.length<1 || sections.length>4) throw validationError(undefined,'invalid_sections');
    const statements:SQL[]=[],kinds=new Set<string>(); let creating=false;
    for (const s of sections) {
      if (!s || typeof s!=='object' || Array.isArray(s)) throw validationError(undefined,'invalid_section');
      id(s.id); const kind=memberOf(s.kind,['vocabulary','reading','speaking','exercise']);
      if (kinds.has(kind)) throw validationError(undefined,'duplicate_kind'); kinds.add(kind);
      const title=text(s.title,120,''),description=text(s.description,2000,'');
      const row=await stateRow(db,i,'homework_sections',s.id);
      if (row) {
        if (c.type==='homework.assign') throw conflict('section_exists');
        if (row.workspace_id!==i.workspaceId || row.session_id!==session.id) throw notFound();
        version(c,row);result.version=row.version+1;
        statements.push(q(`UPDATE homework_sections SET kind=?,title=?,description=?,version=version+1,updated_at=?,updated_by=?
          WHERE workspace_id=? AND id=? AND version=?`,kind,title,description,now,i.userId,i.workspaceId,s.id,row.version));
      } else {
        if (c.base_version!==0) throw notFound();
        creating=true;result.version=1;
        statements.push(q(`INSERT INTO homework_sections(id,workspace_id,class_id,session_id,kind,title,description,created_by,created_at,updated_at,updated_by)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)`,s.id,i.workspaceId,session.class_id,session.id,kind,title,description,i.userId,now,now,i.userId));
      }
    }
    const first=statements.shift()!;
    first.sql=first.sql.replace(/VALUES\(([^)]+)\)$/, 'SELECT $1 WHERE 1');
    first.sql+=` AND EXISTS(SELECT 1 FROM class_sessions WHERE workspace_id=? AND id=? AND version=? AND status<>'cancelled')`;
    first.args.push(i.workspaceId,session.id,session.version);
    // Later inserts are conditional on the successful first mutation's receipt.
    for (const s of statements) {
      s.sql=s.sql.replace(/VALUES\(([^)]+)\)$/,`SELECT $1 WHERE ${ack(c)}`);rest.push(s);
    }
    if (creating) rest.push(notifications(i,c,'homework_assigned',session.class_id,null,session.id,null,now));
    return {result,first,rest};
  }
  if (c.type==='homework.section.delete') {
    const row=await resource(db,i,'homework_sections',p.id,'comments_reports');version(c,row);
    const graded=await one(db,'SELECT 1 FROM homework_grades WHERE workspace_id=? AND section_id=? AND level IS NOT NULL LIMIT 1',i.workspaceId,row.id);
    if (graded) throw validationError(undefined,'section_has_grades');
    result.version=row.version+1;
    return {result,rest,first:q('DELETE FROM homework_sections WHERE workspace_id=? AND id=? AND version=?',i.workspaceId,row.id,row.version)};
  }
  if (c.type==='conflict.resolve') {
    // Conflicts are never recorded in the MVP: the later command always wins (docs/architecture.md 5,
    // api-spec.md 6.5), so the sync_conflicts table stays empty and there is nothing to resolve.
    throw validationError(undefined,'conflicts_not_used');
  }
  throw validationError(undefined,'unknown_command');
}
