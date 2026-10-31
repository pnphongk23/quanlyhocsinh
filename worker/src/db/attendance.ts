import { requireAccess } from './authz';
import type { Identity } from '../types';
import { notFound, validationError } from '../lib/errors';
import { isDate } from './classes';

type AttendanceRow = {
  session_id: string; student_id: string; status: 'present' | 'late' | 'absent';
  version: number; updated_at: string; date?: string; start_time?: string;
};

export async function getSessionAttendance(db: D1Database, identity: Identity, sessionId: string) {
  const session = await db.prepare('SELECT id, class_id FROM class_sessions WHERE workspace_id = ? AND id = ?')
    .bind(identity.workspaceId, sessionId).first<{ id: string; class_id: string }>();
  if (!session) throw notFound();
  requireAccess(identity, 'sessions_attendance', 'read', { classId: session.class_id });
  let guard = '';
  const args: unknown[] = [identity.workspaceId, sessionId];
  if (identity.scopeKind === 'linked_students') {
    if (!identity.linkedStudentIds.length) return [];
    guard = ` AND a.student_id IN (${identity.linkedStudentIds.map(() => '?').join(',')})`;
    args.push(...identity.linkedStudentIds);
  }
    const { results } = await db.prepare(`SELECT a.session_id, a.student_id, a.status,
      a.version, a.updated_at FROM attendance a
      WHERE a.workspace_id = ? AND a.session_id = ?${guard} ORDER BY a.student_id`)
    .bind(...args).all<AttendanceRow>();
  return results;
}

export async function getStudentAttendance(db: D1Database, identity: Identity, studentId: string, input: {
  from: string; to: string; limit: number; cursor?: { date: string; start_time: string; session_id: string };
}) {
  const student = await db.prepare('SELECT id, class_id FROM students WHERE workspace_id = ? AND id = ?')
    .bind(identity.workspaceId, studentId).first<{ id: string; class_id: string }>();
  if (!student) throw notFound();
  requireAccess(identity, 'sessions_attendance', 'read', { classId: student.class_id, studentId });
  let after = '';
  const args: unknown[] = [identity.workspaceId, studentId, input.from, input.to];
  if (input.cursor) {
    after = ' AND (cs.date > ? OR (cs.date = ? AND cs.start_time > ?) OR (cs.date = ? AND cs.start_time = ? AND cs.id > ?))';
    args.push(input.cursor.date, input.cursor.date, input.cursor.start_time,
      input.cursor.date, input.cursor.start_time, input.cursor.session_id);
  }
  args.push(input.limit + 1);
    const { results } = await db.prepare(`SELECT a.session_id, a.student_id, a.status,
      a.version, a.updated_at, cs.date, cs.start_time
      FROM attendance a JOIN class_sessions cs ON cs.id = a.session_id AND cs.workspace_id = a.workspace_id
      WHERE a.workspace_id = ? AND a.student_id = ? AND cs.date >= ? AND cs.date <= ?${after}
      ORDER BY cs.date, cs.start_time, cs.id LIMIT ?`).bind(...args).all<AttendanceRow>();
  const hasMore = results.length > input.limit;
  const items = results.slice(0, input.limit);
  const last = items.at(-1);
  return { items, next: hasMore && last ? { date: last.date!, start_time: last.start_time!, session_id: last.session_id } : null };
}

export function validateAttendanceRange(fromValue: string | null, toValue: string | null,
  limitValue: string | null): { from: string; to: string; limit: number } {
  if (!isDate(fromValue)) throw validationError({ from: 'must_be_date' });
  if (!isDate(toValue)) throw validationError({ to: 'must_be_date' });
  if (fromValue > toValue) throw validationError({ to: 'must_not_precede_from' });
  const limit = limitValue === null ? 50 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw validationError({ limit: 'must_be_1_to_200' });
  return { from: fromValue, to: toValue, limit };
}

export function parseSessionCursor(value: string | null) {
  if (!value) return undefined;
  try {
    const decoded = JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof decoded.date === 'string' && typeof decoded.start_time === 'string' && typeof decoded.id === 'string') return decoded;
  } catch { /* malformed opaque cursor below */ }
  throw validationError({ cursor: 'invalid_cursor' });
}

export function parseAttendanceCursor(value: string | null) {
  if (!value) return undefined;
  try {
    const decoded = JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof decoded.date === 'string' && typeof decoded.start_time === 'string' && typeof decoded.session_id === 'string') return decoded;
  } catch { /* malformed opaque cursor below */ }
  throw validationError({ cursor: 'invalid_cursor' });
}

export function encodeCursor(value: object | null): string | null {
  if (!value) return null;
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
