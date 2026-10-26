import { beforeEach, describe, expect, it } from 'vitest';
import { call, db, fakePhone, insertClass, insertStudent, post, registerWorkspace } from './helpers';

beforeEach(async () => { await db.prepare("DELETE FROM auth_throttle WHERE key LIKE 'phone-check:%'").run(); });

describe('phone check', () => {
  it('returns only the next step for registered, declared guardian, and new teacher numbers', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Phone check');
    const registeredPhone = fakePhone();
    const registered = await call('/v1/auth/register', post({
      phone: registeredPhone, password: 'example-Pass-123', workspace_name: 'Phone check account',
    }));
    expect(registered.status).toBe(201);
    await db.prepare("UPDATE users SET status='disabled' WHERE phone=?").bind(registeredPhone).run();

    const classId = await insertClass(owner.workspaceId, 'Class', owner.userId);
    const guardianPhone = fakePhone();
    await insertStudent(owner.workspaceId, classId, 'Child', guardianPhone, owner.userId);
    const check = (phone: string) => call('/v1/auth/phone-check', post({ phone }));

    const login = await check(registeredPhone);
    expect(login.body).toEqual({ next: 'login' });
    const guardian = await check(guardianPhone);
    expect(guardian.body).toEqual({ next: 'guardian_setup' });
    const teacher = await check(fakePhone());
    expect(teacher.body).toEqual({ next: 'teacher_register' });
  });

  it('validates phone format and applies the per-phone limit with Retry-After', async () => {
    const invalid = await call('/v1/auth/phone-check', post({ phone: 'bad' }));
    expect(invalid.status).toBe(422);
    expect(invalid.body.error).toMatchObject({ code: 'validation_error', details: { fields: { phone: 'invalid_phone' } } });

    const phone = fakePhone();
    for (let index = 0; index < 10; index += 1) {
      expect((await call('/v1/auth/phone-check', {
        ...post({ phone }), headers: { 'cf-connecting-ip': `198.51.100.${100 + index}` },
      })).status).toBe(200);
    }
    const limited = await call('/v1/auth/phone-check', post({ phone }));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(limited.body.error.details).toHaveProperty('retry_after');
    expect((await db.prepare('SELECT fails FROM auth_throttle WHERE key=?').bind('phone-check:ip:127.0.0.1')
      .first<{ fails: number }>())?.fails).toBe(0);
  });

  it('applies the per-IP limit independently of phone keys', async () => {
    const ip = '198.51.100.178';
    for (let index = 0; index < 30; index += 1) {
      expect((await call('/v1/auth/phone-check', {
        ...post({ phone: fakePhone() }), headers: { 'cf-connecting-ip': ip },
      })).status).toBe(200);
    }
    const limited = await call('/v1/auth/phone-check', {
      ...post({ phone: fakePhone() }), headers: { 'cf-connecting-ip': ip },
    });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
