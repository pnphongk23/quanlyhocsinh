import type { ThrottlePolicy } from './auth';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
export const RESET_PHONE_POLICY: ThrottlePolicy = { limit: 5, windowMs: 15 * 60 * 1000 };
export const RESET_IP_POLICY: ThrottlePolicy = { limit: 20, windowMs: 15 * 60 * 1000 };
export const RESET_CONFIRM_IP_POLICY: ThrottlePolicy = { limit: 20, windowMs: 15 * 60 * 1000 };

const RESET_TOKEN_KEEP_MS = 24 * 60 * 60 * 1000;
const TEST_MAILBOX_KEEP_MS = 60 * 60 * 1000;

export function resetPhoneKey(phone: string): string {
  return `reset:phone:${phone}`;
}

export function resetIpKey(ip: string): string {
  return `reset:ip:${ip}`;
}

export function resetConfirmIpKey(ip: string): string {
  return `reset:confirm:ip:${ip}`;
}

export interface ResetAccount {
  id: string;
  phone: string;
  email: string | null;
}

export async function findResetAccountByPhone(
  db: D1Database,
  phone: string,
): Promise<ResetAccount | undefined> {
  const row = await db
    .prepare('SELECT id, phone, email FROM users WHERE phone = ?')
    .bind(phone)
    .first<ResetAccount>();
  return row ?? undefined;
}

export async function setUserEmail(
  db: D1Database,
  userId: string,
  email: string | null,
): Promise<void> {
  await db
    .prepare('UPDATE users SET email = ?, version = version + 1 WHERE id = ?')
    .bind(email, userId)
    .run();
}

export interface CreateResetTokenInput {
  userId: string;
  tokenHash: string;
  now: string;
  expiresAt: string;
}

/** Vô hiệu token chưa dùng cũ của user rồi tạo token mới, trong một batch. */
export async function createResetToken(
  db: D1Database,
  input: CreateResetTokenInput,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE password_reset_tokens SET used_at = ?
          WHERE user_id = ? AND used_at IS NULL`,
      )
      .bind(input.now, input.userId),
    db
      .prepare(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), input.userId, input.tokenHash, input.now, input.expiresAt),
  ]);
}

/** Dùng khi gửi mail lỗi: token vừa tạo không còn ai nhận được. */
export async function invalidateResetToken(
  db: D1Database,
  tokenHash: string,
  now: string,
): Promise<void> {
  await db
    .prepare('UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL')
    .bind(now, tokenHash)
    .run();
}

export interface ValidResetToken {
  id: string;
  userId: string;
  phone: string;
}

/** Token còn hạn, chưa dùng; sai/hết hạn/đã dùng đều trả undefined. */
export async function findValidResetToken(
  db: D1Database,
  tokenHash: string,
  now: string,
): Promise<ValidResetToken | undefined> {
  const row = await db
    .prepare(
      `SELECT t.id AS id, t.user_id AS userId, u.phone AS phone
         FROM password_reset_tokens t
         JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > ?`,
    )
    .bind(tokenHash, now)
    .first<ValidResetToken>();
  return row ?? undefined;
}

export interface ConfirmResetInput {
  tokenId: string;
  userId: string;
  passwordHash: string;
  now: string;
}

/**
 * Đổi mật khẩu bằng token trong một batch. Trả false nếu token đã bị dùng ở request song song
 * (mật khẩu không đổi).
 */
export async function confirmPasswordReset(
  db: D1Database,
  input: ConfirmResetInput,
): Promise<boolean> {
  const results = await db.batch([
    db
      .prepare(
        `UPDATE users
            SET password_hash = ?, must_change_password = 0, password_changed_at = ?,
                version = version + 1
          WHERE id = ?
            AND EXISTS (SELECT 1 FROM password_reset_tokens WHERE id = ? AND used_at IS NULL)`,
      )
      .bind(input.passwordHash, input.now, input.userId, input.tokenId),
    db
      .prepare(
        `UPDATE password_reset_tokens SET used_at = ?
          WHERE user_id = ? AND used_at IS NULL`,
      )
      .bind(input.now, input.userId),
    db
      .prepare(
        `UPDATE auth_sessions SET revoked_at = ?
          WHERE user_id = ? AND revoked_at IS NULL`,
      )
      .bind(input.now, input.userId),
    db
      .prepare(
        `DELETE FROM device_tokens
          WHERE auth_session_id IN (SELECT id FROM auth_sessions WHERE user_id = ?)`,
      )
      .bind(input.userId),
  ]);
  return (results[0]?.meta?.changes ?? 0) === 1;
}

/** Cron: token hết hạn quá 1 ngày và thư thử cũ hơn 1 giờ. */
export async function purgeResetData(db: D1Database, nowMs: number = Date.now()): Promise<void> {
  await db.batch([
    db
      .prepare('DELETE FROM password_reset_tokens WHERE expires_at < ?')
      .bind(new Date(nowMs - RESET_TOKEN_KEEP_MS).toISOString()),
    db
      .prepare('DELETE FROM test_mailbox WHERE created_at < ?')
      .bind(new Date(nowMs - TEST_MAILBOX_KEEP_MS).toISOString()),
  ]);
}
