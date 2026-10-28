import { describe, expect, it } from 'vitest';
import { call, db, post } from './helpers';

describe('garbage phone input', () => {
  it('is a 422 on register, register-guardian and phone-check', async () => {
    for (const phone of ['abc', '', '+84', '0', '84', '+84abc', 123, null, '😀😀😀']) {
      const body = { phone, password: 'fake-password-123', workspace_name: 'W', display_name: 'D' };
      const headers = { 'cf-connecting-ip': `203.0.113.${Math.floor(Math.random() * 200) + 1}` };
      for (const path of ['/v1/auth/register', '/v1/auth/register-guardian', '/v1/auth/phone-check']) {
        const result = await call(path, { ...post(body), headers });
        expect([path, phone, result.status]).toEqual([path, phone, 422]);
      }
      const bare = await call('/v1/auth/register', { ...post({ phone }), headers });
      expect([phone, bare.status]).toEqual([phone, 422]);
    }
  });

  it('answers login with a generic failure', async () => {
    const result = await call('/v1/auth/login', { ...post({ phone: 'abc', password: 'fake-password-123' }),
      headers: { 'cf-connecting-ip': '203.0.113.250' } });
    expect(result.status).toBe(401);
  });

  it('never answers register with a 5xx for malformed bodies', async () => {
    const phone = '0912345678';
    const base = { phone, password: 'fake-password-123', display_name: 'D', workspace_name: 'W' };
    const variants: unknown[] = [
      { ...base, phone: 'abc', password: 'x', display_name: 'x', workspace_name: 'x' },
      { ...base, phone: 912345678 }, { ...base, phone: null }, { ...base, phone: undefined },
      { ...base, workspace_name: '' }, { ...base, workspace_name: 'W'.repeat(500) }, { ...base, workspace_name: 5 },
      { ...base, password: 'x' }, { ...base, password: 5 }, { ...base, password: null }, { ...base, display_name: 5 },
      { ...base, display_name: 'D'.repeat(500) }, { ...base, email: 'not-an-email' }, { ...base, email: 5 },
      [], 'text', 5, null,
    ];
    let n = 0;
    for (const body of variants) {
      const headers = { 'cf-connecting-ip': `198.18.0.${++n}` };
      const result = await call('/v1/auth/register', { method: 'POST', body: JSON.stringify(body), headers }, undefined);
      expect([JSON.stringify(body).slice(0, 60), result.status < 500]).toEqual([JSON.stringify(body).slice(0, 60), true]);
    }
    for (const raw of ['', '{', 'abc']) {
      const result = await call('/v1/auth/register', { method: 'POST', body: raw, headers: { 'cf-connecting-ip': `198.18.1.${++n}` } }, undefined);
      expect([raw, result.status < 500]).toEqual([raw, true]);
    }
  });

  it('answers the first request after the register throttle window expires', async () => {
    const ip = '198.18.9.9';
    const key = `register:ip:${ip}`;
    const old = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const lockedPast = new Date(Date.now() - 60 * 1000).toISOString();
    for (const [fails, locked] of [[1000, null], [1000, lockedPast], [5, lockedPast]] as const) {
      await db.prepare('INSERT OR REPLACE INTO auth_throttle (key, fails, window_start, locked_until) VALUES (?, ?, ?, ?)')
        .bind(key, fails, old, locked).run();
      const result = await call('/v1/auth/register', {
        ...post({ phone: 'abc', password: 'x', display_name: 'x', workspace_name: 'x' }),
        headers: { 'cf-connecting-ip': ip },
      });
      expect([fails, locked === null, result.status]).toEqual([fails, locked === null, 422]);
    }
  });
});
