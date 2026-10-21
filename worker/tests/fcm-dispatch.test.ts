import { beforeEach, describe, expect, it } from 'vitest';
import {
  clubToken,
  db,
  fakePhone,
  insertClass,
  insertDeviceToken,
  insertMembership,
  insertSession,
  insertStudent,
  insertUser,
  registerWorkspace,
} from './helpers';
import { isoAt, nowIso } from '../src/lib/time';
import { runNotificationDispatch } from '../src/db/notification-dispatch';
import { readServiceAccount, type FcmEnv } from '../src/db/fcm-sender';

const TOKEN_URI = 'https://oauth.test/token';

function toPem(der: ArrayBuffer): string {
  const bytes = new Uint8Array(der);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const lines = btoa(binary).match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

/** Khoá RSA sinh trong test; không có service account thật, không gọi mạng. */
async function serviceAccountEnv(): Promise<FcmEnv> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const json = {
    project_id: 'demo-project',
    client_email: 'sender@demo-project.iam.gserviceaccount.com',
    private_key_id: 'fake-key-id',
    private_key: toPem((await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer),
    token_uri: TOKEN_URI,
  };
  return { DB: db, FCM_SERVICE_ACCOUNT: JSON.stringify(json) };
}

interface Fixture {
  workspaceId: string;
  userId: string;
  membershipId: string;
  studentId: string;
  sessionId: string;
  deviceSessionId: string;
}

async function seedNotification(input: {
  workspaceId: string;
  userId: string;
  membershipId: string;
  studentId: string;
  sessionId: string;
  eventKey: string;
  readyAt?: string;
  createdAt?: string;
}): Promise<number> {
  const createdAt = input.createdAt ?? nowIso();
  const row = await db
    .prepare(
      `INSERT INTO notifications
        (workspace_id, user_id, membership_id, kind, event_key, student_id, session_id,
         created_at, ready_at)
       VALUES (?, ?, ?, 'slip_sent', ?, ?, ?, ?, ?)
       RETURNING id`,
    )
    .bind(
      input.workspaceId,
      input.userId,
      input.membershipId,
      input.eventKey,
      input.studentId,
      input.sessionId,
      createdAt,
      input.readyAt ?? createdAt,
    )
    .first<{ id: number }>();
  return row!.id;
}

async function setup(): Promise<Fixture> {
  const ws = await registerWorkspace(fakePhone(), 'dispatch workspace');
  const classId = await insertClass(ws.workspaceId, 'C1', ws.userId);
  const studentId = await insertStudent(
    ws.workspaceId,
    classId,
    'Học sinh giả E',
    '+84900000041',
    ws.userId,
  );
  const sessionId = await insertSession(ws.workspaceId, classId, '2026-10-21', ws.userId, 'held');
  const guardianUser = await insertUser(fakePhone());
  await db
    .prepare(
      `INSERT INTO guardian_student (workspace_id, user_id, student_id, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(ws.workspaceId, guardianUser, studentId, nowIso())
    .run();
  const membershipId = await insertMembership(ws.workspaceId, guardianUser, ws.roles.guardian!);
  const sessionToken = await clubToken(ws.workspaceId, guardianUser, membershipId);
  expect(sessionToken.length).toBeGreaterThan(10);
  const session = await db
    .prepare('SELECT id FROM auth_sessions WHERE user_id = ? AND revoked_at IS NULL')
    .bind(guardianUser)
    .first<{ id: string }>();
  return {
    workspaceId: ws.workspaceId,
    userId: guardianUser,
    membershipId,
    studentId,
    sessionId,
    deviceSessionId: session!.id,
  };
}

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('notification dispatch cron', () => {
  beforeEach(async () => {
    // Mỗi ca độc lập: dọn inbox/delivery/token và bộ đếm đăng ký theo IP.
    await db.batch([
      db.prepare('DELETE FROM push_deliveries'),
      db.prepare('DELETE FROM notifications'),
      db.prepare('DELETE FROM device_tokens'),
      db.prepare('DELETE FROM fcm_oauth_cache'),
      db.prepare('DELETE FROM auth_throttle'),
    ]);
  });

  it('does not claim an inbox before ready_at (score grouping window)', async () => {
    const f = await setup();
    const now = nowIso();
    const notificationId = await seedNotification({
      ...f,
      eventKey: 'later',
      readyAt: isoAt(Date.parse(now) + 5 * 60_000),
    });
    const summary = await runNotificationDispatch({ DB: db }, { now });
    expect(summary.inboxes).toBe(0);
    expect(summary.deliveries).toBe(0);
    const row = await db
      .prepare('SELECT deliveries_expanded_at, expansion_started_at FROM notifications WHERE id = ?')
      .bind(notificationId)
      .first<{ deliveries_expanded_at: string | null; expansion_started_at: string | null }>();
    expect(row!.deliveries_expanded_at).toBeNull();
    expect(row!.expansion_started_at).toBeNull();
  });

  it('pages before filtering: skipped registrations consume the budget and advance the cursor', async () => {
    const f = await setup();
    const now = nowIso();

    // Ba đăng ký cùng membership: hai phiên bị thu hồi ⇒ chỉ một đủ điều kiện.
    await clubToken(f.workspaceId, f.userId, f.membershipId);
    const sessions = await db
      .prepare('SELECT id FROM auth_sessions WHERE user_id = ? ORDER BY id')
      .bind(f.userId)
      .all<{ id: string }>();
    const ids = sessions.results.map((row) => row.id);
    expect(ids.length).toBe(2);
    const [firstSession, liveSession] = ids as [string, string];

    const deadDeviceA = await insertDeviceToken(
      f.workspaceId,
      f.userId,
      f.membershipId,
      firstSession,
      'FAKE_FCM_DEAD_A',
    );
    const deadDeviceB = await insertDeviceToken(
      f.workspaceId,
      f.userId,
      f.membershipId,
      firstSession,
      'FAKE_FCM_DEAD_B',
    );
    const liveDevice = await insertDeviceToken(
      f.workspaceId,
      f.userId,
      f.membershipId,
      liveSession,
      'FAKE_FCM_LIVE',
    );
    await db
      .prepare('UPDATE auth_sessions SET revoked_at = ? WHERE id = ?')
      .bind(now, firstSession)
      .run();
    // Mốc binding phải trước sự kiện (`bound_at <= created_at`) để không bị skip vì lý do khác.
    const boundAt = isoAt(Date.parse(now) - 60_000);
    await db
      .prepare('UPDATE device_tokens SET bound_at = ? WHERE id IN (?, ?, ?)')
      .bind(boundAt, deadDeviceA, deadDeviceB, liveDevice)
      .run();

    const notificationId = await seedNotification({
      ...f,
      eventKey: 'fanout',
      createdAt: now,
    });

    const summary = await runNotificationDispatch({ DB: db }, { now, registrationBudget: 20 });
    expect(summary.registrations).toBe(3);
    expect(summary.deliveries).toBe(1);

    const notification = await db
      .prepare(
        `SELECT deliveries_expanded_at, delivery_cursor, expansion_started_at
           FROM notifications WHERE id = ?`,
      )
      .bind(notificationId)
      .first<{
        deliveries_expanded_at: string | null;
        delivery_cursor: string | null;
        expansion_started_at: string | null;
      }>();
    expect(notification!.deliveries_expanded_at).toBe(now);
    expect(notification!.expansion_started_at).toBe(now);
    const ordered = [deadDeviceA, deadDeviceB, liveDevice].sort();
    expect(notification!.delivery_cursor).toBe(ordered[ordered.length - 1]);

    const deliveries = await db
      .prepare('SELECT device_id FROM push_deliveries WHERE notification_id = ?')
      .bind(notificationId)
      .all<{ device_id: string }>();
    expect(deliveries.results.map((row) => row.device_id)).toEqual([liveDevice]);
  });

  it('respects the registration budget across a page and keeps the inbox open', async () => {
    const f = await setup();
    const now = nowIso();
    for (const index of [1, 2, 3]) {
      await insertDeviceToken(
        f.workspaceId,
        f.userId,
        f.membershipId,
        f.deviceSessionId,
        `FAKE_FCM_BUDGET_${index}`,
      );
    }
    await db
      .prepare('UPDATE device_tokens SET bound_at = ?')
      .bind(isoAt(Date.parse(now) - 60_000))
      .run();
    const notificationId = await seedNotification({ ...f, eventKey: 'budget', createdAt: now });

    const first = await runNotificationDispatch({ DB: db }, { now, registrationBudget: 2 });
    expect(first.registrations).toBe(2);
    const row = await db
      .prepare('SELECT deliveries_expanded_at, delivery_cursor FROM notifications WHERE id = ?')
      .bind(notificationId)
      .first<{ deliveries_expanded_at: string | null; delivery_cursor: string | null }>();
    expect(row!.deliveries_expanded_at).toBeNull();
    expect(row!.delivery_cursor).not.toBeNull();

    // Lượt sau (lease đã hết) reclaim và xét nốt phần còn lại.
    await db
      .prepare("UPDATE notifications SET expansion_lease_until = '2020-01-01T00:00:00.000Z' WHERE id = ?")
      .bind(notificationId)
      .run();
    const second = await runNotificationDispatch({ DB: db }, { now, registrationBudget: 2 });
    expect(second.registrations).toBe(1);
    const done = await db
      .prepare('SELECT deliveries_expanded_at FROM notifications WHERE id = ?')
      .bind(notificationId)
      .first<{ deliveries_expanded_at: string | null }>();
    expect(done!.deliveries_expanded_at).toBe(now);
  });

  it('keeps the inbox frozen while another lease is still held', async () => {
    const f = await setup();
    const now = nowIso();
    const notificationId = await seedNotification({ ...f, eventKey: 'lease' });
    await db
      .prepare(
        `UPDATE notifications
            SET expansion_started_at = ?, expansion_lease_id = ?, expansion_lease_until = ?
          WHERE id = ?`,
      )
      .bind(now, 'other-lease', isoAt(Date.parse(now) + 60_000), notificationId)
      .run();
    const summary = await runNotificationDispatch({ DB: db }, { now });
    expect(summary.inboxes).toBe(0);
  });

  it('sends the delivery through the injected fetch and never twice', async () => {
    const f = await setup();
    const now = nowIso();
    await insertDeviceToken(
      f.workspaceId,
      f.userId,
      f.membershipId,
      f.deviceSessionId,
      'FAKE_FCM_SEND_OK',
    );
    await db
      .prepare('UPDATE device_tokens SET bound_at = ?')
      .bind(isoAt(Date.parse(now) - 60_000))
      .run();
    const env = await serviceAccountEnv();
    expect(await readServiceAccount(env)).not.toBeNull();
    await seedNotification({ ...f, eventKey: 'send', createdAt: now });

    let oauthCalls = 0;
    let fcmCalls = 0;
    const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
      if (url === TOKEN_URI) {
        oauthCalls += 1;
        return okJson({ access_token: 'oauth', expires_in: 3600 });
      }
      fcmCalls += 1;
      const body = JSON.parse(String(init?.body));
      expect(body.message.data.kind).toBe('slip_sent');
      expect(body.message.data.student_id).toBe(f.studentId);
      expect(body.message.data.session_id).toBe(f.sessionId);
      expect(Object.keys(body.message.data).sort()).toEqual([
        'kind',
        'notification_id',
        'session_id',
        'student_id',
      ]);
      return okJson({ name: 'projects/demo-project/messages/1' });
    };

    const first = await runNotificationDispatch(env, { now, fetchImpl });
    expect(first.sent).toBe(1);
    expect(oauthCalls).toBe(1);
    expect(fcmCalls).toBe(1);

    const delivered = await db
      .prepare('SELECT status, sent_at FROM push_deliveries')
      .all<{ status: string; sent_at: string | null }>();
    expect(delivered.results).toEqual([{ status: 'sent', sent_at: now }]);

    // Chạy lại: inbox đã đóng băng xong, delivery đã sent ⇒ không gửi trùng.
    const second = await runNotificationDispatch(env, { now, fetchImpl });
    expect(second.sent).toBe(0);
    expect(fcmCalls).toBe(1);
  });

  it('skips the delivery when the membership is disabled after fanout', async () => {
    const f = await setup();
    const now = nowIso();
    await insertDeviceToken(
      f.workspaceId,
      f.userId,
      f.membershipId,
      f.deviceSessionId,
      'FAKE_FCM_DISABLED',
    );
    await db
      .prepare('UPDATE device_tokens SET bound_at = ?')
      .bind(isoAt(Date.parse(now) - 60_000))
      .run();
    await seedNotification({ ...f, eventKey: 'disabled', createdAt: now });

    // Fanout trước (chưa có credential nên không gửi).
    const fanout = await runNotificationDispatch({ DB: db }, { now });
    expect(fanout.deliveries).toBe(1);

    await db
      .prepare("UPDATE memberships SET status = 'disabled' WHERE id = ?")
      .bind(f.membershipId)
      .run();

    const env = await serviceAccountEnv();
    let fcmCalls = 0;
    const fetchImpl = async (url: string): Promise<Response> => {
      if (url === TOKEN_URI) return okJson({ access_token: 'oauth', expires_in: 3600 });
      fcmCalls += 1;
      return okJson({});
    };
    const summary = await runNotificationDispatch(env, { now, fetchImpl });
    expect(summary.sent).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(fcmCalls).toBe(0);
    const row = await db
      .prepare('SELECT status, error_code FROM push_deliveries')
      .first<{ status: string; error_code: string | null }>();
    expect(row!.status).toBe('skipped');
    expect(row!.error_code).toBe('not_eligible');
  });
});
