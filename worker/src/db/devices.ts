// Tầng truy cập D1 của nhóm: devices — FCM device token (device_tokens, push_deliveries,
// fcm_oauth_cache). Mọi truy vấn D1 của nhóm này CHỈ được viết ở file này; mọi hàm nhận
// danh tính đã xác thực từ phiên (api-spec.md mục 7, data-model.md mục 2.7).
import { notFound, validationError } from '../lib/errors';
import { nowIso } from '../lib/time';
import type { Identity } from '../types';

export type DevicePlatform = 'ios' | 'web';

export interface DeviceTokenView {
  id: string;
  registration_version: number;
  bound_at: string;
  platform: DevicePlatform;
  updated_at: string;
}

interface DeviceTokenRow {
  id: string;
  workspace_id: string;
  user_id: string;
  membership_id: string;
  auth_session_id: string;
  registration_version: number;
  bound_at: string;
  platform: DevicePlatform;
}

export const MAX_TOKEN_LENGTH = 4096;

function parsePlatform(raw: unknown): DevicePlatform {
  if (raw === 'ios' || raw === 'web') return raw;
  throw validationError({ platform: 'must_be_ios_or_web' });
}

function parseToken(raw: unknown): string {
  if (typeof raw !== 'string') throw validationError({ token: 'must_be_string' });
  const token = raw.trim();
  if (token.length === 0) throw validationError({ token: 'required' });
  if (token.length > MAX_TOKEN_LENGTH) {
    throw validationError({ token: `must_be_at_most_${MAX_TOKEN_LENGTH}` });
  }
  return token;
}

/**
 * Đăng ký / làm mới FCM token. Lấy danh tính từ phiên, KHÔNG nhận user/workspace từ body
 * (F02). Hai loại ghi:
 * - làm mới cùng binding (cùng user + membership + phiên): chỉ `updated_at`/`platform`,
 *   không tăng `registration_version`, không đổi `bound_at`, không xoá deliveries;
 * - đổi binding (chuyển chủ, đổi membership, phiên khác): bump `registration_version`,
 *   `bound_at = now`, xoá deliveries cũ trong cùng `batch`.
 */
export async function upsertDeviceToken(
  db: D1Database,
  identity: Identity,
  input: { token: unknown; platform: unknown },
): Promise<DeviceTokenView> {
  const token = parseToken(input.token);
  const platform = parsePlatform(input.platform);
  const now = nowIso();

  const existing = await db
    .prepare(
      `SELECT id, workspace_id, user_id, membership_id, auth_session_id,
              registration_version, bound_at, platform
         FROM device_tokens WHERE token = ?`,
    )
    .bind(token)
    .first<DeviceTokenRow>();

  if (existing) {
    const sameBinding =
      existing.user_id === identity.userId &&
      existing.membership_id === identity.membershipId &&
      existing.auth_session_id === identity.sessionId &&
      existing.workspace_id === identity.workspaceId;

    if (sameBinding) {
      await db
        .prepare('UPDATE device_tokens SET platform = ?, updated_at = ? WHERE id = ?')
        .bind(platform, now, existing.id)
        .run();
      return {
        id: existing.id,
        registration_version: existing.registration_version,
        bound_at: existing.bound_at,
        platform,
        updated_at: now,
      };
    }

    // Đổi binding: xoá deliveries cũ trước khi đổi chủ/khoá ngoại (FK theo membership).
    const version = existing.registration_version + 1;
    await db.batch([
      db.prepare('DELETE FROM push_deliveries WHERE device_id = ?').bind(existing.id),
      db
        .prepare(
          `UPDATE device_tokens
              SET workspace_id = ?, user_id = ?, membership_id = ?, auth_session_id = ?,
                  platform = ?, registration_version = ?, bound_at = ?, updated_at = ?
            WHERE id = ? AND registration_version = ?`,
        )
        .bind(
          identity.workspaceId,
          identity.userId,
          identity.membershipId,
          identity.sessionId,
          platform,
          version,
          now,
          now,
          existing.id,
          existing.registration_version,
        ),
    ]);
    return {
      id: existing.id,
      registration_version: version,
      bound_at: now,
      platform,
      updated_at: now,
    };
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO device_tokens
        (id, workspace_id, user_id, membership_id, auth_session_id, token, platform,
         registration_version, bound_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    )
    .bind(
      id,
      identity.workspaceId,
      identity.userId,
      identity.membershipId,
      identity.sessionId,
      token,
      platform,
      now,
      now,
      now,
    )
    .run();
  return {
    id,
    registration_version: 1,
    bound_at: now,
    platform,
    updated_at: now,
  };
}

/**
 * Thu hồi một đăng ký của CHÍNH chủ: đúng user + membership + phiên + version.
 * Bản cũ, phiên khác, người khác hoặc token đã chuyển chủ ⇒ 404 (không lộ sự tồn tại).
 */
export async function deleteDeviceToken(
  db: D1Database,
  identity: Identity,
  deviceId: string,
  registrationVersion: number,
): Promise<void> {
  if (!Number.isSafeInteger(registrationVersion) || registrationVersion < 1) {
    throw validationError({ registration_version: 'must_be_positive_integer' });
  }
  const result = await db
    .prepare(
      `DELETE FROM device_tokens
        WHERE id = ? AND workspace_id = ? AND user_id = ? AND membership_id = ?
          AND auth_session_id = ? AND registration_version = ?`,
    )
    .bind(
      deviceId,
      identity.workspaceId,
      identity.userId,
      identity.membershipId,
      identity.sessionId,
      registrationVersion,
    )
    .run();
  if ((result.meta?.changes ?? 0) !== 1) throw notFound();
}

/**
 * Xoá đúng đăng ký mà FCM xác nhận không còn hợp lệ (UNREGISTERED). Delivery của đăng ký
 * đó bị xoá theo khoá ngoại. Không xoá khi chỉ payload sai.
 */
export async function invalidateDeviceToken(
  db: D1Database,
  deviceId: string,
  membershipId: string,
  registrationVersion: number,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM device_tokens
        WHERE id = ? AND membership_id = ? AND registration_version = ?`,
    )
    .bind(deviceId, membershipId, registrationVersion)
    .run();
}
