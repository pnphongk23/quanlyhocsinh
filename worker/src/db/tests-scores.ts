import { requireAccess } from "./authz";
import type { Identity } from "../types";
import { notFound } from "../lib/errors";

export async function listTests(
  db: D1Database,
  identity: Identity,
  classId: string,
  archived: boolean,
) {
  const exists = await db
    .prepare("SELECT id FROM classes WHERE workspace_id=? AND id=?")
    .bind(identity.workspaceId, classId)
    .first();
  if (!exists) throw notFound();
  requireAccess(identity, "scores", "read", { classId });
  const includeArchived = archived && identity.scopeKind !== "linked_students";
  return db
    .prepare(
      `SELECT id, class_id, name, date, max, archived, version FROM tests
    WHERE workspace_id = ? AND class_id = ? AND archived = ? ORDER BY date, id`,
    )
    .bind(identity.workspaceId, classId, includeArchived ? 1 : 0)
    .all();
}

export async function listScores(
  db: D1Database,
  identity: Identity,
  testId: string,
) {
  const test = await db
    .prepare(
      "SELECT class_id, archived FROM tests WHERE workspace_id = ? AND id = ?",
    )
    .bind(identity.workspaceId, testId)
    .first<{ class_id: string; archived: number }>();
  if (!test || test.archived) return null;
  requireAccess(identity, "scores", "read", { classId: test.class_id });
  return db
    .prepare(
      `SELECT s.test_id, s.student_id, s.value, s.version, s.updated_at
    FROM scores s JOIN students st ON st.id=s.student_id AND st.workspace_id=s.workspace_id
    WHERE s.workspace_id=? AND s.test_id=? AND (? = 0 OR s.student_id IN (${identity.linkedStudentIds.length ? identity.linkedStudentIds.map(() => "?").join(",") : "NULL"}))
    ORDER BY s.student_id`,
    )
    .bind(
      identity.workspaceId,
      testId,
      identity.scopeKind === "linked_students" ? 1 : 0,
      ...(identity.scopeKind === "linked_students"
        ? identity.linkedStudentIds
        : []),
    )
    .all();
}
