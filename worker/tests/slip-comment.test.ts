import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { db, fakePhone, insertClass, insertSession, insertStudent, registerWorkspace } from './helpers';

const migrations=(env as unknown as {TEST_MIGRATIONS:{name:string;queries:string[]}[]}).TEST_MIGRATIONS;
const backfill=migrations.find(m=>m.name.endsWith('0012_slip_comment_backfill.sql'))!.queries;
const expectedClauses:[string,string][]=[
  ['chú ý nghe giảng','chưa chú ý nghe giảng'],
  ['ghi bài đầy đủ','chưa ghi bài đầy đủ'],
  ['tích cực tham gia các hoạt động trong lớp','chưa tích cực tham gia hoạt động'],
  ['ngồi học ngoan ngoãn, không mất trật tự','còn mất trật tự'],
  ['hoàn thành tốt bài tập về nhà','chưa hoàn thành bài tập về nhà'],
];
function list(items:string[]):string {
  if(items.length<2)return items[0]??'';
  return `${items.slice(0,-1).join(', ')} và ${items.at(-1)}`;
}
function expectedComment(criteria:number):string {
  const met=expectedClauses.filter((_,bit)=>(criteria&(1<<bit))!==0).map(([yes])=>yes);
  const unmet=expectedClauses.filter((_,bit)=>(criteria&(1<<bit))===0).map(([,no])=>no);
  const lead=`Con ${list(met)}`;
  return `${met.length&&unmet.length?`${lead}, nhưng ${list(unmet)}`:`Con ${list(met.length?met:unmet)}`}.`;
}
function migrationComment(criteria:number):string {
  const query=backfill.find(q=>q.endsWith(`criteria=${criteria};`)||q.endsWith(`criteria=${criteria}`));
  if(!query)throw new Error('missing slip comment backfill query');
  const match=/SET comment = '((?:''|[^'])*)' WHERE scale=5 AND comment IS NULL AND criteria=\d+;?$/.exec(query);
  if(!match)throw new Error('invalid slip comment backfill query');
  return match[1]!.replaceAll("''","'");
}
const bitCount=(n:number)=>{let c=0;for(let m=n;m;m&=m-1)c++;return c;};

describe('slip comment backfill migration',()=>{
  it('contains all 32 fixed sentences and matches the four spec examples',()=>{
    expect(backfill).toHaveLength(32);
    for(let criteria=0;criteria<32;criteria++)expect(migrationComment(criteria)).toBe(expectedComment(criteria));
    expect(migrationComment(31)).toBe('Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà.');
    expect(migrationComment(23)).toBe('Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và hoàn thành tốt bài tập về nhà, nhưng còn mất trật tự.');
    expect(migrationComment(0)).toBe('Con chưa chú ý nghe giảng, chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà.');
    expect(migrationComment(3)).toBe('Con chú ý nghe giảng và ghi bài đầy đủ, nhưng chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà.');
  });

  it('backfills null scale-five comments locally without changing versions or timestamps',async()=>{
    const owner=await registerWorkspace(fakePhone(),'Slip comment backfill');
    const classId=await insertClass(owner.workspaceId,'Class',owner.userId);
    const students=await Promise.all([0,1,2].map(i=>insertStudent(owner.workspaceId,classId,`Student ${i}`,null,owner.userId)));
    const sessionId=await insertSession(owner.workspaceId,classId,'2026-10-20',owner.userId);
    const now='2026-10-20T00:00:00.000Z';
    for(const [index,criteria] of [31,23,0].entries()) await db.prepare(`INSERT INTO session_comments
      (workspace_id,class_id,session_id,student_id,stars,scale,criteria,comment,note,status,sent_at,version,created_at,updated_at,updated_by)
      VALUES(?,?,?,?,?,5,?,NULL,'','draft',NULL,7,?,?,?)`)
      .bind(owner.workspaceId,classId,sessionId,students[index]!,bitCount(criteria),criteria,now,now,owner.userId).run();

    await db.batch(backfill.map(query=>db.prepare(query)));
    const rows=(await db.prepare('SELECT student_id,criteria,comment,version,updated_at FROM session_comments WHERE session_id=? ORDER BY criteria')
      .bind(sessionId).all<any>()).results;
    expect(rows.map(row=>[row.criteria,row.comment,row.version,row.updated_at])).toEqual([0,23,31].map(criteria=>
      [criteria,expectedComment(criteria),7,now]));
  });
});
