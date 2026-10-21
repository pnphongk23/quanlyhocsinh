import { requireAccess } from './authz';
import type { Identity } from '../types';
import { nowIso } from '../lib/time';
import { conflict, notFound, validationError } from '../lib/errors';

type ClassRow = {
  id: string; name: string; status: 'active' | 'archived'; weekdays: number;
  start_time: string; version: number;
};

function dayString(date: Date): string { return date.toISOString().slice(0, 10); }
function weekdayBit(date: Date): number { return (date.getUTCDay() + 6) % 7; }
function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function parseWeekdays(value: unknown): number {
  if (!Array.isArray(value) || value.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw validationError({ weekdays: 'must_be_unique_days_1_to_7' });
  }
  if (new Set(value).size !== value.length) throw validationError({ weekdays: 'must_be_unique_days_1_to_7' });
  return value.reduce<number>((bits, day) => bits | (1 << (Number(day) - 1)), 0);
}
function weekdayList(bits: number): number[] {
  return Array.from({ length: 7 }, (_, day) => day + 1).filter((day) => (bits & (1 << (day - 1))) !== 0);
}
function validateTime(value: unknown): string {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw validationError({ start_time: 'must_be_hh_mm' });
  }
  return value;
}
function validateName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 100) {
    throw validationError({ name: 'must_be_1_to_100_chars' });
  }
  return value.trim();
}

function insertSessions(db: D1Database, workspaceId: string, classId: string, bits: number,
  startTime: string, from: string, until: string, now: string) {
  const statements: D1PreparedStatement[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const last = new Date(`${until}T00:00:00.000Z`);
  for (; cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if ((bits & (1 << weekdayBit(cursor))) === 0) continue;
    statements.push(db.prepare(
      `INSERT OR IGNORE INTO class_sessions
       (id, workspace_id, class_id, date, start_time, origin, is_makeup, status, note,
        cancelled_at, cancelled_by, created_at, updated_at, updated_by, version)
       VALUES (?, ?, ?, ?, ?, 'recurring', 0, 'planned', '', NULL, NULL, ?, ?, ?, 1)`,
    ).bind(crypto.randomUUID(), workspaceId, classId, dayString(cursor), startTime, now, now, null));
  }
  return statements;
}

export async function createClass(db: D1Database, identity: Identity, input: {
  name: unknown; weekdays: unknown; start_time: unknown;
}) {
  requireAccess(identity, 'classes', 'write');
  const name = validateName(input.name);
  const weekdays = parseWeekdays(input.weekdays);
  const startTime = validateTime(input.start_time);
  const id = crypto.randomUUID();
  const now = nowIso();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const until = dayString(new Date(new Date(`${today}T00:00:00Z`).getTime() + 56 * 86400000));
  const statements = [
    db.prepare(`INSERT INTO classes
      (id, workspace_id, name, status, weekdays, start_time, generated_until, created_by, created_at, updated_at, updated_by, version)
      VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, 1)`)
      .bind(id, identity.workspaceId, name, weekdays, startTime, until, identity.userId, now, now, identity.userId),
    db.prepare(`INSERT OR IGNORE INTO member_classes (workspace_id, membership_id, class_id, created_at)
      VALUES (?, ?, ?, ?)`)
      .bind(identity.workspaceId, identity.membershipId, id, now),
    ...insertSessions(db, identity.workspaceId, id, weekdays, startTime, today, until, now),
  ];
  await db.batch(statements);
  return { id, name, status: 'active', weekdays: weekdayList(weekdays), start_time: startTime, version: 1 };
}

export async function listClasses(db: D1Database, identity: Identity, status: string | null) {
  const requested = status ?? 'active';
  if (requested !== 'active' && requested !== 'archived' && requested !== 'all') {
    throw validationError({ status: 'must_be_active_archived_or_all' });
  }
  const filter = requested === 'all' ? '' : ' AND c.status = ?';
  const bindings: unknown[] = [identity.workspaceId];
  if (requested !== 'all') bindings.push(requested);
  let scope = '';
  if (identity.scopeKind === 'assigned_classes' || identity.scopeKind === 'linked_students') {
    if (!identity.classIds.length) return [];
    scope = ` AND c.id IN (${identity.classIds.map(() => '?').join(',')})`;
    bindings.push(...identity.classIds);
  }
  const rows = await db.prepare(`SELECT c.id, c.name, c.status, c.weekdays, c.start_time, c.version
    FROM classes c WHERE c.workspace_id = ?${filter}${scope} ORDER BY c.name, c.id`).bind(...bindings).all<ClassRow>();
  if (identity.scopeKind === 'linked_students') {
    requireAccess(identity, 'classes', 'read');
    return rows.results.map(({ id, name, status: rowStatus }) => ({ id, name, status: rowStatus }));
  }
  requireAccess(identity, 'classes', 'read');
  return rows.results.map((row) => ({ ...row, weekdays: weekdayList(row.weekdays) }));
}

export async function getClass(db: D1Database, identity: Identity, classId: string) {
  const row = await db.prepare(`SELECT id, name, status, weekdays, start_time, version
    FROM classes WHERE workspace_id = ? AND id = ?`).bind(identity.workspaceId, classId).first<ClassRow>();
  if (!row) throw notFound();
  requireAccess(identity, 'classes', 'read', { classId });
  if (identity.scopeKind === 'linked_students') return { id: row.id, name: row.name, status: row.status };
  return { ...row, weekdays: weekdayList(row.weekdays) };
}

export async function updateClass(db: D1Database, identity: Identity, classId: string, input: Record<string, unknown>) {
  const old = await db.prepare(`SELECT id, name, status, weekdays, start_time, generated_until, version
    FROM classes WHERE workspace_id = ? AND id = ?`).bind(identity.workspaceId, classId)
    .first<ClassRow & { generated_until: string | null }>();
  if (!old) throw notFound();
  requireAccess(identity, 'classes', 'write', { classId });
  const baseVersion = input.base_version;
  if (baseVersion !== undefined && (!Number.isInteger(baseVersion) || baseVersion !== old.version)) {
    throw conflict('version_conflict');
  }
  const name = input.name === undefined ? old.name : validateName(input.name);
  const weekdays = input.weekdays === undefined ? old.weekdays : parseWeekdays(input.weekdays);
  const startTime = input.start_time === undefined ? old.start_time : validateTime(input.start_time);
  const status = input.status === undefined ? old.status : input.status;
  if (status !== 'active' && status !== 'archived') throw validationError({ status: 'must_be_archived' });
  const now = nowIso();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const changedSchedule = weekdays !== old.weekdays || startTime !== old.start_time;
  const until = dayString(new Date(new Date(`${today}T00:00:00Z`).getTime() + 56 * 86400000));
  const statements: D1PreparedStatement[] = [];
  if (changedSchedule) {
    statements.push(db.prepare(`UPDATE class_sessions SET origin = 'manual', updated_at = ?, updated_by = ?, version = version + 1
      WHERE workspace_id = ? AND class_id = ? AND date > ? AND status = 'planned' AND origin = 'recurring'
      AND (EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = class_sessions.id)
        OR EXISTS (SELECT 1 FROM session_comments sc WHERE sc.session_id = class_sessions.id)
        OR EXISTS (SELECT 1 FROM homework_sections hs WHERE hs.session_id = class_sessions.id))`)
      .bind(now, identity.userId, identity.workspaceId, classId, today));
    statements.push(db.prepare(`DELETE FROM class_sessions WHERE workspace_id = ? AND class_id = ? AND date > ?
      AND status = 'planned' AND origin = 'recurring'
      AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = class_sessions.id)
      AND NOT EXISTS (SELECT 1 FROM session_comments sc WHERE sc.session_id = class_sessions.id)
      AND NOT EXISTS (SELECT 1 FROM homework_sections hs WHERE hs.session_id = class_sessions.id)`)
      .bind(identity.workspaceId, classId, today));
    if (status === 'active') {
      statements.push(...insertSessions(db, identity.workspaceId, classId, weekdays, startTime, today, until, now));
    }
  }
  statements.push(db.prepare(`UPDATE classes SET name = ?, weekdays = ?, start_time = ?, status = ?,
      generated_until = CASE WHEN ? THEN ? ELSE generated_until END,
      updated_at = ?, updated_by = ?, version = version + 1
      WHERE workspace_id = ? AND id = ? AND version = ?`)
    .bind(name, weekdays, startTime, status, changedSchedule ? 1 : 0, until, now, identity.userId,
      identity.workspaceId, classId, old.version));
  await db.batch(statements);
  return { id: classId, name, status, weekdays: weekdayList(weekdays), start_time: startTime, version: old.version + 1 };
}

export { isDate };
