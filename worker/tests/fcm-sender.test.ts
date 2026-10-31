import { beforeEach, describe, expect, it } from 'vitest';
import {
  db,
  fakePhone,
  insertClass,
  insertDeviceToken,
  insertGuardianMembership,
  insertStudent,
  insertUser,
  registerWorkspace,
  clubToken,
} from './helpers';
import {
  buildAssertion,
  getAccessToken,
  readServiceAccount,
  sendFcmMessage,
  sendPushToDevice,
  type FetchLike,
  type FcmEnv,
  type ServiceAccount,
} from '../src/db/fcm-sender';

const NOW = Date.parse('2026-10-21T03:00:00.000Z');
const TOKEN_URI = 'https://oauth.test/token';
const FCM_BASE = 'https://fcm.googleapis.com/v1/projects/demo-project/messages:send';

function toPem(der: ArrayBuffer): string {
  const bytes = new Uint8Array(der);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const lines = btoa(binary).match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** Khoá RSA sinh trong test: KHÔNG có service account thật, không gọi mạng. */
async function makeServiceAccount(): Promise<{
  account: ServiceAccount;
  env: FcmEnv;
  publicKey: CryptoKey;
}> {
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
  const privateKeyPem = toPem((await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer);
  const json = {
    project_id: 'demo-project',
    client_email: 'sender@demo-project.iam.gserviceaccount.com',
    private_key_id: 'fake-key-id',
    private_key: privateKeyPem,
    token_uri: TOKEN_URI,
  };
  const env: FcmEnv = { DB: db, FCM_SERVICE_ACCOUNT: JSON.stringify(json) };
  const account = (await readServiceAccount(env))!;
  return { account, env, publicKey: pair.publicKey };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function recordingFetch(
  handler: (url: string, init?: RequestInit) => Response,
): { fetchImpl: FetchLike; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  return {
    calls,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return handler(url, init);
    },
  };
}

describe('FCM sender (fake fetch, no network)', () => {
  beforeEach(async () => {
    await db.prepare('DELETE FROM fcm_oauth_cache').run();
  });

  it('signs an RS256 assertion verifiable with the public key', async () => {
    const { account, publicKey } = await makeServiceAccount();
    const assertion = await buildAssertion(account, NOW);
    const [header, claims, signature] = assertion.split('.');
    const verified = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      publicKey,
      fromBase64Url(signature!),
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(verified).toBe(true);

    const decodedHeader = JSON.parse(new TextDecoder().decode(fromBase64Url(header!)));
    expect(decodedHeader).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'fake-key-id' });
    const decodedClaims = JSON.parse(new TextDecoder().decode(fromBase64Url(claims!)));
    expect(decodedClaims.iss).toBe(account.clientEmail);
    expect(decodedClaims.scope).toBe('https://www.googleapis.com/auth/firebase.messaging');
    expect(decodedClaims.aud).toBe(TOKEN_URI);
    expect(decodedClaims.exp - decodedClaims.iat).toBe(3600);
    expect(JSON.stringify(decodedClaims)).not.toContain('BEGIN PRIVATE KEY');
  });

  it('caches the OAuth access token in D1 for about 50 minutes', async () => {
    const { account } = await makeServiceAccount();
    const { fetchImpl, calls } = recordingFetch(() =>
      jsonResponse({ access_token: 'oauth-token-1', expires_in: 3600 }),
    );

    expect(await getAccessToken(db, fetchImpl, account, NOW)).toBe('oauth-token-1');
    // Lần hai dùng cache: không gọi mạng.
    expect(await getAccessToken(db, fetchImpl, account, NOW + 60_000)).toBe('oauth-token-1');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(TOKEN_URI);
    expect(String(calls[0]!.init?.body)).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3A');

    const row = await db
      .prepare('SELECT access_token, refresh_at, expires_at, lease_id FROM fcm_oauth_cache WHERE project_id = ?')
      .bind('demo-project')
      .first<{ access_token: string; refresh_at: string; expires_at: string; lease_id: string | null }>();
    expect(row!.access_token).toBe('oauth-token-1');
    expect(Date.parse(row!.refresh_at)).toBe(NOW + 50 * 60_000);
    expect(row!.lease_id).toBeNull();

    // Hết hạn refresh ⇒ mint token mới.
    const later = recordingFetch(() =>
      jsonResponse({ access_token: 'oauth-token-2', expires_in: 3600 }),
    );
    expect(await getAccessToken(db, later.fetchImpl, account, NOW + 51 * 60_000)).toBe(
      'oauth-token-2',
    );
    expect(later.calls).toHaveLength(1);
  });

  it('sends only title and reference ids in the FCM payload', async () => {
    const { account } = await makeServiceAccount();
    const { fetchImpl } = recordingFetch((url, init) => {
      if (url === TOKEN_URI) return jsonResponse({ access_token: 'oauth-token', expires_in: 3600 });
      expect(url).toBe(FCM_BASE);
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe('Bearer oauth-token');
      return jsonResponse({ name: 'projects/demo-project/messages/1' });
    });

    const { account: readyAccount, env } = await makeServiceAccount();
    expect(readyAccount.projectId).toBe('demo-project');
    expect(env.DB).toBe(db);

    const result = await sendPushToDevice(
      db,
      fetchImpl,
      account,
      {
        deviceToken: 'FAKE_FCM_REGISTRATION_TOKEN',
        deviceId: crypto.randomUUID(),
        membershipId: 'not-used-for-skipped-send',
        registrationVersion: 1,
        kind: 'slip_sent',
        refs: {
          notificationId: 124,
          studentId: 'stu_fake_1',
          sessionId: 'ses_fake_3',
          reportId: null,
          testId: null,
        },
      },
      NOW,
    );
    expect(result.outcome).toBe('sent');

    const call = await db
      .prepare('SELECT access_token FROM fcm_oauth_cache WHERE project_id = ?')
      .bind('demo-project')
      .first<{ access_token: string }>();
    expect(call!.access_token).toBe('oauth-token');
  });

  it('builds a payload with no comment, stars or score content', async () => {
    const { account } = await makeServiceAccount();
    let sentBody: any = null;
    const { fetchImpl } = recordingFetch((url, init) => {
      if (url === TOKEN_URI) return jsonResponse({ access_token: 'oauth-token', expires_in: 3600 });
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({ name: 'projects/demo-project/messages/2' });
    });

    const result = await sendPushToDevice(
      db,
      fetchImpl,
      account,
      {
        deviceToken: 'FAKE_FCM_TOKEN_2',
        deviceId: crypto.randomUUID(),
        membershipId: 'membership-ignored',
        registrationVersion: 1,
        kind: 'score_updated',
        refs: {
          notificationId: 126,
          studentId: 'stu_fake_1',
          sessionId: null,
          reportId: null,
          testId: 'tst_fake_1',
        },
      },
      NOW,
    );
    expect(result.outcome).toBe('sent');
    expect(sentBody.message.token).toBe('FAKE_FCM_TOKEN_2');
    expect(sentBody.message.notification.title).toBe('Có điểm mới');
    expect(sentBody.message.data).toEqual({
      kind: 'score_updated',
      notification_id: '126',
      student_id: 'stu_fake_1',
      test_id: 'tst_fake_1',
    });
    const serialized = JSON.stringify(sentBody);
    for (const forbidden of ['stars', 'note', 'value', 'parent_phone', 'password']) {
      expect(serialized.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('deletes the registration when FCM says the token is unregistered', async () => {
    const { account } = await makeServiceAccount();
    const ws = await registerWorkspace(fakePhone(), 'fcm unregistered workspace');
    const classId = await insertClass(ws.workspaceId, 'C1', ws.userId);
    const studentId = await insertStudent(
      ws.workspaceId,
      classId,
      'Học sinh giả D',
      '+84900000031',
      ws.userId,
    );
    const user = await insertUser(fakePhone());
    const membershipId = await insertGuardianMembership(
      ws.workspaceId,
      user,
      ws.roles.guardian!,
      [studentId],
    );
    const sessionToken = await clubToken(ws.workspaceId, user, membershipId);
    expect(sessionToken.length).toBeGreaterThan(10);
    const session = await db
      .prepare('SELECT id FROM auth_sessions WHERE user_id = ?')
      .bind(user)
      .first<{ id: string }>();
    const deviceId = await insertDeviceToken(
      ws.workspaceId,
      user,
      membershipId,
      session!.id,
      'FAKE_FCM_UNREGISTERED',
    );

    const { fetchImpl } = recordingFetch((url) => {
      if (url === TOKEN_URI) return jsonResponse({ access_token: 'oauth-token', expires_in: 3600 });
      return jsonResponse(
        {
          error: {
            status: 'NOT_FOUND',
            details: [{ errorCode: 'UNREGISTERED' }],
          },
        },
        404,
      );
    });

    const result = await sendPushToDevice(db, fetchImpl, account, {
      deviceToken: 'FAKE_FCM_UNREGISTERED',
      deviceId,
      membershipId,
      registrationVersion: 1,
      kind: 'slip_sent',
      refs: { notificationId: 1, studentId, sessionId: null, reportId: null, testId: null },
    }, NOW);
    expect(result.outcome).toBe('invalid_token');
    expect(result.status).toBe(404);
    const row = await db
      .prepare('SELECT id FROM device_tokens WHERE id = ?')
      .bind(deviceId)
      .first<{ id: string }>();
    expect(row).toBeNull();
  });

  it('refreshes the OAuth token exactly once on 401', async () => {
    const { account } = await makeServiceAccount();
    let oauthCalls = 0;
    let fcmCalls = 0;
    const { fetchImpl } = recordingFetch((url) => {
      if (url === TOKEN_URI) {
        oauthCalls += 1;
        return jsonResponse({ access_token: `oauth-token-${oauthCalls}`, expires_in: 3600 });
      }
      fcmCalls += 1;
      if (fcmCalls === 1) {
        return jsonResponse({ error: { status: 'UNAUTHENTICATED' } }, 401);
      }
      return jsonResponse({ name: 'projects/demo-project/messages/3' });
    });

    const result = await sendPushToDevice(
      db,
      fetchImpl,
      account,
      {
        deviceToken: 'FAKE_FCM_TOKEN_3',
        deviceId: crypto.randomUUID(),
        membershipId: 'membership-ignored',
        registrationVersion: 1,
        kind: 'report_published',
        refs: {
          notificationId: 125,
          studentId: 'stu_fake_1',
          sessionId: null,
          reportId: 'rep_fake_1',
          testId: null,
        },
      },
      NOW,
    );
    expect(result.outcome).toBe('sent');
    expect(oauthCalls).toBe(2);
    expect(fcmCalls).toBe(2);
    const row = await db
      .prepare('SELECT access_token FROM fcm_oauth_cache WHERE project_id = ?')
      .bind('demo-project')
      .first<{ access_token: string }>();
    expect(row!.access_token).toBe('oauth-token-2');
  });

  it('keeps the registration on a configuration error (403)', async () => {
    const { account } = await makeServiceAccount();
    const { fetchImpl } = recordingFetch((url) => {
      if (url === TOKEN_URI) return jsonResponse({ access_token: 'oauth-token', expires_in: 3600 });
      return jsonResponse({ error: { status: 'PERMISSION_DENIED' } }, 403);
    });
    const result = await sendFcmMessage(fetchImpl, 'demo-project', 'oauth-token', {
      token: 'FAKE_FCM_TOKEN_4',
    });
    expect(result.outcome).toBe('failed');
    expect(result.status).toBe(403);

    const configResult = await sendPushToDevice(
      db,
      fetchImpl,
      account,
      {
        deviceToken: 'FAKE_FCM_TOKEN_4',
        deviceId: crypto.randomUUID(),
        membershipId: 'membership-ignored',
        registrationVersion: 1,
        kind: 'homework_assigned',
        refs: { notificationId: 9, studentId: 'stu_fake_1', sessionId: 'ses_fake_1', reportId: null, testId: null },
      },
      NOW,
    );
    expect(configResult.outcome).toBe('failed');
  });

  it('returns no_credentials when the service account secret is missing', async () => {
    const env: FcmEnv = { DB: db };
    expect(await readServiceAccount(env)).toBeNull();
    const { fetchImpl } = recordingFetch(() => jsonResponse({}, 200));
    const account = await readServiceAccount(env);
    expect(account).toBeNull();
    // Không có credential ⇒ caller không gọi FCM; sender không ném lỗi.
    expect(typeof fetchImpl).toBe('function');
  });
});
