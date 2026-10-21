import { requireAccess } from "./authz";
import type { Identity } from "../types";

export async function getHomework(
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
  const sections = await db
    .prepare(
      `SELECT id, class_id, session_id, kind, title, description, version
    FROM homework_sections WHERE workspace_id=? AND session_id=? ORDER BY kind`,
    )
    .bind(identity.workspaceId, sessionId)
    .all();
  const studentFilter =
    identity.scopeKind === "linked_students" && identity.linkedStudentIds.length
      ? `AND g.student_id IN (${identity.linkedStudentIds.map(() => "?").join(",")})`
      : identity.scopeKind === "linked_students"
        ? "AND 0"
        : "";
  const sentGate = `AND (? = 0 OR (g.level IS NOT NULL AND EXISTS (SELECT 1 FROM session_comments c
      WHERE c.workspace_id=g.workspace_id AND c.session_id=? AND c.student_id=g.student_id AND c.status='sent')))`;
  const grades = await db
    .prepare(
      `SELECT g.section_id, g.student_id, g.level, g.version, g.updated_at
    FROM homework_grades g JOIN homework_sections hs ON hs.id=g.section_id AND hs.workspace_id=g.workspace_id
    JOIN class_sessions s ON s.id=hs.session_id AND s.workspace_id=hs.workspace_id
    WHERE g.workspace_id=? ${studentFilter} AND EXISTS (SELECT 1 FROM class_sessions next
      WHERE next.workspace_id=hs.workspace_id AND next.class_id=hs.class_id AND next.id=? AND next.status<>'cancelled'
      AND (next.date>s.date OR (next.date=s.date AND next.start_time>s.start_time))
      AND NOT EXISTS (SELECT 1 FROM class_sessions earlier WHERE earlier.workspace_id=next.workspace_id AND earlier.class_id=next.class_id
        AND earlier.status<>'cancelled' AND (earlier.date>s.date OR (earlier.date=s.date AND earlier.start_time>s.start_time))
        AND (earlier.date<next.date OR (earlier.date=next.date AND earlier.start_time<next.start_time)))) ${sentGate}
    ORDER BY g.section_id,g.student_id`,
    )
    .bind(
      identity.workspaceId,
      ...(identity.scopeKind === "linked_students"
        ? identity.linkedStudentIds
        : []),
      sessionId,
      identity.scopeKind === "linked_students" ? 1 : 0,
      sessionId,
    )
    .all();
  return { sections: sections.results, grades: grades.results };
}
