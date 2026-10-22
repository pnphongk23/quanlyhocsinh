import type { Identity, PermGroup } from '../types';
import { ApiError, notFound, validationError } from '../lib/errors';
import { requireAccess } from './authz';
import { classTeacherNameSql } from './class-teacher';

type Row=Record<string,any>;
type Entity={ table:string; keys:string[]; fields:string[]; group:PermGroup; day?:string; join?:string };
const entities:Record<string,Entity>={
  class:{table:'classes',keys:['id'],fields:['id','name','status','weekdays','start_time','version'],group:'classes'},
  student:{table:'students',keys:['id'],fields:['id','class_id','name','parent_phone','enrolled_at','left_at','status','version'],group:'students'},
  class_session:{table:'class_sessions',keys:['id'],fields:['id','class_id','date','start_time','origin','is_makeup','status','note','version'],group:'sessions_attendance',day:'e.date'},
  attendance:{table:'attendance',keys:['session_id','student_id'],fields:['session_id','student_id','status','note','late_at','version','updated_at'],group:'sessions_attendance',join:'JOIN class_sessions parent ON parent.id=e.session_id',day:'parent.date'},
  test:{table:'tests',keys:['id'],fields:['id','class_id','name','date','max','archived','version'],group:'scores',day:'e.date'},
  score:{table:'scores',keys:['test_id','student_id'],fields:['test_id','student_id','value','version','updated_at'],group:'scores',join:'JOIN tests parent ON parent.id=e.test_id',day:'parent.date'},
  slip:{table:'session_comments',keys:['session_id','student_id'],fields:['session_id','student_id','stars','note','status','sent_at','version','updated_at'],group:'comments_reports',join:'JOIN class_sessions parent ON parent.id=e.session_id',day:'parent.date'},
  homework_section:{table:'homework_sections',keys:['id'],fields:['id','class_id','session_id','kind','title','description','version'],group:'comments_reports',join:'JOIN class_sessions parent ON parent.id=e.session_id',day:'parent.date'},
  homework_grade:{table:'homework_grades',keys:['section_id','student_id'],fields:['section_id','student_id','level','version','updated_at'],group:'comments_reports',join:'JOIN homework_sections hs ON hs.id=e.section_id JOIN class_sessions parent ON parent.id=hs.session_id',day:'parent.date'},
  report:{table:'reports',keys:['id'],fields:['id','class_id','student_id','month','status','general_comment','needs_republish','publication_count','published_at','version'],group:'comments_reports',day:"e.month||'-01'"},
  report_publication:{table:'report_publications',keys:['id'],fields:['id','report_id','class_id','student_id','month','publication_no','published_at','snapshot'],group:'comments_reports',day:"e.month||'-01'"},
};
const literal=(v:string)=>`'${v.replaceAll("'","''")}'`;
function allowed(i:Identity,name:string):boolean {
  const e=entities[name];if (!e) return false;
  if (i.scopeKind==='linked_students' && name==='report') return false;
  try {requireAccess(i,e.group,'read');return true;} catch {return false;}
}
function scope(i:Identity,alias:string,isClass=false,studentColumn?:string):string {
  const cls=isClass ? `${alias}.id` : `${alias}.class_id`;
  if (i.scopeKind==='workspace') return '1';
  const classes=`${cls} IN (SELECT class_id FROM member_classes WHERE workspace_id=${literal(i.workspaceId)} AND membership_id=${literal(i.membershipId)})`;
  if (i.scopeKind==='assigned_classes') return classes;
  const links=`SELECT g.student_id FROM guardian_student g WHERE g.workspace_id=${literal(i.workspaceId)} AND g.user_id=${literal(i.userId)}`;
  return studentColumn ? `${alias}.${studentColumn} IN (${links})` : `${cls} IN (SELECT s.class_id FROM students s WHERE s.id IN (${links}))`;
}
function visibility(i:Identity,name:string):string {
  const guardian=i.scopeKind==='linked_students';
  const studentKey=name==='student' ? 'id' : ['attendance','score','slip','homework_grade','report','report_publication'].includes(name) ? 'student_id' : undefined;
  const clauses=[scope(i,'e',name==='class',studentKey)];
  if (guardian) {
    if (name==='test') clauses.push('e.archived=0');
    if (name==='score') clauses.push('parent.archived=0');
    if (name==='slip') clauses.push("e.status='sent'");
    if (name==='homework_grade') clauses.push(`EXISTS(SELECT 1 FROM session_comments sc WHERE sc.workspace_id=e.workspace_id AND sc.student_id=e.student_id AND sc.status='sent'
      AND sc.session_id=(SELECT n.id FROM class_sessions n WHERE n.class_id=parent.class_id AND n.status<>'cancelled'
        AND (n.date>parent.date OR (n.date=parent.date AND n.start_time>parent.start_time)) ORDER BY n.date,n.start_time LIMIT 1))`);
  }
  return clauses.join(' AND ');
}
function fields(i:Identity,name:string):string {
  const e=entities[name]!;
  const list=e.fields.filter(f=>!(i.scopeKind==='linked_students' && ((name==='student' && f==='parent_phone')||(name==='class_session'&&f==='note'))));
    if (name==='class') return i.scopeKind==='linked_students'
      ? `e.id,e.name,e.status,e.version,${classTeacherNameSql('e')} AS teacher_name`
      : `e.id,e.name,e.status,e.weekdays,e.start_time,e.version,${classTeacherNameSql('e')} AS teacher_name`;
  return list.map(f=>`e.${f}`).join(',');
}
function decode(name:string,row:Row):Row {
  if (name==='class' && row.weekdays!==undefined) row.weekdays=Array.from({length:7},(_,i)=>i+1).filter(day=>(row.weekdays & (1<<(day-1)))!==0);
  if (name==='report_publication') row.snapshot=JSON.parse(row.snapshot);
  if (name==='test') row.archived=Boolean(row.archived);
  if (name==='class_session') row.is_makeup=Boolean(row.is_makeup);
  if (name==='report') row.needs_republish=Boolean(row.needs_republish);
  return row;
}
function meta(db:D1Database,i:Identity):D1PreparedStatement {
  return db.prepare(`SELECT m.scope_epoch,w.change_floor,w.timezone,
    MAX(w.change_floor,COALESCE((SELECT MAX(seq) FROM change_log WHERE workspace_id=w.id),0)) cursor
    FROM memberships m JOIN workspaces w ON w.id=m.workspace_id WHERE m.id=? AND m.user_id=? AND m.status='active'`)
    .bind(i.membershipId,i.userId);
}
function window(timezone:string):{from:string;to:string} {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone}).format(new Date());
  const day=Date.parse(today);return {from:new Date(day-90*86400000).toISOString().slice(0,10),to:new Date(day+56*86400000).toISOString().slice(0,10)};
}
export async function snapshot(db:D1Database,i:Identity) {
  const r=await meta(db,i).first<Row>();if (!r) throw notFound();
  return {cursor:r.cursor,epoch:r.scope_epoch,window:window(r.timezone),entities:Object.keys(entities).filter(n=>allowed(i,n))};
}
export async function snapshotPage(db:D1Database,i:Identity,name:string,after:string|undefined,limit:number) {
  const e=entities[name];if (!e) throw notFound();
  if (!allowed(i,name)) {requireAccess(i,e.group,'read');throw notFound();}
  let key:string[]=[];
  if (after!==undefined) {
    try {key=JSON.parse(atob(after));} catch {throw validationError(undefined,'invalid_after');}
    if (!Array.isArray(key)||key.length!==e.keys.length||key.some(k=>typeof k!=='string')) throw validationError(undefined,'invalid_after');
  }
  const r=await meta(db,i).first<Row>();if (!r) throw notFound();
  const w=window(r.timezone),tuple=e.keys.map(k=>`e.${k}`).join(',');
  const cols=e.keys.map(k=>`e.${k} AS _${k}`).join(',');
  const rows=await db.prepare(`SELECT ${fields(i,name)},${cols} FROM ${e.table} e ${e.join ?? ''}
    WHERE e.workspace_id=? AND ${visibility(i,name)} ${e.day ? `AND ${e.day}>=? AND ${e.day}<=?` : ''}
    ${key.length ? `AND (${tuple})>(${key.map(()=>'?').join(',')})` : ''} ORDER BY ${tuple} LIMIT ?`)
    .bind(i.workspaceId,...(e.day ? [w.from,w.to] : []),...key,limit+1).all<Row>();
  const page=rows.results.slice(0,limit),last=page.at(-1);
  const next_after=rows.results.length>limit && last ? btoa(JSON.stringify(e.keys.map(k=>last[`_${k}`]))) : null;
  for (const row of page) for (const k of e.keys) delete row[`_${k}`];
  return {items:page.map(row=>decode(name,row)),next_after};
}
export async function pull(db:D1Database,i:Identity,cursor:number,epoch:number,limit:number) {
  const names=Object.keys(entities).filter(n=>allowed(i,n));
  const logScope=scope(i,'l',false);
  const own=i.scopeKind==='linked_students' ? `AND (l.student_id IS NULL OR l.student_id IN (SELECT student_id FROM guardian_student WHERE workspace_id=${literal(i.workspaceId)} AND user_id=${literal(i.userId)}))` : '';
  const logWhere=`l.workspace_id=? AND l.seq>? AND (${logScope}) ${own} AND l.entity IN (${names.map(literal).join(',')||"''"})`;
  const page=`SELECT l.* FROM change_log l WHERE ${logWhere} ORDER BY seq LIMIT ?`;
  const cte=`WITH page AS (${page})`;
  const statements=[meta(db,i),db.prepare(page).bind(i.workspaceId,cursor,limit+1)];
  for (const name of names) {
    const e=entities[name]!;
    statements.push(db.prepare(`${cte} SELECT DISTINCT ${fields(i,name)},e.${e.keys[0]} _k1,${e.keys[1] ? `e.${e.keys[1]}` : "''"} _k2
      FROM ${e.table} e JOIN page l ON l.entity=? AND e.${e.keys[0]}=l.k1 ${e.keys[1] ? `AND e.${e.keys[1]}=l.k2` : ''}
      ${e.join ?? ''} WHERE e.workspace_id=? AND ${visibility(i,name)}`)
      .bind(i.workspaceId,cursor,limit,name,i.workspaceId));
  }
  // All page keys and entity projections share one D1 batch snapshot; no query per changed row.
  const batches=await db.batch<Row>(statements),m=batches[0]!.results[0];
  if (!m) throw notFound();
  if (epoch!==m.scope_epoch) throw new ApiError(409,'resync_required','Snapshot required.',{reason:'scope_changed'});
  if (cursor<m.change_floor) throw new ApiError(409,'snapshot_required','Snapshot required.',{reason:'log_truncated'});
  const logs=batches[1]!.results.slice(0,limit),seen=new Set<string>(),upserts:Record<string,Row[]>={};
  names.forEach((name,idx)=>{
    const rows=batches[idx+2]!.results;
    for (const row of rows) {seen.add(JSON.stringify([name,row._k1,row._k2]));delete row._k1;delete row._k2;}
    if (rows.length) upserts[name]=rows.map(r=>decode(name,r));
  });
  const deletedMap=new Map<string,{entity:string;k1:string;k2:string}>();
  for (const l of logs) {
    const key=JSON.stringify([l.entity,l.k1,l.k2]);
    if (!seen.has(key)) deletedMap.set(key,{entity:l.entity,k1:l.k1,k2:l.k2});
  }
  return {cursor:logs.at(-1)?.seq ?? Math.max(cursor,m.cursor),epoch:m.scope_epoch,
    has_more:batches[1]!.results.length>limit,server_time:new Date().toISOString(),upserts,deleted:[...deletedMap.values()]};
}
