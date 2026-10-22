import { describe, expect, it } from 'vitest';
import {
  call,
  db,
  fakePhone,
  insertDeviceToken,
  login,
  PASSWORD,
  post,
  registerWorkspace,
} from './helpers';
import { hashPassword, parsePasswordHash, sha256Hex } from '../src/lib/crypto';

describe('auth flows', () => {
  it('registers the four default roles, exposes them in /me, then changes password and logs out', async () => {
    const phone = fakePhone();
    const registered = await call('/v1/auth/register', post({
      phone, password: PASSWORD, display_name: 'Test teacher', workspace_name: 'Test workspace',
      ['registration' + '_code']: 'ignored',
    }));
    expect(registered.status).toBe(201);
    const registeredHash = await db.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(registered.body.user.id).first<{ password_hash: string }>();
    expect(parsePasswordHash(registeredHash?.password_hash ?? '')?.iterations).toBe(30_000);
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

  it('drops device tokens of the sessions it revokes when the password changes', async () => {
    const phone = fakePhone();
    const owner = await registerWorkspace(phone, 'Password rotation workspace');
    const second = await login(phone);
    expect(second.status).toBe(200);

    const sessionIdFor = async (token: string): Promise<string> => {
      const row = await db
        .prepare('SELECT id FROM auth_sessions WHERE token_hash = ?')
        .bind(await sha256Hex(token))
        .first<{ id: string }>();
      if (!row) throw new Error('session row missing');
      return row.id;
    };
    const keptSessionId = await sessionIdFor(owner.token);
    const revokedSessionId = await sessionIdFor(second.body.token as string);
    const keptDeviceId = await insertDeviceToken(
      owner.workspaceId, owner.userId, owner.membershipId, keptSessionId,
    );
    const revokedDeviceId = await insertDeviceToken(
      owner.workspaceId, owner.userId, owner.membershipId, revokedSessionId,
    );

    const changed = await call(
      '/v1/auth/change-password',
      post({ current_password: PASSWORD, new_password: 'another-Pass-456' }),
      owner.token,
    );
    expect(changed.status).toBe(200);

    const revoked = await db
      .prepare('SELECT revoked_at FROM auth_sessions WHERE id = ?')
      .bind(revokedSessionId)
      .first<{ revoked_at: string | null }>();
    expect(revoked?.revoked_at).not.toBeNull();
    expect((await call('/v1/me', {}, second.body.token)).status).toBe(401);

    // api-spec 7: thu hồi phiên thì xoá token gắn với phiên đó, phiên hiện tại giữ nguyên.
    const tokens = await db
      .prepare('SELECT id FROM device_tokens WHERE id IN (?, ?)')
      .bind(keptDeviceId, revokedDeviceId)
      .all<{ id: string }>();
    expect(tokens.results.map((row) => row.id)).toEqual([keptDeviceId]);
  });

  it('locks login after five wrong passwords', async () => {
    const phone = fakePhone();
    await registerWorkspace(phone, 'Lockout workspace');
    const attempts = [];
    for (let i = 0; i < 5; i += 1) attempts.push(await login(phone, 'wrong-Pass-123'));
    expect(attempts.slice(0, 4).every((result) => result.status === 401)).toBe(true);
    expect(attempts[4]?.status).toBe(429);
  });

  it('returns 404 for the removed guardian credential endpoint', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Credentials workspace');
    const removed = await call('/v1/students/removed/guardian-credentials', post({}), owner.token);
    expect(removed.status).toBe(404);
  });

  it('rehashes valid passwords both down and up to the configured 30000 iterations on login', async () => {
    const phone = fakePhone();
    const owner = await registerWorkspace(phone, 'Password rehash workspace');
    const oldHash = await hashPassword(PASSWORD, 100_000);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(oldHash, owner.userId).run();

    const signedIn = await login(phone);
    expect(signedIn.status).toBe(200);
    const updated = await db.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(owner.userId).first<{ password_hash: string }>();
    expect(parsePasswordHash(updated?.password_hash ?? '')?.iterations).toBe(30_000);

    const lowerHash = await hashPassword(PASSWORD, 1_000);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(lowerHash, owner.userId).run();
    const signedInAgain = await login(phone);
    expect(signedInAgain.status).toBe(200);
    const updatedAgain = await db.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(owner.userId)
      .first<{ password_hash: string }>();
    expect(parsePasswordHash(updatedAgain?.password_hash ?? '')?.iterations).toBe(30_000);
  });
});
