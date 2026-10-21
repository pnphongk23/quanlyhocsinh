import { describe, expect, it } from 'vitest';
import { call, db, insertClass, insertMembership, insertUser, post, registerWorkspace, clubToken, insertStudent, insertGuardianMembership, PASSWORD, type RegisteredWorkspace } from './helpers';

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
    expect(parentClass.body.items).toEqual([{ id: classId, name: 'Lớp A', status: 'active' }]);
    expect((await call(`/v1/classes/${classId}`, {}, parentToken)).body).toEqual({ id: classId, name: 'Lớp A', status: 'active' });
    expect((await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived', base_version: 1 }) }, parentToken)).status).toBe(403);

    const other = await registerWorkspaceAtIp('+84900000105', 'Other workspace', '198.51.100.11');
    expect((await call(`/v1/classes/${classId}`, {}, other.token)).status).toBe(404);
    expect((await call('/v1/classes')).status).toBe(401);

    const updated = await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ name: 'Lớp A+', base_version: 1 }) }, owner.token);
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: 'Lớp A+', version: 2 });
    expect((await call(`/v1/classes/${classId}`, { method: 'PATCH', body: JSON.stringify({ name: 'stale', base_version: 1 }) }, owner.token)).status).toBe(409);
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
