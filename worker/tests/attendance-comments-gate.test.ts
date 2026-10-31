import { beforeEach, describe, expect, it } from 'vitest';
import { call, db, fakePhone, insertClass, insertSession, insertStudent, post, registerWorkspace } from './helpers';

const uid = () => crypto.randomUUID();
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const command = (type: string, payload: any, base_version = 0) =>
  ({ id: uid(), type, payload, base_version, created_at: new Date().toISOString() });

beforeEach(async () => { await db.prepare('DELETE FROM auth_throttle').run(); });

async function setup() {
  const owner = await registerWorkspace(fakePhone(), 'Attendance comment gate');
  const classId = await insertClass(owner.workspaceId, 'C1', owner.userId);
  const students = await Promise.all(['S1', 'S2'].map((name) =>
    insertStudent(owner.workspaceId, classId, name, null, owner.userId)));
  const sessionId = await insertSession(owner.workspaceId, classId, today(), owner.userId);
  const push = (commands: unknown[], requestId = 'attendance-gate-test') => call('/v1/sync/push', {
    ...post({ membership_id: owner.membershipId, device_id: uid(), commands }),
    headers: { 'x-request-id': requestId },
  }, owner.token);
  const attendance = (studentId: string, status: string) =>
    command('attendance.set', { session_id: sessionId, student_id: studentId, status });
  const slip = (studentId: string, baseVersion = 0) => command('slip.set', {
    session_id: sessionId, student_id: studentId, criteria: 31, comment: 'Good work.', note: '',
  }, baseVersion);
  const markAll = (status = 'present') => push(students.map((studentId) => attendance(studentId, status)));
  return { owner, classId, students, sessionId, push, attendance, slip, markAll };
}

describe('attendance gate for session comments', () => {
  it('rejects slip.set and slip.send while any enrolled student has no saved attendance', async () => {
    const f = await setup();
    const set = f.slip(f.students[0]!);
    const send = command('slip.send', { session_id: f.sessionId, student_ids: [f.students[0]] });
    const result = await f.push([set, send]);

    expect(result.body.results.map((item: any) => item.error)).toEqual([
      { code: 'attendance_incomplete', message: 'Attendance is incomplete.', request_id: 'attendance-gate-test', details: { missing_count: 2 } },
      { code: 'attendance_incomplete', message: 'Attendance is incomplete.', request_id: 'attendance-gate-test', details: { missing_count: 2 } },
    ]);
    expect(result.body.results.map((item: any) => item.status)).toEqual(['rejected', 'rejected']);
  });

  it('accepts a slip after attendance commands earlier in the same push', async () => {
    const f = await setup();
    const result = await f.push([
      f.attendance(f.students[0]!, 'present'),
      f.attendance(f.students[1]!, 'late'),
      f.slip(f.students[0]!),
    ]);

    expect(result.body.results.map((item: any) => item.status)).toEqual(['applied', 'applied', 'applied']);
  });

  it('rejects editing an existing slip if attendance later becomes incomplete', async () => {
    const f = await setup();
    await f.markAll();
    const created = await f.push([f.slip(f.students[0]!)]);
    expect(created.body.results[0].status).toBe('applied');
    await db.prepare('DELETE FROM attendance WHERE session_id=? AND student_id=?')
      .bind(f.sessionId, f.students[1]).run();

    const edit = f.slip(f.students[0]!, 1);
    const result = await f.push([edit]);
    expect(result.body.results[0]).toEqual({
      id: edit.id,
      status: 'rejected',
      error: {
        code: 'attendance_incomplete',
        message: 'Attendance is incomplete.',
        request_id: 'attendance-gate-test',
        details: { missing_count: 1 },
      },
    });
  });

  it('processes a slip before later attendance as rejected, then returns that rejection for the same command ID', async () => {
    const f = await setup();
    const set = f.slip(f.students[0]!);
    const first = await f.push([set, f.attendance(f.students[0]!, 'present')]);
    expect(first.body.results.map((item: any) => item.status)).toEqual(['rejected', 'applied']);
    expect(first.body.results[0]).toEqual({
      id: set.id,
      status: 'rejected',
      error: {
        code: 'attendance_incomplete',
        message: 'Attendance is incomplete.',
        request_id: 'attendance-gate-test',
        details: { missing_count: 2 },
      },
    });

    await f.push([f.attendance(f.students[1]!, 'absent')]);
    const retry = await f.push([set], 'attendance-gate-retry');
    expect(retry.body.results[0]).toEqual(first.body.results[0]);
  });

  it('allows an absent student to compose and send an individual slip after attendance is complete', async () => {
    const f = await setup();
    await f.push([
      f.attendance(f.students[0]!, 'absent'),
      f.attendance(f.students[1]!, 'present'),
    ]);
    const set = await f.push([f.slip(f.students[0]!)]);
    expect(set.body.results[0].status).toBe('applied');

    const sent = await f.push([command('slip.send', {
      session_id: f.sessionId,
      student_ids: [f.students[0]],
    })]);
    expect(sent.body.results[0]).toMatchObject({ status: 'applied', sent: [f.students[0]] });
    expect(await db.prepare('SELECT status FROM session_comments WHERE session_id=? AND student_id=?')
      .bind(f.sessionId, f.students[0]).first()).toEqual({ status: 'sent' });
  });

  it('becomes incomplete when a new student is added after attendance was completed', async () => {
    const f = await setup();
    await f.markAll();
    const lateStudent = await insertStudent(f.owner.workspaceId, f.classId, 'New student', null, f.owner.userId);
    const blocked = await f.push([f.slip(lateStudent)]);
    expect(blocked.body.results[0].error).toMatchObject({
      code: 'attendance_incomplete',
      details: { missing_count: 1 },
    });

    const completed = await f.push([f.attendance(lateStudent, 'late'), f.slip(lateStudent)]);
    expect(completed.body.results.map((item: any) => item.status)).toEqual(['applied', 'applied']);
  });

  it('skips absent students in a multi-student class send while still sending present students', async () => {
    const f = await setup();
    await f.push([
      f.attendance(f.students[0]!, 'absent'),
      f.attendance(f.students[1]!, 'late'),
    ]);
    await f.push(f.students.map((studentId) => f.slip(studentId)));

    const sent = await f.push([command('slip.send', {
      session_id: f.sessionId,
      student_ids: f.students,
    })]);
    expect(sent.body.results[0]).toMatchObject({
      status: 'applied',
      sent: [f.students[1]],
      skipped: [{ student_id: f.students[0], reason: 'absent' }],
    });
    expect(await db.prepare('SELECT status FROM session_comments WHERE session_id=? AND student_id=?')
      .bind(f.sessionId, f.students[0]).first()).toEqual({ status: 'draft' });
  });
});
