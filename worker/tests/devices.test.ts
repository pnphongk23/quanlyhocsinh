import { beforeAll, describe, expect, it } from 'vitest';
import {
  call,
  clubToken,
  db,
  fakePhone,
  insertClass,
  insertGuardianLink,
  insertGuardianMembership,
  insertMembership,
  insertSession,
  insertStudent,
  insertUser,
  registerWorkspace,
} from './helpers';
import { nowIso } from '../src/lib/time';

const PLATFORM = 'ios';

async function putToken(token: string, body: unknown) {
  return call('/v1/device-tokens', { method: 'PUT', body: JSON.stringify(body) }, token);
}

async function deviceRow(token: string) {
  return db
    .prepare(
      `SELECT id, workspace_id, user_id, membership_id, auth_session_id,
              registration_version, bound_at, platform, updated_at
         FROM device_tokens WHERE token = ?`,
    )
    .bind(token)
    .first<{
      id: string;
      workspace_id: string;
      user_id: string;
      membership_id: string;
      auth_session_id: string;
      registration_version: number;
      bound_at: string;
      platform: string;
      updated_at: string;
    }>();
}

async function seedNotificationWithDelivery(
  workspaceId: string,
  userId: string,
  membershipId: string,
  studentId: string,
  sessionId: string,
  deviceId: string,
): Promise<number> {
  const now = nowIso();
  const notification = await db
    .prepare(
      `INSERT INTO notifications
        (workspace_id, user_id, membership_id, kind, event_key, student_id, session_id,
         created_at, ready_at)
       VALUES (?, ?, ?, 'slip_sent', ?, ?, ?, ?, ?)
       RETURNING id`,
    )
    .bind(
      workspaceId,
      userId,
      membershipId,
      `slip:${crypto.randomUUID()}`,
      studentId,
      sessionId,
      now,
      now,
    )
    .first<{ id: number }>();
  await db
    .prepare(
      `INSERT INTO push_deliveries
        (notification_id, membership_id, device_id, registration_version, status, attempts, next_attempt_at)
       VALUES (?, ?, ?, 1, 'pending', 0, ?)`,
    )
    .bind(notification!.id, membershipId, deviceId, now)
    .run();
  return notification!.id;
}

describe('device token routes', () => {
  let fixture: {
    ws: { workspaceId: string; userId: string; roles: Record<string, string>; token: string };
    otherWs: { workspaceId: string; userId: string; roles: Record<string, string> };
    classId: string;
    studentId: string;
    sessionId: string;
    admin: string;
    teacher: string;
    assistant: string;
    guardian: { userId: string; membershipId: string; token: string };
    otherGuardian: { userId: string; membershipId: string; token: string };
    foreignGuardian: { userId: string; membershipId: string; token: string };
  };

  beforeAll(async () => {
    const ws = await registerWorkspace(fakePhone(), 'devices workspace');
    const otherWs = await registerWorkspace(fakePhone(), 'devices other workspace');
    const classId = await insertClass(ws.workspaceId, 'C1', ws.userId);
    const studentId = await insertStudent(
      ws.workspaceId,
      classId,
      'Học sinh giả C',
      '+84900000021',
      ws.userId,
    );
    const sessionId = await insertSession(ws.workspaceId, classId, '2026-10-21', ws.userId, 'held');

    async function staff(role: string, classes: string[]): Promise<string> {
      const user = await insertUser(fakePhone());
      const membership = await insertMembership(ws.workspaceId, user, ws.roles[role]!, classes);
      return clubToken(ws.workspaceId, user, membership);
    }

    const guardianUser = await insertUser(fakePhone());
    const guardianMembership = await insertGuardianMembership(
      ws.workspaceId,
      guardianUser,
      ws.roles.guardian!,
      [studentId],
    );
    const otherGuardianUser = await insertUser(fakePhone());
    await insertGuardianLink(ws.workspaceId, otherGuardianUser, studentId);
    const otherGuardianMembership = await insertMembership(
      ws.workspaceId,
      otherGuardianUser,
      ws.roles.guardian!,
    );
    const foreignGuardianUser = await insertUser(fakePhone());
    const foreignClassId = await insertClass(otherWs.workspaceId, 'CB', otherWs.userId);
    const foreignStudentId = await insertStudent(
      otherWs.workspaceId,
      foreignClassId,
      'Học sinh giả CB',
      '+84900000022',
      otherWs.userId,
    );
    await insertGuardianLink(otherWs.workspaceId, foreignGuardianUser, foreignStudentId);
    const foreignGuardianMembership = await insertMembership(
      otherWs.workspaceId,
      foreignGuardianUser,
      otherWs.roles.guardian!,
    );

    fixture = {
      ws,
      otherWs,
      classId,
      studentId,
      sessionId,
      admin: ws.token,
      teacher: await staff('teacher', [classId]),
      assistant: await staff('assistant', [classId]),
      guardian: {
        userId: guardianUser,
        membershipId: guardianMembership,
        token: await clubToken(ws.workspaceId, guardianUser, guardianMembership),
      },
      otherGuardian: {
        userId: otherGuardianUser,
        membershipId: otherGuardianMembership,
        token: await clubToken(ws.workspaceId, otherGuardianUser, otherGuardianMembership),
      },
      foreignGuardian: {
        userId: foreignGuardianUser,
        membershipId: foreignGuardianMembership,
        token: await clubToken(otherWs.workspaceId, foreignGuardianUser, foreignGuardianMembership),
      },
    };
  });

  it('requires authentication for register and revoke', async () => {
    const register = await call('/v1/device-tokens', {
      method: 'PUT',
      body: JSON.stringify({ token: 'FAKE_FCM_anon', platform: PLATFORM }),
    });
    expect(register.status).toBe(401);
    const revoke = await call('/v1/device-tokens/unknown?registration_version=1', { method: 'DELETE' });
    expect(revoke.status).toBe(401);
  });

  it('lets every role register its own token and never echoes the token', async () => {
    const tokens: [string, string][] = [
      [fixture.admin, 'FAKE_FCM_admin'],
      [fixture.teacher, 'FAKE_FCM_teacher'],
      [fixture.assistant, 'FAKE_FCM_assistant'],
      [fixture.guardian.token, 'FAKE_FCM_guardian'],
    ];
    for (const [authToken, fcmToken] of tokens) {
      const result = await putToken(authToken, { token: fcmToken, platform: PLATFORM });
      expect(result.status).toBe(200);
      expect(result.body.registration_version).toBe(1);
      expect(typeof result.body.bound_at).toBe('string');
      expect(result.body.platform).toBe(PLATFORM);
      expect(JSON.stringify(result.body)).not.toContain(fcmToken);
      const row = await deviceRow(fcmToken);
      expect(row).not.toBeNull();
      expect(row!.workspace_id).toBe(fixture.ws.workspaceId);
    }

    const guardianRow = await deviceRow('FAKE_FCM_guardian');
    expect(guardianRow!.user_id).toBe(fixture.guardian.userId);
    expect(guardianRow!.membership_id).toBe(fixture.guardian.membershipId);
  });

  it('validates token and platform', async () => {
    for (const body of [
      { platform: PLATFORM },
      { token: '', platform: PLATFORM },
      { token: 'FAKE_FCM_x', platform: 'android' },
      { token: 'x'.repeat(4097), platform: PLATFORM },
    ]) {
      const result = await putToken(fixture.guardian.token, body);
      expect(result.status).toBe(422);
      expect(result.body.error.code).toBe('validation_error');
    }
  });

  it('refreshes the same binding without bumping version or bound_at', async () => {
    const first = await putToken(fixture.teacher, { token: 'FAKE_FCM_refresh', platform: 'ios' });
    expect(first.status).toBe(200);
    const before = await deviceRow('FAKE_FCM_refresh');

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await putToken(fixture.teacher, { token: 'FAKE_FCM_refresh', platform: 'web' });
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.registration_version).toBe(1);
    expect(second.body.bound_at).toBe(first.body.bound_at);
    const after = await deviceRow('FAKE_FCM_refresh');
    expect(after!.registration_version).toBe(1);
    expect(after!.bound_at).toBe(before!.bound_at);
    expect(after!.platform).toBe('web');
    expect(after!.updated_at >= before!.updated_at).toBe(true);
  });

  it('bumps version, rebinds and drops old deliveries when the token changes owner', async () => {
    const registered = await putToken(fixture.guardian.token, {
      token: 'FAKE_FCM_transfer',
      platform: 'ios',
    });
    expect(registered.status).toBe(200);
    const device = await deviceRow('FAKE_FCM_transfer');
    const notificationId = await seedNotificationWithDelivery(
      fixture.ws.workspaceId,
      fixture.guardian.userId,
      fixture.guardian.membershipId,
      fixture.studentId,
      fixture.sessionId,
      device!.id,
    );
    const pending = await db
      .prepare('SELECT count(*) AS n FROM push_deliveries WHERE notification_id = ?')
      .bind(notificationId)
      .first<{ n: number }>();
    expect(pending!.n).toBe(1);

    const transferred = await putToken(fixture.otherGuardian.token, {
      token: 'FAKE_FCM_transfer',
      platform: 'ios',
    });
    expect(transferred.status).toBe(200);
    expect(transferred.body.id).toBe(device!.id);
    expect(transferred.body.registration_version).toBe(2);
    expect(transferred.body.bound_at).not.toBe(device!.bound_at);
    const after = await deviceRow('FAKE_FCM_transfer');
    expect(after!.user_id).toBe(fixture.otherGuardian.userId);
    expect(after!.membership_id).toBe(fixture.otherGuardian.membershipId);
    const deliveries = await db
      .prepare('SELECT count(*) AS n FROM push_deliveries WHERE device_id = ?')
      .bind(device!.id)
      .first<{ n: number }>();
    expect(deliveries!.n).toBe(0);
  });

  it('revokes only the caller own registration with the current version', async () => {
    const registered = await putToken(fixture.guardian.token, {
      token: 'FAKE_FCM_revoke',
      platform: 'ios',
    });
    const id = registered.body.id as string;

    // Người khác, phiên khác, version cũ đều 404 và không xoá.
    const foreign = await call(
      `/v1/device-tokens/${id}?registration_version=1`,
      { method: 'DELETE' },
      fixture.otherGuardian.token,
    );
    expect(foreign.status).toBe(404);
    const foreignWorkspace = await call(
      `/v1/device-tokens/${id}?registration_version=1`,
      { method: 'DELETE' },
      fixture.foreignGuardian.token,
    );
    expect(foreignWorkspace.status).toBe(404);
    const wrongVersion = await call(
      `/v1/device-tokens/${id}?registration_version=2`,
      { method: 'DELETE' },
      fixture.guardian.token,
    );
    expect(wrongVersion.status).toBe(404);
    expect(await deviceRow('FAKE_FCM_revoke')).not.toBeNull();

    const missingVersion = await call(
      `/v1/device-tokens/${id}`,
      { method: 'DELETE' },
      fixture.guardian.token,
    );
    expect(missingVersion.status).toBe(422);

    const ok = await call(
      `/v1/device-tokens/${id}?registration_version=1`,
      { method: 'DELETE' },
      fixture.guardian.token,
    );
    expect(ok.status).toBe(204);
    expect(await deviceRow('FAKE_FCM_revoke')).toBeNull();
  });

  it('does not let the previous owner delete a transferred registration', async () => {
    const registered = await putToken(fixture.guardian.token, {
      token: 'FAKE_FCM_transfer2',
      platform: 'web',
    });
    const id = registered.body.id as string;
    await putToken(fixture.otherGuardian.token, { token: 'FAKE_FCM_transfer2', platform: 'web' });
    const stale = await call(
      `/v1/device-tokens/${id}?registration_version=1`,
      { method: 'DELETE' },
      fixture.guardian.token,
    );
    expect(stale.status).toBe(404);
    const current = await call(
      `/v1/device-tokens/${id}?registration_version=2`,
      { method: 'DELETE' },
      fixture.otherGuardian.token,
    );
    expect(current.status).toBe(204);
  });

  it('blocks registration when the password must be changed', async () => {
    const user = await insertUser(fakePhone());
    const membershipId = await insertMembership(
      fixture.ws.workspaceId,
      user,
      fixture.ws.roles.teacher!,
      [fixture.classId],
    );
    const token = await clubToken(fixture.ws.workspaceId, user, membershipId);
    await db.prepare('UPDATE users SET must_change_password = 1 WHERE id = ?').bind(user).run();
    const result = await putToken(token, { token: 'FAKE_FCM_mcp', platform: 'ios' });
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe('password_change_required');
  });
});
