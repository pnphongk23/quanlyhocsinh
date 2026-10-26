import { describe, expect, it } from 'vitest';
import { call, clubToken, db, insertClass, insertGuardianMembership, insertMembership, insertSession, insertStudent, insertUser, PASSWORD, post, type RegisteredWorkspace } from './helpers';

const syncCommand = (type: string, payload: unknown, baseVersion = 0) => ({
  id: crypto.randomUUID(), type, payload, base_version: baseVersion, created_at: new Date().toISOString(),
});
function pushCommands(token: string, membershipId: string, commands: unknown[]) {
  return call('/v1/sync/push', post({ membership_id: membershipId, device_id: crypto.randomUUID(), commands }), token);
}

async function registerWorkspaceAtIp(phone: string, name: string, ip: string): Promise<RegisteredWorkspace> {
  const result = await call('/v1/auth/register', {
    ...post({ phone, password: PASSWORD, display_name: 'Teacher Sample', workspace_name: name }),
    headers: { 'cf-connecting-ip': ip },
  });
  if (result.status !== 201) throw new Error(`test workspace setup failed: ${result.status}`);
  const workspaceId = result.body.memberships[0].workspace.id as string;
  const { results } = await db.prepare('SELECT system_key, id FROM roles WHERE workspace_id = ?')
    .bind(workspaceId).all<{ system_key: string; id: string }>();
  return { workspaceId, userId: result.body.user.id, membershipId: result.body.active_membership_id,
    token: result.body.token, roles: Object.fromEntries(results.map((row) => [row.system_key, row.id])) };
}

describe('attendance read API', () => {
  it('returns attendance by session and student with role and child scope filtering', async () => {
    const owner = await registerWorkspaceAtIp('+84900000401', 'Attendance API', '198.51.100.31');
    const classId = await insertClass(owner.workspaceId, 'Class A', owner.userId);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);
    const firstStudent = await insertStudent(owner.workspaceId, classId, 'Student A', null, owner.userId);
    const secondStudent = await insertStudent(owner.workspaceId, classId, 'Student B', null, owner.userId);
    const firstSession = await insertSession(owner.workspaceId, classId, today, owner.userId, 'held');
    const secondSession = await insertSession(owner.workspaceId, classId, tomorrow, owner.userId, 'held');
    const now = new Date().toISOString();
    await db.batch([
      db.prepare(`INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note, late_at, version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, 'late', 'Arrived late', '18:12', 1, ?, ?, ?)`)
        .bind(owner.workspaceId, classId, firstSession, firstStudent, now, now, owner.userId),
      db.prepare(`INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note, late_at, version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, 'absent', '', NULL, 1, ?, ?, ?)`)
        .bind(owner.workspaceId, classId, firstSession, secondStudent, now, now, owner.userId),
      db.prepare(`INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note, late_at, version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, 'present', '', NULL, 1, ?, ?, ?)`)
        .bind(owner.workspaceId, classId, firstSession, firstStudent, now, now, owner.userId),
    ].slice(0, 2));
      await db.prepare(`INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note, late_at, version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, 'present', '', NULL, 1, ?, ?, ?)`)
        .bind(owner.workspaceId, classId, secondSession, firstStudent, now, now, owner.userId).run();
      await db.prepare(`INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note, late_at, version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, 'late', '', '18:10', 1, ?, ?, ?)`)
        .bind(owner.workspaceId, classId, secondSession, secondStudent, now, now, owner.userId).run();

    const teacherUser = await insertUser('+84900000402');
    const teacherMembership = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [classId]);
    const teacherToken = await clubToken(owner.workspaceId, teacherUser, teacherMembership);
    const assistantUser = await insertUser('+84900000403');
    const assistantMembership = await insertMembership(owner.workspaceId, assistantUser, owner.roles.assistant!, [classId]);
    const assistantToken = await clubToken(owner.workspaceId, assistantUser, assistantMembership);
    const parentUser = await insertUser('+84900000404');
    const parentMembership = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [firstStudent]);
    const parentToken = await clubToken(owner.workspaceId, parentUser, parentMembership);

    for (const token of [owner.token, teacherToken, assistantToken]) {
      expect((await call(`/v1/sessions/${firstSession}/attendance`, {}, token)).body.items).toHaveLength(2);
    }
    const parentBySession = await call(`/v1/sessions/${firstSession}/attendance`, {}, parentToken);
    expect(parentBySession.body.items).toHaveLength(1);
      expect(parentBySession.body.items[0]).toMatchObject({ student_id: firstStudent, status: 'late' });
      expect(parentBySession.body.items[0]).not.toHaveProperty('note');
      expect(parentBySession.body.items[0]).not.toHaveProperty('late_at');
    expect((await call(`/v1/students/${firstStudent}/attendance?from=2000-01-01&to=2099-12-31&limit=1`, {}, parentToken)).body)
      .toMatchObject({ items: [{ session_id: firstSession, date: today, status: 'late' }] });
    expect((await call(`/v1/students/${firstStudent}/attendance?from=2000-01-01&to=2099-12-31&limit=1`, {}, parentToken)).body.next_cursor).toBeTruthy();
    expect((await call(`/v1/students/${secondStudent}/attendance?from=2000-01-01&to=2099-12-31`, {}, parentToken)).status).toBe(404);

    const other = await registerWorkspaceAtIp('+84900000405', 'Other workspace', '198.51.100.32');
    expect((await call(`/v1/sessions/${firstSession}/attendance`, {}, other.token)).status).toBe(404);
    expect((await call(`/v1/sessions/${firstSession}/attendance`)).status).toBe(401);

      const rejected = await pushCommands(owner.token, owner.membershipId, [syncCommand('attendance.set',
        { session_id: firstSession, student_id: firstStudent, status: 'excused' }, 1)]);
      expect(rejected.body.results[0].error.details.reason).toBe('invalid_value');
      const unchanged = await db.prepare('SELECT status, note, late_at, version FROM attendance WHERE session_id=? AND student_id=?')
        .bind(firstSession, firstStudent).first<any>();
      expect(unchanged).toMatchObject({ status: 'late', note: 'Arrived late', late_at: '18:12', version: 1 });

      const pushed = await pushCommands(owner.token, owner.membershipId, [syncCommand('attendance.set',
        { session_id: firstSession, student_id: firstStudent, status: 'late', note: 'Ignored', late_at: '20:20' }, 1)]);
      expect(pushed.body.results).toEqual([expect.objectContaining({ status: 'applied', version: 1, noop: true })]);
      const history = await db.prepare('SELECT old_status, new_status, changed_by FROM attendance_history WHERE session_id = ? AND student_id = ?')
        .bind(firstSession, firstStudent).first<{ old_status: string; new_status: string; changed_by: string }>();
      expect(history).toBeNull();
      expect((await db.prepare('SELECT note, late_at FROM attendance WHERE session_id=? AND student_id=?')
        .bind(firstSession, firstStudent).first<any>())).toMatchObject({ note: 'Arrived late', late_at: '18:12' });
      const stale = await pushCommands(owner.token, owner.membershipId, [syncCommand('attendance.set',
        { session_id: firstSession, student_id: firstStudent, status: 'absent' }, 1)]);
      expect(stale.body.results).toEqual([expect.objectContaining({ status: 'applied', version: 2 })]);
      const finalCell = await db.prepare('SELECT status, version FROM attendance WHERE session_id = ? AND student_id = ?')
        .bind(firstSession, firstStudent).first<{ status: string; version: number }>();
      expect(finalCell).toMatchObject({ status: 'absent', version: 2 });
      expect((await db.prepare('SELECT old_status, new_status FROM attendance_history WHERE session_id=? AND student_id=?')
        .bind(firstSession, firstStudent).first<any>())).toMatchObject({ old_status: 'late', new_status: 'absent' });
      expect((await db.prepare('SELECT note, late_at FROM attendance WHERE session_id=? AND student_id=?')
        .bind(firstSession, firstStudent).first<any>())).toMatchObject({ note: 'Arrived late', late_at: '18:12' });
      const statuses = await db.prepare('SELECT DISTINCT status FROM attendance WHERE workspace_id = ?')
        .bind(owner.workspaceId).all<{ status: string }>();
      expect(statuses.results.map((row) => row.status).sort()).toEqual(['absent', 'late', 'present']);
    });

    it('rejects attendance writes for a cancelled session through sync push', async () => {
      const owner = await registerWorkspaceAtIp('+84900000411', 'Attendance cancelled session', '198.51.100.35');
      const classId = await insertClass(owner.workspaceId, 'Cancelled', owner.userId);
      const studentId = await insertStudent(owner.workspaceId, classId, 'Student C', null, owner.userId);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
      const cancelledSession = await insertSession(owner.workspaceId, classId, today, owner.userId, 'cancelled');
      const pushed = await pushCommands(owner.token, owner.membershipId, [syncCommand('attendance.set',
        { session_id: cancelledSession, student_id: studentId, status: 'present' })]);
      expect(pushed.status).toBe(200);
      expect(pushed.body.results).toEqual([expect.objectContaining({
        status: 'rejected', error: expect.objectContaining({ details: expect.objectContaining({ reason: 'session_cancelled' }) }),
      })]);
      const cells = await db.prepare('SELECT COUNT(*) AS count FROM attendance WHERE session_id = ?')
        .bind(cancelledSession).first<{ count: number }>();
      expect(cells?.count).toBe(0);
    });

    it('rejects cross-class and cross-workspace attendance cells at the D1 boundary', async () => {
      const owner = await registerWorkspaceAtIp('+84900000431', 'Attendance FK checks', '198.51.100.33');
      const classA = await insertClass(owner.workspaceId, 'A', owner.userId);
      const classB = await insertClass(owner.workspaceId, 'B', owner.userId);
      const studentA = await insertStudent(owner.workspaceId, classA, 'A student', null, owner.userId);
      const studentB = await insertStudent(owner.workspaceId, classB, 'B student', null, owner.userId);
      const sessionA = await insertSession(owner.workspaceId, classA, '2026-10-23', owner.userId);
      const workspaceB = await registerWorkspaceAtIp('+84900000432', 'Attendance FK workspace B', '198.51.100.34');
      const classC = await insertClass(workspaceB.workspaceId, 'C', workspaceB.userId);
      const studentC = await insertStudent(workspaceB.workspaceId, classC, 'C student', null, workspaceB.userId);
      const now = new Date().toISOString();
      const invalidCell = (workspaceId: string, classId: string, studentId: string) => db.prepare(`INSERT INTO attendance
        (workspace_id, class_id, session_id, student_id, status, note, late_at, version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, 'present', '', NULL, 1, ?, ?, ?)`).bind(workspaceId, classId, sessionA, studentId, now, now, owner.userId).run();
      await expect(invalidCell(owner.workspaceId, classA, studentB)).rejects.toThrow();
      await expect(invalidCell(owner.workspaceId, classA, studentC)).rejects.toThrow();
      expect(studentA).not.toBe(studentB);
    });

  it('checks the role matrix for both attendance endpoints without exposing another child', async () => {
    const owner = await registerWorkspaceAtIp('+84900000421', 'Attendance role matrix', '198.51.100.27');
    const classId = await insertClass(owner.workspaceId, 'C1', owner.userId);
    const firstStudent = await insertStudent(owner.workspaceId, classId, 'Child A', null, owner.userId);
    const secondStudent = await insertStudent(owner.workspaceId, classId, 'Child B', null, owner.userId);
    const sessionId = await insertSession(owner.workspaceId, classId,
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()), owner.userId, 'held');
    const now = new Date().toISOString();
    for (const [studentId, status] of [[firstStudent, 'present'], [secondStudent, 'absent']] as const) {
      await db.prepare(`INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note, late_at, version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, '', NULL, 1, ?, ?, ?)`).bind(owner.workspaceId, classId, sessionId, studentId, status, now, now, owner.userId).run();
    }
    const teacherUser = await insertUser('+84900000422');
    const teacherMember = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [classId]);
    const assistantUser = await insertUser('+84900000423');
    const assistantMember = await insertMembership(owner.workspaceId, assistantUser, owner.roles.assistant!, [classId]);
    const parentUser = await insertUser('+84900000424');
    const parentMember = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [firstStudent]);
    const anotherParentUser = await insertUser('+84900000425');
    const anotherParentMember = await insertGuardianMembership(owner.workspaceId, anotherParentUser, owner.roles.guardian!, [secondStudent]);
    const otherWorkspace = await registerWorkspaceAtIp('+84900000426', 'Attendance matrix workspace B', '198.51.100.28');
    const actors = [
      { name: 'Admin', token: owner.token, session: 200, student: 200, studentIds: [firstStudent, secondStudent] },
      { name: 'Giáo viên', token: await clubToken(owner.workspaceId, teacherUser, teacherMember), session: 200, student: 200, studentIds: [firstStudent, secondStudent] },
      { name: 'Trợ giảng', token: await clubToken(owner.workspaceId, assistantUser, assistantMember), session: 200, student: 200, studentIds: [firstStudent, secondStudent] },
      { name: 'Phụ huynh', token: await clubToken(owner.workspaceId, parentUser, parentMember), session: 200, student: 200, studentIds: [firstStudent] },
      { name: 'Chưa đăng nhập', token: undefined, session: 401, student: 401, studentIds: [] },
      { name: 'Workspace khác', token: otherWorkspace.token, session: 404, student: 404, studentIds: [] },
      { name: 'Phụ huynh khác', token: await clubToken(owner.workspaceId, anotherParentUser, anotherParentMember), session: 200, student: 404, studentIds: [secondStudent] },
    ];
    for (const actor of actors) {
      const bySession = await call(`/v1/sessions/${sessionId}/attendance`, {}, actor.token);
      expect(bySession.status, `${actor.name} GET /sessions/:id/attendance`).toBe(actor.session);
      if (actor.session === 200) {
        expect(bySession.body.items.map((row: any) => row.student_id).sort(), `${actor.name} child scope`)
          .toEqual([...actor.studentIds].sort());
      }
      const byStudent = await call(`/v1/students/${firstStudent}/attendance?from=2000-01-01&to=2099-12-31`, {}, actor.token);
      expect(byStudent.status, `${actor.name} GET /students/:id/attendance`).toBe(actor.student);
    }
  });
});
