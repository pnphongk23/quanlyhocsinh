import { conflict, forbidden, notFound, ApiError } from '../lib/errors';
import { isoAfterMs, isoAt } from '../lib/time';
import { classTeacherNameSql } from './class-teacher';
import type { PermGroup, PermLevel, Permissions, ScopeKind } from '../types';

export const ROLE_SYSTEM_KEYS = ['admin', 'teacher', 'assistant', 'guardian'] as const;

export type RoleSeed = {
  systemKey: 'admin' | 'teacher' | 'assistant' | 'guardian';
  name: string;
  scopeKind: ScopeKind;
  isSystem: 0 | 1;
  permissions: Permissions;
};

const allWrite: Permissions = {
  classes: 'write',
  students: 'write',
  sessions_attendance: 'write',
  scores: 'write',
  lectures: 'write',
  comments_reports: 'write',
};

export const DEFAULT_ROLES: RoleSeed[] = [
  {
    systemKey: 'admin',
    name: 'Admin',
    scopeKind: 'workspace',
    isSystem: 1,
    permissions: { ...allWrite },
  },
  {
    systemKey: 'teacher',
    name: 'Giáo viên',
    scopeKind: 'assigned_classes',
    isSystem: 0,
    permissions: { ...allWrite },
  },
  {
    systemKey: 'assistant',
    name: 'Trợ giảng',
    scopeKind: 'assigned_classes',
    isSystem: 0,
    permissions: {
      classes: 'read',
      students: 'read',
      sessions_attendance: 'write',
      scores: 'read',
      lectures: 'read',
      comments_reports: 'read',
    },
  },
  {
    systemKey: 'guardian',
    name: 'Phụ huynh',
    scopeKind: 'linked_students',
    isSystem: 0,
    permissions: {
      classes: 'none',
      students: 'none',
      sessions_attendance: 'read',
      scores: 'read',
      lectures: 'none',
      comments_reports: 'read',
    },
  },
];

const PERM_GROUPS: PermGroup[] = [
  'classes',
  'students',
  'sessions_attendance',
  'scores',
  'lectures',
  'comments_reports',
];

export interface UserRow {
  id: string;
  phone: string;
  display_name: string | null;
  password_hash: string;
  must_change_password: number;
  password_changed_at: string | null;
  status: string;
  created_at: string;
  version: number;
}

export interface MembershipSummary {
  id: string;
  status: string;
  scope_epoch: number;
  workspace: { id: string; name: string };
  role: {
    id: string;
    name: string;
    system_key: string | null;
    scope_kind: ScopeKind;
  };
  students?: GuardianStudentSummary[];
}

export interface GuardianStudentSummary {
  id: string;
  name: string;
  class_id: string;
  class_name: string;
  teacher_name: string | null;
}

export interface UserView {
  id: string;
  phone: string;
  display_name: string | null;
  must_change_password: boolean;
}

export function toUserView(row: UserRow): UserView {
  return {
    id: row.id,
    phone: row.phone,
    display_name: row.display_name,
    must_change_password: row.must_change_password === 1,
  };
}

export async function findUserByPhone(
  db: D1Database,
  phone: string,
): Promise<UserRow | undefined> {
  const row = await db
    .prepare(
      `SELECT id, phone, display_name, password_hash, must_change_password,
              password_changed_at, status, created_at, version
         FROM users WHERE phone = ?`,
    )
    .bind(phone)
    .first<UserRow>();
  return row ?? undefined;
}

export async function getUserById(
  db: D1Database,
  userId: string,
): Promise<UserRow | undefined> {
  const row = await db
    .prepare(
      `SELECT id, phone, display_name, password_hash, must_change_password,
              password_changed_at, status, created_at, version
         FROM users WHERE id = ?`,
    )
    .bind(userId)
    .first<UserRow>();
  return row ?? undefined;
}

export async function getUserPhone(db: D1Database, userId: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT phone FROM users WHERE id = ?')
    .bind(userId)
    .first<{ phone: string }>();
  return row?.phone ?? null;
}

interface MembershipJoinRow {
  id: string;
  status: string;
  scope_epoch: number;
  workspace_id: string;
  workspace_name: string;
  role_id: string;
  role_name: string;
  system_key: string | null;
  scope_kind: ScopeKind;
}

function toMembershipSummary(row: MembershipJoinRow): MembershipSummary {
  return {
    id: row.id,
    status: row.status,
    scope_epoch: row.scope_epoch,
    workspace: { id: row.workspace_id, name: row.workspace_name },
    role: {
      id: row.role_id,
      name: row.role_name,
      system_key: row.system_key,
      scope_kind: row.scope_kind,
    },
  };
}

interface GuardianStudentRow extends GuardianStudentSummary {
  workspace_id: string;
}

function addGuardianStudents(memberships: MembershipSummary[], rows: GuardianStudentRow[]) {
  const studentsByWorkspace = new Map<string, GuardianStudentSummary[]>();
  for (const row of rows) {
    const students = studentsByWorkspace.get(row.workspace_id) ?? [];
      students.push({ id: row.id, name: row.name, class_id: row.class_id, class_name: row.class_name, teacher_name: row.teacher_name });
    studentsByWorkspace.set(row.workspace_id, students);
  }
  return memberships.map((membership) => membership.role.scope_kind === 'linked_students'
    ? { ...membership, students: studentsByWorkspace.get(membership.workspace.id) ?? [] }
    : membership);
}

function linkedStudentsStatement(db: D1Database, userId: string) {
    return db.prepare(`SELECT m.workspace_id, s.id, s.name, s.class_id, c.name AS class_name,
        ${classTeacherNameSql('c')} AS teacher_name
      FROM memberships m
      JOIN roles r ON r.id = m.role_id AND r.scope_kind = 'linked_students'
      JOIN guardian_student gs ON gs.user_id = m.user_id AND gs.workspace_id = m.workspace_id
      JOIN students s ON s.id = gs.student_id AND s.workspace_id = gs.workspace_id
      JOIN classes c ON c.id = s.class_id AND c.workspace_id = s.workspace_id
      WHERE m.user_id = ? AND m.status = 'active'
      ORDER BY m.workspace_id, c.name, s.name, s.id`).bind(userId);
}

export async function listActiveMemberships(
  db: D1Database,
  userId: string,
): Promise<MembershipSummary[]> {
  const [membershipResult, studentResult] = await db.batch([
    db.prepare(
      `SELECT m.id, m.status, m.scope_epoch, m.workspace_id, w.name AS workspace_name,
              r.id AS role_id, r.name AS role_name, r.system_key, r.scope_kind
         FROM memberships m
         JOIN workspaces w ON w.id = m.workspace_id
         JOIN roles r ON r.id = m.role_id
        WHERE m.user_id = ? AND m.status = 'active'
        ORDER BY m.created_at`,
    ).bind(userId),
    linkedStudentsStatement(db, userId),
  ]);
  const memberships = (membershipResult?.results ?? []).map((row) => toMembershipSummary(row as MembershipJoinRow));
  return addGuardianStudents(memberships, (studentResult?.results ?? []) as GuardianStudentRow[]);
}

export interface MeMembership extends MembershipSummary {
  permissions: Permissions;
}

export interface MeResponse {
  user: UserView;
  active_membership_id: string | null;
  memberships: MeMembership[];
}

export async function getMe(
  db: D1Database,
  userId: string,
  activeMembershipId: string | null,
): Promise<MeResponse> {
  const [user, memberships, linkedStudents] = await db.batch([
    db
      .prepare(
        `SELECT id, phone, display_name, password_hash, must_change_password,
                password_changed_at, status, created_at, version
           FROM users WHERE id = ?`,
      )
      .bind(userId),
    db
      .prepare(
        `SELECT m.id, m.status, m.scope_epoch, m.workspace_id, w.name AS workspace_name,
                r.id AS role_id, r.name AS role_name, r.system_key, r.scope_kind
           FROM memberships m
           JOIN workspaces w ON w.id = m.workspace_id
           JOIN roles r ON r.id = m.role_id
          WHERE m.user_id = ? AND m.status = 'active'
          ORDER BY m.created_at`,
      )
      .bind(userId),
    linkedStudentsStatement(db, userId),
  ]);

  const userRow = (user?.results?.[0] as UserRow | undefined) ?? null;
  if (!userRow) throw notFound();

  const membershipRows = (memberships?.results ?? []) as MembershipJoinRow[];
  const membershipSummaries = addGuardianStudents(membershipRows.map(toMembershipSummary),
    (linkedStudents?.results ?? []) as GuardianStudentRow[]);
  const roleIds = [...new Set(membershipRows.map((row) => row.role_id))];

  const permissionsByRole = new Map<string, Permissions>();
  if (roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',');
    const { results: permRows } = await db
      .prepare(
        `SELECT role_id, perm_group, level FROM role_permissions
          WHERE role_id IN (${placeholders})`,
      )
      .bind(...roleIds)
      .all<{ role_id: string; perm_group: PermGroup; level: PermLevel }>();
    for (const roleId of roleIds) {
      const permissions = Object.fromEntries(
        PERM_GROUPS.map((group) => [group, 'none']),
      ) as Permissions;
      for (const row of permRows) {
        if (row.role_id === roleId) permissions[row.perm_group] = row.level;
      }
      permissionsByRole.set(roleId, permissions);
    }
  }

  return {
    user: toUserView(userRow),
    active_membership_id: activeMembershipId,
    memberships: membershipSummaries.map((membership, index) => ({
      ...membership,
      permissions:
        permissionsByRole.get(membershipRows[index]!.role_id) ??
        (Object.fromEntries(PERM_GROUPS.map((group) => [group, 'none'])) as Permissions),
    })),
  };
}

export interface CreateSessionInput {
  id: string;
  userId: string;
  membershipId: string | null;
  tokenHash: string;
  deviceLabel: string | null;
  createdAt: string;
  expiresAt: string;
}

function sessionInsertStatement(db: D1Database, input: CreateSessionInput): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO auth_sessions
        (id, user_id, membership_id, token_hash, device_label, created_at, last_seen_at, expires_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      input.id,
      input.userId,
      input.membershipId,
      input.tokenHash,
      input.deviceLabel,
      input.createdAt,
      input.createdAt,
      input.expiresAt,
    );
}

export async function createSession(
  db: D1Database,
  input: CreateSessionInput,
): Promise<void> {
  await sessionInsertStatement(db, input).run();
}

interface RegisterWorkspaceInput {
  workspaceId: string;
  userId: string;
  membershipId: string;
  sessionId: string;
  phone: string;
  displayName: string | null;
  passwordHash: string;
  workspaceName: string;
  tokenHash: string;
  deviceLabel: string | null;
  now: string;
  expiresAt: string;
  roleIds: Record<string, string>;
}

function workspaceStatements(
  db: D1Database,
  workspaceId: string,
  workspaceName: string,
  now: string,
  roleIds: Record<string, string>,
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO workspaces (id, name, timezone, change_floor, created_at, version)
         VALUES (?, ?, 'Asia/Ho_Chi_Minh', 0, ?, 1)`,
      )
      .bind(workspaceId, workspaceName, now),
  ];

  for (const role of DEFAULT_ROLES) {
    const roleId = roleIds[role.systemKey];
    statements.push(
      db
        .prepare(
          `INSERT INTO roles
            (id, workspace_id, name, scope_kind, is_system, system_key, created_at, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        )
        .bind(
          roleId,
          workspaceId,
          role.name,
          role.scopeKind,
          role.isSystem,
          role.systemKey,
          now,
        ),
    );
    for (const group of PERM_GROUPS) {
      statements.push(
        db
          .prepare('INSERT INTO role_permissions (role_id, perm_group, level) VALUES (?, ?, ?)')
          .bind(roleId, group, role.permissions[group]),
      );
    }
  }

  return statements;
}

export function newRoleIdMap(): Record<string, string> {
  return Object.fromEntries(ROLE_SYSTEM_KEYS.map((key) => [key, crypto.randomUUID()]));
}

function isUniquePhoneError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('UNIQUE constraint failed: users.phone');
}

export async function registerWorkspace(
  db: D1Database,
  input: RegisterWorkspaceInput,
): Promise<void> {
  const statements = workspaceStatements(
    db,
    input.workspaceId,
    input.workspaceName,
    input.now,
    input.roleIds,
  );

  statements.push(
    db
      .prepare(
        `INSERT INTO users
          (id, phone, display_name, password_hash, must_change_password,
           password_changed_at, status, created_at, version)
         VALUES (?, ?, ?, ?, 0, ?, 'active', ?, 1)`,
      )
      .bind(
        input.userId,
        input.phone,
        input.displayName,
        input.passwordHash,
        input.now,
        input.now,
      ),
    db
      .prepare(
        `INSERT INTO memberships
          (id, workspace_id, user_id, role_id, status, scope_epoch, created_at, version)
         VALUES (?, ?, ?, ?, 'active', 1, ?, 1)`,
      )
      .bind(
        input.membershipId,
        input.workspaceId,
        input.userId,
        input.roleIds.admin,
        input.now,
      ),
    sessionInsertStatement(db, {
      id: input.sessionId,
      userId: input.userId,
      membershipId: input.membershipId,
      tokenHash: input.tokenHash,
      deviceLabel: input.deviceLabel,
      createdAt: input.now,
      expiresAt: input.expiresAt,
    }),
  );

  try {
    await db.batch(statements);
  } catch (error) {
    if (isUniquePhoneError(error)) throw conflict('phone_registered');
    throw error;
  }
}

export interface RegisterGuardianInput {
  userId: string;
  sessionId: string;
  phone: string;
  displayName: string | null;
  passwordHash: string;
  tokenHash: string;
  now: string;
  expiresAt: string;
}

/** Tạo tài khoản phụ huynh và liên kết mọi hồ sơ đã khai số điện thoại này. */
export async function registerGuardian(
  db: D1Database,
  input: RegisterGuardianInput,
): Promise<void> {
  const { results: workspaces } = await db
    .prepare(
      `SELECT DISTINCT r.workspace_id, r.id AS role_id
         FROM students s
         JOIN roles r ON r.workspace_id = s.workspace_id AND r.system_key = 'guardian'
        WHERE s.parent_phone = ?
        ORDER BY r.workspace_id`,
    )
    .bind(input.phone)
    .all<{ workspace_id: string; role_id: string }>();
  const membershipIds = new Map(workspaces.map((row) => [row.workspace_id, crypto.randomUUID()]));
  const activeMembershipId = workspaces.length === 1 ? membershipIds.get(workspaces[0]!.workspace_id)! : null;

  const statements: D1PreparedStatement[] = [
    db.prepare(`INSERT INTO users
        (id, phone, display_name, password_hash, must_change_password,
         password_changed_at, status, created_at, version)
       VALUES (?, ?, ?, ?, 0, ?, 'active', ?, 1)`)
      .bind(input.userId, input.phone, input.displayName, input.passwordHash, input.now, input.now),
  ];
  for (const row of workspaces) {
    statements.push(
      db.prepare(`INSERT INTO guardian_student (workspace_id, user_id, student_id, created_at)
        SELECT ?, ?, id, ? FROM students WHERE workspace_id = ? AND parent_phone = ?`)
        .bind(row.workspace_id, input.userId, input.now, row.workspace_id, input.phone),
    );
  }
  for (const row of workspaces) {
    statements.push(
      db.prepare(`INSERT INTO memberships
          (id, workspace_id, user_id, role_id, status, scope_epoch, created_at, version)
         VALUES (?, ?, ?, ?, 'active', 1, ?, 1)`)
        .bind(membershipIds.get(row.workspace_id)!, row.workspace_id, input.userId, row.role_id, input.now),
    );
  }
  statements.push(sessionInsertStatement(db, {
    id: input.sessionId,
    userId: input.userId,
    membershipId: activeMembershipId,
    tokenHash: input.tokenHash,
    deviceLabel: null,
    createdAt: input.now,
    expiresAt: input.expiresAt,
  }));

  try {
    await db.batch(statements);
  } catch (error) {
    if (isUniquePhoneError(error)) throw conflict('phone_registered');
    throw error;
  }
}

export interface AddWorkspaceInput {
  workspaceId: string;
  membershipId: string;
  userId: string;
  workspaceName: string;
  now: string;
  roleIds: Record<string, string>;
}

export async function addWorkspace(
  db: D1Database,
  input: AddWorkspaceInput,
): Promise<void> {
  const statements = workspaceStatements(
    db,
    input.workspaceId,
    input.workspaceName,
    input.now,
    input.roleIds,
  );
  statements.push(
    db
      .prepare(
        `INSERT INTO memberships
          (id, workspace_id, user_id, role_id, status, scope_epoch, created_at, version)
         VALUES (?, ?, ?, ?, 'active', 1, ?, 1)`,
      )
      .bind(
        input.membershipId,
        input.workspaceId,
        input.userId,
        input.roleIds.admin,
        input.now,
      ),
  );
  await db.batch(statements);
}

export async function revokeSession(db: D1Database, sessionId: string): Promise<void> {
  await db
    .prepare('UPDATE auth_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
    .bind(new Date().toISOString(), sessionId)
    .run();
}

/** Đăng xuất: thu hồi phiên + gỡ device token của đúng phiên (cascade deliveries). */
export async function logoutSession(db: D1Database, sessionId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare('UPDATE auth_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
      .bind(now, sessionId),
    db.prepare('DELETE FROM device_tokens WHERE auth_session_id = ?').bind(sessionId),
  ]);
}

export async function updateSessionMembership(
  db: D1Database,
  sessionId: string,
  userId: string,
  membershipId: string,
): Promise<void> {
  await db.batch([
    db
      .prepare('UPDATE auth_sessions SET membership_id = ? WHERE id = ? AND user_id = ?')
      .bind(membershipId, sessionId, userId),
    db.prepare('DELETE FROM device_tokens WHERE auth_session_id = ?').bind(sessionId),
  ]);
}

export async function findActiveMembership(
  db: D1Database,
  userId: string,
  membershipId: string,
): Promise<{ id: string } | undefined> {
  const row = await db
    .prepare(
      `SELECT id FROM memberships
        WHERE id = ? AND user_id = ? AND status = 'active'`,
    )
    .bind(membershipId, userId)
    .first<{ id: string }>();
  return row ?? undefined;
}

export interface ChangePasswordInput {
  userId: string;
  passwordHash: string;
  now: string;
  keepSessionId: string;
}

export async function changePassword(
  db: D1Database,
  input: ChangePasswordInput,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE users
            SET password_hash = ?, must_change_password = 0, password_changed_at = ?,
                version = version + 1
          WHERE id = ?`,
      )
      .bind(input.passwordHash, input.now, input.userId),
    db
      .prepare(
        `UPDATE auth_sessions SET revoked_at = ?
          WHERE user_id = ? AND id <> ? AND revoked_at IS NULL`,
      )
      .bind(input.now, input.userId, input.keepSessionId),
    // api-spec 7: thu hồi phiên thì xoá token gắn với phiên đó, trong cùng batch.
    db
      .prepare(
        `DELETE FROM device_tokens
          WHERE auth_session_id IN (
            SELECT id FROM auth_sessions
             WHERE user_id = ? AND id <> ? AND revoked_at IS NOT NULL
          )`,
      )
      .bind(input.userId, input.keepSessionId),
  ]);
}

/** Ghi đè hash khi đăng nhập thành công với số vòng khác cấu hình hiện tại. */
export async function rehashPassword(
  db: D1Database,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(passwordHash, userId)
    .run();
}

export async function updateDisplayNameIfEmpty(
  db: D1Database,
  userId: string,
  displayName: string | null,
): Promise<void> {
  if (displayName === null) return;
  await db
    .prepare('UPDATE users SET display_name = ? WHERE id = ? AND display_name IS NULL')
    .bind(displayName, userId)
    .run();
}

// --- Giới hạn tốc độ (auth_throttle, api-spec mục 3) -------------------------

export interface ThrottlePolicy {
  limit: number;
  windowMs: number;
  lockMs?: number;
}

export const LOGIN_PHONE_POLICY: ThrottlePolicy = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
};
export const LOGIN_IP_POLICY: ThrottlePolicy = {
  limit: 20,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
};
export const REGISTER_IP_POLICY: ThrottlePolicy = { limit: 5, windowMs: 60 * 60 * 1000 };

interface ThrottleRow {
  key: string;
  fails: number;
  window_start: string;
  locked_until: string | null;
}

async function readThrottle(db: D1Database, key: string): Promise<ThrottleRow | undefined> {
  const row = await db
    .prepare('SELECT key, fails, window_start, locked_until FROM auth_throttle WHERE key = ?')
    .bind(key)
    .first<ThrottleRow>();
  return row ?? undefined;
}

export type ThrottleCheck =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** Kiểm khoá/cửa sổ hiện tại. Chỉ đọc, không ghi. */
export async function checkThrottle(
  db: D1Database,
  key: string,
  policy: ThrottlePolicy,
  nowMs: number = Date.now(),
): Promise<ThrottleCheck> {
  const row = await readThrottle(db, key);
  if (!row) return { allowed: true };

  if (row.locked_until !== null) {
    const lockedUntil = Date.parse(row.locked_until);
    if (lockedUntil > nowMs) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil - nowMs) / 1000)),
      };
    }
  }

  const windowStart = Date.parse(row.window_start);
  if (!Number.isFinite(windowStart) || windowStart + policy.windowMs <= nowMs) {
    return { allowed: true };
  }

  if (row.fails >= policy.limit) {
    const until = policy.lockMs
      ? nowMs + Math.max(policy.lockMs, 1)
      : windowStart + policy.windowMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((until - nowMs) / 1000)),
    };
  }
  return { allowed: true };
}

export async function recordThrottleFailure(
  db: D1Database,
  key: string,
  policy: ThrottlePolicy,
  nowMs: number = Date.now(),
): Promise<void> {
  const row = await readThrottle(db, key);
  let fails = 1;
  let windowStart = isoAt(nowMs);

  if (row) {
    const previousStart = Date.parse(row.window_start);
    if (Number.isFinite(previousStart) && previousStart + policy.windowMs > nowMs) {
      fails = row.fails + 1;
      windowStart = row.window_start;
    }
  }

  const lockedUntil =
    policy.lockMs !== undefined && fails >= policy.limit
      ? isoAfterMs(policy.lockMs, nowMs)
      : null;

  await db
    .prepare(
      `INSERT INTO auth_throttle (key, fails, window_start, locked_until)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         fails = excluded.fails,
         window_start = excluded.window_start,
         locked_until = excluded.locked_until`,
    )
    .bind(key, fails, windowStart, lockedUntil)
    .run();
}

/** Atomically consumes one request from a fixed throttle window. */
export async function consumeThrottle(
  db: D1Database,
  key: string,
  policy: ThrottlePolicy,
  nowMs: number = Date.now(),
  lockMs?: number,
): Promise<ThrottleCheck> {
  const now = isoAt(nowMs);
  const windowCutoff = isoAt(nowMs - policy.windowMs);
  const lockedUntil = lockMs === undefined ? null : isoAfterMs(lockMs, nowMs);
  const row = await db
    .prepare(
      `INSERT INTO auth_throttle (key, fails, window_start, locked_until)
       VALUES (?, 1, ?, CASE WHEN ? = 1 THEN ? ELSE NULL END)
       ON CONFLICT(key) DO UPDATE SET
         fails = CASE
           WHEN auth_throttle.locked_until > ? THEN auth_throttle.fails
           WHEN auth_throttle.window_start <= ? THEN 1
           ELSE auth_throttle.fails + 1
         END,
         window_start = CASE
           WHEN auth_throttle.locked_until > ? THEN auth_throttle.window_start
           WHEN auth_throttle.window_start <= ? THEN excluded.window_start
           ELSE auth_throttle.window_start
         END,
         locked_until = CASE
           WHEN auth_throttle.locked_until > ? THEN auth_throttle.locked_until
           WHEN auth_throttle.window_start <= ? AND ? IS NOT NULL AND ? >= ? THEN ?
           WHEN auth_throttle.window_start > ? AND auth_throttle.fails + 1 >= ? AND ? IS NOT NULL THEN ?
           ELSE NULL
         END
       RETURNING fails, window_start, locked_until`,
    )
    .bind(
      key, now, policy.limit, lockedUntil,
      now, windowCutoff, now, windowCutoff, now, windowCutoff, lockMs ?? null,
      1, policy.limit, lockedUntil, windowCutoff, policy.limit, lockMs ?? null, lockedUntil,
    )
    .first<{ fails: number; window_start: string; locked_until: string | null }>();

  if (!row) throw new Error('Throttle update did not return a row.');
  if (row.locked_until !== null) {
    const until = Date.parse(row.locked_until);
    if (until > nowMs || row.fails >= policy.limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((until - nowMs) / 1000)) };
    }
  }
  if (row.fails <= policy.limit) return { allowed: true };

  const retryAt = Date.parse(row.window_start) + policy.windowMs;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((retryAt - nowMs) / 1000)),
  };
}

/** Atomically returns a reserved attempt, used when a paired throttle key rejects it. */
export async function refundThrottle(
  db: D1Database,
  key: string,
): Promise<void> {
  await db
    .prepare('UPDATE auth_throttle SET fails = MAX(fails - 1, 0) WHERE key = ?')
    .bind(key)
    .run();
}

export async function clearThrottle(db: D1Database, key: string): Promise<void> {
  await db.prepare('DELETE FROM auth_throttle WHERE key = ?').bind(key).run();
}

export function loginPhoneKey(phone: string): string {
  return `login:p:${phone}`;
}

export function loginIpKey(ip: string): string {
  return `login:ip:${ip}`;
}

export function registerIpKey(ip: string): string {
  return `register:ip:${ip}`;
}

export function workspaceCreateKey(userId: string): string {
  return `workspace:user:${userId}`;
}

export function assertNotGuardianRole(scopeKind: ScopeKind | undefined): void {
  if (scopeKind === 'linked_students') throw forbidden();
}
