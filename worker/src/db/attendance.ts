import { requireAccess } from './authz';
import type { Identity } from '../types';
import { conflict, notFound, validationError } from '../lib/errors';
import { isDate } from './classes';

type AttendanceRow = {
  session_id: string; student_id: string; status: 'present' | 'late' | 'excused' | 'absent';
  note: string; late_at: string | null; version: number; updated_at: string; date?: string; start_time?: string;
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
  const { results } = await db.prepare(`SELECT a.session_id, a.student_id, a.status, a.note, a.late_at,
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
  const { results } = await db.prepare(`SELECT a.session_id, a.student_id, a.status, a.note, a.late_at,
      a.version, a.updated_at, cs.date, cs.start_time
      FROM attendance a JOIN class_sessions cs ON cs.id = a.session_id AND cs.workspace_id = a.workspace_id
      WHERE a.workspace_id = ? AND a.student_id = ? AND cs.date >= ? AND cs.date <= ?${after}
      ORDER BY cs.date, cs.start_time, cs.id LIMIT ?`).bind(...args).all<AttendanceRow>();
  const hasMore = results.length > input.limit;
  const items = results.slice(0, input.limit);
  const last = items.at(-1);
  return { items, next: hasMore && last ? { date: last.date!, start_time: last.start_time!, session_id: last.session_id } : null };
}

/** Database operation used by sync's attendance.set command; each command is batched atomically. */
export async function setAttendance(db: D1Database, identity: Identity, input: {
  session_id: string; student_id: string; status: unknown; note?: unknown; late_at?: unknown; base_version: unknown;
}) {
  if (!['present', 'late', 'excused', 'absent'].includes(String(input.status))) {
    throw validationError({ status: 'must_be_present_late_excused_or_absent' });
  }
  const note = input.note === undefined ? '' : input.note;
  if (typeof note !== 'string' || note.length > 500) throw validationError({ note: 'must_be_at_most_500' });
  const lateAt = input.status === 'late' ? input.late_at ?? null : null;
  if (lateAt !== null && (typeof lateAt !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(lateAt))) {
    throw validationError({ late_at: 'must_be_hh_mm' });
  }
  if (!Number.isInteger(input.base_version) || Number(input.base_version) < 0) {
    throw validationError({ base_version: 'must_be_non_negative_integer' });
  }
  const session = await db.prepare(`SELECT cs.id, cs.class_id, cs.date, cs.status AS session_status
    FROM class_sessions cs WHERE cs.workspace_id = ? AND cs.id = ?`)
    .bind(identity.workspaceId, input.session_id)
    .first<{ id: string; class_id: string; date: string; session_status: string }>();
  if (!session) throw notFound();
  const student = await db.prepare(`SELECT id, class_id, enrolled_at, left_at
    FROM students WHERE workspace_id = ? AND id = ?`)
    .bind(identity.workspaceId, input.student_id)
    .first<{ id: string; class_id: string; enrolled_at: string; left_at: string | null }>();
  if (!student || student.class_id !== session.class_id) throw notFound();
  requireAccess(identity, 'sessions_attendance', 'write', { classId: session.class_id, studentId: student.id });
  if (session.session_status === 'cancelled') throw validationError(undefined, 'session_not_started');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (session.date > today) throw validationError(undefined, 'session_not_started');
  if (student.enrolled_at > session.date || (student.left_at !== null && student.left_at < session.date)) {
    throw validationError(undefined, 'student_not_enrolled_on_date');
  }
  const existing = await db.prepare(`SELECT version FROM attendance
    WHERE workspace_id = ? AND session_id = ? AND student_id = ?`)
    .bind(identity.workspaceId, session.id, student.id).first<{ version: number }>();
  const currentVersion = existing?.version ?? 0;
  if (currentVersion !== input.base_version) throw conflict('version_conflict');
  const now = new Date().toISOString();
  const nextVersion = currentVersion + 1;
  const result = await db.batch([
    db.prepare(`INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note, late_at,
        version, created_at, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id, student_id) DO UPDATE SET status = excluded.status, note = excluded.note,
        late_at = excluded.late_at, version = excluded.version, updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
      WHERE attendance.version = ?`)
      .bind(identity.workspaceId, session.class_id, session.id, student.id, input.status, note, lateAt,
        nextVersion, now, now, identity.userId, currentVersion),
    db.prepare(`UPDATE class_sessions SET status = 'held', updated_at = ?, updated_by = ?, version = version + 1
      WHERE workspace_id = ? AND id = ? AND status = 'planned' AND changes() > 0`)
      .bind(now, identity.userId, identity.workspaceId, session.id),
  ]);
  if (!result[0]?.meta.changes) throw conflict('version_conflict');
  return { session_id: session.id, student_id: student.id, status: input.status, note, late_at: lateAt,
    version: nextVersion, updated_at: now };
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
