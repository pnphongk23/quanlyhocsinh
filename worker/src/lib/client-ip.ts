import type { Env } from '../types';

/** IP của client: Cloudflare đặt CF-Connecting-IP; test có thể đặt header này. */
export function getClientIp(request: Request, env?: Env): string {
  const header = request.headers.get('cf-connecting-ip');
  if (header !== null && header.trim() !== '') return header.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded !== null && forwarded.trim() !== '') {
    return forwarded.split(',')[0]?.trim() ?? '127.0.0.1';
  }
  // wrangler dev / test không có IP thật.
  return env?.ENVIRONMENT === 'test' ? '127.0.0.1' : '127.0.0.1';
}
