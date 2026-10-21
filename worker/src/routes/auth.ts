import { Hono } from 'hono';
import type { AppEnv } from '../types';
import {
  DEFAULT_ROLES,
  ISSUE_PASSWORD_POLICY,
  LOGIN_IP_POLICY,
  LOGIN_PHONE_POLICY,
  REGISTER_IP_POLICY,
  addWorkspace,
  changePassword,
  checkThrottle,
  clearThrottle,
  countDisqualifyingMemberships,
  createSession,
  findActiveMembership,
  findStudentForAccess,
  findUserByPhone,
  getGuardianRoleId,
  getMe,
  getUserById,
  getUserPhone,
  issueGuardianCredentials,
  issuePasswordKey,
  listActiveMemberships,
  listGuardianLinks,
  listStudentIdsByParentPhone,
  loginIpKey,
  loginPhoneKey,
  logoutSession,
  newRoleIdMap,
  recordThrottleFailure,
  rehashPassword,
  registerIpKey,
  registerWorkspace,
  toUserView,
  updateSessionMembership,
} from '../db/auth';
import { requireAccess } from '../db/authz';
import { getClientIp } from '../lib/client-ip';
import {
  hashPassword,
  newSessionToken,
  newTemporaryPassword,
  dummyVerify,
  resolveIterations,
  verifyPassword,
} from '../lib/crypto';
import {
  ApiError,
  accountDisabled,
  accountNotResettable,
  conflict,
  forbidden,
  invalidCredentials,
  notFound,
  rateLimited,
  unauthorized,
  validationError,
} from '../lib/errors';
import { optionalDisplayName, readJsonObject, stringField } from '../lib/http';
import { assertPassword, normalizePhone } from '../lib/phone';
import { SESSION_TTL_MS, isoAfterMs, nowIso } from '../lib/time';
import { requireAuth } from '../middleware/auth';

export const authRoutes = new Hono<AppEnv>();

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

authRoutes.post('/auth/register', async (c) => {
  const db = c.env.DB;
  const ip = getClientIp(c.req.raw);
  const registerCheck = await checkThrottle(db, registerIpKey(ip), REGISTER_IP_POLICY);
  if (!registerCheck.allowed) throw rateLimited(registerCheck.retryAfterSeconds);

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

  const registrationCode = c.env.REGISTRATION_CODE;
  if (registrationCode !== undefined && registrationCode !== '') {
    if (body.registration_code !== registrationCode) {
      throw forbidden({ reason: 'registration_code_required' });
    }
  }

  await recordThrottleFailure(db, registerIpKey(ip), REGISTER_IP_POLICY);

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

authRoutes.post('/workspaces', requireAuth, async (c) => {
  const identity = c.get('identity');
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

  for (const [key, policy] of [
    [phoneKey, LOGIN_PHONE_POLICY] as const,
    [ipKey, LOGIN_IP_POLICY] as const,
  ]) {
    const check = await checkThrottle(db, key, policy);
    if (!check.allowed) throw rateLimited(check.retryAfterSeconds);
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
    await recordThrottleFailure(db, phoneKey, LOGIN_PHONE_POLICY);
    await recordThrottleFailure(db, ipKey, LOGIN_IP_POLICY);
    // Lần sai thứ 5 khoá SĐT 15 phút: trả 429 ngay từ lần chạm ngưỡng.
    const locked = await checkThrottle(db, phoneKey, LOGIN_PHONE_POLICY);
    if (!locked.allowed) throw rateLimited(locked.retryAfterSeconds);
    throw invalidCredentials();
  }

  await clearThrottle(db, phoneKey);

  if (user.status !== 'active') throw accountDisabled();

  const memberships = await listActiveMemberships(db, user.id);
  if (memberships.length === 0) throw accountDisabled();

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

  const verified = await verifyPassword(user.password_hash, currentPassword);
  if (!verified.ok) {
    await recordThrottleFailure(db, loginPhoneKey(user.phone), LOGIN_PHONE_POLICY);
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
  await clearThrottle(db, loginPhoneKey(user.phone));

  return c.json({ must_change_password: false });
});

authRoutes.get('/me', requireAuth, async (c) => {
  const identity = c.get('identity');
  const me = await getMe(c.env.DB, identity.userId, identity.membershipId);
  return c.json(me);
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

authRoutes.post('/students/:student_id/guardian-credentials', requireAuth, async (c) => {
  const db = c.env.DB;
  const identity = c.get('identity');
  const studentId = c.req.param('student_id');

  const student = await findStudentForAccess(db, identity.workspaceId, studentId);
  if (!student) throw notFound();

  requireAccess(identity, 'students', 'write', {
    classId: student.class_id,
    studentId: student.id,
  });

  if (student.parent_phone === null || student.parent_phone === '') {
    throw validationError({ parent_phone: 'required' });
  }

  const issueKey = issuePasswordKey(identity.membershipId);
  const issueCheck = await checkThrottle(db, issueKey, ISSUE_PASSWORD_POLICY);
  if (!issueCheck.allowed) throw rateLimited(issueCheck.retryAfterSeconds);
  await recordThrottleFailure(db, issueKey, ISSUE_PASSWORD_POLICY);

  const target = await findUserByPhone(db, student.parent_phone);
  if (target) {
    const disqualifying = await countDisqualifyingMemberships(
      db,
      target.id,
      identity.workspaceId,
    );
    if (disqualifying > 0) throw accountNotResettable();
  }

  const guardianRoleId = await getGuardianRoleId(db, identity.workspaceId);
  if (guardianRoleId === null) throw new ApiError(500, 'internal', 'Guardian role missing.');

  const linkedStudentIds = await listStudentIdsByParentPhone(
    db,
    identity.workspaceId,
    student.parent_phone,
  );
  const existingLinks = target
    ? await listGuardianLinks(db, target.id, identity.workspaceId)
    : [];
  const newLinkCount = linkedStudentIds.filter((id) => !existingLinks.includes(id)).length;

  const body = await readJsonObject(c.req.raw);
  const displayName = optionalDisplayName(body);

  const iterations = resolveIterations(c.env.PBKDF2_ITERATIONS);
  const temporaryPassword = newTemporaryPassword();
  const tempPasswordHash = await hashPassword(temporaryPassword, iterations);

  const result = await issueGuardianCredentials(db, {
    workspaceId: identity.workspaceId,
    studentId: student.id,
    parentPhone: student.parent_phone,
    existingUserId: target?.id ?? null,
    newUserId: crypto.randomUUID(),
    membershipId: crypto.randomUUID(),
    guardianRoleId,
    tempPasswordHash,
    displayName,
    now: nowIso(),
    linkedStudentIds,
    newLinkCount,
  });

  return c.json({
    phone: student.parent_phone,
    temporary_password: temporaryPassword,
    must_change_password: true,
    created_user: target === null,
    password_issued: true,
    linked_student_ids: linkedStudentIds,
    user_id: result.userId,
  });
});

/** Dùng trong test/handler khác khi cần số điện thoại của chính mình. */
export async function currentUserPhone(db: D1Database, userId: string): Promise<string | null> {
  return getUserPhone(db, userId);
}
