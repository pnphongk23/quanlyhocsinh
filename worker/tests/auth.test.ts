import { describe, expect, it } from 'vitest';
import { call, db, fakePhone, insertClass, insertStudent, login, PASSWORD, post, registerWorkspace } from './helpers';

describe('auth flows', () => {
  it('registers the four default roles, exposes them in /me, then changes password and logs out', async () => {
    const phone = fakePhone();
    const registered = await call('/v1/auth/register', post({
      phone, password: PASSWORD, display_name: 'Test teacher', workspace_name: 'Test workspace',
    }));
    expect(registered.status).toBe(201);
    const workspaceId = registered.body.memberships[0].workspace.id;
    const { results: roles } = await db.prepare(
      `SELECT r.system_key, r.scope_kind, p.perm_group, p.level FROM roles r
       JOIN role_permissions p ON p.role_id=r.id WHERE r.workspace_id=? ORDER BY r.system_key,p.perm_group`,
    ).bind(workspaceId).all<{ system_key: string; scope_kind: string; perm_group: string; level: string }>();
    expect(new Set(roles.map((role) => role.system_key))).toEqual(new Set(['admin','teacher','assistant','guardian']));
    expect(roles).toHaveLength(24);
    const me = await call('/v1/me', {}, registered.body.token);
    expect(me.status).toBe(200);
    expect(me.body.memberships).toHaveLength(1);
    expect(me.body.memberships[0].permissions.scores).toBe('write');

    await db.prepare('UPDATE users SET must_change_password=1 WHERE id=?').bind(registered.body.user.id).run();
    expect((await call('/v1/classes', {}, registered.body.token)).body.error.code).toBe('password_change_required');
    const changed = await call('/v1/auth/change-password', post({ current_password: PASSWORD, new_password: 'another-Pass-456' }), registered.body.token);
    expect(changed.status).toBe(200);
    expect((await login(phone, 'another-Pass-456')).status).toBe(200);
    expect((await call('/v1/auth/logout', { method: 'POST' }, registered.body.token)).status).toBe(204);
    expect((await call('/v1/me', {}, registered.body.token)).status).toBe(401);
  });

  it('locks login after five wrong passwords', async () => {
    const phone = fakePhone();
    await registerWorkspace(phone, 'Lockout workspace');
    const attempts = [];
    for (let i = 0; i < 5; i += 1) attempts.push(await login(phone, 'wrong-Pass-123'));
    expect(attempts.slice(0, 4).every((result) => result.status === 401)).toBe(true);
    expect(attempts[4]?.status).toBe(429);
  });

  it('issues temporary guardian credentials once and rejects B-01 reset for a staff account', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Credentials workspace');
    const classId = await insertClass(owner.workspaceId, 'Credential class', owner.userId);
    const guardianPhone = fakePhone();
    const studentId = await insertStudent(owner.workspaceId, classId, 'Child', guardianPhone, owner.userId);
    const issued = await call(`/v1/students/${studentId}/guardian-credentials`, post({}), owner.token);
    expect(issued.status).toBe(200);
    expect(issued.body.password_issued).toBe(true);
    expect(issued.body.must_change_password).toBe(true);
    expect((await login(guardianPhone, issued.body.temporary_password)).body.user.must_change_password).toBe(true);

    const staffPhone = fakePhone();
    await registerWorkspace(staffPhone, 'Staff account workspace');
    const staffStudent = await insertStudent(owner.workspaceId, classId, 'Other child', staffPhone, owner.userId);
    const rejected = await call(`/v1/students/${staffStudent}/guardian-credentials`, post({}), owner.token);
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe('account_not_resettable');
  });
});
