import { describe, expect, it } from 'vitest';
import { call, post } from './helpers';

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
});
