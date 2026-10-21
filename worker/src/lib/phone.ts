import { validationError } from './errors';

const STRIP_CHARS = /[\s\-().]/g;

/**
 * Chuẩn hoá SĐT Việt Nam về '+84' + 9 chữ số.
 * Nhận '0900000001', '84900000001', '+84900000001'.
 */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const compact = input.trim().replace(STRIP_CHARS, '');
  if (compact === '') return null;

  let digits: string;
  if (compact.startsWith('+84')) {
    digits = compact.slice(3);
  } else if (/^84\d{9}$/.test(compact)) {
    digits = compact.slice(2);
  } else if (/^0\d{9}$/.test(compact)) {
    digits = compact.slice(1);
  } else {
    return null;
  }
  if (!/^\d{9}$/.test(digits)) return null;
  return `+84${digits}`;
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

/** Kiểm quy tắc mật khẩu, trả lỗi 422 weak_password. */
export function assertPassword(password: string, phone?: string): void {
  if (!isValidPassword(password)) {
    throw validationError({ password: 'must_be_8_to_128_chars' }, 'weak_password');
  }
  if (phone) {
    const phoneDigits = phone.replace(/\D/g, '');
    const passwordDigits = password.replace(/\D/g, '');
    if (password === phone || (phoneDigits.length >= 9 && passwordDigits === phoneDigits)) {
      throw validationError({ password: 'must_not_be_phone' }, 'weak_password');
    }
  }
}

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}
