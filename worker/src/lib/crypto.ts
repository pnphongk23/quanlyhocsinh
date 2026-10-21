export const DEFAULT_PBKDF2_ITERATIONS = 100_000;
export const MAX_PBKDF2_ITERATIONS = 100_000;

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(new Uint8Array(digest));
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export function resolveIterations(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PBKDF2_ITERATIONS;
  return Math.min(parsed, MAX_PBKDF2_ITERATIONS);
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

/** Định dạng lưu: 'pbkdf2-sha256$<iter>$<salt_b64url>$<hash_b64url>'. */
export async function hashPassword(
  password: string,
  iterations: number,
): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${base64UrlEncode(salt)}$${base64UrlEncode(hash)}`;
}

export interface ParsedPasswordHash {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
}

export function parsePasswordHash(stored: string): ParsedPasswordHash | null {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return null;
  const iterations = Number.parseInt(parts[1] ?? '', 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return null;
  try {
    return {
      iterations,
      salt: base64UrlDecode(parts[2] ?? ''),
      hash: base64UrlDecode(parts[3] ?? ''),
    };
  } catch {
    return null;
  }
}

export async function verifyPassword(
  stored: string,
  password: string,
): Promise<{ ok: boolean; iterations: number }> {
  const parsed = parsePasswordHash(stored);
  if (!parsed) return { ok: false, iterations: 0 };
  const candidate = await derive(password, parsed.salt, parsed.iterations);
  return {
    ok: constantTimeEqual(candidate, parsed.hash),
    iterations: parsed.iterations,
  };
}

/** Băm giả để thời gian trả lời của SĐT không tồn tại giống SĐT tồn tại. */
export async function dummyVerify(password: string, iterations: number): Promise<void> {
  await derive(password, new Uint8Array(16), iterations);
}

export function newSessionToken(): { token: string; tokenHashPromise: Promise<string> } {
  const token = `qlh_${base64UrlEncode(randomBytes(32))}`;
  return { token, tokenHashPromise: sha256Hex(token) };
}

const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Mật khẩu tạm 10 ký tự từ bảng 32 ký tự, in dạng 'XXXXX-XXXXX' (≈ 50 bit). */
export function newTemporaryPassword(): string {
  const chars: string[] = [];
  const limit = 256 - (256 % TEMP_PASSWORD_ALPHABET.length);
  while (chars.length < 10) {
    const bytes = randomBytes(16);
    for (const byte of bytes) {
      if (byte >= limit) continue;
      chars.push(TEMP_PASSWORD_ALPHABET[byte % TEMP_PASSWORD_ALPHABET.length] ?? '');
      if (chars.length === 10) break;
    }
  }
  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
}
