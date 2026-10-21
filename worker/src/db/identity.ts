import type { Identity, PermGroup, PermLevel, Permissions, ScopeKind } from '../types';
import { nowIso } from '../lib/time';

export interface SessionRow {
  session_id: string;
  user_id: string;
  membership_id: string | null;
  token_hash: string;
  expires_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  user_status: string;
  must_change_password: number;
}

export type AuthFailure = 'unauthorized' | 'account_disabled' | 'membership_required';

export type AuthResult =
  | { ok: true; identity: Identity; session: SessionRow }
  | { ok: false; reason: AuthFailure };

const PERM_GROUPS: PermGroup[] = [
  'classes',
  'students',
  'sessions_attendance',
  'scores',
  'lectures',
  'comments_reports',
];

export async function findSessionByTokenHash(
  db: D1Database,
  tokenHash: string,
): Promise<SessionRow | undefined> {
  const row = await db
    .prepare(
      `SELECT s.id AS session_id, s.user_id, s.membership_id, s.token_hash,
              s.expires_at, s.last_seen_at, s.revoked_at,
              u.status AS user_status, u.must_change_password
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`,
    )
    .bind(tokenHash)
    .first<SessionRow>();
  return row ?? undefined;
}

interface MembershipRow {
  id: string;
  workspace_id: string;
  workspace_name: string;
  membership_status: string;
  scope_epoch: number;
  role_id: string;
  role_name: string;
  system_key: string | null;
  scope_kind: ScopeKind;
  user_id: string;
}

async function loadMembership(
  db: D1Database,
  userId: string,
  membershipId: string,
): Promise<MembershipRow | undefined> {
  const row = await db
    .prepare(
      `SELECT m.id, m.workspace_id, w.name AS workspace_name, m.status AS membership_status,
              m.scope_epoch, r.id AS role_id, r.name AS role_name, r.system_key,
              r.scope_kind, m.user_id
         FROM memberships m
         JOIN workspaces w ON w.id = m.workspace_id
         JOIN roles r ON r.id = m.role_id
        WHERE m.id = ? AND m.user_id = ?`,
    )
    .bind(membershipId, userId)
    .first<MembershipRow>();
  return row ?? undefined;
}

interface PermissionRow {
  perm_group: PermGroup;
  level: PermLevel;
}

interface ClassRow {
  class_id: string;
}

interface LinkRow {
  student_id: string;
}

/** Xác thực token Bearer: phiên + user + membership + quyền + phạm vi (một lượt đọc). */
export async function authenticate(
  db: D1Database,
  tokenHash: string,
): Promise<AuthResult> {
  const session = await findSessionByTokenHash(db, tokenHash);
  if (!session) return { ok: false, reason: 'unauthorized' };
  if (session.revoked_at !== null) return { ok: false, reason: 'unauthorized' };
  if (Date.parse(session.expires_at) <= Date.now()) return { ok: false, reason: 'unauthorized' };
  if (session.user_status !== 'active') return { ok: false, reason: 'account_disabled' };

  if (session.membership_id === null) return { ok: false, reason: 'membership_required' };
  const membership = await loadMembership(db, session.user_id, session.membership_id);
  if (!membership || membership.membership_status !== 'active') {
    return { ok: false, reason: 'account_disabled' };
  }

  const statements = [
    db.prepare('SELECT perm_group, level FROM role_permissions WHERE role_id = ?').bind(
      membership.role_id,
    ),
  ];

  const isGuardian = membership.scope_kind === 'linked_students';
  if (isGuardian) {
    statements.push(
      db
        .prepare(
          `SELECT DISTINCT s.class_id
             FROM guardian_student gs
             JOIN students s ON s.id = gs.student_id
            WHERE gs.user_id = ? AND s.workspace_id = ?`,
        )
        .bind(membership.user_id, membership.workspace_id) as D1PreparedStatement,
      db
        .prepare(
          'SELECT student_id FROM guardian_student WHERE user_id = ? AND workspace_id = ?',
        )
        .bind(membership.user_id, membership.workspace_id) as D1PreparedStatement,
    );
  } else {
    statements.push(
      db
        .prepare('SELECT class_id FROM member_classes WHERE membership_id = ?')
        .bind(membership.id) as D1PreparedStatement,
      db.prepare('SELECT student_id FROM guardian_student WHERE 0') as D1PreparedStatement,
    );
  }

  const results = await db.batch(statements);

  const permissions = Object.fromEntries(
    PERM_GROUPS.map((group) => [group, 'none']),
  ) as Permissions;
  for (const row of (results[0]?.results ?? []) as PermissionRow[]) {
    if (PERM_GROUPS.includes(row.perm_group)) permissions[row.perm_group] = row.level;
  }
  const classIds = ((results[1]?.results ?? []) as ClassRow[]).map((row) => row.class_id);
  const linkedStudentIds = ((results[2]?.results ?? []) as LinkRow[]).map(
    (row) => row.student_id,
  );

  return {
    ok: true,
    session,
    identity: {
      userId: session.user_id,
      sessionId: session.session_id,
      membershipId: membership.id,
      workspaceId: membership.workspace_id,
      workspaceName: membership.workspace_name,
      roleId: membership.role_id,
      roleName: membership.role_name,
      roleSystemKey: membership.system_key,
      scopeKind: membership.scope_kind,
      scopeEpoch: membership.scope_epoch,
      permissions,
      classIds,
      linkedStudentIds,
      mustChangePassword: session.must_change_password === 1,
    },
  };
}

/** Gia hạn trượt (180 ngày, khi còn dưới 150 ngày) và cập nhật last_seen tối đa mỗi giờ. */
export async function touchSession(
  db: D1Database,
  session: SessionRow,
  expiresAt: string | null,
): Promise<void> {
  if (expiresAt !== null) {
    await db
      .prepare('UPDATE auth_sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?')
      .bind(nowIso(), expiresAt, session.session_id)
      .run();
    return;
  }
  await db
    .prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?')
    .bind(nowIso(), session.session_id)
    .run();
}
