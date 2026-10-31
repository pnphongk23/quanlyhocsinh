import { describe, expect, it } from 'vitest';
import { call, db, fakePhone, insertMembership, registerWorkspace } from './helpers';

describe('sync authentication without selected membership', () => {
  it('authenticates the session first, then accepts an active membership selected by the queue', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Sync auth no membership');
    await db.prepare('UPDATE auth_sessions SET membership_id = NULL WHERE user_id = ?')
      .bind(owner.userId).run();

    const result = await call(
      `/v1/sync/snapshot?membership_id=${owner.membershipId}`,
      {},
      owner.token,
    );
    expect(result.status).toBe(200);
    expect(result.body.epoch).toBe(1);
  });

  it('returns 404 for a disabled queue membership while regular routes retain strict auth', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Sync auth disabled membership');
    const staffMembership = await insertMembership(
      owner.workspaceId,
      owner.userId,
      owner.roles.teacher!,
    );
    await db.prepare('UPDATE auth_sessions SET membership_id = ? WHERE user_id = ?')
      .bind(staffMembership, owner.userId).run();
    await db.prepare("UPDATE memberships SET status = 'disabled' WHERE id = ?")
      .bind(staffMembership).run();

    const sync = await call(
      `/v1/sync/snapshot?membership_id=${staffMembership}`,
      {},
      owner.token,
    );
    expect(sync.status).toBe(404);
    expect(sync.body.error.code).toBe('not_found');

    const regular = await call('/v1/students', {}, owner.token);
    expect(regular.status).toBe(403);
    expect(regular.body.error.code).toBe('account_disabled');
  });

  it('still requires a password change before sync routes', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Sync auth password change');
    await db.prepare('UPDATE users SET must_change_password = 1 WHERE id = ?')
      .bind(owner.userId).run();

    const result = await call(
      `/v1/sync/snapshot?membership_id=${owner.membershipId}`,
      {},
      owner.token,
    );
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe('password_change_required');
  });
});
