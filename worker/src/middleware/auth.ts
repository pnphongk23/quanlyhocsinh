import { createMiddleware } from 'hono/factory';
import type { AppEnv, Identity } from '../types';
import { authenticate, authenticateSession, sessionIdentity, touchSession } from '../db/identity';
import type { SessionRow } from '../db/identity';
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

// Route tài khoản chỉ cần phiên hợp lệ: người dùng có từ hai vai trò trở lên phải gọi
// được chúng trước khi chọn vai trò (api-spec 4). Mọi route miền khác vẫn 403.
const ACCOUNT_SESSION_PATHS = new Set([
  '/v1/me',
  '/v1/session/membership',
  '/v1/workspaces',
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
  const syncRequest = c.req.path === '/v1/sync' || c.req.path.startsWith('/v1/sync/');
  let identity: Identity;
  let session: SessionRow;
  if (syncRequest) {
    const result = await authenticateSession(c.env.DB, tokenHash);
    if (!result.ok) {
      if (result.reason === 'unauthorized') throw unauthorized();
      throw accountDisabled();
    }
    session = result.session;
    // Sync resolves the requested queue membership itself in db/sync.ts.
    identity = sessionIdentity(session);
  } else {
    const result = await authenticate(c.env.DB, tokenHash);
    if (result.ok) {
      session = result.session;
      identity = result.identity;
    } else if (result.reason === 'unauthorized') {
      throw unauthorized();
    } else if (ACCOUNT_SESSION_PATHS.has(normalizedPath(c.req.path))) {
      // Route tài khoản chỉ cần phiên hợp lệ: chưa chọn vai trò, hoặc membership đang
      // chọn vừa bị vô hiệu (N2) — client phải vào lại được màn chọn vai trò. Phiên của
      // user bị vô hiệu vẫn bị `accountDisabled()` ở nhánh dưới vì `authenticateSession`
      // kiểm `users.status` trước.
      const sessionResult = await authenticateSession(c.env.DB, tokenHash);
      if (!sessionResult.ok) {
        if (sessionResult.reason === 'unauthorized') throw unauthorized();
        throw accountDisabled();
      }
      session = sessionResult.session;
      identity = sessionIdentity(session);
    } else if (result.reason === 'account_disabled') {
      throw accountDisabled();
    } else {
      throw forbidden({ reason: 'membership_required' });
    }
  }
  c.set('identity', identity);

  if (
    identity.mustChangePassword &&
    !PASSWORD_CHANGE_ALLOWED_PATHS.has(normalizedPath(c.req.path))
  ) {
    throw passwordChangeRequired();
  }

  // Gia hạn trượt khi còn dưới 150 ngày; cập nhật last_seen tối đa mỗi giờ.
  const nowMs = Date.now();
  const expiresMs = Date.parse(session.expires_at);
  const lastSeenMs = Date.parse(session.last_seen_at);
  let newExpiresAt: string | null = null;
  let shouldTouch = false;
  if (Number.isFinite(expiresMs) && expiresMs - nowMs < SESSION_RENEW_BELOW_MS) {
    newExpiresAt = isoAfterMs(SESSION_RENEW_BELOW_MS + 30 * 24 * 60 * 60 * 1000, nowMs);
    shouldTouch = true;
  } else if (!Number.isFinite(lastSeenMs) || nowMs - lastSeenMs > SESSION_TOUCH_INTERVAL_MS) {
    shouldTouch = true;
  }
  if (shouldTouch) {
    const touch = touchSession(c.env.DB, session, newExpiresAt);
    try {
      c.executionCtx.waitUntil(touch);
    } catch {
      await touch;
    }
  }

  await next();
});
