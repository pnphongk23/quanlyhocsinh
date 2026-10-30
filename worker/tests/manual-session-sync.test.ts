import { describe, expect, it } from 'vitest';
import { call, clubToken, db, fakePhone, insertClass, insertMembership, insertUser, post, registerWorkspace } from './helpers';

const plusDays = (days: number) => new Date(Date.now() + days * 86400000 + 7 * 3600000).toISOString().slice(0, 10);

describe('manual session visibility in sync', () => {
  it('shows a manual session in snapshot, pull and a fresh snapshot for Admin and the assigned teacher', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Manual session sync');
    const classId = await insertClass(owner.workspaceId, 'Class', owner.userId);
    const teacherUser = await insertUser(fakePhone());
    const teacherMembership = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [classId]);
    const teacherToken = await clubToken(owner.workspaceId, teacherUser, teacherMembership);
    const actors = [{ who: 'admin', token: owner.token, membership: owner.membershipId },
      { who: 'teacher', token: teacherToken, membership: teacherMembership }];
    const sessionIds = async (token: string, membership: string) => {
      const page = await call(`/v1/sync/snapshot/class_session?membership_id=${membership}&limit=200`, {}, token);
      expect(page.status).toBe(200);
      return (page.body.items as Array<{ id: string }>).map((row) => row.id);
    };
    for (const actor of actors) {
      const snapshot = await call(`/v1/sync/snapshot?membership_id=${actor.membership}`, {}, actor.token);
      const created = await call(`/v1/classes/${classId}/sessions`, post({ date: plusDays(actor.who === 'admin' ? 7 : 8), start_time: '19:00' }), actor.token);
      expect(created.status).toBe(201);
      const id = created.body.id as string;
      const pulled = await call(`/v1/sync/pull?membership_id=${actor.membership}&cursor=${snapshot.body.cursor}&epoch=${snapshot.body.epoch}&limit=200`, {}, actor.token);
      expect(pulled.status).toBe(200);
      expect((pulled.body.upserts.class_session ?? []).map((row: any) => row.id), `${actor.who} pull`).toContain(id);
      expect(await sessionIds(actor.token, actor.membership), `${actor.who} fresh snapshot`).toContain(id);
    }
  });

  it('reports which dates fall outside the snapshot window', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Manual session window');
    const classId = await insertClass(owner.workspaceId, 'Class', owner.userId);
    const snapshot = await call(`/v1/sync/snapshot?membership_id=${owner.membershipId}`, {}, owner.token);
    const { from, to } = snapshot.body.window as { from: string; to: string };
    const ids = new Map<number, string>();
    for (const offset of [-100, -89, 55, 56, 57, 120]) {
      const created = await call(`/v1/classes/${classId}/sessions`, post({ date: plusDays(offset), start_time: '19:00' }), owner.token);
      expect(created.status, `create ${offset}`).toBe(201);
      ids.set(offset, created.body.id);
    }
    const page = await call(`/v1/sync/snapshot/class_session?membership_id=${owner.membershipId}&limit=200`, {}, owner.token);
    const visible = new Set((page.body.items as Array<{ id: string }>).map((row) => row.id));
    const outcome = Object.fromEntries([...ids].map(([offset, id]) => [offset, visible.has(id)]));
    expect(outcome).toEqual({ '-100': false, '-89': true, '55': true, '56': true, '57': false, '120': false });
    expect(from <= plusDays(-89) && to >= plusDays(56)).toBe(true);
  });

  it('returns every session across snapshot pages', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Manual session paging');
    const classId = await insertClass(owner.workspaceId, 'Class', owner.userId);
    const created: string[] = [];
    for (let day = 1; day <= 25; day++) {
      const result = await call(`/v1/classes/${classId}/sessions`, post({ date: plusDays(day), start_time: '19:00' }), owner.token);
      expect(result.status).toBe(201);
      created.push(result.body.id);
    }
    const seen: string[] = [];
    let after: string | null = null;
    do {
      const query: string = `/v1/sync/snapshot/class_session?membership_id=${owner.membershipId}&limit=7${after ? `&after=${encodeURIComponent(after)}` : ''}`;
      const page = await call(query, {}, owner.token);
      expect(page.status).toBe(200);
      seen.push(...(page.body.items as Array<{ id: string }>).map((row) => row.id));
      after = page.body.next_after;
    } while (after);
    expect(seen.sort()).toEqual(created.sort());
  });
});
