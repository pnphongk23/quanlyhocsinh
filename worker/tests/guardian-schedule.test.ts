import { beforeEach, describe, expect, it } from 'vitest';
import { call, clubToken, db, fakePhone, insertClass, insertGuardianMembership, insertSession, insertStudent, insertUser, post, registerWorkspace } from './helpers';

beforeEach(async () => { await db.prepare('DELETE FROM auth_throttle').run(); });

const plusDays = (days: number) => new Date(Date.now() + days * 86400000 + 7 * 3600000).toISOString().slice(0, 10);

async function setup() {
  const owner = await registerWorkspace(fakePhone(), 'Guardian schedule');
  const childClass = await insertClass(owner.workspaceId, 'Child class', owner.userId);
  const otherClass = await insertClass(owner.workspaceId, 'Other class', owner.userId);
  const child = await insertStudent(owner.workspaceId, childClass, 'Child', null, owner.userId);
  await insertStudent(owner.workspaceId, otherClass, 'Stranger', null, owner.userId);
  const guardianUser = await insertUser(fakePhone());
  const membership = await insertGuardianMembership(owner.workspaceId, guardianUser, owner.roles.guardian!, [child]);
  const token = await clubToken(owner.workspaceId, guardianUser, membership);
  const recurring = await insertSession(owner.workspaceId, childClass, plusDays(3), owner.userId);
  await db.prepare("UPDATE class_sessions SET origin='recurring', start_time='17:00' WHERE id=?").bind(recurring).run();
  const manual = await insertSession(owner.workspaceId, childClass, plusDays(10), owner.userId);
  await db.prepare('UPDATE class_sessions SET is_makeup=1, note=? WHERE id=?').bind('secret note', manual).run();
  const cancelled = await insertSession(owner.workspaceId, childClass, plusDays(5), owner.userId, 'cancelled');
  const foreign = await insertSession(owner.workspaceId, otherClass, plusDays(4), owner.userId);
  return { owner, membership, token, childClass, otherClass, recurring, manual, cancelled, foreign };
}

describe('guardian schedule data', () => {
  it('serves the calendar with recurring, makeup and cancelled sessions of the child classes only', async () => {
    const f = await setup();
    const result = await call(`/v1/calendar?from=${plusDays(0)}&to=${plusDays(30)}`, {}, f.token);
    expect(result.status).toBe(200);
    const items = result.body.items as Array<Record<string, any>>;
    expect(items.map((item) => item.id)).toEqual([f.recurring, f.cancelled, f.manual]);
    expect(items.find((item) => item.id === f.recurring)).toMatchObject({ origin: 'recurring', status: 'planned', class_id: f.childClass });
    expect(items.find((item) => item.id === f.cancelled)).toMatchObject({ status: 'cancelled' });
    expect(items.find((item) => item.id === f.manual)).toMatchObject({ origin: 'manual', is_makeup: true });
    for (const item of items) {
      expect(item).not.toHaveProperty('note');
      expect(item.class_id).toBe(f.childClass);
    }
    expect(JSON.stringify(result.body)).not.toContain(f.foreign);
    expect(JSON.stringify(result.body)).not.toContain('secret note');
  });

  it('replays a cancellation and a time change to the guardian through pull', async () => {
    const f = await setup();
    const snapshot = await call(`/v1/sync/snapshot?membership_id=${f.membership}`, {}, f.token);
    expect(snapshot.status).toBe(200);
    const page = await call(`/v1/sync/snapshot/class_session?membership_id=${f.membership}`, {}, f.token);
    expect(page.body.items.map((row: any) => row.id).sort()).toEqual([f.recurring, f.manual, f.cancelled].sort());
    const cursor = snapshot.body.cursor as number;
    const epoch = snapshot.body.epoch as number;

    const cancel = await call(`/v1/sessions/${f.recurring}/cancel`, { method: 'POST' }, f.owner.token);
    expect(cancel.status).toBe(200);
    const patch = await call(`/v1/sessions/${f.manual}`, { method: 'PATCH', body: JSON.stringify({ start_time: '19:30' }) }, f.owner.token);
    expect(patch.status).toBe(200);
    await call(`/v1/sessions/${f.foreign}/cancel`, { method: 'POST' }, f.owner.token);

    const pulled = await call(`/v1/sync/pull?membership_id=${f.membership}&cursor=${cursor}&epoch=${epoch}&limit=200`, {}, f.token);
    expect(pulled.status).toBe(200);
    const sessions = pulled.body.upserts.class_session as Array<Record<string, any>>;
    expect(sessions.map((row) => row.id).sort()).toEqual([f.manual, f.recurring].sort());
    expect(sessions.find((row) => row.id === f.recurring)).toMatchObject({ status: 'cancelled' });
    expect(sessions.find((row) => row.id === f.manual)).toMatchObject({ start_time: '19:30' });
    for (const row of sessions) expect(row).not.toHaveProperty('note');
  });
});
