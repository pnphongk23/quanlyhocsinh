// FCM HTTP v1 sender (api-spec.md mục 7, architecture.md mục 4, stack-and-cpu.md mục 9).
// - Nhận `fetch` bơm vào để test không gọi mạng.
// - OAuth access token ký RS256 từ service account trong secret, cache trong D1 ~50 phút
//   (bảng `fcm_oauth_cache`, lease 60 giây để hai isolate không refresh cùng lúc).
// - Payload CHỈ có tiêu đề và mã tham chiếu; không có nội dung nhận xét, mức sao, điểm, SĐT.
// - Không log service account / access token / FCM token / payload.
import { base64UrlEncode, sha256Hex } from '../lib/crypto';
import { isoAfterMs, isoAt } from '../lib/time';
import { invalidateDeviceToken } from './devices';

export const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
export const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token';
export const FCM_SEND_BASE = 'https://fcm.googleapis.com/v1/projects';
const OAUTH_LEASE_MS = 60_000;
const CACHE_MAX_MS = 50 * 60_000;
const CACHE_EXPIRY_SKEW_MS = 5 * 60_000;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Phần binding môi trường mà sender cần; `Env` dùng chung chưa khai báo secret này. */
export interface FcmEnv {
  DB: D1Database;
  /** Secret JSON service account (tên dùng trong brief); chấp nhận cả `..._JSON`. */
  FCM_SERVICE_ACCOUNT?: string;
  FCM_SERVICE_ACCOUNT_JSON?: string;
  FCM_PROJECT_ID?: string;
}

export interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKeyPem: string;
  privateKeyId: string | null;
  tokenUri: string;
}

export type FcmKind =
  | 'slip_sent'
  | 'report_published'
  | 'homework_assigned'
  | 'score_updated';

export interface PushRefs {
  notificationId: number;
  studentId: string;
  sessionId: string | null;
  reportId: string | null;
  testId: string | null;
}

export type FcmOutcome =
  | 'sent'
  | 'unauthorized'
  | 'invalid_token'
  | 'unavailable'
  | 'failed'
  | 'no_credentials';

export interface FcmResult {
  outcome: FcmOutcome;
  status?: number;
  error_code?: string;
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToDer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** JWT assertion RS256 (`alg`, `typ`, `kid`; iss/scope/aud/iat/exp). */
export async function buildAssertion(
  account: ServiceAccount,
  nowMs: number,
): Promise<string> {
  const header: Record<string, string> = { alg: 'RS256', typ: 'JWT' };
  if (account.privateKeyId) header.kid = account.privateKeyId;
  const issuedAt = Math.floor(nowMs / 1000);
  const claims = {
    iss: account.clientEmail,
    scope: FCM_SCOPE,
    aud: account.tokenUri,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const encoder = new TextEncoder();
  const unsigned = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(
    encoder.encode(JSON.stringify(claims)),
  )}`;
  const key = await importPrivateKey(account.privateKeyPem);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    encoder.encode(unsigned),
  );
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Đọc secret service account. Trả `null` khi thiếu/hỏng (không log nội dung). */
export async function readServiceAccount(
  env: FcmEnv,
): Promise<ServiceAccount | null> {
  const raw = env.FCM_SERVICE_ACCOUNT ?? env.FCM_SERVICE_ACCOUNT_JSON;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const clientEmail = parsed.client_email;
  const privateKey = parsed.private_key;
  if (typeof clientEmail !== 'string' || typeof privateKey !== 'string') return null;
  const projectId =
    typeof env.FCM_PROJECT_ID === 'string' && env.FCM_PROJECT_ID !== ''
      ? env.FCM_PROJECT_ID
      : typeof parsed.project_id === 'string'
        ? parsed.project_id
        : '';
  if (projectId === '') return null;
  const tokenUri =
    typeof parsed.token_uri === 'string' && parsed.token_uri !== ''
      ? parsed.token_uri
      : GOOGLE_TOKEN_URI;
  const privateKeyId =
    typeof parsed.private_key_id === 'string' ? parsed.private_key_id : null;
  return {
    projectId,
    clientEmail,
    privateKeyPem: privateKey,
    privateKeyId,
    tokenUri,
  };
}

interface CacheRow {
  credential_key_id: string;
  access_token: string | null;
  refresh_at: string | null;
  expires_at: string | null;
  lease_id: string | null;
  lease_until: string | null;
}

async function readCache(db: D1Database, projectId: string): Promise<CacheRow | null> {
  return db
    .prepare(
      `SELECT credential_key_id, access_token, refresh_at, expires_at, lease_id, lease_until
         FROM fcm_oauth_cache WHERE project_id = ?`,
    )
    .bind(projectId)
    .first<CacheRow>();
}

function cacheUsable(row: CacheRow | null, keyId: string, nowMs: number): boolean {
  if (!row || row.credential_key_id !== keyId) return false;
  if (typeof row.access_token !== 'string' || row.access_token === '') return false;
  const refreshAt = row.refresh_at ? Date.parse(row.refresh_at) : Number.NaN;
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : Number.NaN;
  if (!Number.isFinite(refreshAt) || !Number.isFinite(expiresAt)) return false;
  return refreshAt > nowMs && expiresAt > nowMs;
}

async function releaseLease(
  db: D1Database,
  projectId: string,
  leaseId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE fcm_oauth_cache SET lease_id = NULL, lease_until = NULL
        WHERE project_id = ? AND lease_id = ?`,
    )
    .bind(projectId, leaseId)
    .run();
}

/** Vô hiệu cache đúng project (dùng khi FCM trả 401 hoặc khi xoay service account). */
export async function invalidateAccessToken(
  db: D1Database,
  projectId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE fcm_oauth_cache
          SET access_token = NULL, refresh_at = NULL, expires_at = NULL
        WHERE project_id = ?`,
    )
    .bind(projectId)
    .run();
}

/**
 * Lấy OAuth access token: dùng cache D1 nếu còn hạn, nếu không thì claim lease và mint
 * token mới. Không có token (lease của isolate khác, lỗi mạng) ⇒ `null` để delivery nằm
 * pending cho lần cron sau, không spin.
 */
export async function getAccessToken(
  db: D1Database,
  fetchImpl: FetchLike,
  account: ServiceAccount,
  nowMs: number,
): Promise<string | null> {
  const projectId = account.projectId;
  const keyId = account.privateKeyId ?? (await sha256Hex(account.privateKeyPem)).slice(0, 32);

  const cached = await readCache(db, projectId);
  if (cacheUsable(cached, keyId, nowMs)) return cached!.access_token;

  await db
    .prepare(
      'INSERT OR IGNORE INTO fcm_oauth_cache (project_id, credential_key_id) VALUES (?, ?)',
    )
    .bind(projectId, keyId)
    .run();

  const leaseId = crypto.randomUUID();
  const claimed = await db
    .prepare(
      `UPDATE fcm_oauth_cache
          SET lease_id = ?, lease_until = ?, credential_key_id = ?
        WHERE project_id = ? AND (lease_until IS NULL OR lease_until < ?)
        RETURNING project_id`,
    )
    .bind(leaseId, isoAfterMs(OAUTH_LEASE_MS, nowMs), keyId, projectId, isoAt(nowMs))
    .first<{ project_id: string }>();
  if (!claimed) {
    const again = await readCache(db, projectId);
    return cacheUsable(again, keyId, nowMs) ? again!.access_token : null;
  }

  try {
    const assertion = await buildAssertion(account, nowMs);
    const response = await fetchImpl(account.tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });
    const text = await response.text();
    if (!response.ok) {
      await releaseLease(db, projectId, leaseId);
      return null;
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      await releaseLease(db, projectId, leaseId);
      return null;
    }
    const accessToken = payload.access_token;
    if (typeof accessToken !== 'string' || accessToken === '') {
      await releaseLease(db, projectId, leaseId);
      return null;
    }
    const rawExpiresIn = payload.expires_in;
    const expiresInSec =
      typeof rawExpiresIn === 'number' && Number.isFinite(rawExpiresIn) && rawExpiresIn > 0
        ? rawExpiresIn
        : 3600;
    const expiresAtMs = nowMs + expiresInSec * 1000;
    const refreshAtMs = Math.min(nowMs + CACHE_MAX_MS, expiresAtMs - CACHE_EXPIRY_SKEW_MS);
    await db
      .prepare(
        `UPDATE fcm_oauth_cache
            SET access_token = ?, refresh_at = ?, expires_at = ?,
                lease_id = NULL, lease_until = NULL
          WHERE project_id = ? AND lease_id = ?`,
      )
      .bind(accessToken, isoAt(refreshAtMs), isoAt(expiresAtMs), projectId, leaseId)
      .run();
    return accessToken;
  } catch {
    await releaseLease(db, projectId, leaseId);
    return null;
  }
}

const PUSH_TITLES: Record<FcmKind, string> = {
  slip_sent: 'Có phiếu buổi học mới',
  report_published: 'Có báo cáo tháng mới',
  homework_assigned: 'Có bài tập về nhà mới',
  score_updated: 'Có điểm mới',
};

/**
 * Message FCM HTTP v1: chỉ tiêu đề + mã tham chiếu, không nội dung nhận xét/điểm/sao/SĐT.
 * `data` chỉ chứa chuỗi.
 */
export function buildPushMessage(
  token: string,
  kind: FcmKind,
  refs: PushRefs,
): Record<string, unknown> {
  const data: Record<string, string> = {
    kind,
    notification_id: String(refs.notificationId),
    student_id: refs.studentId,
  };
  if (refs.sessionId) data.session_id = refs.sessionId;
  if (refs.reportId) data.report_id = refs.reportId;
  if (refs.testId) data.test_id = refs.testId;
  return {
    token,
    notification: { title: PUSH_TITLES[kind] },
    data,
  };
}

function fcmErrorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return null;
  const details = (error as { details?: unknown }).details;
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (typeof detail === 'object' && detail !== null) {
        const code = (detail as { errorCode?: unknown }).errorCode;
        if (typeof code === 'string') return code;
      }
    }
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === 'string' ? status : null;
}

/** Gửi một message tới FCM; phân loại lỗi để caller xử lý token/cache/retry. */
export async function sendFcmMessage(
  fetchImpl: FetchLike,
  projectId: string,
  accessToken: string,
  message: unknown,
): Promise<FcmResult> {
  const response = await fetchImpl(
    `${FCM_SEND_BASE}/${encodeURIComponent(projectId)}/messages:send`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message }),
    },
  );
  const text = await response.text();
  if (response.ok) return { outcome: 'sent', status: response.status };

  let parsed: unknown = null;
  try {
    parsed = text === '' ? null : JSON.parse(text);
  } catch {
    parsed = null;
  }
  const code = fcmErrorCode(parsed);
  if (response.status === 401) {
    return { outcome: 'unauthorized', status: 401, ...(code ? { error_code: code } : {}) };
  }
  if (response.status === 404) {
    // Token không còn đăng ký với FCM.
    return { outcome: 'invalid_token', status: 404, ...(code ? { error_code: code } : {}) };
  }
  if (
    response.status === 400 &&
    (code === 'UNREGISTERED' || code === 'INVALID_REGISTRATION_TOKEN')
  ) {
    return { outcome: 'invalid_token', status: 400, error_code: code };
  }
  if (response.status === 429 || response.status >= 500) {
    return { outcome: 'unavailable', status: response.status, ...(code ? { error_code: code } : {}) };
  }
  return {
    outcome: 'failed',
    status: response.status,
    ...(code ? { error_code: code } : {}),
  };
}

/**
 * Gửi push cho một đăng ký: lấy/cache access token, gửi, và nếu FCM trả 401 thì vô hiệu
 * cache rồi làm mới đúng một lần. Token bị FCM báo không hợp lệ (404/UNREGISTERED) thì xoá
 * đúng đăng ký đó (delivery cascade), không xoá vì payload sai.
 */
export async function sendPushToDevice(
  db: D1Database,
  fetchImpl: FetchLike,
  account: ServiceAccount,
  input: { deviceToken: string; deviceId: string; membershipId: string; registrationVersion: number; kind: FcmKind; refs: PushRefs },
  nowMs: number = Date.now(),
): Promise<FcmResult> {
  const message = buildPushMessage(input.deviceToken, input.kind, input.refs);
  let accessToken = await getAccessToken(db, fetchImpl, account, nowMs);
  if (accessToken === null) return { outcome: 'no_credentials' };

  let result = await sendFcmMessage(fetchImpl, account.projectId, accessToken, message);
  if (result.outcome === 'unauthorized') {
    await invalidateAccessToken(db, account.projectId);
    accessToken = await getAccessToken(db, fetchImpl, account, nowMs);
    if (accessToken === null) return result;
    result = await sendFcmMessage(fetchImpl, account.projectId, accessToken, message);
  }
  if (result.outcome === 'invalid_token') {
    await invalidateDeviceToken(
      db,
      input.deviceId,
      input.membershipId,
      input.registrationVersion,
    );
  }
  return result;
}
