import { describe, expect, it } from 'vitest';
import { call, clubToken, db, fakePhone, insertClass, insertGuardianMembership, insertMembership, insertStudent, insertUser, login, post } from './helpers';

const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });
let ipCounter = 120;
async function registerWorkspace(name: string) {
  const result = await call('/v1/auth/register', {
    ...post({ phone: fakePhone(), password: 'example-Pass-123', display_name: 'Owner', workspace_name: name }),
    headers: { 'cf-connecting-ip': `198.51.100.${ipCounter++}` },
  });
  if (result.status !== 201) throw new Error(`workspace setup failed: ${result.status}`);
  const workspaceId = result.body.memberships[0].workspace.id as string;
  const roles = await db.prepare('SELECT system_key,id FROM roles WHERE workspace_id=?').bind(workspaceId)
    .all<{ system_key: string; id: string }>();
  return { workspaceId, userId: result.body.user.id as string, membershipId: result.body.active_membership_id as string,
    token: result.body.token as string, roles: Object.fromEntries(roles.results.map((row) => [row.system_key, row.id])) };
}

async function staffMember(workspace: Awaited<ReturnType<typeof registerWorkspace>>, role: 'teacher' | 'assistant', name: string | null) {
  const userId = await insertUser(fakePhone(), name);
  const membershipId = await insertMembership(workspace.workspaceId, userId, workspace.roles[role]!);
  return { userId, membershipId, token: await clubToken(workspace.workspaceId, userId, membershipId) };
}

describe('staff display name per workspace', () => {
  it('lets an Admin name a member without a name and shows it in staff list, /me and class teacher name', async () => {
    const workspace = await registerWorkspace('Name edit');
    const classId = await insertClass(workspace.workspaceId, 'Class', workspace.userId);
    const teacher = await staffMember(workspace, 'teacher', null);
    await db.prepare('INSERT INTO member_classes(workspace_id,membership_id,class_id,created_at) VALUES(?,?,?,?)')
      .bind(workspace.workspaceId, teacher.membershipId, classId, new Date().toISOString()).run();
    const before = (await call('/v1/staff', {}, workspace.token)).body.items.find((row: any) => row.id === teacher.membershipId);
    expect(before.display_name).toBeNull();

    const updated = await call(`/v1/staff/${teacher.membershipId}`, patch({ display_name: '  Cô Thu  ', base_version: before.version }), workspace.token);
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ display_name: 'Cô Thu', version: before.version + 1 });
    expect((await call('/v1/staff', {}, workspace.token)).body.items.find((row: any) => row.id === teacher.membershipId).display_name).toBe('Cô Thu');

    const me = await call('/v1/me', {}, teacher.token);
    expect(me.body.memberships[0].display_name).toBe('Cô Thu');
    expect(me.body.user.display_name).toBe('Cô Thu');
    const classes = await call('/v1/classes', {}, workspace.token);
    expect(classes.body.items.find((row: any) => row.id === classId).teacher_name).toBe('Cô Thu');
    expect(await db.prepare('SELECT display_name FROM users WHERE id=?').bind(teacher.userId).first()).toEqual({ display_name: null });
  });

  it('stores the Admin-entered name when adding a phone that already has an account', async () => {
    const workspace = await registerWorkspace('Name add existing');
    const phone = fakePhone();
    const userId = await insertUser(phone, 'Account name');
    const created = await call('/v1/staff', post({ phone, display_name: '  Cô Hoa  ', role: 'assistant' }), workspace.token);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ kind: 'member', display_name: 'Cô Hoa' });
    expect(await db.prepare('SELECT display_name FROM users WHERE id=?').bind(userId).first()).toEqual({ display_name: 'Account name' });
    const token = await clubToken(workspace.workspaceId, userId, created.body.id);
    expect((await call('/v1/me', {}, token)).body.memberships[0].display_name).toBe('Cô Hoa');
  });

  it('lets an Admin rename themselves and shows the new name in /me', async () => {
    const workspace = await registerWorkspace('Name self');
    const self = (await call('/v1/staff', {}, workspace.token)).body.items.find((row: any) => row.is_self);
    expect(self.display_name).toBe('Owner');
    const renamed = await call(`/v1/staff/${workspace.membershipId}`, patch({ display_name: 'Cô Chủ' }), workspace.token);
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ is_self: true, display_name: 'Cô Chủ' });
    const me = await call('/v1/me', {}, workspace.token);
    expect(me.body).toMatchObject({ user: { display_name: 'Cô Chủ' }, memberships: [{ display_name: 'Cô Chủ' }] });
  });

  it('does not rename the same person in another workspace', async () => {
    const first = await registerWorkspace('Name A');
    const second = await registerWorkspace('Name B');
    const userId = await insertUser(fakePhone(), 'Account name');
    const inFirst = await insertMembership(first.workspaceId, userId, first.roles.assistant!);
    const inSecond = await insertMembership(second.workspaceId, userId, second.roles.assistant!);
    expect((await call(`/v1/staff/${inFirst}`, patch({ display_name: 'Name in A' }), first.token)).status).toBe(200);
    const listB = (await call('/v1/staff', {}, second.token)).body.items.find((row: any) => row.id === inSecond);
    expect(listB.display_name).toBe('Account name');
    const me = await call('/v1/me', {}, await clubToken(second.workspaceId, userId, inSecond));
    expect(me.body.user.display_name).toBe('Account name');
    // an Admin of workspace B cannot reach the membership of workspace A
    expect((await call(`/v1/staff/${inFirst}`, patch({ display_name: 'Hijack' }), second.token)).status).toBe(404);
    expect(await db.prepare('SELECT display_name FROM memberships WHERE id=?').bind(inFirst).first()).toEqual({ display_name: 'Name in A' });
  });

  it('validates the name and keeps a no-op edit from bumping the version', async () => {
    const workspace = await registerWorkspace('Name validation');
    const teacher = await staffMember(workspace, 'teacher', 'Same');
    const url = `/v1/staff/${teacher.membershipId}`;
    for (const bad of ['', '   ', 'x'.repeat(101), 5, null]) {
      const result = await call(url, patch({ display_name: bad }), workspace.token);
      expect(result.status, JSON.stringify(bad)).toBe(422);
    }
    const same = await call(url, patch({ display_name: 'Same' }), workspace.token);
    expect(same.status).toBe(200);
    expect(same.body.version).toBe(1);
    expect((await call(url, patch({ display_name: 'x'.repeat(100) }), workspace.token)).status).toBe(200);
    const stale = await call(url, patch({ display_name: 'Late', base_version: 1 }), workspace.token);
    expect(stale.status).toBe(409);
  });

  it('does not bump scope_epoch for a name-only edit', async () => {
    const workspace = await registerWorkspace('Name epoch');
    const teacher = await staffMember(workspace, 'teacher', null);
    await call(`/v1/staff/${teacher.membershipId}`, patch({ display_name: 'Renamed' }), workspace.token);
    expect(await db.prepare('SELECT scope_epoch FROM memberships WHERE id=?').bind(teacher.membershipId).first()).toEqual({ scope_epoch: 1 });
  });

  it('rejects renaming for teacher, assistant and guardian roles and for an unauthenticated caller', async () => {
    const workspace = await registerWorkspace('Name permissions');
    const teacher = await staffMember(workspace, 'teacher', 'Teacher');
    const assistant = await staffMember(workspace, 'assistant', 'Assistant');
    for (const actor of [teacher, assistant]) {
      for (const target of [teacher.membershipId, assistant.membershipId, workspace.membershipId]) {
        expect((await call(`/v1/staff/${target}`, patch({ display_name: 'Self rename' }), actor.token)).status).toBe(403);
      }
    }
    const guardianUser = await insertUser(fakePhone(), 'Parent');
    const classId = await insertClass(workspace.workspaceId, 'Class', workspace.userId);
    const child = await insertStudent(workspace.workspaceId, classId, 'Child', null, workspace.userId);
    const guardianMembership = await insertGuardianMembership(workspace.workspaceId, guardianUser, workspace.roles.guardian!, [child]);
    const guardianToken = await clubToken(workspace.workspaceId, guardianUser, guardianMembership);
    expect((await call(`/v1/staff/${teacher.membershipId}`, patch({ display_name: 'Parent rename' }), guardianToken)).status).toBe(403);
    expect((await call(`/v1/staff/${teacher.membershipId}`, patch({ display_name: 'Anon' }))).status).toBe(401);
    expect(await db.prepare('SELECT display_name FROM memberships WHERE id=?').bind(teacher.membershipId).first()).toEqual({ display_name: null });
  });

  it('carries the pending name onto the membership when the person activates by guardian setup or login', async () => {
    const workspace = await registerWorkspace('Name claim');
    const viaSetup = fakePhone();
    const viaLogin = fakePhone();
    await call('/v1/staff', post({ phone: viaSetup, display_name: 'Cô Lan', role: 'assistant' }), workspace.token);
    await call('/v1/staff', post({ phone: viaLogin, display_name: 'Thầy Minh', role: 'teacher' }), workspace.token);

    const registration = await call('/v1/auth/register-guardian', {
      ...post({ phone: viaSetup, password: 'fake-password-123' }), headers: { 'cf-connecting-ip': `198.51.100.${ipCounter++}` },
    });
    expect(registration.status).toBe(201);
    expect(registration.body.memberships[0].display_name).toBe('Cô Lan');
    expect((await call('/v1/me', {}, registration.body.token)).body.user.display_name).toBe('Cô Lan');

    await insertUser(viaLogin, null, 'fake-password-123');
    const loggedIn = await login(viaLogin, 'fake-password-123');
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.memberships[0].display_name).toBe('Thầy Minh');
    const list = (await call('/v1/staff', {}, workspace.token)).body.items;
    expect(list.filter((row: any) => row.kind === 'member').map((row: any) => row.display_name)).toEqual(expect.arrayContaining(['Cô Lan', 'Thầy Minh']));
  });
});
