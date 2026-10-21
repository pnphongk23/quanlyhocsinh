import { requireAccess } from './authz';
import type { Identity } from '../types';
import { nowIso } from '../lib/time';
import { conflict, notFound, validationError } from '../lib/errors';
import { normalizePhone } from '../lib/phone';
import { isDate } from './classes';

type StudentRow = {
  id: string; class_id: string; name: string; parent_phone: string | null;
  enrolled_at: string; left_at: string | null; status: 'active' | 'left'; version: number;
};
function nameValue(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 100) {
    throw validationError({ name: 'must_be_1_to_100_chars' });
  }
  return value.trim();
}
function phoneValue(value: unknown, required = false): string | null {
  if (value === null || value === undefined || value === '') {
    if (required) throw validationError({ parent_phone: 'invalid_phone' });
    return null;
  }
  const phone = normalizePhone(value);
  if (!phone) throw validationError({ parent_phone: 'invalid_phone' });
  return phone;
}
function rowView(row: StudentRow, guardian = false) {
  const common = { id: row.id, class_id: row.class_id, name: row.name };
  if (guardian) return common;
  return { ...common, parent_phone: row.parent_phone, enrolled_at: row.enrolled_at,
    left_at: row.left_at, status: row.status, version: row.version };
}

async function linkedUsersForPhone(db: D1Database, phone: string | null) {
  if (!phone) return [] as string[];
  const { results } = await db.prepare(`SELECT id FROM users WHERE phone = ? AND status = 'active'`)
    .bind(phone).all<{ id: string }>();
  return results.map((row) => row.id);
}

export async function listStudents(db: D1Database, identity: Identity, classId: string, status: string | null) {
  const cls = await db.prepare('SELECT id FROM classes WHERE workspace_id = ? AND id = ?')
    .bind(identity.workspaceId, classId).first();
  if (!cls) throw notFound();
  requireAccess(identity, 'students', 'read', { classId });
  if (status !== null && status !== 'active' && status !== 'left' && status !== 'all') {
    throw validationError({ status: 'must_be_active_left_or_all' });
  }
  let query = `SELECT id, class_id, name, parent_phone, enrolled_at, left_at, status, version
    FROM students WHERE workspace_id = ? AND class_id = ?`;
  const args: unknown[] = [identity.workspaceId, classId];
  if (identity.scopeKind === 'linked_students') {
    if (!identity.linkedStudentIds.length) return [];
    query += ` AND id IN (${identity.linkedStudentIds.map(() => '?').join(',')})`;
    args.push(...identity.linkedStudentIds);
  }
  if (status && status !== 'all') { query += ' AND status = ?'; args.push(status); }
  query += ' ORDER BY status, name, id';
  const { results } = await db.prepare(query).bind(...args).all<StudentRow>();
  return results.map((row) => rowView(row, identity.scopeKind === 'linked_students'));
}

export async function getStudent(db: D1Database, identity: Identity, studentId: string) {
  const row = await db.prepare(`SELECT id, class_id, name, parent_phone, enrolled_at, left_at, status, version
    FROM students WHERE workspace_id = ? AND id = ?`).bind(identity.workspaceId, studentId).first<StudentRow>();
  if (!row) throw notFound();
  requireAccess(identity, 'students', 'read', { classId: row.class_id, studentId: row.id });
  return rowView(row, identity.scopeKind === 'linked_students');
}

export async function createStudent(db: D1Database, identity: Identity, classId: string,
  input: { name: unknown; parent_phone?: unknown; enrolled_at: unknown }) {
  const cls = await db.prepare('SELECT id FROM classes WHERE workspace_id = ? AND id = ?')
    .bind(identity.workspaceId, classId).first();
  if (!cls) throw notFound();
  requireAccess(identity, 'students', 'write', { classId });
  const name = nameValue(input.name);
  const phone = phoneValue(input.parent_phone);
  if (!isDate(input.enrolled_at)) throw validationError({ enrolled_at: 'must_be_date' });
  const id = crypto.randomUUID();
  const now = nowIso();
  const linkedUsers = await linkedUsersForPhone(db, phone);
  const stmts = [db.prepare(`INSERT INTO students
      (id, workspace_id, class_id, name, parent_phone, enrolled_at, left_at, status, created_at, updated_at, updated_by, version)
      VALUES (?, ?, ?, ?, ?, ?, NULL, 'active', ?, ?, ?, 1)`)
    .bind(id, identity.workspaceId, classId, name, phone, input.enrolled_at, now, now, identity.userId),
  ...linkedUsers.map((userId) => db.prepare(`INSERT OR IGNORE INTO guardian_student (workspace_id, user_id, student_id, created_at)
      VALUES (?, ?, ?, ?)`)
    .bind(identity.workspaceId, userId, id, now)),
  ...linkedUsers.map((userId) => db.prepare(`UPDATE memberships SET scope_epoch = scope_epoch + 1, version = version + 1
      WHERE workspace_id = ? AND user_id = ? AND status = 'active'`)
    .bind(identity.workspaceId, userId))];
  await db.batch(stmts);
  return { id, class_id: classId, name, parent_phone: phone, enrolled_at: input.enrolled_at,
    left_at: null, status: 'active', version: 1 };
}

export async function updateStudent(db: D1Database, identity: Identity, studentId: string,
  input: Record<string, unknown>) {
  const old = await db.prepare(`SELECT id, class_id, name, parent_phone, enrolled_at, left_at, status, version
    FROM students WHERE workspace_id = ? AND id = ?`).bind(identity.workspaceId, studentId).first<StudentRow>();
  if (!old) throw notFound();
  requireAccess(identity, 'students', 'write', { classId: old.class_id, studentId });
  if (input.base_version !== undefined &&
      (!Number.isInteger(input.base_version) || input.base_version !== old.version)) throw conflict('version_conflict');
  const name = input.name === undefined ? old.name : nameValue(input.name);
  const phone = input.parent_phone === undefined ? old.parent_phone : phoneValue(input.parent_phone);
  const status = input.status === undefined ? old.status : input.status;
  let leftAt = old.left_at;
  if (status === 'left') {
    leftAt = input.left_at === undefined ? old.left_at : input.left_at as string;
    if (!leftAt || !isDate(leftAt)) throw validationError({ left_at: 'required_date_when_left' });
  } else if (status === 'active') {
    leftAt = null;
  } else throw validationError({ status: 'must_be_active_or_left' });
  if (leftAt !== null && leftAt < old.enrolled_at) throw validationError({ left_at: 'before_enrolled_at' });
  const now = nowIso();
  const changedPhone = phone !== old.parent_phone;
  const statements: D1PreparedStatement[] = [];
  const affectedUsers = changedPhone ? await linkedUsersForPhone(db, old.parent_phone) : [];
  const addedUsers = changedPhone ? await linkedUsersForPhone(db, phone) : [];
  if (changedPhone) {
    statements.push(db.prepare('DELETE FROM guardian_student WHERE workspace_id = ? AND student_id = ?')
      .bind(identity.workspaceId, studentId));
  }
  statements.push(db.prepare(`UPDATE students SET name = ?, parent_phone = ?, status = ?, left_at = ?,
      updated_at = ?, updated_by = ?, version = version + 1
      WHERE workspace_id = ? AND id = ? AND version = ?`)
    .bind(name, phone, status, leftAt, now, identity.userId, identity.workspaceId, studentId, old.version));
  for (const userId of addedUsers) {
    statements.push(db.prepare(`INSERT OR IGNORE INTO guardian_student (workspace_id, user_id, student_id, created_at)
      VALUES (?, ?, ?, ?)`).bind(identity.workspaceId, userId, studentId, now));
  }
  for (const userId of new Set([...affectedUsers, ...addedUsers])) {
    statements.push(db.prepare(`UPDATE memberships SET scope_epoch = scope_epoch + 1, version = version + 1
      WHERE workspace_id = ? AND user_id = ? AND status = 'active'`)
      .bind(identity.workspaceId, userId));
  }
  await db.batch(statements);
  return { id: studentId, class_id: old.class_id, name, parent_phone: phone,
    enrolled_at: old.enrolled_at, left_at: leftAt, status, version: old.version + 1 };
}
