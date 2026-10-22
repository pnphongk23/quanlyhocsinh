import { describe, expect, it } from 'vitest';
import {
  call,
  db,
  fakePhone,
  insertClass,
  insertDeviceToken,
  insertStudent,
  login,
  PASSWORD,
  post,
  put,
} from './helpers';

async function registerWorkspaceAtIp(phone: string, name: string, ip: string) {
  const result = await call('/v1/auth/register', {
    ...post({ phone, password: PASSWORD, workspace_name: name }),
    headers: { 'cf-connecting-ip': ip },
  });
  if (result.status !== 201) throw new Error(`workspace setup failed: ${result.status}`);
  return {
    workspaceId: result.body.memberships[0].workspace.id as string,
    userId: result.body.user.id as string,
    membershipId: result.body.active_membership_id as string,
    token: result.body.token as string,
  };
}

async function registerGuardian(phone: string, ip: string) {
  return call('/v1/auth/register-guardian', {
    ...post({ phone, password: PASSWORD, display_name: 'Parent Sample' }),
    headers: { 'cf-connecting-ip': ip },
  });
}

describe('guardian self registration', () => {
  it('links all matching students across workspaces and keeps guardian scope narrow', async () => {
    const phone = fakePhone();
    const teacherA = await registerWorkspaceAtIp(fakePhone(), 'Guardian workspace A', '198.51.100.41');
    const classA = await insertClass(teacherA.workspaceId, 'Class A', teacherA.userId);
    const childA = await insertStudent(teacherA.workspaceId, classA, 'Child A', phone, teacherA.userId);
    const childA2 = await insertStudent(teacherA.workspaceId, classA, 'Child A2', phone, teacherA.userId);
    const siblingA = await insertStudent(teacherA.workspaceId, classA, 'Not linked', null, teacherA.userId);
    const teacherB = await registerWorkspaceAtIp(fakePhone(), 'Guardian workspace B', '198.51.100.42');
    const classB = await insertClass(teacherB.workspaceId, 'Class B', teacherB.userId);
    const childB = await insertStudent(teacherB.workspaceId, classB, 'Child B', phone, teacherB.userId);

    const registered = await registerGuardian(phone, '198.51.100.43');
    expect(registered.status).toBe(201);
    expect(registered.headers.get('cache-control')).toBe('no-store');
    expect(registered.body.user.must_change_password).toBe(false);
    expect(registered.body.memberships).toHaveLength(2);
    expect(registered.body.active_membership_id).toBeNull();
    expect(await db.prepare('SELECT COUNT(*) AS count FROM guardian_student WHERE user_id = ?')
      .bind(registered.body.user.id).first<{ count: number }>()).toMatchObject({ count: 3 });

    const loggedIn = await login(phone);
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.active_membership_id).toBeNull();
    const me = await call('/v1/me', {}, registered.body.token);
    expect(me.body.memberships).toHaveLength(2);
    const membershipA = me.body.memberships.find((row: any) => row.workspace.id === teacherA.workspaceId);
    const selected = await call('/v1/session/membership', put({ membership_id: membershipA.id }), registered.body.token);
    expect(selected.status).toBe(200);
    const guardianToken = registered.body.token as string;

    const children = await call(`/v1/classes/${classA}/students`, {}, guardianToken);
    expect(children.status).toBe(200);
    expect(children.body.items.map((row: any) => row.id)).toEqual([childA, childA2]);
    expect(children.body.items[0]).not.toHaveProperty('parent_phone');
    expect((await call(`/v1/students/${siblingA}`, {}, guardianToken)).body.error.code).toBe('not_found');
    expect((await call(`/v1/students/${childB}`, {}, guardianToken)).body.error.code).toBe('not_found');
  });

  it('allows an unlinked account, then adds a guardian membership when a teacher adds the child', async () => {
    const phone = fakePhone();
    const registered = await registerGuardian(phone, '198.51.100.44');
    expect(registered.status).toBe(201);
    expect(registered.body.memberships).toEqual([]);
    expect(registered.body.active_membership_id).toBeNull();
    expect((await call('/v1/me', {}, registered.body.token)).body.memberships).toEqual([]);
    expect((await call('/v1/classes', {}, registered.body.token)).body.error)
      .toMatchObject({ code: 'forbidden', details: { reason: 'membership_required' } });
    expect((await login(phone)).body.memberships).toEqual([]);

    const teacher = await registerWorkspaceAtIp(fakePhone(), 'Later child workspace', '198.51.100.45');
    const classId = await insertClass(teacher.workspaceId, 'Class', teacher.userId);
    const created = await call(`/v1/classes/${classId}/students`, post({
      name: 'New child', parent_phone: phone, enrolled_at: '2026-10-21',
    }), teacher.token);
    expect(created.status).toBe(201);
    const me = await call('/v1/me', {}, registered.body.token);
    expect(me.body.memberships).toHaveLength(1);
    expect((await call('/v1/session/membership', put({ membership_id: me.body.memberships[0].id }), registered.body.token)).status)
      .toBe(200);
    expect((await call(`/v1/students/${created.body.id}`, {}, registered.body.token)).status).toBe(200);
  });

  it('moves the final child link, revokes the old guardian session, and reactivates the new guardian membership', async () => {
    const oldPhone = fakePhone();
    const newPhone = fakePhone();
    const teacher = await registerWorkspaceAtIp(fakePhone(), 'Phone change workspace', '198.51.100.46');
    const classId = await insertClass(teacher.workspaceId, 'Class', teacher.userId);
    const studentId = await insertStudent(teacher.workspaceId, classId, 'Child', oldPhone, teacher.userId);
    const oldGuardian = await registerGuardian(oldPhone, '198.51.100.47');
    const newGuardian = await registerGuardian(newPhone, '198.51.100.48');
    const oldMembershipId = oldGuardian.body.memberships[0].id as string;
    const newMembershipId = newGuardian.body.memberships.length === 0 ? null : newGuardian.body.memberships[0].id;
    const oldSession = await db.prepare('SELECT id FROM auth_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(oldGuardian.body.user.id).first<{ id: string }>();
    expect(oldSession).not.toBeNull();
    const deviceId = await insertDeviceToken(teacher.workspaceId, oldGuardian.body.user.id, oldMembershipId, oldSession!.id);

    const changed = await call(`/v1/students/${studentId}`, {
      method: 'PATCH', body: JSON.stringify({ parent_phone: newPhone, base_version: 1 }),
    }, teacher.token);
    expect(changed.status).toBe(200);
    expect((await call('/v1/me', {}, oldGuardian.body.token)).status).toBe(401);
    expect((await db.prepare('SELECT status FROM memberships WHERE id = ?').bind(oldMembershipId)
      .first<{ status: string }>())?.status).toBe('disabled');
    expect((await db.prepare('SELECT revoked_at FROM auth_sessions WHERE id = ?').bind(oldSession!.id)
      .first<{ revoked_at: string | null }>())?.revoked_at).not.toBeNull();
    expect((await db.prepare('SELECT id FROM device_tokens WHERE id = ?').bind(deviceId)
      .first<{ id: string }>())).toBeNull();

    const newMe = await call('/v1/me', {}, newGuardian.body.token);
    expect(newMe.body.memberships).toHaveLength(1);
    expect(newMembershipId).toBeNull();
    expect((await call('/v1/session/membership', put({ membership_id: newMe.body.memberships[0].id }), newGuardian.body.token)).status)
      .toBe(200);
    expect((await call(`/v1/students/${studentId}`, {}, newGuardian.body.token)).status).toBe(200);
  });

  it('rejects duplicate phones and weak passwords', async () => {
    const phone = fakePhone();
    await registerGuardian(phone, '198.51.100.49');
    expect((await registerGuardian(phone, '198.51.100.50')).body.error)
      .toMatchObject({ code: 'conflict', details: { reason: 'phone_registered' } });
    expect((await call('/v1/auth/register-guardian', {
      ...post({ phone: fakePhone(), password: 'short' }),
      headers: { 'cf-connecting-ip': '198.51.100.51' },
    })).body.error).toMatchObject({ code: 'validation_error', details: { reason: 'weak_password' } });
  });

  it('throttles guardian registration and workspace creation with Retry-After', async () => {
    const ip = '198.51.100.52';
    for (let index = 0; index < 5; index += 1) {
      expect((await registerGuardian(fakePhone(), ip)).status).toBe(201);
    }
    const throttledGuardian = await registerGuardian(fakePhone(), ip);
    expect(throttledGuardian.status).toBe(429);
    expect(Number(throttledGuardian.headers.get('retry-after'))).toBeGreaterThan(0);

    const owner = await registerWorkspaceAtIp(fakePhone(), 'Workspace throttle owner', '198.51.100.53');
    for (let index = 0; index < 5; index += 1) {
      expect((await call('/v1/workspaces', post({ workspace_name: `Workspace ${index}` }), owner.token)).status).toBe(201);
    }
    const throttledWorkspace = await call('/v1/workspaces', post({ workspace_name: 'Over limit' }), owner.token);
    expect(throttledWorkspace.status).toBe(429);
    expect(Number(throttledWorkspace.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
