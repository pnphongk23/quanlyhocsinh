import { beforeEach, describe, it, expect } from 'vitest';
import { call, post, db, registerWorkspace, fakePhone, insertUser, insertClass, insertStudent, insertSession,
  insertGuardianMembership, clubToken } from './helpers';

beforeEach(async () => { await db.prepare('DELETE FROM auth_throttle').run(); });
const uid = () => crypto.randomUUID();
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const command = (type: string, payload: any, base_version = 0) =>
  ({ id: uid(), type, payload, base_version, created_at: new Date().toISOString() });

async function setup() {
  const a = await registerWorkspace(fakePhone(), 'Slip criteria');
  const cls = await insertClass(a.workspaceId, 'C1', a.userId);
  const ids = [] as string[];
  for (const name of ['S1', 'S2', 'S3', 'S4'])
    ids.push(await insertStudent(a.workspaceId, cls, name, null, a.userId));
  await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE workspace_id=?").bind(a.workspaceId).run();
  const ses = await insertSession(a.workspaceId, cls, today(), a.userId);
  const parentUser = await insertUser(fakePhone());
  const parent = await insertGuardianMembership(a.workspaceId, parentUser, a.roles.guardian!, [ids[0]!]);
  const parentToken = await clubToken(a.workspaceId, parentUser, parent);
  const send = (commands: any[]) =>
    call('/v1/sync/push', post({ membership_id: a.membershipId, device_id: uid(), commands }), a.token);
  const row = (student: string) => db.prepare('SELECT * FROM session_comments WHERE session_id=? AND student_id=?')
    .bind(ses, student).first<any>();
  const parentSlips = async () => (await call(`/v1/sync/snapshot/slip?membership_id=${parent}`, {}, parentToken)).body.items;
  return { a, cls, s: ids, ses, send, row, parentSlips };
}
const attend = (f: Awaited<ReturnType<typeof setup>>, student: string, status: string) =>
  command('attendance.set', { session_id: f.ses, student_id: student, status });

describe('slip criteria', () => {
  it('requires and stores client comments with criteria and preserves comments on note-only edits', async () => {
    const f = await setup();
    const set = (extra: any, base = 0) => f.send([command('slip.set', { session_id: f.ses, student_id: f.s[0], note: '', ...extra }, base)]);
    expect((await set({ criteria: 0b10111, comment: '  Câu do máy khách tạo.  ' })).body.results[0].status).toBe('applied');
    expect(await f.row(f.s[0]!)).toMatchObject({ stars: 4, scale: 5, criteria: 23, comment: 'Câu do máy khách tạo.', status: 'draft' });
    for (const comment of [undefined, null, '', '   '])
      expect((await set({ criteria: 23, comment }, 1)).body.results[0].error.details.reason).toBe('comment_required');
    expect((await set({ criteria: 23, comment: 7 }, 1)).body.results[0].error.details.reason).toBe('invalid_comment');
    for (const bad of [32, -1, 1.5, '3', null])
      expect((await set({ criteria: bad, comment: 'valid' }, 1)).body.results[0].error.details.reason).toBe('invalid_criteria');
    expect((await set({ criteria: 31, comment: '  Manual sentence.  ' }, 1)).body.results[0].status).toBe('applied');
    expect((await set({ comment: '  Revised sentence.  ' }, 2)).body.results[0].status).toBe('applied');
    expect(await f.row(f.s[0]!)).toMatchObject({ stars: 5, criteria: 31, comment: 'Revised sentence.' });
    const long = 'Extra note. '.repeat(400);
    expect((await set({ note: long }, 3)).body.results[0].status).toBe('applied');
    expect((await f.row(f.s[0]!)).note).toBe(long);
    expect((await f.row(f.s[0]!)).comment).toBe('Revised sentence.');
    expect((await set({ hw_manual: 'true' }, 3)).body.results[0].error.details.reason).toBe('invalid_hw_manual');
    expect((await set({ note: 'updated' }, 3)).body.results[0].status).toBe('applied');
    expect((await f.row(f.s[0]!)).comment).toBe('Revised sentence.');
    expect((await f.row(f.s[0]!)).note).toBe('updated');
    await f.send([attend(f,f.s[0]!,'present'),command('slip.send',{session_id:f.ses,student_ids:[f.s[0]]})]);
    const parentSlip=(await f.parentSlips()).find((x:any)=>x.student_id===f.s[0]);
    expect(parentSlip.comment).toBe('Revised sentence.\nupdated');
    expect(parentSlip).not.toHaveProperty('note');
    await db.prepare('UPDATE session_comments SET comment=NULL WHERE session_id=? AND student_id=?').bind(f.ses,f.s[0]).run();
    const nullComment=(await f.parentSlips()).find((x:any)=>x.student_id===f.s[0]);
    expect(nullComment.comment).toBe('\nupdated');
    expect(nullComment).not.toHaveProperty('criteria');
  });

  it('keeps legacy three-star slips readable and editable by installed clients', async () => {
    const f = await setup();
    const legacy = (student: string, stars: number | null, status: string) => db.prepare(
      `INSERT INTO session_comments(workspace_id,class_id,session_id,student_id,stars,scale,criteria,comment,note,status,sent_at,version,created_at,updated_at)
       VALUES(?,?,?,?,?,3,NULL,NULL,'',?,?,1,'2026-01-01','2026-01-01')`)
      .bind(f.a.workspaceId, f.cls, f.ses, student, stars, status, status === 'sent' ? '2026-01-01' : null).run();
    await legacy(f.s[0]!, 2, 'sent');
    await legacy(f.s[1]!, null, 'draft');
    const old = (student: string, stars: number | null, base: number) =>
      f.send([command('slip.set', { session_id: f.ses, student_id: student, stars, note: 'x' }, base)]);
    expect((await old(f.s[0]!, 3, 1)).body.results[0].status).toBe('applied');
    expect(await f.row(f.s[0]!)).toMatchObject({ stars: 3, scale: 3, criteria: null, status: 'sent' });
    const withCriteria = await f.send([command('slip.set', { session_id: f.ses, student_id: f.s[0], criteria: 31, note: '' }, 2)]);
    expect(withCriteria.body.results[0].error.details.reason).toBe('legacy_scale');
    // A new slip written by an old client stays on the old scale.
    expect((await old(f.s[2]!, 1, 0)).body.results[0].status).toBe('applied');
    expect(await f.row(f.s[2]!)).toMatchObject({ stars: 1, scale: 3 });
    // A legacy draft moves to the five-criteria scale when edited with criteria.
    expect((await f.send([command('slip.set', { session_id: f.ses, student_id: f.s[1], criteria: 15, note: '' }, 1)])).body.results[0].error.details.reason)
      .toBe('comment_required');
    const upgraded = await f.send([command('slip.set', { session_id: f.ses, student_id: f.s[1], criteria: 15, comment: 'Legacy upgrade.', note: '' }, 1)]);
    expect(upgraded.body.results[0].status).toBe('applied');
    expect(await f.row(f.s[1]!)).toMatchObject({ stars: 4, scale: 5, criteria: 15 });
    expect((await old(f.s[1]!, 2, 2)).body.results[0].error.details.reason).toBe('criteria_required');
    // The parent keeps getting stars 1..3 with scale 3 and no new-scale text.
    const seen = (await f.parentSlips()).find((x: any) => x.student_id === f.s[0]);
    expect(seen).toMatchObject({ stars: 3, scale: 3, comment: null });
    expect(seen).not.toHaveProperty('criteria');
  });

  it('sends client defaults for new slips and preserves existing slips', async () => {
    const f = await setup();
    const [present, late, absent, opened] = f.s as [string, string, string, string];
      await f.send([attend(f, present, 'present'), attend(f, late, 'late'), attend(f, absent, 'absent'), attend(f, opened, 'absent'),
        command('slip.set', { session_id: f.ses, student_id: opened, criteria: 3, comment: 'Keep existing.', note: '' })]);
    const sent = await f.send([command('slip.send', { session_id: f.ses, student_ids: [present, late, absent, opened], defaults: [
      { student_id: present, criteria: 31, comment: 'Present default.' },
      { student_id: late, criteria: 23, comment: 'Late default.' },
      { student_id: opened, criteria: 0, comment: 'Ignore for existing slip.' },
    ] })]);
    const result = sent.body.results[0];
    expect(result.status).toBe('applied');
    expect([...result.sent].sort()).toEqual([present, late, opened].sort());
    expect(result.skipped).toEqual([{ student_id: absent, reason: 'not_attended' }]);
    expect(await f.row(present)).toMatchObject({ stars: 5, scale: 5, criteria: 31, comment: 'Present default.', status: 'sent' });
    expect(await f.row(late)).toMatchObject({ stars: 4, scale: 5, criteria: 23, comment: 'Late default.', status: 'sent' });
    expect(await f.row(opened)).toMatchObject({ stars: 2, criteria: 3, comment: 'Keep existing.', status: 'sent' });
    expect(await f.row(absent)).toBeNull();
    const view = (await f.parentSlips()).find((x: any) => x.student_id === present);
    expect(view).toMatchObject({ stars: 5, scale: 5, comment: 'Present default.' });
      expect(view).not.toHaveProperty('criteria');
      expect(view).not.toHaveProperty('note');
      expect(view).not.toHaveProperty('hw_manual');
    const again = await f.send([command('slip.send', { session_id: f.ses, student_ids: [present] })]);
    expect(again.body.results[0].skipped).toEqual([{ student_id: present, reason: 'already_sent' }]);
  });

  it('skips attended students without defaults and does not rewrite draft slips when homework is graded', async () => {
    const f = await setup(), student=f.s[0]!;
    const next=await insertSession(f.a.workspaceId,f.cls,'2099-01-01',f.a.userId);
    const section=uid();
    await f.send([command('homework.section.upsert',{id:section,session_id:f.ses,kind:'reading'}),
      command('slip.set',{session_id:next,student_id:student,criteria:31,comment:'Draft stays.',note:''})]);
    await f.send([attend(f,student,'present')]);
    const noDefault=await f.send([command('slip.send',{session_id:f.ses,student_ids:[student]})]);
    expect(noDefault.body.results[0].skipped).toEqual([{student_id:student,reason:'no_default'}]);
    const grade=(level:string)=>f.send([command('homework.grade.set',{section_id:section,student_id:student,level})]);
    const before=await db.prepare('SELECT criteria,stars,version,comment FROM session_comments WHERE session_id=? AND student_id=?').bind(next,student).first<any>();
    expect((await grade('not_done')).body.results[0].status).toBe('applied');
    expect(await db.prepare('SELECT criteria,stars,version,comment FROM session_comments WHERE session_id=? AND student_id=?').bind(next,student).first<any>())
      .toEqual(before);
    expect((await grade('done')).body.results[0].status).toBe('applied');
    expect(await db.prepare('SELECT criteria,stars,version,comment FROM session_comments WHERE session_id=? AND student_id=?').bind(next,student).first<any>())
      .toEqual(before);
  });

  it('stores the supplied client default for a new slip without calculating it from homework', async () => {
    const f=await setup(),student=f.s[0]!;
    const previous=await insertSession(f.a.workspaceId,f.cls,'2000-01-01',f.a.userId);
    const section=uid();
    await f.send([command('homework.section.upsert',{id:section,session_id:previous,kind:'reading'}),
      command('homework.grade.set',{section_id:section,student_id:student,level:'not_done'}),
      attend(f,student,'present')]);
    const sent=await f.send([command('slip.send',{session_id:f.ses,student_ids:[student],defaults:[{student_id:student,criteria:7,comment:'Client homework comment.'}]})]);
    expect(sent.body.results[0].sent).toEqual([student]);
    expect(await f.row(student)).toMatchObject({criteria:7,stars:3,comment:'Client homework comment.',hw_manual:0,status:'sent'});
  });

  it('validates defaults and upgrades a legacy draft only when a default is supplied', async () => {
    const f=await setup(),student=f.s[0]!;
    await f.send([attend(f,student,'present')]);
    const send=(defaults:any)=>f.send([command('slip.send',{session_id:f.ses,student_ids:[student],defaults})]);
    for(const [defaults,reason] of [
      [{},'invalid_defaults'],
      [[{student_id:f.s[1],criteria:1,comment:'valid'}],'invalid_defaults'],
      [[{student_id:student,criteria:32,comment:'valid'}],'invalid_criteria'],
      [[{student_id:student,criteria:1,comment:7}],'invalid_comment'],
      [[{student_id:student,criteria:1,comment:'   '}],'comment_required'],
    ] as const) expect((await send(defaults)).body.results[0].error.details.reason).toBe(reason);

    await db.prepare(`INSERT INTO session_comments
      (workspace_id,class_id,session_id,student_id,stars,scale,criteria,comment,note,status,sent_at,version,created_at,updated_at,updated_by)
      VALUES(?,?,?, ?,NULL,3,NULL,NULL,'','draft',NULL,1,'2026-01-01','2026-01-01',?)`)
      .bind(f.a.workspaceId,f.cls,f.ses,student,f.a.userId).run();
    const noDefault=await send(undefined);
    expect(noDefault.body.results[0].skipped).toEqual([{student_id:student,reason:'no_default'}]);
    const upgraded=await send([{student_id:student,criteria:0,comment:'Legacy default.'}]);
    expect(upgraded.body.results[0].sent).toEqual([student]);
    expect(await f.row(student)).toMatchObject({stars:0,scale:5,criteria:0,comment:'Legacy default.',hw_manual:0,status:'sent'});
  });

  it('does not rewrite a legacy three-star next-session slip when homework is graded', async () => {
    const f=await setup(),student=f.s[0]!;
    const next=await insertSession(f.a.workspaceId,f.cls,'2099-01-01',f.a.userId),section=uid();
    await f.send([command('homework.section.upsert',{id:section,session_id:f.ses,kind:'reading'}),
      command('slip.set',{session_id:next,student_id:student,stars:3,note:''})]);
    const grade=await f.send([command('homework.grade.set',{section_id:section,student_id:student,level:'not_done'})]);
    expect(grade.body.results[0].status).toBe('applied');
    expect(await db.prepare('SELECT stars,scale,criteria,comment,version FROM session_comments WHERE session_id=? AND student_id=?').bind(next,student).first<any>())
      .toMatchObject({stars:3,scale:3,criteria:null,comment:null,version:1});
  });

  it('keeps sent five-criteria slips unchanged when prior homework is regraded', async () => {
    const f=await setup(),student=f.s[0]!;
    const next=await insertSession(f.a.workspaceId,f.cls,'2099-01-01',f.a.userId),section=uid();
    await f.send([command('homework.section.upsert',{id:section,session_id:f.ses,kind:'reading'}),
      command('slip.set',{session_id:next,student_id:student,criteria:31,comment:'Sent comment.',note:''})]);
    const sent=await f.send([command('slip.send',{session_id:next,student_ids:[student]})]);
    expect(sent.body.results[0].sent).toEqual([student]);
    const regrade=(level:string)=>f.send([command('homework.grade.set',{section_id:section,student_id:student,level})]);
    expect((await regrade('done')).body.results[0].status).toBe('applied');
    expect((await regrade('not_done')).body.results[0].status).toBe('applied');
    expect(await db.prepare('SELECT criteria,stars,comment,version,status,hw_manual FROM session_comments WHERE session_id=? AND student_id=?').bind(next,student).first<any>())
        .toMatchObject({criteria:31,stars:5,comment:'Sent comment.',version:2,status:'sent',hw_manual:0});
  });

  it('does not create a default slip when attendance changed after it was read', async () => {
    const f = await setup();
    const student = f.s[0]!;
    await f.send([attend(f, student, 'present')]);
    await db.prepare("UPDATE attendance SET status='absent',version=version+1 WHERE session_id=? AND student_id=?").bind(f.ses, student).run();
    const sent = await f.send([command('slip.send', { session_id: f.ses, student_ids: [student] })]);
    expect(sent.body.results[0].skipped).toEqual([{ student_id: student, reason: 'not_attended' }]);
    expect(await f.row(student)).toBeNull();
  });

  it('builds monthly report batches and counts sent slips by stars per scale', async () => {
    const f = await setup();
    const month = today().slice(0, 7);
    const [s1, s2] = f.s as [string, string];
    await f.send([attend(f, s1, 'present'), attend(f, s2, 'present'),
      command('slip.set', { session_id: f.ses, student_id: s2, criteria: 7, comment: 'Three criteria met.', note: '' })]);
    await f.send([command('slip.send', { session_id: f.ses, student_ids: [s1, s2] })]);
    await db.prepare(
      `INSERT INTO session_comments(workspace_id,class_id,session_id,student_id,stars,scale,criteria,comment,note,status,sent_at,version,created_at,updated_at)
       SELECT ?,?,?,?,2,3,NULL,NULL,'','sent','2026-01-01',1,'2026-01-01','2026-01-01'
       WHERE NOT EXISTS(SELECT 1 FROM session_comments WHERE session_id=? AND student_id=?)`)
      .bind(f.a.workspaceId, f.cls, f.ses, f.s[3], f.ses, f.s[3]).run();

    const id = uid();
    const create = (body: any) => call(`/v1/classes/${f.cls}/report-batches`, post(body), f.a.token);
    const first = await create({ month, id });
    expect(first.status).toBe(201);
    expect(first.body.batch).toMatchObject({ id, month, from_session_id: null, to_session_id: null,
      from_key: `${month}-01 00:00`, from_number: null, to_number: null });
    expect(first.body.batch.to_key.startsWith(`${month}-`)).toBe(true);
    expect(first.body.reports).toHaveLength(4);
    expect((await create({ month, id })).status).toBe(200);
    expect((await create({ month: '2020-01', id })).status).toBe(409);
    expect((await create({ month })).status).toBe(201);
    for (const bad of ['2026-13', '2026-1', 7, null])
      expect((await create({ month: bad })).status).toBe(422);

    const report = (student: string) => first.body.reports.find((r: any) => r.student_id === student).report_id;
    const preview = async (student: string) => (await call(`/v1/reports/${report(student)}/preview`, {}, f.a.token)).body;
    const p2 = await preview(s2);
    expect(p2.snapshot?.stars5 ?? p2.stars5).toMatchObject({ s5: 0, s3: 1 });
    const p4 = await preview(f.s[3]!);
    expect(p4.snapshot?.stars ?? p4.stars).toMatchObject({ two: 1 });
    expect((p4.snapshot?.stars5 ?? p4.stars5)).toMatchObject({ s5: 0, s4: 0, s3: 0, s2: 0, s1: 0, s0: 0 });
  });
});
