import { requireAccess } from "./authz";
import type { Identity } from "../types";

export async function listSlips(
  db: D1Database,
  identity: Identity,
  sessionId: string,
) {
  const session = await db
    .prepare(
      "SELECT class_id FROM class_sessions WHERE workspace_id=? AND id=?",
    )
    .bind(identity.workspaceId, sessionId)
    .first<{ class_id: string }>();
  if (!session) return null;
  requireAccess(identity, "comments_reports", "read", {
    classId: session.class_id,
  });
  const studentScope =
    identity.scopeKind === "linked_students"
      ? identity.linkedStudentIds.length
        ? `AND student_id IN (${identity.linkedStudentIds.map(() => "?").join(",")})`
        : "AND 0"
      : "";
  const sent =
    identity.scopeKind === "linked_students" ? "AND status='sent'" : "";
  return db
    .prepare(
      `SELECT session_id, student_id, stars, note, status, sent_at, version, updated_at
    FROM session_comments WHERE workspace_id=? AND session_id=? ${studentScope} ${sent} ORDER BY student_id`,
    )
    .bind(
      identity.workspaceId,
      sessionId,
      ...(identity.scopeKind === "linked_students"
        ? identity.linkedStudentIds
        : []),
    )
    .all();
}
