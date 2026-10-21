import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';
import { authenticate, touchSession } from '../db/identity';
import { sha256Hex } from '../lib/crypto';
import {
  accountDisabled,
  forbidden,
  passwordChangeRequired,
  unauthorized,
} from '../lib/errors';
import {
  SESSION_RENEW_BELOW_MS,
  SESSION_TOUCH_INTERVAL_MS,
  isoAfterMs,
} from '../lib/time';

const PASSWORD_CHANGE_ALLOWED_PATHS = new Set([
  '/v1/me',
  '/v1/auth/change-password',
  '/v1/auth/logout',
]);

function normalizedPath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function extractBearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header === null) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = extractBearer(c.req.raw);
  if (token === null || token.length < 16 || token.length > 512) throw unauthorized();

  const tokenHash = await sha256Hex(token);
  const result = await authenticate(c.env.DB, tokenHash);

  if (!result.ok) {
    if (result.reason === 'unauthorized') throw unauthorized();
    if (result.reason === 'account_disabled') throw accountDisabled();
    throw forbidden({ reason: 'membership_required' });
  }

  const identity = result.identity;
  c.set('identity', identity);

  if (
    identity.mustChangePassword &&
    !PASSWORD_CHANGE_ALLOWED_PATHS.has(normalizedPath(c.req.path))
  ) {
    throw passwordChangeRequired();
  }

  // Gia hạn trượt khi còn dưới 150 ngày; cập nhật last_seen tối đa mỗi giờ.
  const nowMs = Date.now();
  const expiresMs = Date.parse(result.session.expires_at);
  const lastSeenMs = Date.parse(result.session.last_seen_at);
  let newExpiresAt: string | null = null;
  let shouldTouch = false;
  if (Number.isFinite(expiresMs) && expiresMs - nowMs < SESSION_RENEW_BELOW_MS) {
    newExpiresAt = isoAfterMs(SESSION_RENEW_BELOW_MS + 30 * 24 * 60 * 60 * 1000, nowMs);
    shouldTouch = true;
  } else if (!Number.isFinite(lastSeenMs) || nowMs - lastSeenMs > SESSION_TOUCH_INTERVAL_MS) {
    shouldTouch = true;
  }
  if (shouldTouch) {
    const touch = touchSession(c.env.DB, result.session, newExpiresAt);
    try {
      c.executionCtx.waitUntil(touch);
    } catch {
      await touch;
    }
  }

  await next();
});
