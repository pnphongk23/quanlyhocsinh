import { describe, expect, it } from 'vitest';
import { call, db, insertClass, insertMembership, insertUser, post, registerWorkspace, clubToken, insertStudent, insertGuardianMembership, PASSWORD, type RegisteredWorkspace } from './helpers';

function vnToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}
function addDays(value: string, count: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
/** 1 = Thứ hai … 7 = Chủ nhật, cùng quy ước với `weekdays` của API. */
function weekdayOf(value: string): number {
  return ((new Date(`${value}T00:00:00.000Z`).getUTCDay() + 6) % 7) + 1;
}
function sessionDates(rows: any[]): string[] {
  return rows.map((row) => row.date as string);
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

describe('classes API', () => {
  it('creates recurring sessions, enforces scopes and supports archive/version checks', async () => {
    const owner = await registerWorkspaceAtIp('+84900000101', 'Classes API', '198.51.100.10');
    const created = await call('/v1/classes', post({ name: 'Lớp A', weekdays: [1, 3], start_time: '18:00' }), owner.token);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Lớp A', status: 'active', weekdays: [1, 3], version: 1 });
    const classId = created.body.id as string;
    const sessions = await call(`/v1/classes/${classId}/sessions?from=2026-10-21&to=2026-12-31`, {}, owner.token);
    expect(sessions.status).toBe(200);
    expect(sessions.body.items.length).toBeGreaterThanOrEqual(15);

    const teacherUser = await insertUser('+84900000102');
    const teacherMembership = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [classId]);
    const teacherToken = await clubToken(owner.workspaceId, teacherUser, teacherMembership);
    expect((await call(`/v1/classes/${classId}`, {}, teacherToken)).status).toBe(200);
    expect((await call('/v1/classes', post({ name: 'Lớp B', weekdays: [], start_time: '18:00' }), teacherToken)).status).toBe(201);

    const assistantUser = await insertUser('+84900000103');
    const assistantMembership = await insertMembership(owner.workspaceId, assistantUser, owner.roles.assistant!, [classId]);
    const assistantToken = await clubToken(owner.workspaceId, assistantUser, assistantMembership);
    expect((await call(`/v1/classes/${classId}`, {}, assistantToken)).status).toBe(200);
    expect((await call('/v1/classes', post({ name: 'Nope', weekdays: [], start_time: '18:00' }), assistantToken)).status).toBe(403);

    const parentUser = await insertUser('+84900000104');
    const studentId = await insertStudent(owner.workspaceId, classId, 'Student A', null, owner.userId);
    const parentMembership = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [studentId]);
    const parentToken = await clubToken(owner.workspaceId, parentUser, parentMembership);
    const parentClass = await call('/v1/classes', {}, parentToken);
    expect(parentClass.status).toBe(200);
      expect(parentClass.body.items).toEqual([{ id: classId, name: 'Lớp A', status: 'active', teacher_name: 'Teacher Sample' }]);
      expect((await call(`/v1/classes/${classId}`, {}, parentToken)).body).toEqual({ id: classId, name: 'Lớp A', status: 'active', teacher_name: 'Teacher Sample' });
    expect((await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived', base_version: 1 }) }, parentToken)).status).toBe(403);

    const other = await registerWorkspaceAtIp('+84900000105', 'Other workspace', '198.51.100.11');
    expect((await call(`/v1/classes/${classId}`, {}, other.token)).status).toBe(404);
    expect((await call('/v1/classes')).status).toBe(401);

    const updated = await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ name: 'Lớp A+', base_version: 1 }) }, owner.token);
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: 'Lớp A+', version: 2 });
    expect((await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ name: 'stale', base_version: 1 }) }, owner.token)).status).toBe(409);
  });

  it('chooses the first named active teacher by assignment time, then falls back to the first named active Admin', async () => {
    const owner = await registerWorkspaceAtIp('+84900000106', 'Class teacher display', '198.51.100.12');
    const classId = await insertClass(owner.workspaceId, 'Lớp Lan', owner.userId);
    const child = await insertStudent(owner.workspaceId, classId, 'Con A', null, owner.userId);
    const parent = await insertUser('+84900000107');
    const parentMembership = await insertGuardianMembership(owner.workspaceId, parent, owner.roles.guardian!, [child]);
    const parentToken = await clubToken(owner.workspaceId, parent, parentMembership);
    const unnamedUser = await insertUser('+84900000108', '   ');
    const firstTeacher = await insertUser('+84900000109', 'Cô Lan');
    const secondTeacher = await insertUser('+84900000110', 'Thầy Minh');
    const disabledTeacher = await insertUser('+84900000111', 'Cô nghỉ');
    const disabledUser = await insertUser('+84900000112', 'Thầy đã nghỉ');
    const unnamedMembership = await insertMembership(owner.workspaceId, unnamedUser, owner.roles.teacher!, [classId]);
    const firstMembership = await insertMembership(owner.workspaceId, firstTeacher, owner.roles.teacher!, [classId]);
    const secondMembership = await insertMembership(owner.workspaceId, secondTeacher, owner.roles.teacher!, [classId]);
    const disabledMembership = await insertMembership(owner.workspaceId, disabledTeacher, owner.roles.teacher!, [classId]);
    await insertMembership(owner.workspaceId, disabledUser, owner.roles.teacher!, [classId]);
    await db.prepare('UPDATE member_classes SET created_at = ? WHERE membership_id = ?').bind('2026-01-01T00:00:00.000Z', unnamedMembership).run();
    await db.prepare('UPDATE member_classes SET created_at = ? WHERE membership_id = ?').bind('2026-01-02T00:00:00.000Z', firstMembership).run();
    await db.prepare('UPDATE member_classes SET created_at = ? WHERE membership_id = ?').bind('2026-01-03T00:00:00.000Z', secondMembership).run();
    await db.prepare("UPDATE memberships SET status = 'disabled' WHERE id = ?").bind(disabledMembership).run();
    await db.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").bind(disabledUser).run();

    const list = await call('/v1/classes', {}, parentToken);
    expect(list.body.items).toEqual([{ id: classId, name: 'Lớp Lan', status: 'active', teacher_name: 'Cô Lan' }]);
    const detail = await call(`/v1/classes/${classId}`, {}, parentToken);
    expect(detail.body).toEqual(list.body.items[0]);

    const me = await call('/v1/me', {}, parentToken);
    const student = me.body.memberships[0].students[0];
    expect(student).toEqual({ id: child, name: 'Con A', class_id: classId, class_name: 'Lớp Lan', teacher_name: 'Cô Lan' });
    expect(Object.keys(student).sort()).toEqual(['class_id', 'class_name', 'id', 'name', 'teacher_name']);

    await db.prepare("UPDATE memberships SET status = 'disabled' WHERE id IN (?, ?)").bind(firstMembership, secondMembership).run();
    expect((await call(`/v1/classes/${classId}`, {}, parentToken)).body.teacher_name).toBe('Teacher Sample');
    await db.prepare('UPDATE users SET display_name = NULL WHERE id = ?').bind(owner.userId).run();
    expect((await call(`/v1/classes/${classId}`, {}, parentToken)).body.teacher_name).toBeNull();
  });

  it('replaces today\'s recurring session when start_time changes (one session per day, numbered)', async () => {
    const owner = await registerWorkspaceAtIp('+84900000131', 'Class start time change', '198.51.100.41');
    const today = vnToday();
    const created = await call('/v1/classes', post({ name: 'Lịch giờ', weekdays: [weekdayOf(today)], start_time: '18:00' }), owner.token);
    const classId = created.body.id as string;
    const before = await call(`/v1/classes/${classId}/sessions?from=${today}&to=${addDays(today, 7)}`, {}, owner.token);
    const oldToday = before.body.items.find((row: any) => row.date === today);
    expect(oldToday).toMatchObject({ start_time: '18:00', status: 'planned', session_number: 1 });

    const patched = await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ start_time: '17:30', base_version: 1 }) }, owner.token);
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ start_time: '17:30', weekdays: [weekdayOf(today)], version: 2 });

    const sessions = await call(`/v1/classes/${classId}/sessions?from=${today}&to=${addDays(today, 56)}`, {}, owner.token);
    const items = sessions.body.items as any[];
    expect(items.filter((row) => row.date === today)).toEqual([
      expect.objectContaining({ start_time: '17:30', status: 'planned', session_number: 1 }),
    ]);
    expect(items.some((row) => row.id === oldToday.id)).toBe(false);
    const dates = sessionDates(items);
    expect(new Set(dates).size, 'at most one session per day after a schedule change').toBe(dates.length);
    expect(items.map((row) => row.session_number)).toEqual(items.map((_, index) => index + 1));
  });

  it('keeps sessions that already have data and applies the new schedule around them', async () => {
    const owner = await registerWorkspaceAtIp('+84900000132', 'Class schedule with data', '198.51.100.42');
    const today = vnToday();
    const todayDay = weekdayOf(today);
    const otherDay = todayDay === 7 ? 1 : todayDay + 1;
    const created = await call('/v1/classes', post({ name: 'Lịch có dữ liệu', weekdays: [todayDay, otherDay], start_time: '18:00' }), owner.token);
    const classId = created.body.id as string;
    const before = await call(`/v1/classes/${classId}/sessions?from=${today}&to=${addDays(today, 56)}`, {}, owner.token);
    const todaySession = before.body.items.find((row: any) => row.date === today);
    const laterSession = before.body.items.find((row: any) => row.date > today && weekdayOf(row.date) === otherDay);
    expect(todaySession.start_time).toBe('18:00');
    expect(laterSession.start_time).toBe('18:00');
    const studentId = await insertStudent(owner.workspaceId, classId, 'Có điểm danh', null, owner.userId);
    const now = new Date().toISOString();
    for (const sessionId of [todaySession.id, laterSession.id]) {
      await db.prepare(`INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note, late_at, version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, 'present', '', NULL, 1, ?, ?, ?)`)
        .bind(owner.workspaceId, classId, sessionId, studentId, now, now, owner.userId).run();
    }

    const patched = await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ start_time: '17:30', base_version: 1 }) }, owner.token);
    expect(patched.status).toBe(200);

    const sessions = await call(`/v1/classes/${classId}/sessions?from=${today}&to=${addDays(today, 56)}`, {}, owner.token);
    const items = sessions.body.items as any[];
    expect(items.filter((row) => row.date === today)).toEqual([
      expect.objectContaining({ id: todaySession.id, start_time: '18:00', session_number: 1 }),
    ]);
    expect(items.filter((row) => row.date === laterSession.date)).toEqual([
      expect.objectContaining({ id: laterSession.id, start_time: '18:00' }),
    ]);
    const rebuilt = items.filter((row) => row.id !== todaySession.id && row.id !== laterSession.id);
    expect(rebuilt.length).toBeGreaterThan(0);
    expect(rebuilt.every((row) => row.start_time === '17:30')).toBe(true);
    const dates = sessionDates(items);
    expect(new Set(dates).size, 'at most one session per day after a schedule change').toBe(dates.length);
    expect(items.map((row) => row.session_number)).toEqual(items.map((_, index) => index + 1));
  });

  it('rebuilds the series from today when weekdays change', async () => {
    const owner = await registerWorkspaceAtIp('+84900000133', 'Class weekday change', '198.51.100.43');
    const today = vnToday();
    const todayDay = weekdayOf(today);
    const otherDay = todayDay === 7 ? 1 : todayDay + 1;
    const created = await call('/v1/classes', post({ name: 'Đổi thứ', weekdays: [todayDay, otherDay], start_time: '18:00' }), owner.token);
    const classId = created.body.id as string;
    const before = await call(`/v1/classes/${classId}/sessions?from=${today}&to=${addDays(today, 7)}`, {}, owner.token);
    expect(before.body.items.some((row: any) => row.date === today)).toBe(true);

    const patched = await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ weekdays: [otherDay], base_version: 1 }) }, owner.token);
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ weekdays: [otherDay], version: 2 });

    const sessions = await call(`/v1/classes/${classId}/sessions?from=${today}&to=${addDays(today, 56)}`, {}, owner.token);
    const items = sessions.body.items as any[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((row) => weekdayOf(row.date) === otherDay)).toBe(true);
    expect(items.some((row) => row.date === today)).toBe(false);
    const dates = sessionDates(items);
    expect(new Set(dates).size).toBe(dates.length);
    expect(items.map((row) => row.session_number)).toEqual(items.map((_, index) => index + 1));
  });

  it('does not rebuild sessions when a stale schedule update loses the version check', async () => {
    const owner = await registerWorkspaceAtIp('+84900000144', 'Class stale schedule', '198.51.100.44');
    const today = vnToday();
    const todayDay = weekdayOf(today);
    const nextDay = todayDay === 7 ? 1 : todayDay + 1;
    const created = await call('/v1/classes', post({ name: 'Lịch', weekdays: [todayDay], start_time: '18:00' }), owner.token);
    const classId = created.body.id as string;
    const changed = await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ weekdays: [nextDay], base_version: 1 }) }, owner.token);
    expect(changed.status).toBe(200);
    const before = await call(`/v1/classes/${classId}/sessions?from=${today}&to=${addDays(today, 56)}`, {}, owner.token);
    const stale = await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ weekdays: [todayDay], start_time: '19:00', base_version: 1 }) }, owner.token);
    expect(stale.status).toBe(409);
    const after = await call(`/v1/classes/${classId}/sessions?from=${today}&to=${addDays(today, 56)}`, {}, owner.token);
    expect(after.body.items).toEqual(before.body.items);
  });

  it('checks the role matrix for every class endpoint', async () => {
    const owner = await registerWorkspaceAtIp('+84900000121', 'Class role matrix', '198.51.100.21');
    const target = await insertClass(owner.workspaceId, 'C1', owner.userId);
    const otherClass = await insertClass(owner.workspaceId, 'C2', owner.userId);
    const child = await insertStudent(owner.workspaceId, target, 'Own child', null, owner.userId);
    const otherChild = await insertStudent(owner.workspaceId, otherClass, 'Other child', null, owner.userId);
    const teacherUser = await insertUser('+84900000122');
    const teacherMember = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [target]);
    const assistantUser = await insertUser('+84900000123');
    const assistantMember = await insertMembership(owner.workspaceId, assistantUser, owner.roles.assistant!, [target]);
    const parentUser = await insertUser('+84900000124');
    const parentMember = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [child]);
    const anotherParentUser = await insertUser('+84900000125');
    const anotherParentMember = await insertGuardianMembership(owner.workspaceId, anotherParentUser, owner.roles.guardian!, [otherChild]);
    const otherWorkspace = await registerWorkspaceAtIp('+84900000126', 'Class matrix workspace B', '198.51.100.22');
    const actors = [
      { name: 'Admin', token: owner.token, list: 200, create: 201, get: 200, patch: 200 },
      { name: 'Giáo viên', token: await clubToken(owner.workspaceId, teacherUser, teacherMember), list: 200, create: 201, get: 200, patch: 200 },
      { name: 'Trợ giảng', token: await clubToken(owner.workspaceId, assistantUser, assistantMember), list: 200, create: 403, get: 200, patch: 403 },
      { name: 'Phụ huynh', token: await clubToken(owner.workspaceId, parentUser, parentMember), list: 200, create: 403, get: 200, patch: 403 },
      { name: 'Chưa đăng nhập', token: undefined, list: 401, create: 401, get: 401, patch: 401 },
      { name: 'Workspace khác', token: otherWorkspace.token, list: 200, create: 201, get: 404, patch: 404 },
      { name: 'Phụ huynh khác', token: await clubToken(owner.workspaceId, anotherParentUser, anotherParentMember), list: 200, create: 403, get: 404, patch: 404 },
    ];
    for (const actor of actors) {
      const list = await call('/v1/classes', {}, actor.token);
      expect(list.status, `${actor.name} GET /classes`).toBe(actor.list);
      if (actor.name === 'Phụ huynh') expect(list.body.items.map((row: any) => row.id)).toEqual([target]);
      if (actor.name === 'Phụ huynh khác' || actor.name === 'Workspace khác') {
        expect(list.body.items.some((row: any) => row.id === target)).toBe(false);
      }
      expect((await call('/v1/classes', post({ name: `New ${actor.name}`, weekdays: [], start_time: '18:00' }), actor.token)).status,
        `${actor.name} POST /classes`).toBe(actor.create);
      expect((await call(`/v1/classes/${target}`, {}, actor.token)).status, `${actor.name} GET /classes/:id`).toBe(actor.get);
      expect((await call(`/v1/classes/${target}`, { method: 'PATCH', body: JSON.stringify({ name: `Renamed ${actor.name}` }) }, actor.token)).status,
        `${actor.name} PATCH /classes/:id`).toBe(actor.patch);
    }
  });
});
