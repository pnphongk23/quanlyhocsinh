import { beforeAll, describe, expect, it } from 'vitest';
import {
  call, clubToken, db, fakePhone, insertClass, insertGuardianMembership, insertMembership, insertSession,
  insertStudent, insertTest, insertUser, post, put, registerWorkspace,
} from './helpers';

const NIL = '00000000-0000-4000-8000-000000000001';

describe('report batches by session range', () => {
  let f: {
    classId: string; otherClassId: string; ws: Awaited<ReturnType<typeof registerWorkspace>>;
    sessions: Record<string, string>; students: Record<string, string>;
    teacher: string; assistant: string; otherAssistant: string; teacherOther: string; otherWorkspace: string;
    guardianA: string; guardianAMembership: string; guardianB: string; otherWsSession: string;
  };
  const batchesOf = async (token = f.ws.token) =>
    (await call(`/v1/classes/${f.classId}/report-batches`, {}, token)).body.items as any[];
  const create = (from: string, to: string, token = f.ws.token, extra: object = {}) =>
    call(`/v1/classes/${f.classId}/report-batches`, post({ from_session_id: f.sessions[from], to_session_id: f.sessions[to], ...extra }), token);

  beforeAll(async () => {
      const ws = await registerWorkspace(fakePhone(), 'report batches workspace');
      await db.prepare("UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'")
        .bind(ws.roles.assistant).run();
    const classId = await insertClass(ws.workspaceId, 'C1', ws.userId);
    const otherClassId = await insertClass(ws.workspaceId, 'C2', ws.userId);
    const sessions = {
      s1: await insertSession(ws.workspaceId, classId, '2026-10-01', ws.userId, 'held'),
      s2: await insertSession(ws.workspaceId, classId, '2026-10-03', ws.userId, 'held'),
      s3: await insertSession(ws.workspaceId, classId, '2026-10-05', ws.userId, 'cancelled'),
      s4: await insertSession(ws.workspaceId, classId, '2026-10-07', ws.userId, 'held'),
      s5: await insertSession(ws.workspaceId, classId, '2026-10-09', ws.userId, 'planned'),
      other: await insertSession(ws.workspaceId, otherClassId, '2026-10-02', ws.userId, 'held'),
    };
    const students: Record<string, string> = {};
    const membership: [string, string, string | null][] = [
      ['a', '2026-10-01', null], ['late', '2026-10-08', null], ['early', '2026-08-01', '2026-09-30'],
      ['left', '2026-08-01', '2026-10-04'], ['joined', '2026-10-05', null],
    ];
    for (const [key, enrolled, left] of membership) {
      students[key] = await insertStudent(ws.workspaceId, classId, `Student ${key}`, null, ws.userId);
      await db.prepare(`UPDATE students SET enrolled_at=?, left_at=?, status=? WHERE id=?`)
        .bind(enrolled, left, left ? 'left' : 'active', students[key]).run();
    }
    students.other = await insertStudent(ws.workspaceId, otherClassId, 'Student other', null, ws.userId);
    const member = async (role: string, classes: string[]) => {
      const user = await insertUser(fakePhone());
      return clubToken(ws.workspaceId, user, await insertMembership(ws.workspaceId, user, role, classes));
    };
    const guardian = async (studentId: string) => {
      const user = await insertUser(fakePhone());
      const membershipId = await insertGuardianMembership(ws.workspaceId, user, ws.roles.guardian!, [studentId]);
      return { membershipId, token: await clubToken(ws.workspaceId, user, membershipId) };
    };
    const guardianA = await guardian(students.a!);
      const other = await registerWorkspace(fakePhone(), 'other batches workspace');
      await db.prepare("UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'")
        .bind(other.roles.assistant).run();
    const otherUser = await insertUser(fakePhone());
    const otherClass = await insertClass(other.workspaceId, 'CX', other.userId);
    f = {
      classId, otherClassId, ws, sessions, students,
      teacher: await member(ws.roles.teacher!, [classId]),
      teacherOther: await member(ws.roles.teacher!, [otherClassId]),
      assistant: await member(ws.roles.assistant!, [classId]),
      otherAssistant: await member(ws.roles.assistant!, [otherClassId]),
      guardianA: guardianA.token, guardianAMembership: guardianA.membershipId,
      guardianB: (await guardian(students.other!)).token,
      otherWorkspace: await clubToken(other.workspaceId, otherUser, await insertMembership(other.workspaceId, otherUser, other.roles.teacher!, [otherClass])),
      otherWsSession: await insertSession(other.workspaceId, otherClass, '2026-10-01', other.userId, 'held'),
    };
  });

  it('creates the default batch from the first session to the latest held one with drafts for enrolled students', async () => {
    const result = await create('s1', 's4');
    expect(result.status).toBe(201);
    expect(result.body.batch).toMatchObject({
      class_id: f.classId, from_session_id: f.sessions.s1, to_session_id: f.sessions.s4,
      from_key: '2026-10-01 18:00', to_key: '2026-10-07 18:00', from_number: 1, to_number: 3,
      counts: { total: 3, draft: 3, published: 0, needs_republish: 0 },
    });
    // 'late' joined after the last session, 'early' left before the first one.
    expect(result.body.reports.map((r: any) => r.student_id).sort())
      .toEqual([f.students.a, f.students.left, f.students.joined].sort());
    expect(result.body.reports.every((r: any) => r.status === 'draft' && r.month === '2026-10' && r.batch_id === result.body.batch.id)).toBe(true);
  });

  it('allows an overlapping range and lists newest batch first with live session numbers', async () => {
    const second = await create('s2', 's5');
    expect(second.status).toBe(201);
    expect(second.body.batch).toMatchObject({ from_number: 2, to_number: 4 });
    // a, left (left 10-04 >= 10-03), joined and late (enrolled 10-08 <= 10-09)
    expect(second.body.reports).toHaveLength(4);
    const items = await batchesOf();
    expect(items.map((b) => b.id)).toEqual([second.body.batch.id, items[1].id]);
    expect(items[0].to_key > items[1].to_key).toBe(true);
    expect(items[0]).toMatchObject({ from_number: 2, to_number: 4, counts: { total: 4, draft: 4 } });
  });

  it('validates the range and the sessions', async () => {
    const backwards = await create('s4', 's1');
    expect(backwards.status).toBe(422);
    expect(backwards.body.error.details.reason).toBe('invalid_range');
    for (const [from, to] of [['s3', 's4'], ['s1', 's3']] as const) {
      const cancelled = await create(from, to);
      expect(cancelled.status).toBe(422);
      expect(cancelled.body.error.details.reason).toBe('session_cancelled');
    }
    expect((await call(`/v1/classes/${f.classId}/report-batches`, post({ from_session_id: f.sessions.s1 }), f.ws.token)).status).toBe(422);
    expect((await call(`/v1/classes/${f.classId}/report-batches`, post({ from_session_id: f.sessions.s1, to_session_id: NIL }), f.ws.token)).status).toBe(404);
    expect((await call(`/v1/classes/${f.classId}/report-batches`, post({ from_session_id: f.sessions.s1, to_session_id: f.sessions.other }), f.ws.token)).status).toBe(404);
    expect((await call(`/v1/classes/${NIL}/report-batches`, post({}), f.ws.token)).status).toBe(404);
    expect((await create('s1', 's2', f.ws.token, { id: 'not-a-uuid' })).status).toBe(422);
  });

  it('accepts a client id and replays it without creating another batch', async () => {
    const id = crypto.randomUUID().toUpperCase();
    const before = (await batchesOf()).length;
    const first = await create('s1', 's2', f.ws.token, { id });
    expect(first.status).toBe(201);
    expect(first.body.batch.id).toBe(id.toLowerCase());
    const replay = await create('s1', 's2', f.ws.token, { id });
    expect(replay.status).toBe(200);
    expect(replay.body.batch.id).toBe(id.toLowerCase());
    expect((await create('s1', 's4', f.ws.token, { id })).status).toBe(409);
    expect((await batchesOf()).length).toBe(before + 1);
  });

  it('enforces authorization on every batch endpoint', async () => {
    const batch = (await batchesOf())[0];
    const report = (await call(`/v1/report-batches/${batch.id}/reports`, {}, f.ws.token)).body.items[0];
    for (const token of [f.ws.token, f.teacher, f.assistant]) {
      expect((await call(`/v1/classes/${f.classId}/report-batches`, {}, token)).status).toBe(200);
      expect((await call(`/v1/report-batches/${batch.id}/reports`, {}, token)).status).toBe(200);
      expect((await call(`/v1/reports/${report.report_id}/preview`, {}, token)).status).toBe(200);
    }
    expect((await create('s1', 's2', f.teacher)).status).toBe(201);
    // read-only assistant assigned to the class
    expect((await create('s1', 's2', f.assistant)).status).toBe(403);
    expect((await call(`/v1/reports/${report.report_id}`, put({ general_comment: 'x' }), f.assistant)).status).toBe(403);
    expect((await call(`/v1/reports/${report.report_id}/publish`, post({}), f.assistant)).status).toBe(403);
    expect((await call(`/v1/report-batches/${batch.id}/publish`, post({}), f.assistant)).status).toBe(403);
    // not assigned to the class, other workspace, guardian
    for (const token of [f.otherAssistant, f.teacherOther, f.otherWorkspace]) {
      expect((await call(`/v1/classes/${f.classId}/report-batches`, {}, token)).status).toBe(404);
      expect((await create('s1', 's2', token)).status).toBe(404);
      expect((await call(`/v1/report-batches/${batch.id}/reports`, {}, token)).status).toBe(404);
      expect((await call(`/v1/reports/${report.report_id}/preview`, {}, token)).status).toBe(404);
      expect((await call(`/v1/reports/${report.report_id}`, put({ general_comment: 'x' }), token)).status).toBe(404);
      expect((await call(`/v1/reports/${report.report_id}/publish`, post({}), token)).status).toBe(404);
      expect((await call(`/v1/report-batches/${batch.id}/publish`, post({}), token)).status).toBe(404);
    }
    expect((await call(`/v1/classes/${f.classId}/report-batches`, {}, f.guardianA)).status).toBe(403);
    expect((await create('s1', 's2', f.guardianA)).status).toBe(403);
    expect((await call(`/v1/report-batches/${batch.id}/reports`, {}, f.guardianA)).status).toBe(403);
    expect((await call(`/v1/reports/${report.report_id}/preview`, {}, f.guardianA)).status).toBe(403);
    expect((await call(`/v1/reports/${report.report_id}/publish`, post({}), f.guardianA)).status).toBe(403);
    expect((await call(`/v1/report-batches/${batch.id}/publish`, post({}), f.guardianA)).status).toBe(403);
    expect((await call(`/v1/report-batches/${batch.id}/reports`, {}, f.guardianB)).status).toBe(404);
    expect((await call(`/v1/reports/${report.report_id}/preview`, {}, f.guardianB)).status).toBe(404);
    for (const path of [`/v1/classes/${f.classId}/report-batches`, `/v1/report-batches/${batch.id}/reports`, `/v1/reports/${report.report_id}/preview`])
      expect((await call(path)).status).toBe(401);
    expect((await call(`/v1/report-batches/${NIL}/reports`, {}, f.ws.token)).status).toBe(404);
    expect((await call(`/v1/reports/${NIL}/preview`, {}, f.ws.token)).status).toBe(404);
  });

  it('previews only non-cancelled sessions and tests inside the range', async () => {
    const homework = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, '2026-10-02');
    const outside = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, '2026-10-08');
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at) VALUES(?,?,?,?,8,1,?,?)`)
      .bind(f.ws.workspaceId, f.classId, homework, f.students.a, now, now).run();
    // The published report's full attendance coverage includes the final held session.
    await db.prepare(`INSERT OR IGNORE INTO attendance(workspace_id,class_id,session_id,student_id,status,note,version,created_at,updated_at)
      VALUES(?,?,?,?,'present','',1,?,?)`).bind(f.ws.workspaceId, f.classId, f.sessions.s4, f.students.a, now, now).run();
    for (const [key, status] of [['s1', 'present'], ['s2', 'late'], ['s3', 'present'], ['s5', 'present']] as const)
      await db.prepare(`INSERT INTO attendance(workspace_id,class_id,session_id,student_id,status,note,version,created_at,updated_at) VALUES(?,?,?,?,?,'',1,?,?)`)
        .bind(f.ws.workspaceId, f.classId, f.sessions[key], f.students.a, status, now, now).run();
    const batch = (await batchesOf()).find((b) => b.from_session_id === f.sessions.s1 && b.to_session_id === f.sessions.s4);
    const report = (await call(`/v1/report-batches/${batch.id}/reports`, {}, f.ws.token)).body.items.find((r: any) => r.student_id === f.students.a);
    const preview = await call(`/v1/reports/${report.report_id}/preview`, {}, f.ws.token);
    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({
      batch_id: batch.id, student_id: f.students.a, month: '2026-10',
      range: { from_key: '2026-10-01 18:00', to_key: '2026-10-07 18:00', from_number: 1, to_number: 3, session_count: 3 },
        attendance: { present: 2, late: 1, excused: 0, absent: 0, held_sessions: 3 },
    });
    expect(preview.body.tests).toEqual([expect.objectContaining({ test_id: homework, value: 8 })]);
    expect(preview.body.tests.map((t: any) => t.test_id)).not.toContain(outside);
  });

  it('bounds range statistics to each student enrollment dates', async () => {
    const joined = await insertStudent(f.ws.workspaceId, f.classId, 'Joined mid-range', null, f.ws.userId);
    const left = await insertStudent(f.ws.workspaceId, f.classId, 'Left mid-range', null, f.ws.userId);
    await db.prepare(`UPDATE students SET enrolled_at='2026-10-03' WHERE id=?`).bind(joined).run();
    await db.prepare(`UPDATE students SET enrolled_at='2026-08-01',left_at='2026-10-01',status='left' WHERE id=?`).bind(left).run();
    const batch = await create('s1', 's2');
    const joinedReport = batch.body.reports.find((r: any) => r.student_id === joined);
    const leftReport = batch.body.reports.find((r: any) => r.student_id === left);
    const t1 = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, '2026-10-01');
    const t3 = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, '2026-10-03');
    const now = new Date().toISOString();
    const attendance = (studentId: string, sessionId: string) => db.prepare(`INSERT INTO attendance(workspace_id,class_id,session_id,student_id,status,note,version,created_at,updated_at)
      VALUES(?,?,?,?, 'present','',1,?,?)`).bind(f.ws.workspaceId, f.classId, sessionId, studentId, now, now).run();
    const score = (studentId: string, testId: string) => db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
      VALUES(?,?,?,?,8,1,?,?)`).bind(f.ws.workspaceId, f.classId, testId, studentId, now, now).run();
    await Promise.all([
      attendance(joined, f.sessions.s2!), attendance(left, f.sessions.s1!),
      score(joined, t3), score(left, t1), score(left, t3), score(f.students.a!, t1), score(f.students.a!, t3),
    ]);
    const [joinedPreview, leftPreview] = await Promise.all([
      call(`/v1/reports/${joinedReport.report_id}/preview`, {}, f.ws.token),
      call(`/v1/reports/${leftReport.report_id}/preview`, {}, f.ws.token),
    ]);
    expect(joinedPreview.body).toMatchObject({ range: { session_count: 1 }, attendance: { present: 1, held_sessions: 1 }, tests: [expect.objectContaining({ test_id: t3, value: 8 })] });
    expect(leftPreview.body).toMatchObject({ range: { session_count: 1 }, attendance: { present: 1, held_sessions: 1 }, tests: [expect.objectContaining({ test_id: t1, value: 8 })] });
    expect(joinedPreview.body.tests.map((t: any) => t.test_id)).not.toContain(t1);
    expect(leftPreview.body.tests.map((t: any) => t.test_id)).not.toContain(t3);
    // A test dated before enrollment counts once the student has a score for it.
    await score(joined, t1);
    const joinedAgain = await call(`/v1/reports/${joinedReport.report_id}/preview`, {}, f.ws.token);
    expect(joinedAgain.body.tests.map((t: any) => t.test_id)).toEqual([t1, t3]);
  });

  it('saves comments, publishes with a labelled snapshot and republishes after a score change', async () => {
    const batch = (await batchesOf()).find((b) => b.from_session_id === f.sessions.s1 && b.to_session_id === f.sessions.s4);
    const report = (await call(`/v1/report-batches/${batch.id}/reports`, {}, f.ws.token)).body.items.find((r: any) => r.student_id === f.students.a);
    expect((await call(`/v1/reports/${report.report_id}`, put({ general_comment: 'x'.repeat(4001) }), f.ws.token)).status).toBe(422);
    expect((await call(`/v1/reports/${report.report_id}`, put({}), f.ws.token)).status).toBe(422);
    const saved = await call(`/v1/reports/${report.report_id}`, put({ general_comment: 'Tiến bộ tốt' }), f.teacher);
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ id: report.report_id, status: 'draft', general_comment: 'Tiến bộ tốt', needs_republish: 0 });

    const first = await call(`/v1/reports/${report.report_id}/publish`, post({}), f.teacher);
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ report_id: report.report_id, batch_id: batch.id, publication_no: 1 });
    expect(first.body.snapshot.range).toMatchObject({ from_number: 1, to_number: 3, label: 'Buổi 1–3 · 01/10–07/10' });
    expect(first.body.snapshot.general_comment).toBe('Tiến bộ tốt');
    const stored = await call(`/v1/reports/${report.report_id}/publications/1`, {}, f.ws.token);
    expect(stored.body).toMatchObject({ batch_id: batch.id, month: '2026-10' });
    expect(stored.body.snapshot.range.label).toBe('Buổi 1–3 · 01/10–07/10');
    expect((await batchesOf()).find((b) => b.id === batch.id).counts).toEqual({ total: 3, draft: 2, published: 1, needs_republish: 0 });

    // Score inside the range flags the published report; a score outside does not.
    const inRange = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, '2026-10-06');
    const outRange = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, '2026-10-20');
    const now = new Date().toISOString();
    const score = (test: string, studentId = f.students.a) => db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at) VALUES(?,?,?,?,9,1,?,?)`)
      .bind(f.ws.workspaceId, f.classId, test, studentId, now, now).run();
    await score(outRange);
    expect((await batchesOf()).find((b) => b.id === batch.id).counts.needs_republish).toBe(0);
    await score(inRange);
    await score(inRange, f.students.joined);
    expect((await batchesOf()).find((b) => b.id === batch.id).counts).toMatchObject({ published: 1, needs_republish: 1 });

    const again = await call(`/v1/reports/${report.report_id}/publish`, post({}), f.ws.token);
    expect(again.body.publication_no).toBe(2);
    expect(again.body.snapshot.tests.map((t: any) => t.test_id)).toContain(inRange);
    expect((await batchesOf()).find((b) => b.id === batch.id).counts).toMatchObject({ published: 1, needs_republish: 0 });
    await db.prepare(`UPDATE scores SET value=8 WHERE test_id=? AND student_id=?`).bind(inRange, f.students.a).run();
    await call(`/v1/reports/${report.report_id}/publish`, post({}), f.ws.token);
    await db.prepare(`UPDATE scores SET value=NULL WHERE test_id=? AND student_id=?`).bind(inRange, f.students.a).run();
    expect((await batchesOf()).find((b) => b.id === batch.id).counts.needs_republish).toBe(1);
    await db.prepare(`UPDATE scores SET value=9 WHERE test_id=? AND student_id=?`).bind(inRange, f.students.a).run();
    expect((await batchesOf()).find((b) => b.id === batch.id).counts.needs_republish).toBe(1);
    expect((await call(`/v1/reports/${report.report_id}/publish`, post({}), f.ws.token)).status).toBe(201);
    // Editing a published comment also asks for a republish.
    expect((await call(`/v1/reports/${report.report_id}`, put({ general_comment: 'Cập nhật' }), f.ws.token)).body.needs_republish).toBe(1);
    expect((await call(`/v1/reports/${report.report_id}/publications/1`, {}, f.ws.token)).body.snapshot.general_comment).toBe('Tiến bộ tốt');
  });

    it('blocks individual publishing until attendance, scores, and comment are complete', async () => {
      const studentId = await insertStudent(f.ws.workspaceId, f.classId, 'Readiness student', null, f.ws.userId);
        await db.prepare(`UPDATE students SET enrolled_at='2026-10-03',left_at='2026-10-03',status='left' WHERE id=?`).bind(studentId).run();
      const batch = await create('s2', 's2');
      const report = batch.body.reports.find((r: any) => r.student_id === studentId);
      const testId = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, '2026-10-03');
      const now = new Date().toISOString();
      for (const studentId of [f.students.a, f.students.left])
        await db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
          VALUES(?,?,?,?,8,1,?,?)`).bind(f.ws.workspaceId, f.classId, testId, studentId, now, now).run();
      const sameDayTests = await db.prepare(`SELECT id FROM tests WHERE class_id=? AND date='2026-10-03' AND id<>?`)
        .bind(f.classId, testId).all<{ id: string }>();
      for (const row of sameDayTests.results)
        await db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
          VALUES(?,?,?,?,8,1,?,?)`).bind(f.ws.workspaceId, f.classId, row.id, studentId, now, now).run();
      const preview = () => call(`/v1/reports/${report.report_id}/preview`, {}, f.ws.token);
      const publish = () => call(`/v1/reports/${report.report_id}/publish`, post({}), f.ws.token);
      expect((await preview()).body).toMatchObject({ ready: false, missing: ['attendance', 'scores', 'comment'] });
      const batchPublish = await call(`/v1/report-batches/${batch.body.batch.id}/publish`, post({}), f.ws.token);
      expect(batchPublish.body.skipped).toContainEqual({ report_id: report.report_id, missing: ['attendance', 'scores', 'comment'] });
      expect(batchPublish.body.published.map((p: any) => p.report_id)).not.toContain(report.report_id);
      for (const expected of [['attendance', 'scores', 'comment'], ['scores', 'comment'], ['comment']] as string[][]) {
        const blocked = await publish();
        expect(blocked.status).toBe(409);
        expect(blocked.body.error.details).toMatchObject({ reason: 'report_not_ready', missing: expected });
        expect(await db.prepare('SELECT status,publication_count FROM reports WHERE id=?').bind(report.report_id).first())
          .toEqual({ status: 'draft', publication_count: 0 });
        if (expected[0] === 'attendance') {
          const now = new Date().toISOString();
          await db.prepare(`INSERT INTO attendance(workspace_id,class_id,session_id,student_id,status,note,version,created_at,updated_at)
            VALUES(?,?,? ,?,'present','',1,?,?)`).bind(f.ws.workspaceId, f.classId, f.sessions.s2, studentId, now, now).run();
        } else if (expected[0] === 'scores') {
          await db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
            VALUES(?,?,?,?,8,1,?,?)`).bind(f.ws.workspaceId, f.classId, testId, studentId, now, now).run();
        } else {
          await call(`/v1/reports/${report.report_id}`, put({ general_comment: 'Đạt yêu cầu' }), f.ws.token);
        }
      }
      expect((await preview()).body).toMatchObject({ ready: true, missing: [] });
      expect((await publish()).status).toBe(201);
    });

    it('requires attendance for planned, non-cancelled sessions in the report range', async () => {
      const studentId = await insertStudent(f.ws.workspaceId, f.classId, 'Planned session student', null, f.ws.userId);
      await db.prepare(`UPDATE students SET enrolled_at='2026-10-09' WHERE id=?`).bind(studentId).run();
      const batch = await create('s4', 's5');
      const report = batch.body.reports.find((r: any) => r.student_id === studentId);
      const testId = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, '2026-10-09');
      const now = new Date().toISOString();
      await db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
        VALUES(?,?,?,?,8,1,?,?)`).bind(f.ws.workspaceId, f.classId, testId, studentId, now, now).run();
      await call(`/v1/reports/${report.report_id}`, put({ general_comment: 'Đạt yêu cầu' }), f.ws.token);

      const preview = await call(`/v1/reports/${report.report_id}/preview`, {}, f.ws.token);
      expect(preview.body).toMatchObject({ ready: false, missing: ['attendance'] });
      const blocked = await call(`/v1/reports/${report.report_id}/publish`, post({}), f.ws.token);
      expect(blocked.status).toBe(409);
      expect(blocked.body.error.details).toMatchObject({ reason: 'report_not_ready', missing: ['attendance'] });
      const batchPublish = await call(`/v1/report-batches/${batch.body.batch.id}/publish`, post({}), f.ws.token);
      expect(batchPublish.body.skipped).toContainEqual({ report_id: report.report_id, missing: ['attendance'] });
      expect(batchPublish.body.published.map((p: any) => p.report_id)).not.toContain(report.report_id);

      await db.prepare(`INSERT INTO attendance(workspace_id,class_id,session_id,student_id,status,note,version,created_at,updated_at)
        VALUES(?,?,?,?,'present','',1,?,?)`).bind(f.ws.workspaceId, f.classId, f.sessions.s5, studentId, now, now).run();
      expect((await call(`/v1/reports/${report.report_id}/preview`, {}, f.ws.token)).body).toMatchObject({ ready: true, missing: [] });
      expect((await call(`/v1/reports/${report.report_id}/publish`, post({}), f.ws.token)).status).toBe(201);
    });

      it('publishes the whole batch, skipping reports that are already current', async () => {
      const batch = (await batchesOf()).find((b) => b.from_session_id === f.sessions.s1 && b.to_session_id === f.sessions.s4);
      const before = (await call(`/v1/report-batches/${batch.id}/reports`, {}, f.ws.token)).body.items;
      const flagged = before.find((r: any) => r.needs_republish === 1);
      const now = new Date().toISOString();
      for (const [studentId, sessionKeys] of [[f.students.left, ['s1', 's2']], [f.students.joined, ['s4']]] as const) {
        for (const key of sessionKeys)
          await db.prepare(`INSERT OR IGNORE INTO attendance(workspace_id,class_id,session_id,student_id,status,note,version,created_at,updated_at)
            VALUES(?,?,?,?,'present','',1,?,?)`).bind(f.ws.workspaceId, f.classId, f.sessions[key], studentId, now, now).run();
        const item = before.find((r: any) => r.student_id === studentId);
        await call(`/v1/reports/${item.report_id}`, put({ general_comment: 'Tiến bộ' }), f.ws.token);
      }
      const homework = await db.prepare(`SELECT id FROM tests WHERE class_id=? AND date='2026-10-02'`).bind(f.classId).first<{id:string}>();
      await db.prepare(`INSERT OR IGNORE INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
        VALUES(?,?,?,?,7,1,?,?)`).bind(f.ws.workspaceId, f.classId, homework!.id, f.students.left, now, now).run();
      for (const item of before) {
        const preview = await call(`/v1/reports/${item.report_id}/preview`, {}, f.ws.token);
        for (const test of preview.body.tests.filter((t: any) => t.value === null))
          await db.prepare(`INSERT OR IGNORE INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
            VALUES(?,?,?,?,7,1,?,?)`).bind(f.ws.workspaceId, f.classId, test.test_id, item.student_id, now, now).run();
      }
      const result = await call(`/v1/report-batches/${batch.id}/publish`, post({}), f.teacher);
      expect(result.status).toBe(200);
      expect(result.body.skipped).toEqual([]);
      expect(result.body.published).toHaveLength(3);
    expect(result.body.published.find((p: any) => p.report_id === flagged.report_id).publication_no).toBe(flagged.publication_count + 1);
    expect(result.body.published.filter((p: any) => p.publication_no === 1)).toHaveLength(2);
    expect((await batchesOf()).find((b) => b.id === batch.id).counts).toEqual({ total: 3, draft: 0, published: 3, needs_republish: 0 });
    const idle = await call(`/v1/report-batches/${batch.id}/publish`, post({}), f.teacher);
    expect(idle.body.published).toEqual([]);
    const notes = await db.prepare(`SELECT count(*) AS n FROM notifications WHERE kind='report_published' AND event_key LIKE 'report:%'`).first<{ n: number }>();
    expect(notes!.n).toBeGreaterThanOrEqual(1);
  });

  it('shows guardians only the published reports of their own child, newest range first', async () => {
    const list = await call(`/v1/students/${f.students.a}/reports?limit=50`, {}, f.guardianA);
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    expect(list.body.items.every((i: any) => i.status === 'published' && i.student_id === f.students.a)).toBe(true);
    expect(list.body.items[0]).toEqual(expect.objectContaining({
      batch_id: expect.any(String), from_key: expect.any(String), to_key: '2026-10-07 18:00', from_number: 1, to_number: 3,
    }));
    expect((await call(`/v1/students/${f.students.a}/reports`, {}, f.guardianB)).status).toBe(404);
    const reportId = list.body.items[0].report_id;
    expect((await call(`/v1/reports/${reportId}/publications/1`, {}, f.guardianA)).status).toBe(200);
    expect((await call(`/v1/reports/${reportId}/publications/1`, {}, f.guardianB)).status).toBe(404);
  });

  it('orders and pages the student report list by range end then id', async () => {
    const publish = async (from: string, to: string) => {
      const batch = (await create(from, to)).body;
      await call(`/v1/report-batches/${batch.batch.id}/publish`, post({}), f.ws.token);
    };
    await publish('s2', 's5');
    const all = (await call(`/v1/students/${f.students.a}/reports?limit=50`, {}, f.ws.token)).body.items;
    const keys = all.map((i: any) => i.to_key);
    expect(keys).toEqual([...keys].sort().reverse());
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: any = await call(`/v1/students/${f.students.a}/reports?limit=2${cursor ? `&cursor=${cursor}` : ''}`, {}, f.ws.token);
      expect(page.status).toBe(200);
      seen.push(...page.body.items.map((i: any) => i.report_id));
      cursor = page.body.next_cursor;
    } while (cursor);
    expect(seen).toEqual(all.map((i: any) => i.report_id));
    expect(JSON.parse(atob(all.length > 2 ? (await call(`/v1/students/${f.students.a}/reports?limit=1`, {}, f.ws.token)).body.next_cursor : btoa('["",""]')))).toHaveLength(2);
    expect((await call(`/v1/students/${f.students.a}/reports?cursor=${btoa('2026-10')}`, {}, f.ws.token)).status).toBe(422);
  });

  it('retires the monthly write endpoints but keeps the monthly reads', async () => {
    for (const token of [f.ws.token, f.teacher]) {
      const write = await call(`/v1/students/${f.students.a}/reports/2026-10`, put({ general_comment: 'x' }), token);
      expect(write.status).toBe(410);
      expect(write.body.error.code).toBe('endpoint_retired');
      const publish = await call(`/v1/students/${f.students.a}/reports/2026-10/publish`, post({}), token);
      expect(publish.status).toBe(410);
      expect(publish.body.error.code).toBe('endpoint_retired');
    }
    expect((await call(`/v1/students/${f.students.a}/reports/2026-10`, put({ general_comment: 'x' }))).status).toBe(401);
    const list = await call(`/v1/classes/${f.classId}/reports?month=2026-10`, {}, f.ws.token);
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);
    expect(list.body.items[0]).toHaveProperty('batch_id');
    const preview = await call(`/v1/students/${f.students.a}/report-preview?month=2026-10`, {}, f.ws.token);
    expect(preview.status).toBe(200);
    expect(preview.body.general_comment).toBeTypeOf('string');
  });

  it('syncs report batches to staff and hides them from guardians', async () => {
    const sync = (path: string, token: string, membershipId: string, extra = '') =>
      call(`/v1/sync/${path}${path.includes('?') ? '&' : '?'}membership_id=${membershipId}${extra}`, {}, token);
    const admin = f.ws.membershipId;
    const snapshot = await sync('snapshot', f.ws.token, admin);
    expect(snapshot.body.entities).toContain('report_batch');
    const page = await sync('snapshot/report_batch', f.ws.token, admin, '&limit=200');
    expect(page.status).toBe(200);
    expect(page.body.items[0]).toEqual({
      id: expect.any(String), class_id: f.classId, month: null, from_session_id: expect.any(String), to_session_id: expect.any(String),
      from_key: expect.any(String), to_key: expect.any(String), version: 1,
    });
    const reports = await sync('snapshot/report', f.ws.token, admin, '&limit=200');
    expect(reports.body.items.every((r: any) => typeof r.batch_id === 'string' && /^\d{4}-\d{2}$/.test(r.month))).toBe(true);
    const publications = await sync('snapshot/report_publication', f.ws.token, admin, '&limit=200');
    expect(publications.body.items.length).toBeGreaterThan(0);
    expect(publications.body.items.every((r: any) => typeof r.batch_id === 'string')).toBe(true);
    const pull = await sync('pull', f.ws.token, admin, `&cursor=0&epoch=${snapshot.body.epoch}&limit=200`);
    expect(pull.status).toBe(200);
    expect(pull.body.upserts.report_batch.length).toBeGreaterThan(0);
    const guardian = await sync('snapshot', f.guardianA, f.guardianAMembership);
    expect(guardian.body.entities).not.toContain('report_batch');
    expect(guardian.body.entities).toContain('report_publication');
    expect((await sync('snapshot/report_batch', f.guardianA, f.guardianAMembership)).status).toBeGreaterThanOrEqual(400);
  });
  it('soft-deletes a whole batch and hides it from staff, guardians, sync and the inbox', async () => {
    const sync = (path: string, token: string, membershipId: string, extra = '') =>
      call(`/v1/sync/${path}${path.includes('?') ? '&' : '?'}membership_id=${membershipId}${extra}`, {}, token);
    const admin = f.ws.membershipId;
    const list = await call(`/v1/students/${f.students.a}/reports?limit=50`, {}, f.guardianA);
    const { batch_id: batchId, report_id: reportId } = list.body.items[0];
    const inbox = async () => (await call('/v1/notifications', {}, f.guardianA)).body.items as any[];
    expect((await inbox()).some((n) => n.report_id === reportId)).toBe(true);
    const staffCursor = await sync('snapshot', f.ws.token, admin);
    const guardianCursor = await sync('snapshot', f.guardianA, f.guardianAMembership);

    const scoreInRange = async () => {
      const range = (await db.prepare('SELECT from_key FROM report_batches WHERE id=?').bind(batchId).first<any>())!;
      const testId = await insertTest(f.ws.workspaceId, f.classId, f.ws.userId, range.from_key.slice(0, 10));
      const now = new Date().toISOString();
      await db.prepare(`INSERT INTO scores(workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at)
        VALUES(?,?,?,?,5,1,?,?)`).bind(f.ws.workspaceId, f.classId, testId, f.students.a, now, now).run();
      return (await db.prepare("SELECT count(*) n FROM reports WHERE batch_id=? AND status='published' AND needs_republish=1").bind(batchId).first<any>())!.n as number;
    };
    expect(await scoreInRange()).toBeGreaterThan(0);
    await db.prepare('UPDATE reports SET needs_republish=0 WHERE batch_id=?').bind(batchId).run();

    const del = (token: string, id = batchId) => call(`/v1/report-batches/${id}`, { method: 'DELETE' }, token);
    expect((await del(f.guardianA)).status).toBe(403);
    expect((await del(f.teacherOther)).status).toBeGreaterThanOrEqual(403);
    expect((await del(f.otherWorkspace)).status).toBe(404);
    expect((await del(f.ws.token, NIL)).status).toBe(404);
    expect(await del(f.teacher)).toMatchObject({ status: 200, body: { id: batchId, deleted: true } });
    expect(await del(f.ws.token)).toMatchObject({ status: 200, body: { id: batchId, deleted: true } });

    expect((await batchesOf()).some((b) => b.id === batchId)).toBe(false);
    expect((await call(`/v1/report-batches/${batchId}/reports`, {}, f.ws.token)).status).toBe(404);
    expect((await call(`/v1/reports/${reportId}/preview`, {}, f.ws.token)).status).toBe(404);
    expect((await call(`/v1/reports/${reportId}`, put({ general_comment: 'x' }), f.ws.token)).status).toBe(404);
    expect((await call(`/v1/reports/${reportId}/publish`, post({}), f.ws.token)).status).toBe(404);
    expect((await call(`/v1/report-batches/${batchId}/publish`, post({}), f.ws.token)).status).toBe(404);
    for (const token of [f.ws.token, f.guardianA]) {
      expect((await call(`/v1/reports/${reportId}/publications/1`, {}, token)).status).toBe(404);
      const rows = (await call(`/v1/students/${f.students.a}/reports?limit=50`, {}, token)).body.items as any[];
      expect(rows.some((r) => r.batch_id === batchId)).toBe(false);
    }
    expect((await inbox()).some((n) => n.report_id === reportId)).toBe(false);

    for (const [name, token, membership] of [['report_batch', f.ws.token, admin], ['report', f.ws.token, admin],
      ['report_publication', f.ws.token, admin], ['report_publication', f.guardianA, f.guardianAMembership]] as const) {
      const rows = (await sync(`snapshot/${name}`, token, membership, '&limit=300')).body.items as any[];
      expect(rows.some((r) => (name === 'report_batch' ? r.id === batchId : r.batch_id === batchId))).toBe(false);
    }
    const staffPull = await sync('pull', f.ws.token, admin, `&cursor=${staffCursor.body.cursor}&epoch=${staffCursor.body.epoch}&limit=300`);
    const gone = (staffPull.body.deleted as any[]).map((d) => d.entity);
    expect(gone).toEqual(expect.arrayContaining(['report_batch', 'report', 'report_publication']));
    expect((staffPull.body.deleted as any[]).find((d) => d.entity === 'report_batch').k1).toBe(batchId);
    const guardianPull = await sync('pull', f.guardianA, f.guardianAMembership,
      `&cursor=${guardianCursor.body.cursor}&epoch=${guardianCursor.body.epoch}&limit=300`);
    expect((guardianPull.body.deleted as any[]).some((d) => d.entity === 'report_publication')).toBe(true);
    expect((await db.prepare('SELECT count(*) n FROM reports WHERE batch_id=?').bind(batchId).first<any>())!.n).toBeGreaterThan(0);
    expect((await db.prepare('SELECT count(*) n FROM report_publications WHERE batch_id=?').bind(batchId).first<any>())!.n).toBeGreaterThan(0);

    await expect(db.prepare(`INSERT INTO report_publications(id,workspace_id,class_id,student_id,report_id,batch_id,month,publication_no,snapshot,published_by,published_at)
      SELECT ?,workspace_id,class_id,student_id,report_id,batch_id,month,98,'{}',published_by,published_at FROM report_publications WHERE batch_id=? LIMIT 1`)
      .bind(crypto.randomUUID(), batchId).run()).rejects.toThrow(/report_batch_deleted/);
    const flag = await scoreInRange();
    expect(flag).toBe(0);
    const clientId = crypto.randomUUID();
    expect((await create('s1', 's2', f.ws.token, { id: clientId })).status).toBe(201);
    expect((await del(f.ws.token, clientId)).status).toBe(200);
    const replay = await create('s1', 's2', f.ws.token, { id: clientId });
    expect(replay.status).toBe(409);
    expect(replay.body.error.code).toBe('id_conflict');
  });
});
