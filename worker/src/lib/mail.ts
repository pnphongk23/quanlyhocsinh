import type { Env } from '../types';
import { ApiError } from './errors';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailSender {
  send(message: MailMessage): Promise<void>;
}

export const mailUnavailable = () =>
  new ApiError(503, 'mail_unavailable', 'Mail is unavailable.');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Chuẩn hoá (trim + chữ thường); null nếu sai định dạng hoặc dài quá 254 ký tự. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

/** Che email: ký tự đầu của phần local + '***@' + miền đầy đủ. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  return `${email.slice(0, 1)}***@${email.slice(at + 1)}`;
}

// Chế độ thử chỉ chạy ở dev/staging, local và runtime test; production bị coi như disabled.
const TEST_MAIL_ENVIRONMENTS = new Set(['dev', 'staging', 'local', 'test']);

/**
 * Chọn người gửi theo `MAIL_MODE`:
 * - `cloudflare`: binding Email Service `EMAIL`, người gửi lấy từ `MAIL_FROM`.
 * - `test`: ghi vào bảng `test_mailbox` (chỉ khi ENVIRONMENT là dev/staging/local/test).
 * - thiếu hoặc giá trị khác: null (disabled).
 */
export function resolveMailSender(env: Env): MailSender | null {
  if (env.MAIL_MODE === 'cloudflare') {
    const binding = env.EMAIL;
    const from = env.MAIL_FROM;
    if (!binding || !from) return null;
    return {
      async send(message) {
        await binding.send({
          to: message.to,
          from,
          subject: message.subject,
          text: message.text,
          ...(message.html === undefined ? {} : { html: message.html }),
        });
      },
    };
  }
  if (env.MAIL_MODE === 'test' && TEST_MAIL_ENVIRONMENTS.has(env.ENVIRONMENT ?? '')) {
    return {
      async send(message) {
        await env.DB
          .prepare(
            `INSERT INTO test_mailbox (id, to_email, subject, body, created_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            message.to,
            message.subject,
            message.text,
            new Date().toISOString(),
          )
          .run();
      },
    };
  }
  return null;
}
