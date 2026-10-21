import { describe, expect, it } from 'vitest';
import { call, clubToken, db, insertClass, insertGuardianMembership, insertMembership, insertStudent, insertUser, post, registerWorkspace, PASSWORD, type RegisteredWorkspace } from './helpers';

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

describe('students API', () => {
  it('creates, scopes, links by phone, updates phone and preserves a left student', async () => {
    const owner = await registerWorkspaceAtIp('+84900000201', 'Students API', '198.51.100.12');
    const classId = await insertClass(owner.workspaceId, 'Class A', owner.userId);
    const studentId = await insertStudent(owner.workspaceId, classId, 'Student A', '+84900000202', owner.userId);
    const parentUser = await insertUser('+84900000202');
    const parentMembership = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [studentId]);
    const parentToken = await clubToken(owner.workspaceId, parentUser, parentMembership);

    const create = await call(`/v1/classes/${classId}/students`, post({ name: 'Student B', parent_phone: '0900000202', enrolled_at: '2026-10-21' }), owner.token);
    expect(create.status).toBe(201);
    expect(create.body.parent_phone).toBe('+84900000202');
    const list = await call(`/v1/classes/${classId}/students`, {}, parentToken);
    expect(list.status).toBe(200);
    expect(list.body.items.every((row: any) => !('parent_phone' in row))).toBe(true);
    expect(list.body.items.length).toBe(2);

    const teacherUser = await insertUser('+84900000203');
    const teacherMembership = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [classId]);
    const teacherToken = await clubToken(owner.workspaceId, teacherUser, teacherMembership);
    const createdElsewhere = await call(`/v1/classes/${classId}/students`, post({ name: 'Student C', enrolled_at: '2026-10-21' }), teacherToken);
    expect(createdElsewhere.status).toBe(201);
    expect((await call(`/v1/classes/${classId}/students`, post({ name: 'Denied', enrolled_at: '2026-10-21' }), parentToken)).status).toBe(403);

    const replacementUser = await insertUser('+84900000204');
    const anotherStudent = await insertStudent(owner.workspaceId, classId, 'Student Other', '+84900000204', owner.userId);
    const replacementMembership = await insertGuardianMembership(owner.workspaceId, replacementUser, owner.roles.guardian!, [anotherStudent]);
    const replacementToken = await clubToken(owner.workspaceId, replacementUser, replacementMembership);
    const before = await call(`/v1/students/${studentId}`, {}, parentToken);
    expect(before.status).toBe(200);
    expect(before.body).not.toHaveProperty('parent_phone');
    const epochBefore = await db.prepare('SELECT scope_epoch FROM memberships WHERE id = ?').bind(parentMembership).first<{ scope_epoch: number }>();

    const changed = await call(`/v1/students/${studentId}`, { method: 'PATCH', body: JSON.stringify({ parent_phone: '+84900000204', base_version: 1 }) }, owner.token);
    expect(changed.status).toBe(200);
    expect((await call(`/v1/students/${studentId}`, {}, parentToken)).status).toBe(404);
    expect((await call(`/v1/students/${studentId}`, {}, replacementToken)).status).toBe(200);
    const epochAfter = await db.prepare('SELECT scope_epoch FROM memberships WHERE id = ?').bind(parentMembership).first<{ scope_epoch: number }>();
    expect(epochAfter!.scope_epoch).toBe(epochBefore!.scope_epoch + 1);

    const left = await call(`/v1/students/${studentId}`, { method: 'PATCH', body: JSON.stringify({ status: 'left', left_at: '2026-10-22', base_version: 2 }) }, owner.token);
    expect(left.status).toBe(200);
    expect(left.body).toMatchObject({ status: 'left', left_at: '2026-10-22', version: 3 });
    expect((await call(`/v1/classes/${classId}/students?status=left`, {}, owner.token)).body.items.map((row: any) => row.id)).toContain(studentId);
    expect((await call(`/v1/classes/${classId}/students`, {}, (await registerWorkspaceAtIp('+84900000205', 'Other', '198.51.100.13')).token)).status).toBe(404);
    expect((await call(`/v1/students/${studentId}`)).status).toBe(401);
  });

  it('checks the role matrix and student privacy for every student endpoint', async () => {
    const owner = await registerWorkspaceAtIp('+84900000221', 'Student role matrix', '198.51.100.23');
    const classId = await insertClass(owner.workspaceId, 'C1', owner.userId);
    const otherClass = await insertClass(owner.workspaceId, 'C2', owner.userId);
    const target = await insertStudent(owner.workspaceId, classId, 'Target child', null, owner.userId);
    const sibling = await insertStudent(owner.workspaceId, classId, 'Other child', null, owner.userId);
    const foreignStudent = await insertStudent(owner.workspaceId, otherClass, 'Different class', null, owner.userId);
    const teacherUser = await insertUser('+84900000222');
    const teacherMember = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [classId]);
    const assistantUser = await insertUser('+84900000223');
    const assistantMember = await insertMembership(owner.workspaceId, assistantUser, owner.roles.assistant!, [classId]);
    const parentUser = await insertUser('+84900000224');
    const parentMember = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [target]);
    const anotherParentUser = await insertUser('+84900000225');
    const anotherParentMember = await insertGuardianMembership(owner.workspaceId, anotherParentUser, owner.roles.guardian!, [sibling]);
    const otherWorkspace = await registerWorkspaceAtIp('+84900000226', 'Student matrix workspace B', '198.51.100.24');
    const actors = [
      { name: 'Admin', token: owner.token, classList: 200, create: 201, studentGet: 200, patch: 200 },
      { name: 'Giáo viên', token: await clubToken(owner.workspaceId, teacherUser, teacherMember), classList: 200, create: 201, studentGet: 200, patch: 200 },
      { name: 'Trợ giảng', token: await clubToken(owner.workspaceId, assistantUser, assistantMember), classList: 200, create: 403, studentGet: 200, patch: 403 },
      { name: 'Phụ huynh', token: await clubToken(owner.workspaceId, parentUser, parentMember), classList: 200, create: 403, studentGet: 200, patch: 403 },
      { name: 'Chưa đăng nhập', token: undefined, classList: 401, create: 401, studentGet: 401, patch: 401 },
      { name: 'Workspace khác', token: otherWorkspace.token, classList: 404, create: 404, studentGet: 404, patch: 404 },
      { name: 'Phụ huynh khác', token: await clubToken(owner.workspaceId, anotherParentUser, anotherParentMember), classList: 200, create: 403, studentGet: 404, patch: 404 },
    ];
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    for (const actor of actors) {
      const list = await call(`/v1/classes/${classId}/students`, {}, actor.token);
      expect(list.status, `${actor.name} GET /classes/:id/students`).toBe(actor.classList);
      if (actor.name === 'Phụ huynh') {
        expect(list.body.items.map((row: any) => row.id)).toEqual([target]);
        expect(list.body.items[0]).not.toHaveProperty('parent_phone');
      }
      if (actor.name === 'Phụ huynh khác') expect(list.body.items.map((row: any) => row.id)).toEqual([sibling]);
      expect((await call(`/v1/classes/${classId}/students`, post({ name: `New ${actor.name}`, enrolled_at: today }), actor.token)).status,
        `${actor.name} POST /classes/:id/students`).toBe(actor.create);
      expect((await call(`/v1/students/${target}`, {}, actor.token)).status, `${actor.name} GET /students/:id`).toBe(actor.studentGet);
      expect((await call(`/v1/students/${target}`, { method: 'PATCH', body: JSON.stringify({ name: `Updated ${actor.name}` }) }, actor.token)).status,
        `${actor.name} PATCH /students/:id`).toBe(actor.patch);
    }
    expect((await call(`/v1/students/${foreignStudent}`, {}, actors[1]!.token)).status).toBe(404);
    expect((await call(`/v1/students/${foreignStudent}`, {}, owner.token)).status).toBe(200);
  });
});
