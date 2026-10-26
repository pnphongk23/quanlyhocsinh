import { beforeEach, describe, expect, it } from 'vitest';
import { PASSWORD, call, db, fakePhone, insertClass, insertStudent, login, post, put, registerWorkspace } from './helpers';

beforeEach(async () => {
  await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
});

let ipCounter = 1;
const nextIp = () => `203.0.113.${ipCounter++}`;

function register(body: Record<string, unknown>) {
  return call('/v1/auth/register', {
    ...post({ password: PASSWORD, workspace_name: 'Lớp thử email', ...body }),
    headers: { 'cf-connecting-ip': nextIp() },
  });
}

async function storedEmail(userId: string): Promise<string | null> {
  const row = await db.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string | null }>();
  return row?.email ?? null;
}

describe('account email', () => {
  it('registers with an optional email normalised to lower case', async () => {
    const withEmail = await register({ phone: fakePhone(), email: '  Co.Giao@Example.COM ' });
    expect(withEmail.status).toBe(201);
    expect(withEmail.body.user.email).toBe('co.giao@example.com');
    expect(await storedEmail(withEmail.body.user.id)).toBe('co.giao@example.com');

    const without = await register({ phone: fakePhone() });
    expect(without.status).toBe(201);
    expect(without.body.user.email).toBeNull();
  });

  it('rejects a malformed email on both register endpoints', async () => {
    const workspace = await register({ phone: fakePhone(), email: 'khong-hop-le' });
    expect(workspace.status).toBe(422);
    expect(workspace.body.error.details.fields).toEqual({ email: 'invalid_email' });

    const guardian = await call('/v1/auth/register-guardian', {
      ...post({ phone: fakePhone(), password: PASSWORD, email: 'a@b' }),
      headers: { 'cf-connecting-ip': nextIp() },
    });
    expect(guardian.status).toBe(422);
    expect(guardian.body.error.details.fields).toEqual({ email: 'invalid_email' });

      const guardianPhone = fakePhone();
      const owner = await registerWorkspace(fakePhone(), 'Declared guardian email');
      const classId = await insertClass(owner.workspaceId, 'Class', owner.userId);
      await insertStudent(owner.workspaceId, classId, 'Child', guardianPhone, owner.userId);
      const guardianOk = await call('/v1/auth/register-guardian', {
        ...post({ phone: guardianPhone, password: PASSWORD, email: 'PH@Example.com' }),
      headers: { 'cf-connecting-ip': nextIp() },
    });
    expect(guardianOk.status).toBe(201);
    expect(guardianOk.body.user.email).toBe('ph@example.com');
  });

  it('returns the own email from GET /me and the login response', async () => {
    const phone = fakePhone();
    const reg = await register({ phone, email: 'me@example.com' });
    const me = await call('/v1/me', {}, reg.body.token);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('me@example.com');
    const session = await login(phone);
    expect(session.body.user.email).toBe('me@example.com');
  });

  it('PUT /me/email requires the current password and can clear the email', async () => {
    const phone = fakePhone();
    const owner = await registerWorkspace(phone, 'Email owner');

    const wrong = await call('/v1/me/email', put({ email: 'moi@example.com', current_password: 'sai-mat-khau-1' }), owner.token);
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('invalid_credentials');
    expect(await storedEmail(owner.userId)).toBeNull();

    const bad = await call('/v1/me/email', put({ email: 'khong-hop-le', current_password: PASSWORD }), owner.token);
    expect(bad.status).toBe(422);

    const set = await call('/v1/me/email', put({ email: ' Moi@Example.com ', current_password: PASSWORD }), owner.token);
    expect(set.status).toBe(200);
    expect(set.body).toEqual({ email: 'moi@example.com' });
    expect(await storedEmail(owner.userId)).toBe('moi@example.com');

    const cleared = await call('/v1/me/email', put({ email: null, current_password: PASSWORD }), owner.token);
    expect(cleared.status).toBe(200);
    expect(cleared.body).toEqual({ email: null });
    expect(await storedEmail(owner.userId)).toBeNull();

    const missing = await call('/v1/me/email', put({ current_password: PASSWORD }), owner.token);
    expect(missing.status).toBe(422);
    const anonymous = await call('/v1/me/email', put({ email: null, current_password: PASSWORD }));
    expect(anonymous.status).toBe(401);
  });

  it('throttles wrong current passwords on PUT /me/email', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Email throttle');
    // Giống change-password: lần sai thứ 5 chạm ngưỡng và khoá.
    for (let i = 0; i < 4; i += 1) {
      const res = await call('/v1/me/email', put({ email: null, current_password: 'sai-mat-khau-1' }), owner.token);
      expect(res.status).toBe(401);
    }
    const locked = await call('/v1/me/email', put({ email: null, current_password: PASSWORD }), owner.token);
    expect(locked.status).toBe(429);
  });
});
