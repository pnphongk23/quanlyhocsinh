import { describe, expect, it } from 'vitest';
import {
  call,
  db,
  fakePhone,
  insertDeviceToken,
  insertUser,
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
    expect(roles).toHaveLength(28);
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

  it('reserves concurrent login attempts atomically and permits retry after lock expiry', async () => {
    await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
    const phone = fakePhone();
    await registerWorkspace(phone, 'Concurrent login throttle');
    await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
    const ip = '198.51.100.71';
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        call('/v1/auth/login', {
          ...post({ phone, password: 'wrong-Pass-123' }),
          headers: { 'cf-connecting-ip': ip },
        }),
      ),
    );
    expect(results.filter((result) => result.status === 401)).toHaveLength(4);
    const throttled = results.filter((result) => result.status === 429);
    expect(throttled).toHaveLength(8);
    expect(throttled.every((result) => Number(result.headers.get('retry-after')) > 0)).toBe(true);

    await db.prepare("UPDATE auth_throttle SET window_start = '2000-01-01T00:00:00.000Z', locked_until = NULL WHERE key = ?")
      .bind(`login:p:${phone}`).run();
    expect((await call('/v1/auth/login', {
      ...post({ phone, password: PASSWORD }),
      headers: { 'cf-connecting-ip': ip },
    })).status).toBe(200);
  });

  it('refunds IP reservations for successful logins and throttles 20 failures across phones', async () => {
    await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
    const ip = '198.51.100.72';
    const phone = fakePhone();
    await registerWorkspace(phone, 'Successful login IP refund');
    await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
    for (let index = 0; index < 25; index += 1) {
      expect((await call('/v1/auth/login', {
        ...post({ phone, password: PASSWORD }),
        headers: { 'cf-connecting-ip': ip },
      })).status).toBe(200);
    }
    const ipRow = await db.prepare('SELECT fails FROM auth_throttle WHERE key = ?')
      .bind(`login:ip:${ip}`).first<{ fails: number }>();
    expect(ipRow?.fails).toBe(0);

    const failureIp = '198.51.100.73';
    const phones = Array.from({ length: 20 }, () => fakePhone());
    await Promise.all(phones.map((phone) => insertUser(phone)));
    const failures = await Promise.all(phones.map((phone) => {
      return call('/v1/auth/login', {
        ...post({ phone, password: 'wrong-Pass-123' }),
        headers: { 'cf-connecting-ip': failureIp },
      });
    }));
    expect(failures.filter((result) => result.status === 401)).toHaveLength(19);
    expect(failures.filter((result) => result.status === 429)).toHaveLength(1);
    expect(Number(failures.find((result) => result.status === 429)?.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('applies the same phone reservation limit to change-password', async () => {
    await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
    const phone = fakePhone();
    const owner = await registerWorkspace(phone, 'Change password throttle');
    await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
    const results = await Promise.all(Array.from({ length: 8 }, () =>
      call('/v1/auth/change-password', post({
        current_password: 'wrong-Pass-123',
        new_password: 'another-Pass-456',
      }), owner.token),
    ));
    expect(results.filter((result) => result.status === 401)).toHaveLength(4);
    const throttled = results.filter((result) => result.status === 429);
    expect(throttled).toHaveLength(4);
    expect(throttled.every((result) => Number(result.headers.get('retry-after')) > 0)).toBe(true);
  });

  it('keeps unknown-phone login errors and throttle behavior indistinguishable', async () => {
    const ip = '198.51.100.74';
    const knownPhone = fakePhone();
    await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
    await registerWorkspace(knownPhone, 'Known phone throttle behavior');
    await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
    const unknownPhone = fakePhone();
    const send = (phone: string) => call('/v1/auth/login', {
      ...post({ phone, password: 'wrong-Pass-123' }),
      headers: { 'cf-connecting-ip': ip },
    });

    const known = await send(knownPhone);
    const unknown = await send(unknownPhone);
    expect(known.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe(known.body.error.code);
    for (let attempt = 0; attempt < 3; attempt += 1) await send(unknownPhone);
    const locked = await send(unknownPhone);
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get('retry-after'))).toBeGreaterThan(0);
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
