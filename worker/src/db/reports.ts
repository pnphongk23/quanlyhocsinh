import { requireAccess } from "./authz";
import type { Identity } from "../types";
import { notFound, forbidden } from "../lib/errors";

export async function listClassReports(
  db: D1Database,
  i: Identity,
  classId: string,
  month: string,
) {
  const exists = await db
    .prepare("SELECT id FROM classes WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, classId)
    .first();
  if (!exists) throw notFound();
  requireAccess(i, "comments_reports", "read", { classId });
  if (i.scopeKind === "linked_students") throw forbidden();
  return db
    .prepare(
      `SELECT r.id AS report_id, r.student_id, r.month, r.status, r.needs_republish,
      r.publication_count, r.published_at, r.version FROM reports r
    WHERE r.workspace_id=? AND r.class_id=? AND r.month=? ORDER BY r.student_id`,
    )
    .bind(i.workspaceId, classId, month)
    .all();
}

export async function previewReport(
  db: D1Database,
  i: Identity,
  studentId: string,
  month: string,
) {
  const student = await db
    .prepare("SELECT class_id FROM students WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, studentId)
    .first<{ class_id: string }>();
  if (!student) return null;
  requireAccess(i, "comments_reports", "read", {
    classId: student.class_id,
    studentId,
  });
  if (i.scopeKind === "linked_students") throw forbidden();
  const [attendance, tests, stars, homework, report] = await Promise.all([
    db
      .prepare(
        `SELECT a.status, count(*) AS count FROM attendance a JOIN class_sessions s ON s.id=a.session_id
      WHERE a.workspace_id=? AND a.student_id=? AND s.status='held' AND substr(s.date,1,7)=? GROUP BY a.status`,
      )
      .bind(i.workspaceId, studentId, month)
      .all<{ status: string; count: number }>(),
    db
      .prepare(
        `SELECT t.id AS test_id,t.name,t.date,t.max,s.value FROM tests t LEFT JOIN scores s
      ON s.test_id=t.id AND s.student_id=? WHERE t.workspace_id=? AND t.class_id=? AND t.archived=0
      AND substr(t.date,1,7)=? ORDER BY t.date,t.id`,
      )
      .bind(studentId, i.workspaceId, student.class_id, month)
      .all(),
    db
      .prepare(
        `SELECT stars,count(*) AS count FROM session_comments c JOIN class_sessions s ON s.id=c.session_id
      WHERE c.workspace_id=? AND c.student_id=? AND c.status='sent' AND substr(s.date,1,7)=? GROUP BY stars`,
      )
      .bind(i.workspaceId, studentId, month)
      .all<{ stars: number; count: number }>(),
    db
      .prepare(
        `SELECT hs.kind, g.level, count(*) AS count FROM homework_grades g JOIN homework_sections hs
      ON hs.id=g.section_id JOIN class_sessions s ON s.id=hs.session_id WHERE g.workspace_id=? AND g.student_id=?
      AND g.level IS NOT NULL AND substr(s.date,1,7)=? GROUP BY hs.kind,g.level`,
      )
      .bind(i.workspaceId, studentId, month)
      .all<{ kind: string; level: string; count: number }>(),
    db
      .prepare(
        "SELECT general_comment FROM reports WHERE workspace_id=? AND student_id=? AND month=?",
      )
      .bind(i.workspaceId, studentId, month)
      .first<{ general_comment: string }>(),
  ]);
  const counts = Object.fromEntries(
    attendance.results.map((x) => [x.status, x.count]),
  );
  const starCounts = Object.fromEntries(
    stars.results.map((x) => [
      x.stars === 3 ? "three" : x.stars === 2 ? "two" : "one",
      x.count,
    ]),
  );
  const held = await db
    .prepare(
      `SELECT count(*) AS n FROM class_sessions WHERE workspace_id=? AND class_id=? AND status='held' AND substr(date,1,7)=?`,
    )
    .bind(i.workspaceId, student.class_id, month)
    .first<{ n: number }>();
  const homeworkByKind = new Map<
    string,
    { kind: string; excellent: number; done: number; not_done: number }
  >();
  for (const row of homework.results) {
    const summary = homeworkByKind.get(row.kind) ?? {
      kind: row.kind,
      excellent: 0,
      done: 0,
      not_done: 0,
    };
    if (row.level === "excellent" || row.level === "done" || row.level === "not_done") {
      summary[row.level] = row.count;
    }
    homeworkByKind.set(row.kind, summary);
  }
  const homeworkSummary = [...homeworkByKind.values()].sort((a, b) =>
    a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0,
  );
  return {
    student_id: studentId,
    month,
    attendance: {
      present: counts.present ?? 0,
      late: counts.late ?? 0,
      excused: counts.excused ?? 0,
      absent: counts.absent ?? 0,
      held_sessions: held?.n ?? 0,
    },
    tests: tests.results,
    stars: {
      three: starCounts.three ?? 0,
      two: starCounts.two ?? 0,
      one: starCounts.one ?? 0,
    },
    homework: homeworkSummary,
    general_comment: report?.general_comment ?? "",
    ready: true,
  };
}

export async function listStudentReports(
  db: D1Database,
  i: Identity,
  studentId: string,
  limit: number,
  cursorMonth: string | null = null,
) {
  const student = await db
    .prepare("SELECT class_id FROM students WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, studentId)
    .first<{ class_id: string }>();
  if (!student) return null;
  requireAccess(i, "comments_reports", "read", {
    classId: student.class_id,
    studentId,
  });
  const guardian = i.scopeKind === "linked_students";
  return db
    .prepare(
      `SELECT r.id AS report_id,r.student_id,r.month,r.status,r.needs_republish,r.publication_count,r.published_at,r.version
    FROM reports r WHERE r.workspace_id=? AND r.student_id=? ${guardian ? "AND r.status='published'" : ""} ${cursorMonth ? "AND r.month < ?" : ""} ORDER BY r.month DESC LIMIT ?`,
    )
    .bind(
      i.workspaceId,
      studentId,
      ...(cursorMonth ? [cursorMonth] : []),
      limit,
    )
    .all();
}

export async function reportNotificationStatements(
  db: D1Database,
  i: Identity,
  studentId: string,
  reportId: string,
  publicationNo: number,
  now: string,
) {
  const { results } = await db
    .prepare(
      `SELECT gs.user_id,m.id AS membership_id FROM guardian_student gs
   JOIN memberships m ON m.user_id=gs.user_id AND m.workspace_id=gs.workspace_id AND m.status='active'
   JOIN roles r ON r.id=m.role_id AND r.scope_kind='linked_students'
   WHERE gs.workspace_id=? AND gs.student_id=?`,
    )
    .bind(i.workspaceId, studentId)
    .all<{ user_id: string; membership_id: string }>();
  return results.map((recipient) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO notifications(workspace_id,user_id,membership_id,kind,event_key,student_id,session_id,report_id,test_id,created_at,ready_at)
   VALUES(?,?,?,'report_published',?,?,NULL,?,NULL,?,?)`,
      )
      .bind(
        i.workspaceId,
        recipient.user_id,
        recipient.membership_id,
        `report:${reportId}:${publicationNo}`,
        studentId,
        reportId,
        now,
        now,
      ),
  );
}

export async function getPublication(
  db: D1Database,
  i: Identity,
  reportId: string,
  no: number,
) {
  type PublicationRow = {
    id: string;
    workspace_id: string;
    class_id: string;
    student_id: string;
    report_id: string;
    month: string;
    publication_no: number;
    snapshot: string;
    published_by: string;
    published_at: string;
  };
  const row = await db
    .prepare(
      `SELECT p.id,p.workspace_id,p.class_id,p.student_id,p.report_id,p.month,p.publication_no,p.snapshot,p.published_by,p.published_at
      FROM report_publications p WHERE p.workspace_id=? AND p.report_id=? AND p.publication_no=?`,
    )
    .bind(i.workspaceId, reportId, no)
    .first<PublicationRow>();
  if (!row) return null;
  requireAccess(i, "comments_reports", "read", {
    classId: row.class_id,
    studentId: row.student_id,
  });
  if (i.scopeKind === "linked_students" && !row.published_at) return null;
    return { ...row, snapshot: JSON.parse(row.snapshot) };
}
