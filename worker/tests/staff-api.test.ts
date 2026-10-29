import { describe, expect, it } from 'vitest';
import { call, clubToken, db, fakePhone, insertClass, insertGuardianLink, insertMembership, insertSession, insertStudent, insertTest, insertUser, login, post, put } from './helpers';

const uid = () => crypto.randomUUID();
const command = (type: string, payload: unknown) => ({ id: uid(), type, payload, base_version: 0, created_at: new Date().toISOString() });
let ipCounter = 20;
async function registerWorkspace(name: string) {
  const phone = fakePhone();
  const result = await call('/v1/auth/register', {
    ...post({ phone, password: 'example-Pass-123', display_name: 'Workspace Admin', workspace_name: name }),
    headers: { 'cf-connecting-ip': `198.51.100.${ipCounter++}` },
  });
  if (result.status !== 201) throw new Error(`workspace setup failed: ${result.status}`);
  const workspaceId = result.body.memberships[0].workspace.id as string;
  const roles = await db.prepare('SELECT system_key,id FROM roles WHERE workspace_id=?').bind(workspaceId)
    .all<{ system_key: string; id: string }>();
  return { workspaceId, userId: result.body.user.id as string, membershipId: result.body.active_membership_id as string,
    token: result.body.token as string, roles: Object.fromEntries(roles.results.map((row) => [row.system_key, row.id])) };
}

describe('staff management and role permissions', () => {
  it('creates and claims a pending declaration through guardian setup', async () => {
    const admin = await registerWorkspace('Staff pending flow');
    const classId = await insertClass(admin.workspaceId, 'Assigned', admin.userId);
    const phone = fakePhone();
    const pending = await call('/v1/staff', post({ phone, display_name: 'Cô chờ', role: 'assistant', class_ids: [classId] }), admin.token);
    expect(pending.status).toBe(201);
    expect(pending.body).toMatchObject({ kind: 'pending', status: 'pending', class_ids: [classId], role: { system_key: 'assistant' } });
    expect((await call('/v1/auth/phone-check', post({ phone }))).body).toEqual({ next: 'guardian_setup' });
    expect((await call('/v1/staff', post({ phone, display_name: 'Trùng', role: 'teacher' }), admin.token)).body.error.details.reason)
      .toBe('staff_exists');

    const registration = await call('/v1/auth/register-guardian', post({ phone, password: 'fake-password-123' }));
    expect(registration.status).toBe(201);
    expect(registration.body.memberships).toHaveLength(1);
    expect(registration.body.active_membership_id).toBe(registration.body.memberships[0].id);
    expect(registration.body.memberships[0].role.system_key).toBe('assistant');
    expect(await db.prepare('SELECT id FROM staff_declarations WHERE phone=?').bind(phone).first()).toBeNull();
    expect(await db.prepare('SELECT class_id FROM member_classes WHERE membership_id=?').bind(registration.body.active_membership_id).first())
      .toEqual({ class_id: classId });
    expect((await call('/v1/me', {}, registration.body.token)).body.memberships[0].class_ids).toEqual([classId]);
  });

  it('claims pending staff on login after workspace registration', async () => {
    const admin = await registerWorkspace('Staff claim on register');
    const classId = await insertClass(admin.workspaceId, 'Assigned', admin.userId);
    const phone = fakePhone();
    const pending = await call('/v1/staff', post({ phone, display_name: 'Teacher pending', role: 'teacher', class_ids: [classId] }), admin.token);
    const registration = await call('/v1/auth/register', {
      ...post({ phone, password: 'fake-password-123', display_name: 'New owner', workspace_name: 'New workspace' }),
      headers: { 'cf-connecting-ip': `198.51.100.${ipCounter++}` },
    });
    expect(registration.status).toBe(201);
    expect(registration.body.memberships).toHaveLength(1);
    expect(registration.body.memberships[0].role.system_key).toBe('admin');
    const loggedIn = await login(phone, 'fake-password-123');
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.memberships).toHaveLength(2);
    expect(loggedIn.body.active_membership_id).toBeNull();
    expect(await db.prepare('SELECT id FROM staff_declarations WHERE id=?').bind(pending.body.id).first()).toBeNull();
    expect(loggedIn.body.memberships.map((member: any) => member.role.system_key).sort()).toEqual(['admin', 'teacher']);
    const staffMembership = loggedIn.body.memberships.find((member: any) => member.role.system_key === 'teacher');
    expect(await db.prepare('SELECT class_id FROM member_classes WHERE membership_id=?').bind(staffMembership.id).first())
      .toEqual({ class_id: classId });
  });

  it('claims a pending declaration for an existing account during login', async () => {
    const admin = await registerWorkspace('Staff claim on login');
    const classId = await insertClass(admin.workspaceId, 'Assigned', admin.userId);
    const phone = fakePhone();
    const userId = await insertUser(phone, 'Existing account');
    const declarationId = uid();
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO staff_declarations(id,workspace_id,phone,display_name,role_id,created_by,created_at,version)
      VALUES(?,?,?,?,?,?,?,1)`).bind(declarationId, admin.workspaceId, phone, 'Existing account', admin.roles.assistant, admin.userId, now).run();
    await db.prepare('INSERT INTO staff_declaration_classes(workspace_id,declaration_id,class_id) VALUES(?,?,?)')
      .bind(admin.workspaceId, declarationId, classId).run();
    const result = await login(phone);
    expect(result.status).toBe(200);
    expect(result.body.memberships[0].role.system_key).toBe('assistant');
    expect(await db.prepare('SELECT id FROM staff_declarations WHERE id=?').bind(declarationId).first()).toBeNull();
    expect(await db.prepare('SELECT user_id FROM memberships WHERE id=?').bind(result.body.active_membership_id).first())
      .toEqual({ user_id: userId });
  });

  it('adds existing accounts, enforces assigned scope and assistant permissions immediately', async () => {
    const admin = await registerWorkspace('Staff access');
    const assigned = await insertClass(admin.workspaceId, 'Assigned', admin.userId);
    const hidden = await insertClass(admin.workspaceId, 'Hidden', admin.userId);
    const studentId = await insertStudent(admin.workspaceId, assigned, 'Learner', null, admin.userId);
    const sessionId = await insertSession(admin.workspaceId, assigned, '2026-10-28', admin.userId);
    const testId = await insertTest(admin.workspaceId, assigned, admin.userId);
    const phone = fakePhone();
    const userId = await insertUser(phone, 'Existing user');
    const created = await call('/v1/staff', post({ phone, display_name: 'Ignored name', role: 'assistant', class_ids: [assigned] }), admin.token);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ kind: 'member', user_id: userId, display_name: 'Existing user', status: 'active' });
    const token = (await login(phone)).body.token as string;
    const me = await call('/v1/me', {}, token);
    const membershipId = created.body.id as string;
    expect(me.body.memberships[0].class_ids).toEqual([assigned]);
    expect((await call('/v1/classes', {}, token)).body.items.map((row: any) => row.id)).toEqual([assigned]);
    expect((await call(`/v1/classes/${hidden}`, {}, token)).status).toBe(404);
    const snapshot = await call(`/v1/sync/snapshot/class?membership_id=${membershipId}`, {}, token);
    expect(snapshot.body.items.map((row: any) => row.id)).toEqual([assigned]);
    const pull = await call('/v1/sync/pull', post({ membership_id: membershipId, cursor: null }), token);
    expect(JSON.stringify(pull.body)).not.toContain(hidden);

    const push = await call('/v1/sync/push', post({ membership_id: membershipId, device_id: uid(), commands: [
      command('score.set', { test_id: testId, student_id: studentId, value: 8 }),
      command('attendance.set', { session_id: sessionId, student_id: studentId, status: 'present' }),
      command('slip.set', { session_id: sessionId, student_id: studentId, stars: 3, note: 'Nice work' }),
      command('slip.send', { session_id: sessionId, student_ids: [studentId] }),
    ] }), token);
    expect(push.status).toBe(200);
    expect(push.body.results.map((result: any) => result.error?.code ?? result.status))
      .toEqual(['forbidden', 'applied', 'applied', 'forbidden']);

    const teacherRole = await call(`/v1/staff/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ role: 'teacher' }) }, admin.token);
    expect(teacherRole.status).toBe(200);
    expect((await call(`/v1/classes/${assigned}`, {}, token)).status).toBe(200);
    const ownClass = await call('/v1/classes', post({ name: 'Created by staff', weekdays: [], start_time: '18:00' }), token);
    expect(ownClass.status).toBe(201);
    expect(await db.prepare('SELECT class_id FROM member_classes WHERE membership_id=? AND class_id=?')
      .bind(membershipId, ownClass.body.id).first<any>()).toEqual({ class_id: ownClass.body.id });
    const before = (await db.prepare('SELECT scope_epoch,version FROM memberships WHERE id=?').bind(membershipId).first<any>())!;
    await call(`/v1/staff/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ class_ids: [] }) }, admin.token);
    const after = (await db.prepare('SELECT scope_epoch,version FROM memberships WHERE id=?').bind(membershipId).first<any>())!;
    expect(after.scope_epoch).toBe(before.scope_epoch + 1);
    expect((await call(`/v1/classes/${assigned}`, {}, token)).status).toBe(404);
    const unassignedPull = await call('/v1/sync/pull', post({ membership_id: membershipId, cursor: null }), token);
    expect(JSON.stringify(unassignedPull.body)).not.toContain(assigned);

    await call(`/v1/staff/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) }, admin.token);
    const denied = await call('/v1/classes', {}, token);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('account_disabled');
    const duplicate = await call('/v1/staff', post({ phone, display_name: 'Again', role: 'teacher' }), admin.token);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.details).toMatchObject({ reason: 'staff_exists', status: 'disabled', id: membershipId });
      const syncDenied = await call('/v1/sync/push', post({ membership_id: membershipId, device_id: uid(), commands: [] }), token);
      expect(syncDenied.status).toBe(404);
      const pullDenied = await call('/v1/sync/pull', post({ membership_id: membershipId, cursor: null }), token);
      expect([403, 404]).toContain(pullDenied.status);
      const other = await registerWorkspace('Staff same phone other workspace');
      const otherStaff = await call('/v1/staff', post({ phone, display_name: 'Same phone', role: 'teacher' }), other.token);
      expect(otherStaff.status).toBe(201);
      const multiRoleLogin = await login(phone);
      const otherMembership = multiRoleLogin.body.memberships.find((member: any) => member.workspace.id === other.workspaceId);
      expect((await call('/v1/session/membership', put({ membership_id: otherMembership.id }), multiRoleLogin.body.token)).status).toBe(200);
      expect((await call('/v1/classes', {}, multiRoleLogin.body.token)).status).toBe(200);
      await call(`/v1/staff/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) }, admin.token);
      expect((await call('/v1/session/membership', put({ membership_id: membershipId }), multiRoleLogin.body.token)).status).toBe(200);
      expect((await call('/v1/classes', {}, multiRoleLogin.body.token)).status).toBe(200);
  });

  it('applies role permissions, protects routes and preserves the final admin under parallel changes', async () => {
    const admin = await registerWorkspace('Staff permissions');
    const staffUserId = await insertUser(fakePhone());
    const staffMembership = await insertMembership(admin.workspaceId, staffUserId, admin.roles.teacher!);
    const staffToken = await clubToken(admin.workspaceId, staffUserId, staffMembership);
    const scoreClass = await insertClass(admin.workspaceId, 'Score class', admin.userId);
    const scoreStudent = await insertStudent(admin.workspaceId, scoreClass, 'Score learner', null, admin.userId);
    const scoreTest = await insertTest(admin.workspaceId, scoreClass, admin.userId);
    const assistantUserId = await insertUser(fakePhone());
    const assistantMembership = await insertMembership(admin.workspaceId, assistantUserId, admin.roles.assistant!, [scoreClass]);
    const assistantToken = await clubToken(admin.workspaceId, assistantUserId, assistantMembership);
    const assistantBefore = await db.prepare('SELECT scope_epoch FROM memberships WHERE id=?').bind(assistantMembership).first<any>();
    const nonAdminCalls = [
      call('/v1/staff', {}, staffToken),
      call('/v1/staff', post({ phone: fakePhone(), display_name: 'Nope', role: 'teacher' }), staffToken),
      call('/v1/staff/unknown', { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) }, staffToken),
      call('/v1/staff/unknown', { method: 'DELETE' }, staffToken),
      call('/v1/roles/permissions', {}, staffToken),
      call('/v1/roles/teacher/permissions', put({ permissions: { scores: 'read' } }), staffToken),
    ];
    for (const result of await Promise.all(nonAdminCalls)) {
      expect(result.status).toBe(403);
      expect(result.body.error.details.reason).toBe('admin_required');
    }
    const initial = await call('/v1/roles/permissions', {}, admin.token);
    expect(initial.body.items.find((item: any) => item.role.system_key === 'assistant').permissions.comments_reports).toBe('write');
    for (const permissions of [{ lectures: 'read' }, { scores: 'full' }]) {
      expect((await call('/v1/roles/teacher/permissions', put({ permissions }), admin.token)).status).toBe(422);
    }
    expect((await call('/v1/roles/teacher/permissions', put({ permissions: {} }), admin.token)).status).toBe(422);
    expect((await call('/v1/roles/admin/permissions', put({ permissions: { scores: 'read' } }), admin.token))
      .body.error.details.reason).toBe('role_not_editable');
    const guardianUser = await insertUser(fakePhone());
    const guardianRole = await db.prepare('SELECT id FROM roles WHERE workspace_id=? AND system_key=\'guardian\'')
      .bind(admin.workspaceId).first<any>();
    const guardianClass = await insertClass(admin.workspaceId, 'Guardian class', admin.userId);
    const guardianStudent = await insertStudent(admin.workspaceId, guardianClass, 'Guardian learner', null, admin.userId);
    await insertGuardianLink(admin.workspaceId, guardianUser, guardianStudent);
    const guardianMembership = await insertMembership(admin.workspaceId, guardianUser, guardianRole.id);
    const guardianToken = await clubToken(admin.workspaceId, guardianUser, guardianMembership);
    const routePaths = [
      ['/v1/staff', {}], ['/v1/staff', post({ phone: fakePhone(), display_name: 'Denied', role: 'teacher' })],
      ['/v1/staff/nope', { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) }],
      ['/v1/staff/nope', { method: 'DELETE' }], ['/v1/roles/permissions', {}],
      ['/v1/roles/assistant/permissions', put({ permissions: { scores: 'write' } })],
    ] as const;
    for (const token of [staffToken, assistantToken, guardianToken]) {
      for (const [path, init] of routePaths) {
        const result = await call(path, init, token);
        expect(result.status).toBe(403);
        expect(result.body.error.details.reason).toBe('admin_required');
      }
    }
    expect((await call('/v1/roles/guardian/permissions', put({ permissions: { scores: 'read' } }), admin.token))
      .body.error.details.reason).toBe('role_not_editable');
    expect((await call('/v1/roles/assistant/permissions', put({ permissions: { scores: 'write' } }), admin.token)).status).toBe(200);
    const assistantAfter = await db.prepare('SELECT scope_epoch FROM memberships WHERE id=?').bind(assistantMembership).first<any>();
    expect(assistantAfter.scope_epoch).toBe(assistantBefore.scope_epoch + 1);
    const assistantScore = await call('/v1/sync/push', post({ membership_id: assistantMembership, device_id: uid(), commands: [
      command('score.set', { test_id: scoreTest, student_id: scoreStudent, value: 8 }),
    ] }), assistantToken);
    expect(assistantScore.body.results[0].status).toBe('applied');

    for (const change of [{ status: 'disabled' }, { role: 'teacher' }]) {
      const lastAdmin = await call(`/v1/staff/${admin.membershipId}`, { method: 'PATCH', body: JSON.stringify(change) }, admin.token);
      expect(lastAdmin.status).toBe(409);
      expect(lastAdmin.body.error.details.reason).toBe('last_admin');
    }
    const secondAdminUser = await insertUser(fakePhone());
    const secondAdminMembership = await insertMembership(admin.workspaceId, secondAdminUser, admin.roles.admin!);
    const secondAdminToken = await clubToken(admin.workspaceId, secondAdminUser, secondAdminMembership);
    const results = await Promise.all([
      call(`/v1/staff/${admin.membershipId}`, { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) }, admin.token),
      call(`/v1/staff/${secondAdminMembership}`, { method: 'PATCH', body: JSON.stringify({ role: 'teacher' }) }, secondAdminToken),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const denied = results.find((result) => result.status === 409)!;
    expect(denied.body.error.details.reason).toBe('last_admin');
  });

  it('lets one phone switch between an Admin workspace and an assistant workspace', async () => {
    const first = await registerWorkspace('Staff workspace A');
    const second = await registerWorkspace('Staff workspace B');
    const classId = await insertClass(second.workspaceId, 'Assigned', second.userId);
    const result = await call('/v1/staff', post({ phone: (await db.prepare('SELECT phone FROM users WHERE id=?').bind(first.userId).first<any>()).phone,
      display_name: 'Will be ignored', role: 'assistant', class_ids: [classId] }), second.token);
    expect(result.status).toBe(201);
    const loggedIn = await login((await db.prepare('SELECT phone FROM users WHERE id=?').bind(first.userId).first<any>()).phone);
    expect(loggedIn.body.active_membership_id).toBeNull();
    expect(loggedIn.body.memberships).toHaveLength(2);
    const assistant = loggedIn.body.memberships.find((member: any) => member.workspace.id === second.workspaceId);
    const switched = await call('/v1/session/membership', put({ membership_id: assistant.id }), loggedIn.body.token);
    expect(switched.status).toBe(200);
    expect((await call('/v1/me', {}, loggedIn.body.token)).body.memberships
      .find((member: any) => member.workspace.id === second.workspaceId).permissions.scores).toBe('read');
    expect((await call('/v1/staff', {}, loggedIn.body.token)).status).toBe(403);
    const adminMembership = loggedIn.body.memberships.find((member: any) => member.workspace.id === first.workspaceId);
    await call('/v1/session/membership', put({ membership_id: adminMembership.id }), loggedIn.body.token);
    expect((await call('/v1/staff', {}, loggedIn.body.token)).status).toBe(200);
    expect((await call('/v1/me', {}, loggedIn.body.token)).body.memberships
      .find((member: any) => member.workspace.id === first.workspaceId).permissions.scores).toBe('write');
  });

  it('rejects a second staff role for the same account even when requests race', async () => {
    const admin = await registerWorkspace('Staff race roles');
    const phone = fakePhone();
    await insertUser(phone, 'Racing user');
    const results = await Promise.all(['teacher', 'assistant'].map((role) =>
      call('/v1/staff', post({ phone, display_name: 'Racing user', role, class_ids: [] }), admin.token)));
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect((await db.prepare(`SELECT COUNT(*) AS n FROM memberships m JOIN users u ON u.id=m.user_id
      WHERE m.workspace_id=? AND u.phone=?`).bind(admin.workspaceId, phone).first<{ n: number }>())!.n).toBe(1);
  });

  it('does not let a stale concurrent update re-enable a disabled member', async () => {
    const admin = await registerWorkspace('Staff race patch');
    const phone = fakePhone();
    await insertUser(phone, 'Patched user');
    const created = await call('/v1/staff', post({ phone, display_name: 'x', role: 'assistant', class_ids: [] }), admin.token);
    const [disable, retitle] = await Promise.all([
      call(`/v1/staff/${created.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) }, admin.token),
      call(`/v1/staff/${created.body.id}`, { method: 'PATCH', body: JSON.stringify({ role: 'teacher' }) }, admin.token),
    ]);
    expect([disable.status, retitle.status].sort()).toEqual([200, 409]);
    const row = await db.prepare('SELECT status,version FROM memberships WHERE id=?').bind(created.body.id)
      .first<{ status: string; version: number }>();
    expect(row!.version).toBe(2);
  });
});
