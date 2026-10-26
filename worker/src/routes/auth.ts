import { Hono } from 'hono';
import type { AppEnv } from '../types';
import {
  DEFAULT_ROLES,
  LOGIN_IP_POLICY,
  LOGIN_PHONE_POLICY,
  REGISTER_IP_POLICY,
  addWorkspace,
  changePassword,
  clearThrottle,
  consumeThrottle,
  createSession,
  findActiveMembership,
  findUserByPhone,
  hasGuardianPhoneDeclaration,
  getMe,
  getUserById,
  getUserPhone,
  listActiveMemberships,
  loginIpKey,
  loginPhoneKey,
  phoneCheckIpKey,
  phoneCheckPhoneKey,
  logoutSession,
  newRoleIdMap,
  refundThrottle,
  rehashPassword,
  registerIpKey,
  registerGuardian,
  registerWorkspace,
  toUserView,
  updateSessionMembership,
  workspaceCreateKey,
} from '../db/auth';
import {
  RESET_CONFIRM_IP_POLICY,
  RESET_IP_POLICY,
  RESET_PHONE_POLICY,
  RESET_TOKEN_TTL_MS,
  confirmPasswordReset,
  createResetToken,
  findResetAccountByPhone,
  findValidResetToken,
  invalidateResetToken,
  resetConfirmIpKey,
  resetIpKey,
  resetPhoneKey,
  setUserEmail,
} from '../db/password-reset';
import { getClientIp } from '../lib/client-ip';
import {
  base64UrlEncode,
  hashPassword,
  newSessionToken,
  randomBytes,
  sha256Hex,
  dummyVerify,
  resolveIterations,
  verifyPassword,
} from '../lib/crypto';
import {
  ApiError,
  accountDisabled,
  conflict,
  forbidden,
  invalidCredentials,
  notFound,
  rateLimited,
  unauthorized,
  validationError,
} from '../lib/errors';
import { optionalDisplayName, readJsonObject, stringField } from '../lib/http';
import { maskEmail, mailUnavailable, normalizeEmail, resolveMailSender } from '../lib/mail';
import { assertPassword, normalizePhone } from '../lib/phone';
import { SESSION_TTL_MS, isoAfterMs, nowIso } from '../lib/time';
import { requireAuth } from '../middleware/auth';

export const authRoutes = new Hono<AppEnv>();

const WORKSPACE_CREATE_POLICY = { limit: 5, windowMs: 60 * 60 * 1000 } as const;
const PHONE_CHECK_IP_POLICY = { limit: 100, windowMs: 15 * 60 * 1000 } as const;
const PHONE_CHECK_PHONE_POLICY = { limit: 50, windowMs: 15 * 60 * 1000 } as const;

function requirePassword(value: unknown, field = 'password'): string {
  if (typeof value !== 'string' || value === '') {
    throw validationError({ [field]: 'required' });
  }
  return value;
}

function roleView(systemKey: 'admin' | 'teacher' | 'assistant' | 'guardian') {
  const role = DEFAULT_ROLES.find((row) => row.systemKey === systemKey);
  if (!role) throw new ApiError(500, 'internal', 'Role seed missing.');
  return role;
}

/** Email tùy chọn khi đăng ký: vắng/null/rỗng = không có; sai định dạng = 422. */
function optionalEmail(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const email = normalizeEmail(value);
  if (email === null) throw validationError({ email: 'invalid_email' });
  return email;
}

function tokenInvalid() {
  return new ApiError(400, 'token_invalid', 'Reset link is invalid or expired.');
}

/** Giữ chỗ throttle theo IP rồi SĐT; hoàn lại IP nếu SĐT bị từ chối. */
async function reserveResetThrottle(db: D1Database, ip: string, phone: string): Promise<void> {
  const ipKey = resetIpKey(ip);
  const ipReservation = await consumeThrottle(db, ipKey, RESET_IP_POLICY);
  if (!ipReservation.allowed) throw rateLimited(ipReservation.retryAfterSeconds);
  const phoneReservation = await consumeThrottle(db, resetPhoneKey(phone), RESET_PHONE_POLICY);
  if (!phoneReservation.allowed) {
    await refundThrottle(db, ipKey);
    throw rateLimited(phoneReservation.retryAfterSeconds);
  }
}

async function reservePhoneCheckThrottle(db: D1Database, ip: string, phone: string): Promise<void> {
  const ipKey = phoneCheckIpKey(ip);
  const ipReservation = await consumeThrottle(db, ipKey, PHONE_CHECK_IP_POLICY);
  if (!ipReservation.allowed) throw rateLimited(ipReservation.retryAfterSeconds);
  const phoneReservation = await consumeThrottle(db, phoneCheckPhoneKey(phone), PHONE_CHECK_PHONE_POLICY);
  if (!phoneReservation.allowed) {
    await refundThrottle(db, ipKey);
    throw rateLimited(phoneReservation.retryAfterSeconds);
  }
}

authRoutes.post('/auth/phone-check', async (c) => {
  const db = c.env.DB;
  const body = await readJsonObject(c.req.raw);
  const phone = normalizePhone(body.phone);
  if (phone === null) throw validationError({ phone: 'invalid_phone' });
  await reservePhoneCheckThrottle(db, getClientIp(c.req.raw), phone);
  if (await findUserByPhone(db, phone)) return c.json({ next: 'login' });
  return c.json({ next: await hasGuardianPhoneDeclaration(db, phone) ? 'guardian_setup' : 'teacher_register' });
});

authRoutes.post('/auth/register', async (c) => {
  const db = c.env.DB;
  const ip = getClientIp(c.req.raw);
  const registerThrottle = await consumeThrottle(db, registerIpKey(ip), REGISTER_IP_POLICY);
  if (!registerThrottle.allowed) throw rateLimited(registerThrottle.retryAfterSeconds);

  const body = await readJsonObject(c.req.raw);
  const phone = normalizePhone(body.phone);
  if (phone === null) throw validationError({ phone: 'invalid_phone' });
  const password = requirePassword(body.password);
  assertPassword(password, phone);
  const workspaceName = stringField(body, 'workspace_name', {
    required: true,
    min: 1,
    max: 100,
  }) as string;
  const displayName = optionalDisplayName(body);
  const email = optionalEmail(body.email);

  const existing = await findUserByPhone(db, phone);
  if (existing) throw conflict('phone_registered');

  const iterations = resolveIterations(c.env.PBKDF2_ITERATIONS);
  const passwordHash = await hashPassword(password, iterations);
  const { token, tokenHashPromise } = newSessionToken();
  const tokenHash = await tokenHashPromise;

  const workspaceId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const roleIds = newRoleIdMap();
  const now = nowIso();
  const expiresAt = isoAfterMs(SESSION_TTL_MS);

  await registerWorkspace(db, {
    workspaceId,
    userId,
    membershipId,
    sessionId,
    phone,
    displayName,
    email,
    passwordHash,
    workspaceName,
    tokenHash,
    deviceLabel: null,
    now,
    expiresAt,
    roleIds,
  });

  const adminRole = roleView('admin');
  return c.json(
    {
      token,
      expires_at: expiresAt,
      user: {
        id: userId,
        phone,
        display_name: displayName,
        email,
        must_change_password: false,
      },
      memberships: [
        {
          id: membershipId,
          status: 'active',
          scope_epoch: 1,
          workspace: { id: workspaceId, name: workspaceName },
          role: {
            id: roleIds.admin,
            name: adminRole.name,
            system_key: adminRole.systemKey,
            scope_kind: adminRole.scopeKind,
          },
        },
      ],
      active_membership_id: membershipId,
    },
    201,
  );
});

authRoutes.post('/auth/register-guardian', async (c) => {
  const db = c.env.DB;
  const ip = getClientIp(c.req.raw);
  const throttleKey = registerIpKey(ip);
  const throttle = await consumeThrottle(db, throttleKey, REGISTER_IP_POLICY);
  if (!throttle.allowed) throw rateLimited(throttle.retryAfterSeconds);

  const body = await readJsonObject(c.req.raw);
  const phone = normalizePhone(body.phone);
  if (phone === null) throw validationError({ phone: 'invalid_phone' });
  const password = requirePassword(body.password);
  assertPassword(password, phone);
  const displayName = optionalDisplayName(body);
    const email = optionalEmail(body.email);

    if (await findUserByPhone(db, phone)) throw conflict('phone_registered');
    if (!(await hasGuardianPhoneDeclaration(db, phone))) throw forbidden({ reason: 'phone_not_declared' });

    const iterations = resolveIterations(c.env.PBKDF2_ITERATIONS);
  const passwordHash = await hashPassword(password, iterations);
  const { token, tokenHashPromise } = newSessionToken();
  const tokenHash = await tokenHashPromise;
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const now = nowIso();
  const expiresAt = isoAfterMs(SESSION_TTL_MS);

  await registerGuardian(db, {
    userId,
    sessionId,
    phone,
    displayName,
    email,
    passwordHash,
    tokenHash,
    now,
    expiresAt,
  });
  const memberships = await listActiveMemberships(db, userId);
  const activeMembershipId = memberships.length === 1 ? memberships[0]?.id ?? null : null;

  return c.json({
    token,
    expires_at: expiresAt,
    user: {
      id: userId,
      phone,
      display_name: displayName,
      email,
      must_change_password: false,
    },
    memberships,
    active_membership_id: activeMembershipId,
  }, 201);
});

authRoutes.post('/workspaces', requireAuth, async (c) => {
  const identity = c.get('identity');
  const throttleKey = workspaceCreateKey(identity.userId);
  const throttle = await consumeThrottle(c.env.DB, throttleKey, WORKSPACE_CREATE_POLICY);
  if (!throttle.allowed) throw rateLimited(throttle.retryAfterSeconds);
  const body = await readJsonObject(c.req.raw);
  const workspaceName = stringField(body, 'workspace_name', {
    required: true,
    min: 1,
    max: 100,
  }) as string;

  const workspaceId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const roleIds = newRoleIdMap();
  const now = nowIso();

  await addWorkspace(c.env.DB, {
    workspaceId,
    membershipId,
    userId: identity.userId,
    workspaceName,
    now,
    roleIds,
  });

  const adminRole = roleView('admin');
  return c.json(
    {
      membership: {
        id: membershipId,
        status: 'active',
        scope_epoch: 1,
        workspace: { id: workspaceId, name: workspaceName },
        role: {
          id: roleIds.admin,
          name: adminRole.name,
          system_key: adminRole.systemKey,
          scope_kind: adminRole.scopeKind,
        },
      },
    },
    201,
  );
});

authRoutes.post('/auth/login', async (c) => {
  const db = c.env.DB;
  const ip = getClientIp(c.req.raw);
  const body = await readJsonObject(c.req.raw);

  const phone = normalizePhone(body.phone);
  const password = requirePassword(body.password);
  const deviceLabelRaw = body.device_label;
  if (deviceLabelRaw !== undefined && deviceLabelRaw !== null) {
    if (typeof deviceLabelRaw !== 'string' || deviceLabelRaw.length > 80) {
      throw validationError({ device_label: 'must_be_at_most_80' });
    }
  }
  const deviceLabel =
    typeof deviceLabelRaw === 'string' && deviceLabelRaw.trim() !== ''
      ? deviceLabelRaw.trim()
      : null;

  const phoneKey = loginPhoneKey(phone ?? 'invalid');
  const ipKey = loginIpKey(ip);

  // Reserve IP first, then phone; refund IP if the phone reservation is denied.
  const ipReservation = await consumeThrottle(db, ipKey, LOGIN_IP_POLICY, Date.now(), LOGIN_IP_POLICY.lockMs);
  if (!ipReservation.allowed) throw rateLimited(ipReservation.retryAfterSeconds);
  const phoneReservation = await consumeThrottle(
    db,
    phoneKey,
    LOGIN_PHONE_POLICY,
    Date.now(),
    LOGIN_PHONE_POLICY.lockMs,
  );
  if (!phoneReservation.allowed) {
    await refundThrottle(db, ipKey);
    throw rateLimited(phoneReservation.retryAfterSeconds);
  }

  const iterations = resolveIterations(c.env.PBKDF2_ITERATIONS);
  const user = phone === null ? undefined : await findUserByPhone(db, phone);

  let passwordOk = false;
  let storedIterations = iterations;
  if (user) {
    const verified = await verifyPassword(user.password_hash, password);
    passwordOk = verified.ok;
    if (verified.iterations > 0) storedIterations = verified.iterations;
    if (!verified.ok && verified.iterations === 0) {
      await dummyVerify(password, iterations);
    }
  } else {
    await dummyVerify(password, iterations);
  }

  if (!passwordOk || !user) {
    throw invalidCredentials();
  }

  await clearThrottle(db, phoneKey);
  await refundThrottle(db, ipKey);

  if (user.status !== 'active') throw accountDisabled();

  const memberships = await listActiveMemberships(db, user.id);

  const activeMembershipId = memberships.length === 1 ? memberships[0]?.id ?? null : null;
  const sessionId = crypto.randomUUID();
  const { token, tokenHashPromise } = newSessionToken();
  const tokenHash = await tokenHashPromise;
  const now = nowIso();
  const expiresAt = isoAfterMs(SESSION_TTL_MS);

  await createSession(db, {
    id: sessionId,
    userId: user.id,
    membershipId: activeMembershipId,
    tokenHash,
    deviceLabel,
    createdAt: now,
    expiresAt,
  });

  if (storedIterations !== iterations) {
    const upgraded = await hashPassword(password, iterations);
    await rehashPassword(db, user.id, upgraded);
  }

  return c.json({
    token,
    expires_at: expiresAt,
    user: toUserView(user),
    memberships,
    active_membership_id: activeMembershipId,
  });
});

authRoutes.post('/auth/logout', requireAuth, async (c) => {
  const identity = c.get('identity');
  await logoutSession(c.env.DB, identity.sessionId);
  return c.body(null, 204);
});

authRoutes.post('/auth/change-password', requireAuth, async (c) => {
  const db = c.env.DB;
  const identity = c.get('identity');
  const body = await readJsonObject(c.req.raw);
  const currentPassword = requirePassword(body.current_password, 'current_password');
  const newPassword = requirePassword(body.new_password, 'new_password');

  const user = await getUserById(db, identity.userId);
  if (!user) throw unauthorized();

  const throttleKey = loginPhoneKey(user.phone);
  const reservation = await consumeThrottle(
    db,
    throttleKey,
    LOGIN_PHONE_POLICY,
    Date.now(),
    LOGIN_PHONE_POLICY.lockMs,
  );
  if (!reservation.allowed) throw rateLimited(reservation.retryAfterSeconds);

  const verified = await verifyPassword(user.password_hash, currentPassword);
  if (!verified.ok) {
    throw invalidCredentials();
  }

  assertPassword(newPassword, user.phone);

  const iterations = resolveIterations(c.env.PBKDF2_ITERATIONS);
  const passwordHash = await hashPassword(newPassword, iterations);
  await changePassword(db, {
    userId: user.id,
    passwordHash,
    now: nowIso(),
    keepSessionId: identity.sessionId,
  });
  await clearThrottle(db, throttleKey);

  return c.json({ must_change_password: false });
});

authRoutes.get('/me', requireAuth, async (c) => {
  const identity = c.get('identity');
  const activeMembershipId = identity.membershipId === '' ? null : identity.membershipId;
  const me = await getMe(c.env.DB, identity.userId, activeMembershipId);
  return c.json(me);
});

authRoutes.put('/me/email', requireAuth, async (c) => {
  const db = c.env.DB;
  const identity = c.get('identity');
  const body = await readJsonObject(c.req.raw);
  const currentPassword = requirePassword(body.current_password, 'current_password');
  if (!('email' in body)) throw validationError({ email: 'required' });
  const email = body.email === null ? null : normalizeEmail(body.email);
  if (body.email !== null && email === null) throw validationError({ email: 'invalid_email' });

  const user = await getUserById(db, identity.userId);
  if (!user) throw unauthorized();

  const throttleKey = loginPhoneKey(user.phone);
  const reservation = await consumeThrottle(
    db,
    throttleKey,
    LOGIN_PHONE_POLICY,
    Date.now(),
    LOGIN_PHONE_POLICY.lockMs,
  );
  if (!reservation.allowed) throw rateLimited(reservation.retryAfterSeconds);

  const verified = await verifyPassword(user.password_hash, currentPassword);
  if (!verified.ok) throw invalidCredentials();

  await setUserEmail(db, user.id, email);
  await clearThrottle(db, throttleKey);
  return c.json({ email });
});

authRoutes.post('/auth/password-reset/lookup', async (c) => {
  const db = c.env.DB;
  const body = await readJsonObject(c.req.raw);
  const phone = normalizePhone(body.phone);
  if (phone === null) throw validationError({ phone: 'invalid_phone' });
  await reserveResetThrottle(db, getClientIp(c.req.raw), phone);

  const account = await findResetAccountByPhone(db, phone);
  return c.json({
    account: account !== undefined,
    has_email: account?.email != null,
    email_masked: account?.email != null ? maskEmail(account.email) : null,
  });
});

authRoutes.post('/auth/password-reset/request', async (c) => {
  const db = c.env.DB;
  const sender = resolveMailSender(c.env);
  const linkBase = (c.env.RESET_LINK_BASE ?? '').trim().replace(/\/+$/, '');
  if (sender === null || linkBase === '') throw mailUnavailable();

  const body = await readJsonObject(c.req.raw);
  const phone = normalizePhone(body.phone);
  if (phone === null) throw validationError({ phone: 'invalid_phone' });
  const email = normalizeEmail(body.email);
  if (email === null) throw validationError({ email: 'invalid_email' });
  await reserveResetThrottle(db, getClientIp(c.req.raw), phone);

  const account = await findResetAccountByPhone(db, phone);
  if (!account) throw notFound();
  if (account.email === null) throw conflict('no_email');
  if (account.email !== email) throw validationError({ email: 'email_mismatch' });

  const token = base64UrlEncode(randomBytes(32));
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  await createResetToken(db, {
    userId: account.id,
    tokenHash,
    now,
    expiresAt: isoAfterMs(RESET_TOKEN_TTL_MS, Date.parse(now)),
  });

  const link = `${linkBase}/dat-lai-mat-khau#token=${token}`;
  try {
    await sender.send({
      to: account.email,
      subject: 'Đặt lại mật khẩu tài khoản của bạn',
      text:
        'Bạn vừa yêu cầu đặt lại mật khẩu.\n\n' +
        `Mở liên kết sau để đặt mật khẩu mới (hiệu lực 30 phút, chỉ dùng một lần):\n${link}\n\n` +
        'Nếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.',
    });
  } catch {
    await invalidateResetToken(db, tokenHash, nowIso());
    throw mailUnavailable();
  }
  return c.json({ sent: true }, 202);
});

authRoutes.post('/auth/password-reset/confirm', async (c) => {
  const db = c.env.DB;
  const ipReservation = await consumeThrottle(
    db,
    resetConfirmIpKey(getClientIp(c.req.raw)),
    RESET_CONFIRM_IP_POLICY,
  );
  if (!ipReservation.allowed) throw rateLimited(ipReservation.retryAfterSeconds);

  const body = await readJsonObject(c.req.raw);
  const newPassword = requirePassword(body.new_password, 'new_password');
  if (typeof body.token !== 'string' || body.token === '') throw tokenInvalid();

  const now = nowIso();
  const valid = await findValidResetToken(db, await sha256Hex(body.token), now);
  if (!valid) throw tokenInvalid();
  assertPassword(newPassword, valid.phone);

  const passwordHash = await hashPassword(newPassword, resolveIterations(c.env.PBKDF2_ITERATIONS));
  const changed = await confirmPasswordReset(db, {
    tokenId: valid.id,
    userId: valid.userId,
    passwordHash,
    now,
  });
  if (!changed) throw tokenInvalid();
  await clearThrottle(db, loginPhoneKey(valid.phone));
  return c.json({ ok: true });
});

authRoutes.put('/session/membership', requireAuth, async (c) => {
  const identity = c.get('identity');
  const body = await readJsonObject(c.req.raw);
  const membershipId = stringField(body, 'membership_id', { required: true, max: 64 }) as string;

  const membership = await findActiveMembership(c.env.DB, identity.userId, membershipId);
  if (!membership) throw notFound();

  await updateSessionMembership(
    c.env.DB,
    identity.sessionId,
    identity.userId,
    membership.id,
  );

  return c.json({
    active_membership_id: membership.id,
    device_registration_cleared: true,
  });
});

/** Dùng trong test/handler khác khi cần số điện thoại của chính mình. */
export async function currentUserPhone(db: D1Database, userId: string): Promise<string | null> {
  return getUserPhone(db, userId);
}
