import { beforeEach, describe, expect, it } from 'vitest';
import { scheduled } from '../src/index';
import { purgeResetData } from '../src/db/password-reset';
import { sha256Hex } from '../src/lib/crypto';
import { PASSWORD, call, db, fakePhone, login, post, put, registerWorkspace, testEnv } from './helpers';

let ipCounter = 1;
const nextIp = () => `198.51.100.${ipCounter++}`;
const NEW_PASSWORD = 'mat-khau-moi-456';

beforeEach(async () => {
  await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'register:ip:%'").run();
});

async function tokenCount(phone: string): Promise<number> {
  const row = await db
    .prepare('SELECT count(*) AS n FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.phone = ?')
    .bind(phone)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

function withIp(path: string, body: unknown, ip: string = nextIp()) {
  return call(path, { ...post(body), headers: { 'cf-connecting-ip': ip } });
}

async function accountWithEmail(email = 'giao.vien@example.com') {
  const phone = fakePhone();
  const owner = await registerWorkspace(phone, 'Reset workspace');
  const set = await call('/v1/me/email', put({ email, current_password: PASSWORD }), owner.token);
  expect(set.status).toBe(200);
  return { phone, email, owner };
}

async function mailboxFor(email: string) {
  const { results } = await db
    .prepare('SELECT subject, body FROM test_mailbox WHERE to_email = ? ORDER BY created_at, rowid')
    .bind(email)
    .all<{ subject: string; body: string }>();
  return results;
}

function tokenFrom(body: string): string {
  const match = /#token=([A-Za-z0-9_-]+)/.exec(body);
  if (!match) throw new Error('no token in mail');
  return match[1]!;
}

async function requestReset(phone: string, email: string, ip?: string) {
  const res = await withIp('/v1/auth/password-reset/request', { phone, email }, ip);
  if (res.status !== 202) throw new Error(`request failed ${res.status}`);
  const mails = await mailboxFor(email);
  return tokenFrom(mails[mails.length - 1]!.body);
}

describe('password reset lookup', () => {
  it('reports unknown phone, missing email and masked email without leaking the address', async () => {
    const unknown = await withIp('/v1/auth/password-reset/lookup', { phone: fakePhone() });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({ account: false, has_email: false, email_masked: null });

    const noEmailPhone = fakePhone();
    await registerWorkspace(noEmailPhone, 'No email');
    const noEmail = await withIp('/v1/auth/password-reset/lookup', { phone: noEmailPhone });
    expect(noEmail.body).toEqual({ account: true, has_email: false, email_masked: null });

    const { phone, email } = await accountWithEmail('thay.tuan@example.com');
    const found = await withIp('/v1/auth/password-reset/lookup', { phone });
    expect(found.status).toBe(200);
    expect(found.body).toEqual({ account: true, has_email: true, email_masked: 't***@example.com' });
    expect(JSON.stringify(found.body)).not.toContain(email);
    expect(JSON.stringify(found.body)).not.toContain('thay.tuan');
  });

  it('rejects an invalid phone', async () => {
    const res = await withIp('/v1/auth/password-reset/lookup', { phone: 'abc' });
    expect(res.status).toBe(422);
  });

  it('throttles per phone (6th call) and per IP', async () => {
    const phone = fakePhone();
    for (let i = 0; i < 5; i += 1) {
      expect((await withIp('/v1/auth/password-reset/lookup', { phone })).status).toBe(200);
    }
    expect((await withIp('/v1/auth/password-reset/lookup', { phone })).status).toBe(429);

    const ip = nextIp();
    for (let i = 0; i < 20; i += 1) {
      expect((await withIp('/v1/auth/password-reset/lookup', { phone: fakePhone() }, ip)).status).toBe(200);
    }
    expect((await withIp('/v1/auth/password-reset/lookup', { phone: fakePhone() }, ip)).status).toBe(429);
  });
});

describe('password reset request', () => {
  it('404 for unknown account, 409 without email, 422 for mismatched email and no token created', async () => {
    const unknown = await withIp('/v1/auth/password-reset/request', { phone: fakePhone(), email: 'a@example.com' });
    expect(unknown.status).toBe(404);

    const noEmailPhone = fakePhone();
    await registerWorkspace(noEmailPhone, 'No email');
    const none = await withIp('/v1/auth/password-reset/request', { phone: noEmailPhone, email: 'a@example.com' });
    expect(none.status).toBe(409);
    expect(none.body.error.details.reason).toBe('no_email');

    const { phone } = await accountWithEmail('dung@example.com');
    const mismatch = await withIp('/v1/auth/password-reset/request', { phone, email: 'khac@example.com' });
    expect(mismatch.status).toBe(422);
    expect(mismatch.body.error.details.fields).toEqual({ email: 'email_mismatch' });
    expect(await tokenCount(phone)).toBe(0);

    const badFormat = await withIp('/v1/auth/password-reset/request', { phone, email: 'xyz' });
    expect(badFormat.status).toBe(422);
    expect(badFormat.body.error.details.fields).toEqual({ email: 'invalid_email' });
  });

  it('sends a link mail on match (case-insensitive) and stores only the token hash', async () => {
    const { phone, email } = await accountWithEmail('khop@example.com');
    const res = await withIp('/v1/auth/password-reset/request', { phone, email: ' KHOP@example.com ' });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ sent: true });

    const mails = await mailboxFor(email);
    expect(mails).toHaveLength(1);
    const body = mails[0]!.body;
    expect(body).toContain('https://web.test/dat-lai-mat-khau#token=');
    expect(body).not.toContain(phone);
    expect(body).not.toContain(PASSWORD);

    const token = tokenFrom(body);
    const row = await db
      .prepare('SELECT token_hash, created_at, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?')
      .bind(await sha256Hex(token))
      .first<{ token_hash: string; created_at: string; expires_at: string; used_at: string | null }>();
    expect(row?.token_hash).toBe(await sha256Hex(token));
    expect(row?.token_hash).not.toContain(token);
    expect(Date.parse(row!.expires_at) - Date.parse(row!.created_at)).toBe(30 * 60 * 1000);
    expect(row?.used_at).toBeNull();
  });

  it('throttles per phone: 6th attempt is 429', async () => {
    const { phone } = await accountWithEmail('chan@example.com');
    for (let i = 0; i < 5; i += 1) {
      expect((await withIp('/v1/auth/password-reset/request', { phone, email: 'sai@example.com' })).status).toBe(422);
    }
    expect((await withIp('/v1/auth/password-reset/request', { phone, email: 'sai@example.com' })).status).toBe(429);
  });

  it('throttles per IP: 21st attempt is 429', async () => {
    const ip = nextIp();
    for (let i = 0; i < 20; i += 1) {
      expect((await withIp('/v1/auth/password-reset/request', { phone: fakePhone(), email: 'a@example.com' }, ip)).status).toBe(404);
    }
    expect((await withIp('/v1/auth/password-reset/request', { phone: fakePhone(), email: 'a@example.com' }, ip)).status).toBe(429);
  });

  it('is unavailable when mail is disabled, missing, or test mode runs outside test environments', async () => {
    const { phone, email } = await accountWithEmail('khong-gui@example.com');
    const original = { MAIL_MODE: testEnv.MAIL_MODE, ENVIRONMENT: testEnv.ENVIRONMENT };
    try {
      testEnv.ENVIRONMENT = 'production';
      const production = await withIp('/v1/auth/password-reset/request', { phone, email });
      expect(production.status).toBe(503);
      expect(production.body.error.code).toBe('mail_unavailable');

      testEnv.ENVIRONMENT = original.ENVIRONMENT;
      testEnv.MAIL_MODE = undefined;
      expect((await withIp('/v1/auth/password-reset/request', { phone, email })).status).toBe(503);
      testEnv.MAIL_MODE = 'disabled';
      expect((await withIp('/v1/auth/password-reset/request', { phone, email })).status).toBe(503);
    } finally {
      testEnv.MAIL_MODE = original.MAIL_MODE;
      testEnv.ENVIRONMENT = original.ENVIRONMENT;
    }
    expect(await mailboxFor(email)).toHaveLength(0);
    expect(await tokenCount(phone)).toBe(0);
  });

  it('returns 503 and invalidates the token when the sender fails', async () => {
    const { phone, email } = await accountWithEmail('loi-gui@example.com');
    const original = testEnv.MAIL_MODE;
    try {
      testEnv.MAIL_MODE = 'cloudflare';
      (testEnv as unknown as Record<string, unknown>).MAIL_FROM = 'noreply@example.com';
      (testEnv as unknown as Record<string, unknown>).EMAIL = {
        send: async () => {
          throw new Error('boom');
        },
      };
      const res = await withIp('/v1/auth/password-reset/request', { phone, email });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('mail_unavailable');
    } finally {
      testEnv.MAIL_MODE = original;
      delete (testEnv as unknown as Record<string, unknown>).MAIL_FROM;
      delete (testEnv as unknown as Record<string, unknown>).EMAIL;
    }
    const row = await db
      .prepare('SELECT used_at FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.phone = ?')
      .bind(phone)
      .first<{ used_at: string | null }>();
    expect(row?.used_at).not.toBeNull();
  });

  it('a new request invalidates the previous token', async () => {
    const { phone, email } = await accountWithEmail('hai-lan@example.com');
    const first = await requestReset(phone, email);
    const second = await requestReset(phone, email);
    expect(second).not.toBe(first);

    const old = await withIp('/v1/auth/password-reset/confirm', { token: first, new_password: NEW_PASSWORD });
    expect(old.status).toBe(400);
    expect(old.body.error.code).toBe('token_invalid');
    const fresh = await withIp('/v1/auth/password-reset/confirm', { token: second, new_password: NEW_PASSWORD });
    expect(fresh.status).toBe(200);
  });
});

describe('password reset confirm', () => {
  it('changes the password, revokes every session, and consumes the token', async () => {
    const { phone, email, owner } = await accountWithEmail('doi-mk@example.com');
    const otherSession = await login(phone);
    const token = await requestReset(phone, email);

    const done = await withIp('/v1/auth/password-reset/confirm', { token, new_password: NEW_PASSWORD });
    expect(done.status).toBe(200);
    expect(done.body).toEqual({ ok: true });

    expect((await login(phone, NEW_PASSWORD)).status).toBe(200);
    expect((await login(phone, PASSWORD)).status).toBe(401);
    expect((await call('/v1/me', {}, owner.token)).status).toBe(401);
    expect((await call('/v1/me', {}, otherSession.body.token)).status).toBe(401);

    const reuse = await withIp('/v1/auth/password-reset/confirm', { token, new_password: 'mat-khau-khac-789' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('token_invalid');
  });

  it('rejects unknown and expired tokens with the same error', async () => {
    const { phone, email } = await accountWithEmail('het-han@example.com');
    const unknown = await withIp('/v1/auth/password-reset/confirm', { token: 'khong-ton-tai', new_password: NEW_PASSWORD });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe('token_invalid');

    const token = await requestReset(phone, email);
    await db
      .prepare('UPDATE password_reset_tokens SET expires_at = ? WHERE token_hash = ?')
      .bind(new Date(Date.now() - 1000).toISOString(), await sha256Hex(token))
      .run();
    const expired = await withIp('/v1/auth/password-reset/confirm', { token, new_password: NEW_PASSWORD });
    expect(expired.status).toBe(400);
    expect(expired.body.error.code).toBe('token_invalid');
    expect((await login(phone, PASSWORD)).status).toBe(200);
  });

  it('rejects a weak password and keeps the token usable', async () => {
    const { phone, email } = await accountWithEmail('yeu@example.com');
    const token = await requestReset(phone, email);
    const weak = await withIp('/v1/auth/password-reset/confirm', { token, new_password: '123' });
    expect(weak.status).toBe(422);
    const ok = await withIp('/v1/auth/password-reset/confirm', { token, new_password: NEW_PASSWORD });
    expect(ok.status).toBe(200);
  });

  it('clears the login throttle for the phone', async () => {
    const { phone, email } = await accountWithEmail('khoa@example.com');
    for (let i = 0; i < 5; i += 1) await login(phone, 'sai-mat-khau-1');
    expect((await login(phone, PASSWORD)).status).toBe(429);
    const token = await requestReset(phone, email);
    expect((await withIp('/v1/auth/password-reset/confirm', { token, new_password: NEW_PASSWORD })).status).toBe(200);
    expect((await login(phone, NEW_PASSWORD)).status).toBe(200);
  });

  it('throttles confirm per IP', async () => {
    const ip = nextIp();
    for (let i = 0; i < 20; i += 1) {
      expect((await withIp('/v1/auth/password-reset/confirm', { token: 'x', new_password: NEW_PASSWORD }, ip)).status).toBe(400);
    }
    expect((await withIp('/v1/auth/password-reset/confirm', { token: 'x', new_password: NEW_PASSWORD }, ip)).status).toBe(429);
  });
});

describe('password reset cleanup', () => {
  it('cron removes tokens expired over a day ago and mailbox rows older than an hour', async () => {
    const now = Date.now();
    const owner = await registerWorkspace(fakePhone(), 'Cleanup');
    const insertToken = (id: string, expiresAt: number) =>
      db
        .prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, owner.userId, `hash-${id}`, new Date(now - 3 * 86400000).toISOString(), new Date(expiresAt).toISOString())
        .run();
    await insertToken('old', now - 2 * 86400000);
    await insertToken('recent', now - 3600000);
    const insertMail = (id: string, createdAt: number) =>
      db
        .prepare('INSERT INTO test_mailbox (id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, 'x@example.com', 's', 'b', new Date(createdAt).toISOString())
        .run();
    await insertMail('mail-old', now - 2 * 3600000);
    await insertMail('mail-new', now - 60000);

    await scheduled({} as ScheduledController, testEnv, { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext);

    const tokens = await db.prepare("SELECT id FROM password_reset_tokens WHERE id IN ('old','recent')").all<{ id: string }>();
    expect(tokens.results.map((r) => r.id)).toEqual(['recent']);
    const mails = await db.prepare("SELECT id FROM test_mailbox WHERE id IN ('mail-old','mail-new')").all<{ id: string }>();
    expect(mails.results.map((r) => r.id)).toEqual(['mail-new']);
    await purgeResetData(db);
  });
});
