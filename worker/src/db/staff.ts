import { conflict, forbidden, notFound, validationError, ApiError } from '../lib/errors';
import { normalizePhone } from '../lib/phone';
import { nowIso } from '../lib/time';
import type { Identity, PermGroup, PermLevel } from '../types';
import { mapTriggerError } from './authz';

const EDITABLE_GROUPS: PermGroup[] = [
  'classes', 'students', 'sessions_attendance', 'scores', 'comments_reports',
];
const STAFF_ROLES = ['teacher', 'assistant'] as const;
type StaffRole = (typeof STAFF_ROLES)[number];
type StaffRow = {
  id: string; kind: 'member' | 'pending'; user_id: string | null; display_name: string | null;
  phone: string; role_id: string; role_name: string; system_key: string;
  status: 'active' | 'disabled' | 'pending'; created_at: string; version: number;
};

function requireAdmin(identity: Identity): void {
  if (identity.roleSystemKey !== 'admin') throw forbidden({ reason: 'admin_required' });
}

function parseRole(value: unknown): StaffRole {
  if (value !== 'teacher' && value !== 'assistant') throw validationError({ role: 'invalid_role' });
  return value;
}

function parseClassIds(value: unknown, required: boolean): string[] | undefined {
  if (value === undefined && !required) return undefined;
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !id.trim())) {
    throw validationError({ class_ids: 'invalid' });
  }
  return [...new Set((value as string[]).map((id) => id.trim()))].sort();
}

async function validateClasses(db: D1Database, workspaceId: string, classIds: string[]): Promise<void> {
  if (!classIds.length) return;
  const rows = await db.prepare(`SELECT id FROM classes WHERE workspace_id = ? AND id IN (${classIds.map(() => '?').join(',')})`)
    .bind(workspaceId, ...classIds).all<{ id: string }>();
  if (rows.results.length !== classIds.length) throw validationError({ class_ids: 'unknown_class' });
}

async function roleId(db: D1Database, workspaceId: string, key: StaffRole): Promise<string> {
  const role = await db.prepare('SELECT id FROM roles WHERE workspace_id = ? AND system_key = ?')
    .bind(workspaceId, key).first<{ id: string }>();
  if (!role) throw notFound();
  return role.id;
}

function statementsForClasses(db: D1Database, workspaceId: string, membershipId: string,
  classIds: string[], createdAt: string): D1PreparedStatement[] {
  return [db.prepare('DELETE FROM member_classes WHERE membership_id = ?').bind(membershipId),
    ...classIds.map((classId) => db.prepare(`INSERT INTO member_classes(workspace_id,membership_id,class_id,created_at)
      VALUES(?,?,?,?)`).bind(workspaceId, membershipId, classId, createdAt))];
}

async function classesById(db: D1Database, id: string, pending: boolean): Promise<string[]> {
  const rows = pending
    ? await db.prepare('SELECT class_id FROM staff_declaration_classes WHERE declaration_id = ? ORDER BY class_id').bind(id).all<{ class_id: string }>()
    : await db.prepare('SELECT class_id FROM member_classes WHERE membership_id = ? ORDER BY class_id').bind(id).all<{ class_id: string }>();
  return rows.results.map((row) => row.class_id);
}

function memberView(row: StaffRow, classIds: string[], selfId: string) {
  return {
    id: row.id, kind: row.kind, user_id: row.user_id, display_name: row.display_name, phone: row.phone,
    role: { id: row.role_id, name: row.role_name, system_key: row.system_key },
    class_ids: row.system_key === 'admin' ? [] : classIds,
    status: row.status, is_self: row.user_id === selfId, created_at: row.created_at, version: row.version,
  };
}

async function findStaff(db: D1Database, workspaceId: string, id: string): Promise<StaffRow | undefined> {
  const pending = await db.prepare(`SELECT d.id,'pending' AS kind,NULL AS user_id,d.display_name,d.phone,
      r.id AS role_id,r.name AS role_name,r.system_key,'pending' AS status,d.created_at,d.version
    FROM staff_declarations d JOIN roles r ON r.id=d.role_id
    WHERE d.workspace_id=? AND d.id=?`).bind(workspaceId, id).first<StaffRow>();
  if (pending) return pending;
  return (await db.prepare(`SELECT m.id,'member' AS kind,m.user_id,
        u.display_name,u.phone,r.id AS role_id,r.name AS role_name,
      r.system_key,m.status,m.created_at,m.version
    FROM memberships m JOIN users u ON u.id=m.user_id JOIN roles r ON r.id=m.role_id
    WHERE m.workspace_id=? AND m.id=? AND r.system_key IN ('admin','teacher','assistant')`)
    .bind(workspaceId, id).first<StaffRow>()) ?? undefined;
}

export async function listStaff(db: D1Database, identity: Identity) {
  requireAdmin(identity);
  const rows = await db.prepare(`SELECT m.id,'member' AS kind,m.user_id,
        u.display_name,u.phone,r.id AS role_id,r.name AS role_name,
      r.system_key,m.status,m.created_at,m.version
    FROM memberships m JOIN users u ON u.id=m.user_id JOIN roles r ON r.id=m.role_id
    WHERE m.workspace_id=? AND r.system_key IN ('admin','teacher','assistant')
    UNION ALL
    SELECT d.id,'pending' AS kind,NULL AS user_id,d.display_name,d.phone,r.id AS role_id,r.name AS role_name,
      r.system_key,'pending' AS status,d.created_at,d.version
    FROM staff_declarations d JOIN roles r ON r.id=d.role_id WHERE d.workspace_id=?`)
    .bind(identity.workspaceId, identity.workspaceId).all<StaffRow>();
  const statusOrder = { active: 0, pending: 1, disabled: 2 };
  const sorted = rows.results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] ||
    (a.display_name ?? '').localeCompare(b.display_name ?? '') || a.id.localeCompare(b.id));
  return Promise.all(sorted.map(async (row) => memberView(row, await classesById(db, row.id, row.kind === 'pending'), identity.userId)));
}

export async function createStaff(db: D1Database, identity: Identity, input: Record<string, unknown>) {
  requireAdmin(identity);
  const phone = normalizePhone(input.phone);
  if (phone === null) throw validationError({ phone: 'invalid_phone' });
  const displayName = typeof input.display_name === 'string' ? input.display_name.trim() : '';
  if (typeof input.display_name !== 'string') throw validationError({ display_name: 'must_be_string' });
  if (displayName.length < 1) throw validationError({ display_name: 'required' });
  if (displayName.length > 100) throw validationError({ display_name: 'must_be_at_most_100' });
  const role = parseRole(input.role);
  const classIds = parseClassIds(input.class_ids, true)!;
  await validateClasses(db, identity.workspaceId, classIds);
  const exists = await db.prepare(`SELECT m.id,m.status FROM memberships m JOIN users u ON u.id=m.user_id
      JOIN roles r ON r.id=m.role_id WHERE m.workspace_id=? AND u.phone=?
        AND r.system_key IN ('admin','teacher','assistant')
    UNION ALL SELECT id,'pending' FROM staff_declarations WHERE workspace_id=? AND phone=? LIMIT 1`)
    .bind(identity.workspaceId, phone, identity.workspaceId, phone).first<{ id: string; status: string }>();
  if (exists) {
    if (exists.status === 'disabled') {
      throw new ApiError(409, 'conflict', 'Conflict.', { reason: 'staff_exists', status: 'disabled', id: exists.id });
    }
    throw conflict('staff_exists');
  }
  const roleIdValue = await roleId(db, identity.workspaceId, role);
  const user = await db.prepare('SELECT id FROM users WHERE phone=?').bind(phone).first<{ id: string }>();
  const id = crypto.randomUUID();
  const now = nowIso();
  try {
    if (user) {
      const statements: D1PreparedStatement[] = [db.prepare(`INSERT INTO memberships
        (id,workspace_id,user_id,role_id,status,scope_epoch,created_at,version)
        SELECT ?,?,?,?,'active',1,?,1 WHERE NOT EXISTS (
          SELECT 1 FROM memberships m JOIN roles r ON r.id=m.role_id
           WHERE m.workspace_id=? AND m.user_id=? AND r.system_key IN ('admin','teacher','assistant'))`)
        .bind(id, identity.workspaceId, user.id, roleIdValue, now, identity.workspaceId, user.id),
        ...classIds.map((classId) => db.prepare(`INSERT INTO member_classes(workspace_id,membership_id,class_id,created_at)
          SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM memberships WHERE id=?)`)
          .bind(identity.workspaceId, id, classId, now, id))];
      const results = await db.batch(statements);
      if (results[0]!.meta.changes === 0) throw conflict('staff_exists');
    } else {
      const statements: D1PreparedStatement[] = [db.prepare(`INSERT INTO staff_declarations
        (id,workspace_id,phone,display_name,role_id,created_by,created_at,version)
        VALUES(?,?,?,?,?,?,?,1)`).bind(id, identity.workspaceId, phone, displayName, roleIdValue, identity.userId, now)];
      for (const classId of classIds) statements.push(db.prepare(`INSERT INTO staff_declaration_classes
        (workspace_id,declaration_id,class_id) VALUES(?,?,?)`).bind(identity.workspaceId, id, classId));
      await db.batch(statements);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed: staff_declarations.workspace_id, staff_declarations.phone') ||
      message.includes('memberships.user_id, memberships.workspace_id, memberships.role_id') ||
      message.includes('staff_exists')) throw conflict('staff_exists');
    throw error;
  }
  const row = await findStaff(db, identity.workspaceId, id);
  if (!row) throw notFound();
  return memberView(row, classIds, identity.userId);
}

export async function updateStaff(db: D1Database, identity: Identity, id: string, input: Record<string, unknown>) {
  requireAdmin(identity);
  const row = await findStaff(db, identity.workspaceId, id);
  if (!row) throw notFound();
  if (input.base_version !== undefined) {
    const baseVersion = input.base_version;
    if (typeof baseVersion !== 'number' || !Number.isInteger(baseVersion) || baseVersion < 1) {
      throw validationError({ base_version: 'invalid' });
    }
    if (baseVersion !== row.version) {
      throw new ApiError(409, 'conflict', 'Conflict.', { reason: 'version_conflict', current: { id, version: row.version } });
    }
  }
  const pending = row.kind === 'pending';
  const currentClassIds = await classesById(db, id, pending);
  if (pending && input.status !== undefined && input.status !== 'pending') throw validationError({ status: 'invalid_for_pending' });
  if (!pending && input.display_name !== undefined) throw validationError({ display_name: 'owned_by_user' });
  const requestedClassIds = parseClassIds(input.class_ids, false);
  if (requestedClassIds && row.system_key === 'admin') throw validationError({ class_ids: 'not_applicable' });
  const nextRole = input.role === undefined ? row.system_key as StaffRole : parseRole(input.role);
  const nextRoleId = input.role === undefined ? row.role_id : await roleId(db, identity.workspaceId, nextRole);
  const nextStatus = input.status === undefined ? row.status : input.status;
  if (!pending && nextStatus !== 'active' && nextStatus !== 'disabled') throw validationError({ status: 'invalid' });
  const nextName = input.display_name === undefined ? row.display_name ?? '' :
    (typeof input.display_name === 'string' ? input.display_name.trim() : '');
  if (pending && input.display_name !== undefined && typeof input.display_name !== 'string') {
    throw validationError({ display_name: 'must_be_string' });
  }
  if (pending && input.display_name !== undefined && nextName.length < 1) throw validationError({ display_name: 'required' });
  if (pending && nextName.length > 100) throw validationError({ display_name: 'must_be_at_most_100' });
  const classesChanged = requestedClassIds !== undefined &&
    (requestedClassIds.length !== currentClassIds.length || requestedClassIds.some((classId, i) => classId !== currentClassIds[i]));
  await validateClasses(db, identity.workspaceId, requestedClassIds ?? []);
  const changed = nextRoleId !== row.role_id || nextStatus !== row.status || nextName !== row.display_name || classesChanged;
  if (!changed) return memberView(row, currentClassIds, identity.userId);
  const now = nowIso();
  const statements: D1PreparedStatement[] = [];
  if (pending) {
    statements.push(db.prepare(`UPDATE staff_declarations SET role_id=?,display_name=?,version=version+1 WHERE id=? AND workspace_id=?`)
      .bind(nextRoleId, nextName, id, identity.workspaceId));
    if (classesChanged) {
      statements.push(db.prepare('DELETE FROM staff_declaration_classes WHERE declaration_id=?').bind(id));
      for (const classId of requestedClassIds!) statements.push(db.prepare(`INSERT INTO staff_declaration_classes
        (workspace_id,declaration_id,class_id) VALUES(?,?,?)`).bind(identity.workspaceId, id, classId));
    }
  } else {
    statements.push(db.prepare(`UPDATE memberships SET role_id=?,status=?,scope_epoch=scope_epoch+1,version=version+1
      WHERE id=? AND workspace_id=? AND version=?`).bind(nextRoleId, nextStatus, id, identity.workspaceId, row.version));
    if (classesChanged) {
      const guard = 'EXISTS (SELECT 1 FROM memberships WHERE id=? AND version=?)';
      statements.push(db.prepare(`DELETE FROM member_classes WHERE membership_id=? AND ${guard}`)
        .bind(id, id, row.version + 1));
      for (const classId of requestedClassIds!) {
        statements.push(db.prepare(`INSERT INTO member_classes(workspace_id,membership_id,class_id,created_at)
          SELECT ?,?,?,? WHERE ${guard}`).bind(identity.workspaceId, id, classId, now, id, row.version + 1));
      }
    }
  }
  let results: D1Result[];
  try {
    results = await db.batch(statements);
  } catch (error) {
    throw mapTriggerError(error, conflict('conflict'));
  }
  if (results[0]!.meta.changes === 0) {
    throw new ApiError(409, 'conflict', 'Conflict.', { reason: 'version_conflict', current: { id, version: row.version } });
  }
  const updated = await findStaff(db, identity.workspaceId, id);
  if (!updated) throw notFound();
  return memberView(updated, await classesById(db, id, pending), identity.userId);
}

export async function deleteStaff(db: D1Database, identity: Identity, id: string): Promise<void> {
  requireAdmin(identity);
  const row = await findStaff(db, identity.workspaceId, id);
  if (!row) throw notFound();
  if (row.kind !== 'pending') throw conflict('not_pending');
  await db.prepare('DELETE FROM staff_declarations WHERE id=? AND workspace_id=?').bind(id, identity.workspaceId).run();
}

async function editableRole(db: D1Database, identity: Identity, key: string) {
  requireAdmin(identity);
  if (key !== 'teacher' && key !== 'assistant') throw conflict('role_not_editable');
  const role = await db.prepare('SELECT id,name,system_key FROM roles WHERE workspace_id=? AND system_key=?')
    .bind(identity.workspaceId, key).first<{ id: string; name: string; system_key: string }>();
  if (!role) throw notFound();
  return role;
}

export async function getRolePermissions(db: D1Database, identity: Identity) {
  requireAdmin(identity);
  const items = [];
  for (const key of STAFF_ROLES) {
    const role = await editableRole(db, identity, key);
    const rows = await db.prepare(`SELECT perm_group,level FROM role_permissions WHERE role_id=?
      AND perm_group IN ('classes','students','sessions_attendance','scores','comments_reports') ORDER BY perm_group`)
      .bind(role.id).all<{ perm_group: string; level: string }>();
    items.push({ role: { id: role.id, name: role.name, system_key: role.system_key },
      permissions: Object.fromEntries(rows.results.map((row) => [row.perm_group, row.level])) });
  }
  return { items };
}

export async function updateRolePermissions(db: D1Database, identity: Identity, key: string, input: unknown) {
  const role = await editableRole(db, identity, key);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw validationError(undefined, 'body_must_be_object');
  const entries = Object.entries(input as Record<string, unknown>);
  if (!entries.length) throw validationError(undefined, 'permissions_required');
  const updates: Array<[PermGroup, PermLevel]> = [];
  for (const [group, level] of entries) {
    if (!EDITABLE_GROUPS.includes(group as PermGroup) || !['none', 'read', 'write'].includes(String(level))) {
      throw validationError({ [group]: 'invalid' });
    }
    updates.push([group as PermGroup, level as PermLevel]);
  }
  const statements: D1PreparedStatement[] = updates.map(([group, level]) => db.prepare(`UPDATE role_permissions SET level=?
    WHERE role_id=? AND perm_group=?`).bind(level, role.id, group));
  statements.push(db.prepare('UPDATE roles SET version=version+1 WHERE id=?').bind(role.id));
  statements.push(db.prepare('UPDATE memberships SET scope_epoch=scope_epoch+1,version=version+1 WHERE role_id=?')
    .bind(role.id));
  await db.batch(statements);
  const current = await getRolePermissions(db, identity);
  return current.items.find((item) => item.role.system_key === key)!;
}
