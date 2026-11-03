import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import app from '../src/index';
import type { Env } from '../src/types';
import { call, post, put, testEnv, db, registerWorkspace, fakePhone, insertUser, insertClass, insertStudent,
  insertAttendance, insertSession, insertGuardianMembership, clubToken } from './helpers';

beforeEach(async () => { await db.prepare('DELETE FROM auth_throttle').run(); });
const uid = () => crypto.randomUUID();
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const command = (type: string, payload: any, base_version = 0) =>
  ({ id: uid(), type, payload, base_version, created_at: new Date().toISOString() });
/** Mức mặc định: focus+Tốt, mastery+Tốt, homework+Tốt, participation+Đạt, notes+Cần cố gắng. */
const levels = (over: Record<string, string> = {}) =>
  ({ focus: 'good', participation: 'ok', mastery: 'good', notes: 'needs_work', homework: 'good', ...over });

/** Env có bật/tắt cờ THỬ NGHIỆM `CRITERIA_LEVELS` (các binding khác đi qua nguyên vẹn). */
const flagged = (on: boolean): Env =>
  new Proxy(testEnv, { get: (target, key) => (key === 'CRITERIA_LEVELS' ? (on ? '1' : undefined) : Reflect.get(target, key)) });
async function callFlag(on: boolean, path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  if (token !== undefined) headers.set('authorization', `Bearer ${token}`);
  if (init.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await app.request(`https://api.test${path}`, { ...init, headers }, flagged(on));
  const text = await response.text();
  return { status: response.status, body: text === '' ? null : JSON.parse(text) as any };
}

async function setup() {
  const a = await registerWorkspace(fakePhone(), 'Criteria levels');
  const cls = await insertClass(a.workspaceId, 'C1', a.userId);
  const students: string[] = [];
  for (const name of ['S1', 'S2', 'S3']) students.push(await insertStudent(a.workspaceId, cls, name, null, a.userId));
  await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE workspace_id=?").bind(a.workspaceId).run();
  const ses = await insertSession(a.workspaceId, cls, today(), a.userId);
  await Promise.all(students.map((id) => insertAttendance(a.workspaceId, cls, ses, id, 'present', a.userId)));
  const parentUser = await insertUser(fakePhone());
  const parent = await insertGuardianMembership(a.workspaceId, parentUser, a.roles.guardian!, [students[0]!]);
  const teacher = { token: a.token, mid: a.membershipId };
  const guardian = { token: await clubToken(a.workspaceId, parentUser, parent), mid: parent };
  const send = (commands: any[], on = true) =>
    callFlag(on, '/v1/sync/push', post({ membership_id: a.membershipId, device_id: uid(), commands }), a.token);
  const page = async (entity: string, who: { token: string; mid: string }, on = true) =>
    (await callFlag(on, `/v1/sync/snapshot/${entity}?membership_id=${who.mid}`, {}, who.token)).body.items;
  const slips = (who: { token: string; mid: string }, on = true) =>
    callFlag(on, `/v1/sessions/${ses}/slips`, {}, who.token);
  const row = (student: string = students[0]!) =>
    db.prepare('SELECT * FROM session_comments WHERE session_id=? AND student_id=?').bind(ses, student).first<any>();
  const sessionRow = async () => db.prepare('SELECT * FROM class_sessions WHERE id=?').bind(ses).first<any>();
  const slipSet = (payload: any, base = 0, on = true) =>
    send([command('slip.set', { session_id: ses, student_id: students[0], note: '', ...payload }, base)], on);
  return { a, cls, students, ses, teacher, guardian, send, page, slips, row, sessionRow, slipSet };
}

describe('criteria levels flag off', () => {
  it('rejects levels, skill_levels and session.lesson.set with feature_disabled', async () => {
    const f = await setup();
    const results = await f.send([
      command('slip.set', { session_id: f.ses, student_id: f.students[0], levels: levels(), comment: 'Câu.' }),
      command('slip.set', { session_id: f.ses, student_id: f.students[1], skill_levels: { speaking: 'good' }, note: '' }),
      command('session.lesson.set', { session_id: f.ses, topics: ['speaking'], graded_skills: [] }),
      command('slip.set', { session_id: f.ses, student_id: f.students[2], criteria: 31, comment: 'Câu cũ.' }),
    ], false);
    expect(results.body.results.map((r: any) => r.status)).toEqual(['rejected', 'rejected', 'rejected', 'applied']);
    expect(results.body.results.slice(0, 3).map((r: any) => r.error.code)).toEqual(['feature_disabled', 'feature_disabled', 'feature_disabled']);
    // Cờ tắt: phiếu kiểu cũ vẫn ghi như trước và không có levels.
    expect(await f.row(f.students[2]!)).toMatchObject({ stars: 5, scale: 5, criteria: 31, levels: null, skill_levels: null });
    expect(await f.sessionRow()).toMatchObject({ today_topics: null, graded_skills: null, version: 1 });
  });

  it('keeps old slip and session JSON free of the new keys', async () => {
    const f = await setup();
    await f.send([command('slip.set', { session_id: f.ses, student_id: f.students[0], criteria: 21, comment: 'Câu cũ.', note: 'x' })], false);
    const slip = (await f.page('slip', f.teacher, false)).find((x: any) => x.student_id === f.students[0]);
    expect(Object.keys(slip).sort()).toEqual(['comment', 'criteria', 'hw_manual', 'note', 'scale', 'sent_at', 'session_id',
      'stars', 'status', 'student_id', 'updated_at', 'version']);
    const session = (await f.page('class_session', f.teacher, false)).find((x: any) => x.id === f.ses);
    expect(Object.keys(session).sort()).toEqual(['class_id', 'date', 'id', 'is_makeup', 'note', 'origin', 'start_time', 'status', 'version']);
  });
});

describe('criteria levels writes', () => {
  it('derives criteria and stars from levels, ignoring client criteria, and stores skill levels', async () => {
    const f = await setup();
    const applied = await f.slipSet({
      levels: levels(), skill_levels: { speaking: 'good', reading: 'ok' },
      criteria: 31, stars: 5, comment: '  Con học tốt hôm nay.  ',
    });
    expect(applied.body.results[0]).toMatchObject({ status: 'applied', version: 1 });
    expect(await f.row()).toMatchObject({
      stars: 3, scale: 5, criteria: 21, comment: 'Con học tốt hôm nay.', levels: JSON.stringify(levels()),
      skill_levels: JSON.stringify({ speaking: 'good', reading: 'ok' }), status: 'draft',
    });
    // Không gửi skill_levels thì giữ map cũ của phiếu; gửi {} thì xoá hết.
    expect((await f.slipSet({ levels: levels({ notes: 'ok' }), comment: 'Câu mới.' }, 1)).body.results[0].status).toBe('applied');
    expect(await f.row()).toMatchObject({ stars: 3, criteria: 21, skill_levels: JSON.stringify({ speaking: 'good', reading: 'ok' }) });
    expect((await f.slipSet({ levels: levels(), skill_levels: {}, comment: 'Câu khác.' }, 2)).body.results[0].status).toBe('applied');
    expect(await f.row()).toMatchObject({ skill_levels: '{}', levels: JSON.stringify(levels()) });
  });

  it('rejects malformed levels, malformed skill levels and skill levels without levels', async () => {
    const f = await setup();
    const set = (extra: any, base = 0) => f.slipSet({ comment: 'Câu.', ...extra }, base);
    const missing = levels(); delete (missing as any).notes;
    for (const bad of [null, [], 'good', 7, missing, { ...levels(), extra: 'good' }, levels({ focus: 'great' })])
      expect((await set({ levels: bad })).body.results[0].error.details.reason).toBe('invalid_levels');
    for (const bad of [null, [], 'good', { dancing: 'good' }, { speaking: 'great' }])
      expect((await set({ levels: levels(), skill_levels: bad })).body.results[0].error.details.reason).toBe('invalid_skill_levels');
    // Chưa có `levels` trên phiếu và payload cũng không có ⇒ invalid_skill_levels.
    expect((await set({ skill_levels: { speaking: 'good' } })).body.results[0].error.details.reason).toBe('invalid_skill_levels');
    expect((await set({ levels: levels(), comment: '   ' })).body.results[0].error.details.reason).toBe('comment_required');
    expect(await f.row()).toBeNull();
    // Có levels trên phiếu rồi thì sửa riêng skill_levels được.
    expect((await f.slipSet({ levels: levels(), comment: 'Câu.' })).body.results[0].status).toBe('applied');
    expect((await set({ skill_levels: { vocabulary: 'ok' } }, 1)).body.results[0].status).toBe('applied');
    expect(await f.row()).toMatchObject({ skill_levels: JSON.stringify({ vocabulary: 'ok' }), levels: JSON.stringify(levels()) });
  });

  it('wipes levels for old payloads and keeps them for note-only edits', async () => {
    const f = await setup();
    await f.slipSet({ levels: levels(), skill_levels: { speaking: 'good' }, comment: 'Câu mức.' });
    expect((await f.slipSet({ note: 'ghi chú thêm' }, 1)).body.results[0].status).toBe('applied');
    expect(await f.row()).toMatchObject({ note: 'ghi chú thêm', comment: 'Câu mức.', levels: JSON.stringify(levels()), skill_levels: JSON.stringify({ speaking: 'good' }) });
    expect((await f.slipSet({ comment: 'Câu sửa tay.' }, 2)).body.results[0].status).toBe('applied');
    expect(await f.row()).toMatchObject({ comment: 'Câu sửa tay.', levels: JSON.stringify(levels()) });
    // Client cũ (criteria, không levels) là nguồn đúng ⇒ bỏ dữ liệu mức.
    expect((await f.slipSet({ criteria: 9, comment: 'Câu bit.' }, 3)).body.results[0].status).toBe('applied');
    expect(await f.row()).toMatchObject({ stars: 2, criteria: 9, comment: 'Câu bit.', levels: null, skill_levels: null });
  });

  it('still edits levels on a slip that was already sent', async () => {
    const f = await setup();
    await f.slipSet({ levels: levels(), skill_levels: { speaking: 'ok' }, comment: 'Câu gửi.' });
    await f.send([command('slip.send', { session_id: f.ses, student_ids: [f.students[0]] })]);
    expect(await f.row()).toMatchObject({ status: 'sent' });
    const edited = await f.slipSet({ levels: levels({ notes: 'good', mastery: 'needs_work' }), skill_levels: { speaking: 'good' }, comment: 'Câu sửa sau khi gửi.' }, 2);
    expect(edited.body.results[0].status).toBe('applied');
    expect(await f.row()).toMatchObject({
      status: 'sent', stars: 3, criteria: 1 + 8 + 16, comment: 'Câu sửa sau khi gửi.',
      levels: JSON.stringify(levels({ notes: 'good', mastery: 'needs_work' })),
    });
    const mine = (await f.slips(f.guardian)).body.items.find((x: any) => x.student_id === f.students[0]);
    expect(mine).toMatchObject({ status: 'sent', comment: 'Câu sửa sau khi gửi.', levels: levels({ notes: 'good', mastery: 'needs_work' }) });
  });

  it('creates default slips with levels on class send and still skips absences', async () => {
    const f = await setup();
    await db.prepare("UPDATE attendance SET status='absent' WHERE session_id=? AND student_id=?")
      .bind(f.ses, f.students[2]).run();
    const sent = await f.send([command('slip.send', {
      session_id: f.ses, student_ids: f.students,
      defaults: [{ student_id: f.students[0], levels: levels(), skill_levels: { speaking: 'good' }, comment: 'Câu mặc định.' }],
    })]);
    expect(sent.body.results[0]).toMatchObject({ status: 'applied', sent: [f.students[0]] });
    expect(sent.body.results[0].skipped).toEqual([
      { student_id: f.students[1], reason: 'no_default' },
      { student_id: f.students[2], reason: 'absent' },
    ]);
    expect(await f.row(f.students[0]!)).toMatchObject({
      status: 'sent', stars: 3, criteria: 21, levels: JSON.stringify(levels()),
      skill_levels: JSON.stringify({ speaking: 'good' }), comment: 'Câu mặc định.',
    });
    expect(await f.row(f.students[1]!)).toBeNull();
  });

  it('keeps legacy three-star slips out of the levels path', async () => {
    const f = await setup();
    await db.prepare(
      `INSERT INTO session_comments(workspace_id,class_id,session_id,student_id,stars,scale,criteria,comment,note,status,sent_at,version,created_at,updated_at)
       VALUES(?,?,?,?,2,3,NULL,NULL,'','sent','2026-01-01',1,'2026-01-01','2026-01-01')`)
      .bind(f.a.workspaceId, f.cls, f.ses, f.students[0]).run();
    expect((await f.slipSet({ levels: levels(), comment: 'Câu.' }, 1)).body.results[0].error.details.reason).toBe('legacy_scale');
    expect((await f.slipSet({ skill_levels: { speaking: 'good' } }, 1)).body.results[0].error.details.reason).toBe('invalid_skill_levels');
    expect(await f.row()).toMatchObject({ scale: 3, stars: 2, levels: null, skill_levels: null });
  });

  it('stores today_topics and graded_skills with session.lesson.set', async () => {
    const f = await setup();
    const applied = await f.send([command('session.lesson.set', { session_id: f.ses, topics: ['speaking', 'grammar'], graded_skills: ['speaking'] })]);
    expect(applied.body.results[0]).toMatchObject({ status: 'applied', version: 2 });
    expect(await f.sessionRow()).toMatchObject({
      today_topics: JSON.stringify(['speaking', 'grammar']), graded_skills: JSON.stringify(['speaking']), version: 2,
    });
    const session = (await f.page('class_session', f.teacher)).find((x: any) => x.id === f.ses);
    expect(session).toMatchObject({ today_topics: ['speaking', 'grammar'], graded_skills: ['speaking'] });
    const guardianSession = (await f.page('class_session', f.guardian)).find((x: any) => x.id === f.ses);
    expect(guardianSession).toMatchObject({ today_topics: ['speaking', 'grammar'], graded_skills: ['speaking'] });
    expect(guardianSession).not.toHaveProperty('note');
    // Mảng rỗng hợp lệ và lưu []; đổi topics không đụng phiếu nào.
    expect((await f.send([command('session.lesson.set', { session_id: f.ses, topics: [], graded_skills: [] }, 2)])).body.results[0].status).toBe('applied');
    expect(await f.sessionRow()).toMatchObject({ today_topics: '[]', graded_skills: '[]', version: 3 });
    expect(await f.row()).toBeNull();
    const empty = (await f.page('class_session', f.teacher)).find((x: any) => x.id === f.ses);
    expect(empty).toMatchObject({ today_topics: [], graded_skills: [] });
  });

  it('validates session.lesson.set payloads and rejects cancelled sessions', async () => {
    const f = await setup();
    const lesson = (payload: any, base = 0) => f.send([command('session.lesson.set', { session_id: f.ses, ...payload }, base)]);
    for (const bad of [undefined, null, 'speaking', ['dancing'], ['speaking', 'speaking']])
      expect((await lesson({ topics: bad, graded_skills: [] })).body.results[0].error.details.reason).toBe('invalid_topics');
    for (const bad of [undefined, null, 'speaking', ['dancing'], ['reading']])
      expect((await lesson({ topics: ['speaking'], graded_skills: bad })).body.results[0].error.details.reason).toBe('invalid_graded_skills');
    expect((await lesson({ topics: ['speaking'], graded_skills: [] })).body.results[0].status).toBe('applied');
    // Lệch base_version như `test.update`: chỉ base_version ở tương lai bị từ chối, bản cũ vẫn áp dụng.
    const ahead = await lesson({ topics: [], graded_skills: [] }, 9);
    expect(ahead.body.results[0]).toMatchObject({ status: 'rejected', error: { details: { reason: 'base_version_ahead' } } });
    expect((await lesson({ topics: ['reading'], graded_skills: ['reading'] }, 1)).body.results[0]).toMatchObject({ status: 'applied', version: 3 });
    const cancelled = await insertSession(f.a.workspaceId, f.cls, '2026-01-05', f.a.userId, 'cancelled');
    expect((await f.send([command('session.lesson.set', { session_id: cancelled, topics: ['speaking'], graded_skills: [] })])).body.results[0])
      .toMatchObject({ status: 'rejected', error: { details: { reason: 'session_cancelled' } } });
  });

  it('applies session.lesson.set once for a retried command id', async () => {
    const f = await setup();
    const once = command('session.lesson.set', { session_id: f.ses, topics: ['writing'], graded_skills: ['writing'] });
    expect((await f.send([once])).body.results[0]).toMatchObject({ status: 'applied', version: 2 });
    expect((await f.send([once])).body.results[0]).toMatchObject({ status: 'duplicate', original_status: 'applied' });
    expect(await f.sessionRow()).toMatchObject({ today_topics: JSON.stringify(['writing']), version: 2 });
    const log = await db.prepare(`SELECT count(*) AS n FROM applied_commands WHERE workspace_id=? AND command_id=?`)
      .bind(f.a.workspaceId, once.id).first<any>();
    expect(log!.n).toBe(1);
  });
});

describe('criteria levels reads and reports', () => {
  it('returns levels to teachers and guardians, and keeps old slip JSON unchanged', async () => {
    const f = await setup();
    await f.slipSet({ levels: levels(), skill_levels: { speaking: 'good' }, comment: 'Câu mức.', note: 'ghi chú' });
    await f.slipSet({ student_id: f.students[1], criteria: 31, comment: 'Câu cũ.' }, 0, true);
    await f.send([command('slip.send', { session_id: f.ses, student_ids: f.students.slice(0, 2) })]);

    const teacherSlips = (await f.slips(f.teacher)).body.items;
    const teacherLevel = teacherSlips.find((x: any) => x.student_id === f.students[0]);
    expect(teacherLevel).toMatchObject({
      levels: levels(), skill_levels: { speaking: 'good' }, criteria: 21, stars: 3, scale: 5, note: 'ghi chú',
    });
    const teacherBits = teacherSlips.find((x: any) => x.student_id === f.students[1]);
    expect(teacherBits).not.toHaveProperty('levels');
    expect(teacherBits).not.toHaveProperty('skill_levels');

    const guardianSlips = (await f.slips(f.guardian)).body.items;
    const guardianLevel = guardianSlips.find((x: any) => x.student_id === f.students[0]);
    expect(guardianLevel).toMatchObject({ levels: levels(), skill_levels: { speaking: 'good' }, comment: 'Câu mức.\nghi chú' });
    expect(guardianLevel).not.toHaveProperty('criteria');
    expect(guardianLevel).not.toHaveProperty('hw_manual');
    expect(guardianLevel).not.toHaveProperty('note');

    const pulled = (await callFlag(true, `/v1/sync/pull?membership_id=${f.guardian.mid}&cursor=0&epoch=1&limit=200`, {}, f.guardian.token)).body;
    expect(pulled.upserts.slip).toContainEqual(expect.objectContaining({ student_id: f.students[0], levels: levels(), skill_levels: { speaking: 'good' } }));
    const teacherPull = (await callFlag(true, `/v1/sync/pull?membership_id=${f.teacher.mid}&cursor=0&epoch=1&limit=200`, {}, f.teacher.token)).body;
    expect(teacherPull.upserts.slip.find((x: any) => x.student_id === f.students[1])).not.toHaveProperty('levels');
  });

  it('adds criteria_summary and skill_summary only with the flag on and sent slips carrying levels', async () => {
    const f = await setup();
    const month = '2026-10', now = new Date().toISOString();
    // Ba phiếu trong tháng: hai ĐÃ GỬI của S1, một NHÁP của S1 (không được đếm).
    const monthSessionA = await insertSession(f.a.workspaceId, f.cls, '2026-10-21', f.a.userId);
    const monthSessionB = await insertSession(f.a.workspaceId, f.cls, '2026-10-22', f.a.userId);
    const att = (sessionId: string) => db.prepare(`INSERT INTO attendance(workspace_id,class_id,session_id,student_id,status,note,version,created_at,updated_at)
      VALUES(?,?,?,?,'present','',1,?,?)`).bind(f.a.workspaceId, f.cls, sessionId, f.students[0], now, now).run();
    await att(monthSessionA);
    await att(monthSessionB);
    const slip = (sessionId: string, student: string, values: any, status: 'draft' | 'sent') => db.prepare(
      `INSERT INTO session_comments(workspace_id,class_id,session_id,student_id,stars,scale,criteria,comment,note,hw_manual,levels,skill_levels,status,sent_at,version,created_at,updated_at)
       VALUES(?,?,?,?,3,5,21,'Câu.','',0,?,?,?,?,1,?,?)`)
      .bind(f.a.workspaceId, f.cls, sessionId, student, JSON.stringify(values.levels), values.skill_levels === undefined ? null : JSON.stringify(values.skill_levels),
        status, status === 'sent' ? now : null, now, now).run();
    await slip(monthSessionA, f.students[0]!, { levels: levels(), skill_levels: { speaking: 'good' } }, 'sent');
    await slip(monthSessionB, f.students[0]!, { levels: levels({ focus: 'needs_work' }), skill_levels: { speaking: 'ok', reading: 'good' } }, 'sent');
    await slip(f.ses, f.students[0]!, { levels: levels({ focus: 'needs_work' }) }, 'draft');
    // Phiếu của em khác không vào báo cáo của S1.
    await slip(f.ses, f.students[1]!, { levels: levels({ focus: 'needs_work' }) }, 'sent');

    const preview = await callFlag(true, `/v1/students/${f.students[0]}/report-preview?month=${month}`, {}, f.a.token);
    expect(preview.status).toBe(200);
    expect(preview.body.criteria_summary).toEqual({
      focus: { good: 1, ok: 0, needs_work: 1 },
      participation: { good: 0, ok: 2, needs_work: 0 },
      mastery: { good: 2, ok: 0, needs_work: 0 },
      notes: { good: 0, ok: 0, needs_work: 2 },
      homework: { good: 2, ok: 0, needs_work: 0 },
    });
    expect(preview.body.skill_summary).toEqual({
      reading: { good: 1, ok: 0, needs_work: 0, sessions: 1 },
      speaking: { good: 1, ok: 1, needs_work: 0, sessions: 2 },
    });
    // Cờ tắt ⇒ hai khoá vắng hẳn (snapshot y như cũ).
    const off = await callFlag(false, `/v1/students/${f.students[0]}/report-preview?month=${month}`, {}, f.a.token);
    expect(off.body).not.toHaveProperty('criteria_summary');
    expect(off.body).not.toHaveProperty('skill_summary');

    // Bản xem trước và bản phát hành của đợt báo cáo cũng có hai khoá khi cờ bật.
    const batch = await callFlag(true, `/v1/classes/${f.cls}/report-batches`, post({ from_session_id: monthSessionA, to_session_id: monthSessionB }), f.a.token);
    const reportId = batch.body.reports[0].report_id;
    const rangePreview = await callFlag(true, `/v1/reports/${reportId}/preview`, {}, f.a.token);
    expect(rangePreview.body.criteria_summary.focus).toEqual({ good: 1, ok: 0, needs_work: 1 });
    expect(rangePreview.body.skill_summary.speaking).toMatchObject({ good: 1, ok: 1, sessions: 2 });
    await callFlag(true, `/v1/reports/${reportId}`, put({ general_comment: 'Nhận xét chung.' }), f.a.token);
    const published = await callFlag(true, `/v1/reports/${reportId}/publish`, post({}), f.a.token);
    expect(published.status).toBe(201);
    expect(published.body.snapshot.criteria_summary.mastery).toEqual({ good: 2, ok: 0, needs_work: 0 });
    // Cờ tắt: cùng báo cáo đó không có hai khoá mới.
    const offPreview = await callFlag(false, `/v1/reports/${reportId}/preview`, {}, f.a.token);
    expect(offPreview.body).not.toHaveProperty('criteria_summary');
    expect(offPreview.body).not.toHaveProperty('skill_summary');
  });

  it('has the 0016 columns and keeps the existing behavior without any levels slip', async () => {
    const columns = async (table: string) =>
      (await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>()).results.map((c) => c.name);
    expect(await columns('session_comments')).toEqual(expect.arrayContaining(['levels', 'skill_levels']));
    expect(await columns('class_sessions')).toEqual(expect.arrayContaining(['today_topics', 'graded_skills']));
    const f = await setup();
    const month = '2026-10';
    const preview = await callFlag(true, `/v1/students/${f.students[0]}/report-preview?month=${month}`, {}, f.a.token);
    expect(preview.body).not.toHaveProperty('criteria_summary');
    expect(preview.body).not.toHaveProperty('skill_summary');
    // 200 mức: vẫn cần `comment`, vẫn qua cổng điểm danh như cũ.
    await db.prepare("DELETE FROM attendance WHERE session_id=? AND student_id=?").bind(f.ses, f.students[0]).run();
    expect((await f.slipSet({ levels: levels(), comment: 'Câu.' })).body.results[0].error.code).toBe('attendance_incomplete');
    expect((await call('/v1/sessions/' + f.ses + '/slips', {}, f.a.token)).status).toBe(200);
  });
});
