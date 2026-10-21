import { describe, expect, it } from 'vitest';
import app from '../src/index';
import type { Env } from '../src/types';
import { testEnv } from './helpers';

const PAGES_ORIGIN = 'https://qlh-staging.pages.dev';
const LOCAL_ORIGIN = 'http://localhost:5173';
const ALLOWED = `${PAGES_ORIGIN}, ${LOCAL_ORIGIN}`;

/** Gọi app với env ghi đè `ALLOWED_ORIGINS` (danh sách origin do người triển khai chốt). */
async function request(
  path: string,
  init: RequestInit = {},
  allowOrigins?: string,
): Promise<Response> {
  const env = { ...testEnv, ALLOWED_ORIGINS: allowOrigins } as unknown as Env;
  return app.request(`https://api.test${path}`, init, env);
}

function preflight(origin: string): RequestInit {
  return {
    method: 'OPTIONS',
    headers: {
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization,content-type',
    },
  };
}

describe('CORS cho /v1/*', () => {
  it('reflects an allowed origin on a preflight with 204 and the documented headers', async () => {
    const response = await request('/v1/auth/login', preflight(PAGES_ORIGIN), ALLOWED);

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(PAGES_ORIGIN);
    expect(response.headers.get('access-control-allow-origin')).not.toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-methods')).toContain('PATCH');
    expect(response.headers.get('access-control-allow-methods')).toContain('DELETE');
    const allowedHeaders = (response.headers.get('access-control-allow-headers') ?? '').toLowerCase();
    for (const name of ['authorization', 'content-type', 'x-request-id', 'x-client']) {
      expect(allowedHeaders).toContain(name);
    }
    const maxAge = Number(response.headers.get('access-control-max-age'));
    expect(Number.isFinite(maxAge)).toBe(true);
    expect(maxAge).toBeGreaterThan(0);
    expect((response.headers.get('vary') ?? '').toLowerCase()).toContain('origin');
  });

  it('does not reflect an origin outside the allow list, and never reflects *', async () => {
    const stranger = await request('/v1/auth/login', preflight('https://evil.example.com'), ALLOWED);
    expect(stranger.status).toBe(204);
    expect(stranger.headers.get('access-control-allow-origin')).toBeNull();
    expect((stranger.headers.get('vary') ?? '').toLowerCase()).toContain('origin');

    const wildcard = await request('/v1/auth/login', preflight(PAGES_ORIGIN), '*');
    expect(wildcard.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('allows no origin when ALLOWED_ORIGINS is empty or unset (default)', async () => {
    for (const configured of ['', '   ', undefined]) {
      const response = await request('/v1/health', { headers: { origin: PAGES_ORIGIN } }, configured);
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    }
  });

  it('tolerates whitespace and a trailing slash in the configured list', async () => {
    const response = await request(
      '/v1/health',
      { headers: { origin: LOCAL_ORIGIN } },
      ` ${PAGES_ORIGIN}/ , ${LOCAL_ORIGIN} `,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(LOCAL_ORIGIN);
  });

  it('adds the CORS headers to real requests and to error responses', async () => {
    const health = await request('/v1/health', { headers: { origin: PAGES_ORIGIN } }, ALLOWED);
    expect(health.status).toBe(200);
    expect(health.headers.get('access-control-allow-origin')).toBe(PAGES_ORIGIN);
    expect(health.headers.get('vary')?.toLowerCase()).toContain('origin');

    // Thiếu token ⇒ 401; lỗi vẫn phải mang header CORS để trình duyệt đọc được mã lỗi.
    const unauthorized = await request('/v1/me', { headers: { origin: PAGES_ORIGIN } }, ALLOWED);
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get('access-control-allow-origin')).toBe(PAGES_ORIGIN);
    expect(unauthorized.headers.get('x-request-id')).toBeTruthy();

    const unknownOrigin = await request('/v1/me', { headers: { origin: 'https://evil.example.com' } }, ALLOWED);
    expect(unknownOrigin.headers.get('access-control-allow-origin')).toBeNull();
  });
});
