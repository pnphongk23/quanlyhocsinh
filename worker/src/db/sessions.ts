import { requireAccess } from './authz';
import type { Identity } from '../types';
import { nowIso } from '../lib/time';
import { conflict, notFound, validationError } from '../lib/errors';
import { isDate } from './classes';

type SessionRow = {
  id: string; class_id: string; date: string; start_time: string; origin: 'recurring' | 'manual';
  is_makeup: number; status: 'planned' | 'held' | 'cancelled'; note: string; version: number;
  session_number: number | null;
};
function validateTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function mapSession(row: SessionRow, guardian = false) {
  const result = { id: row.id, class_id: row.class_id, date: row.date, start_time: row.start_time,
    origin: row.origin, is_makeup: Boolean(row.is_makeup), status: row.status,
    session_number: row.session_number, version: row.version } as Record<string, unknown>;
  if (!guardian) result.note = row.note;
  return result;
}
const SESSION_SELECT = `SELECT cs.id, cs.class_id, cs.date, cs.start_time, cs.origin, cs.is_makeup,
  cs.status, cs.note, cs.version,
  CASE WHEN cs.status = 'cancelled' THEN NULL ELSE
    (SELECT COUNT(*) FROM class_sessions prior WHERE prior.class_id = cs.class_id
      AND prior.status <> 'cancelled' AND (prior.date < cs.date OR (prior.date = cs.date AND prior.start_time <= cs.start_time))) END AS session_number
  FROM class_sessions cs`;

export async function listClassSessions(db: D1Database, identity: Identity, classId: string, range: {
  from: string; to: string; limit: number; cursor?: { date: string; start_time: string; id: string };
}) {
  const cls = await db.prepare('SELECT id FROM classes WHERE workspace_id = ? AND id = ?')
    .bind(identity.workspaceId, classId).first();
  if (!cls) throw notFound();
  requireAccess(identity, 'sessions_attendance', 'read', { classId });
  let cursorClause = '';
  const args: unknown[] = [identity.workspaceId, classId, range.from, range.to];
  if (identity.scopeKind === 'linked_students' && !identity.classIds.includes(classId)) throw notFound();
  if (range.cursor) {
    cursorClause = ' AND (cs.date > ? OR (cs.date = ? AND cs.start_time > ?) OR (cs.date = ? AND cs.start_time = ? AND cs.id > ?))';
    args.push(range.cursor.date, range.cursor.date, range.cursor.start_time, range.cursor.date, range.cursor.start_time, range.cursor.id);
  }
  args.push(range.limit + 1);
  const { results } = await db.prepare(`${SESSION_SELECT}
    WHERE cs.workspace_id = ? AND cs.class_id = ? AND cs.date >= ? AND cs.date <= ?${cursorClause}
    ORDER BY cs.date, cs.start_time, cs.id LIMIT ?`).bind(...args).all<SessionRow>();
  const more = results.length > range.limit;
  const page = results.slice(0, range.limit);
  const last = page.at(-1);
  return { items: page.map((row) => mapSession(row, identity.scopeKind === 'linked_students')),
    next: more && last ? { date: last.date, start_time: last.start_time, id: last.id } : null };
}

export async function listCalendar(db: D1Database, identity: Identity, from: string, to: string) {
  requireAccess(identity, 'sessions_attendance', 'read');
  let scope = '';
  const args: unknown[] = [identity.workspaceId, from, to];
  if (identity.scopeKind !== 'workspace') {
    if (!identity.classIds.length) return [];
    scope = ` AND cs.class_id IN (${identity.classIds.map(() => '?').join(',')})`;
    args.push(...identity.classIds);
  }
  const { results } = await db.prepare(`${SESSION_SELECT}
    WHERE cs.workspace_id = ? AND cs.date >= ? AND cs.date <= ?${scope}
    ORDER BY cs.date, cs.start_time, cs.class_id, cs.id`).bind(...args).all<SessionRow>();
  return results.map((row) => ({ ...mapSession(row, identity.scopeKind === 'linked_students'),
    ...(identity.scopeKind === 'linked_students' ? {} : {}) }));
}

export async function createManualSession(db: D1Database, identity: Identity, classId: string,
  input: Record<string, unknown>) {
  const cls = await db.prepare('SELECT id FROM classes WHERE workspace_id = ? AND id = ?')
    .bind(identity.workspaceId, classId).first();
  if (!cls) throw notFound();
  requireAccess(identity, 'sessions_attendance', 'write', { classId });
  if (!isDate(input.date)) throw validationError({ date: 'must_be_date' });
  if (!validateTime(input.start_time)) throw validationError({ start_time: 'must_be_hh_mm' });
  if (input.is_makeup !== undefined && typeof input.is_makeup !== 'boolean') throw validationError({ is_makeup: 'must_be_boolean' });
  const note = input.note === undefined ? '' : input.note;
  if (typeof note !== 'string' || note.length > 500) throw validationError({ note: 'must_be_at_most_500' });
  const id = crypto.randomUUID();
  const now = nowIso();
  try {
    await db.prepare(`INSERT INTO class_sessions
      (id, workspace_id, class_id, date, start_time, origin, is_makeup, status, note,
       cancelled_at, cancelled_by, created_at, updated_at, updated_by, version)
      VALUES (?, ?, ?, ?, ?, 'manual', ?, 'planned', ?, NULL, NULL, ?, ?, ?, 1)`)
      .bind(id, identity.workspaceId, classId, input.date, input.start_time, input.is_makeup ? 1 : 0,
        note, now, now, identity.userId).run();
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw conflict('session_exists');
    throw error;
  }
  const number = await db.prepare(`SELECT COUNT(*) AS count FROM class_sessions
    WHERE class_id = ? AND status <> 'cancelled' AND (date < ? OR (date = ? AND start_time <= ?))`)
    .bind(classId, input.date, input.date, input.start_time).first<{ count: number }>();
  return { id, class_id: classId, date: input.date, start_time: input.start_time, origin: 'manual',
    is_makeup: input.is_makeup === true, status: 'planned', note, session_number: number?.count ?? null, version: 1 };
}

export async function cancelSession(db: D1Database, identity: Identity, sessionId: string) {
  const row = await db.prepare('SELECT id, class_id, date, start_time, status, version FROM class_sessions WHERE workspace_id = ? AND id = ?')
    .bind(identity.workspaceId, sessionId).first<{ id: string; class_id: string; date: string; start_time: string; status: string; version: number }>();
  if (!row) throw notFound();
  requireAccess(identity, 'sessions_attendance', 'write', { classId: row.class_id });
  if (row.status !== 'planned') throw conflict('session_not_planned');
  const hasData = await db.prepare(`SELECT EXISTS(SELECT 1 FROM homework_sections WHERE session_id = ?) AS found`)
    .bind(sessionId).first<{ found: number }>();
  if (hasData?.found) throw conflict('session_has_data');
  const now = nowIso();
    const results = await db.batch([
      db.prepare(`UPDATE class_sessions SET status = 'cancelled', cancelled_at = ?, cancelled_by = ?,
        updated_at = ?, updated_by = ?, version = version + 1
        WHERE workspace_id = ? AND id = ? AND status = 'planned' AND version = ?`)
        .bind(now, identity.userId, now, identity.userId, identity.workspaceId, sessionId, row.version),
      // Phát lại mọi ô chấm BTVN vừa đổi buổi chấm, không lọc trạng thái phiếu: `pull` tự sinh
      // `upsert` khi cổng mở (phiếu buổi chấm mới đã gửi) hoặc `deleted` khi cổng đóng lại.
      db.prepare(`INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
        SELECT g.workspace_id, 'homework_grade', g.section_id, g.student_id, 'upsert', g.class_id, g.student_id, unixepoch()
        FROM homework_grades g
        JOIN homework_sections hs ON hs.id = g.section_id
        JOIN class_sessions assigned ON assigned.id = hs.session_id
        JOIN class_sessions grading ON grading.id = (
          SELECT next.id FROM class_sessions next
          WHERE next.workspace_id = assigned.workspace_id AND next.class_id = assigned.class_id
            AND next.status <> 'cancelled'
            AND (next.date > assigned.date OR (next.date = assigned.date AND next.start_time > assigned.start_time))
          ORDER BY next.date, next.start_time LIMIT 1
        )
        WHERE g.workspace_id = ? AND assigned.class_id = ? AND assigned.status <> 'cancelled'
          AND (assigned.date < ? OR (assigned.date = ? AND assigned.start_time < ?))
          AND NOT EXISTS (
            SELECT 1 FROM class_sessions between_session
            WHERE between_session.workspace_id = assigned.workspace_id AND between_session.class_id = assigned.class_id
              AND between_session.status <> 'cancelled'
              AND (between_session.date > assigned.date OR (between_session.date = assigned.date AND between_session.start_time > assigned.start_time))
              AND (between_session.date < ? OR (between_session.date = ? AND between_session.start_time < ?))
          )
          AND (grading.date > ? OR (grading.date = ? AND grading.start_time > ?))
          AND EXISTS (SELECT 1 FROM class_sessions cancelled
            WHERE cancelled.workspace_id = ? AND cancelled.id = ? AND cancelled.status = 'cancelled'
              AND cancelled.version = ? AND cancelled.cancelled_at = ?)`)
        .bind(identity.workspaceId, row.class_id, row.date, row.date, row.start_time,
          row.date, row.date, row.start_time, row.date, row.date, row.start_time,
          identity.workspaceId, sessionId, row.version + 1, now),
    ]);
    if (!results[0]?.meta.changes) throw conflict('session_not_planned');
  return { id: sessionId, status: 'cancelled', version: row.version + 1 };
}

export async function updateManualSession(db: D1Database, identity: Identity, sessionId: string,
  input: Record<string, unknown>) {
  const row = await db.prepare(`SELECT cs.id, cs.class_id, cs.date, cs.start_time, cs.origin, cs.status,
      cs.note, cs.version, w.timezone
    FROM class_sessions cs JOIN workspaces w ON w.id = cs.workspace_id
    WHERE cs.workspace_id = ? AND cs.id = ?`)
    .bind(identity.workspaceId, sessionId)
    .first<SessionRow & { timezone: string }>();
  if (!row) throw notFound();
  requireAccess(identity, 'sessions_attendance', 'write', { classId: row.class_id });
  if (row.origin !== 'manual' || row.status !== 'planned') throw conflict('session_not_editable');

  const fields = ['date', 'start_time', 'note'] as const;
  if (!fields.some((field) => Object.prototype.hasOwnProperty.call(input, field))) {
    throw validationError(undefined, 'at_least_one_field_required');
  }
  if (input.base_version !== undefined && !Number.isInteger(input.base_version)) {
    throw validationError({ base_version: 'must_be_integer' });
  }
  if (input.base_version !== undefined && input.base_version !== row.version) throw conflict('version_conflict');

  const date = input.date === undefined ? row.date : input.date;
  if (input.date !== undefined && !isDate(input.date)) throw validationError({ date: 'must_be_date' });
  if (typeof date !== 'string') throw validationError({ date: 'must_be_date' });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: row.timezone }).format(new Date());
  if (date < today) throw validationError({ date: 'date_in_past' }, 'date_in_past');

  const startTime = input.start_time === undefined ? row.start_time : input.start_time;
  if (input.start_time !== undefined && !validateTime(input.start_time)) {
    throw validationError({ start_time: 'must_be_hh_mm' });
  }
  if (typeof startTime !== 'string') throw validationError({ start_time: 'must_be_hh_mm' });
  const note = input.note === undefined ? row.note : input.note;
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 500)) {
    throw validationError({ note: 'must_be_at_most_500' });
  }
  if (typeof note !== 'string') throw validationError({ note: 'must_be_at_most_500' });

  const now = nowIso();
  let result: D1Result;
  try {
    result = await db.prepare(`UPDATE class_sessions
      SET date = ?, start_time = ?, note = ?, updated_at = ?, updated_by = ?, version = version + 1
      WHERE workspace_id = ? AND id = ? AND version = ? AND origin = 'manual' AND status = 'planned'`)
      .bind(date, startTime, note, now, identity.userId, identity.workspaceId, sessionId, row.version).run();
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw conflict('session_exists');
    throw error;
  }
  if (result.meta.changes === 0) throw conflict('version_conflict');

  const updated = await db.prepare(`${SESSION_SELECT}
    WHERE cs.workspace_id = ? AND cs.id = ?`).bind(identity.workspaceId, sessionId).first<SessionRow>();
  if (!updated) throw notFound();
  return { ...mapSession(updated), note: updated.note };
}
