import { requireAccess } from "./authz";
import { findIdOwner, idConflict, isConstraintError, parseClientId } from "./client-id";
import type { Identity } from "../types";
import { ApiError, notFound, forbidden, validationError } from "../lib/errors";

type Row = Record<string, any>;
const sessionNumberSql = (col: "from_session_id" | "to_session_id") =>
  `(SELECT CASE WHEN s.status='cancelled' THEN NULL ELSE
    (SELECT COUNT(*) FROM class_sessions p WHERE p.class_id=s.class_id AND p.status<>'cancelled'
      AND (p.date<s.date OR (p.date=s.date AND p.start_time<=s.start_time))) END
    FROM class_sessions s WHERE s.id=b.${col})`;
const BATCH_SELECT = `SELECT b.id,b.class_id,b.from_session_id,b.to_session_id,b.from_key,b.to_key,
  ${sessionNumberSql("from_session_id")} AS from_number,${sessionNumberSql("to_session_id")} AS to_number,
  (SELECT count(*) FROM reports r WHERE r.batch_id=b.id) AS total,
  (SELECT count(*) FROM reports r WHERE r.batch_id=b.id AND r.status='draft') AS draft,
  (SELECT count(*) FROM reports r WHERE r.batch_id=b.id AND r.status='published') AS published,
  (SELECT count(*) FROM reports r WHERE r.batch_id=b.id AND r.needs_republish=1) AS needs_republish,
  b.created_at FROM report_batches b`;
const mapBatch = (row: Row) => ({
  id: row.id,
  class_id: row.class_id,
  from_session_id: row.from_session_id,
  to_session_id: row.to_session_id,
  from_key: row.from_key,
  to_key: row.to_key,
  from_number: row.from_number,
  to_number: row.to_number,
  counts: {
    total: row.total,
    draft: row.draft,
    published: row.published,
    needs_republish: row.needs_republish,
  },
  created_at: row.created_at,
});
const REPORT_SELECT = `SELECT r.id AS report_id,r.batch_id,r.student_id,r.month,r.status,r.general_comment,
  r.needs_republish,r.publication_count,r.published_at,r.version FROM reports r`;

async function classExists(db: D1Database, i: Identity, classId: string) {
  const exists = await db
    .prepare("SELECT id FROM classes WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, classId)
    .first();
  if (!exists) throw notFound();
}

export async function createReportBatch(
  db: D1Database,
  i: Identity,
  classId: string,
  input: Record<string, unknown>,
) {
  await classExists(db, i, classId);
  requireAccess(i, "comments_reports", "write", { classId });
  const fields: Record<string, string> = {};
  for (const key of ["from_session_id", "to_session_id"])
    if (typeof input[key] !== "string" || input[key] === "")
      fields[key] = "must_be_string";
  if (Object.keys(fields).length) throw validationError(fields);
  const clientId = parseClientId(input);
  const sessionOf = (id: string) =>
    db
      .prepare(
        "SELECT id,date,start_time,status FROM class_sessions WHERE workspace_id=? AND class_id=? AND id=?",
      )
      .bind(i.workspaceId, classId, id)
      .first<Row>();
  const [from, to] = await Promise.all([
    sessionOf(input.from_session_id as string),
    sessionOf(input.to_session_id as string),
  ]);
  if (!from || !to) throw notFound();
  if (clientId) {
    const owner = await db
      .prepare("SELECT workspace_id,class_id,from_session_id,to_session_id FROM report_batches WHERE id=?")
      .bind(clientId)
      .first<Row>();
    if (owner) {
      if (
        owner.workspace_id !== i.workspaceId ||
        owner.class_id !== classId ||
        owner.from_session_id !== from.id ||
        owner.to_session_id !== to.id
      )
        throw idConflict();
      return { ...(await loadBatchWithReports(db, i.workspaceId, clientId)), created: false };
    }
    if (await findIdOwner(db, clientId)) throw idConflict();
  }
  if (from.status === "cancelled" || to.status === "cancelled")
    throw validationError(
      {
        [from.status === "cancelled" ? "from_session_id" : "to_session_id"]:
          "session_cancelled",
      },
      "session_cancelled",
    );
  const fromKey = `${from.date} ${from.start_time}`,
    toKey = `${to.date} ${to.start_time}`;
  if (fromKey > toKey)
    throw validationError({ to_session_id: "before_from_session" }, "invalid_range");
  const id = clientId ?? crypto.randomUUID(),
    now = new Date().toISOString();
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO report_batches(id,workspace_id,class_id,from_session_id,to_session_id,from_key,to_key,created_by,created_at,version)
        VALUES(?,?,?,?,?,?,?,?,?,1)`,
        )
        .bind(id, i.workspaceId, classId, from.id, to.id, fromKey, toKey, i.userId, now),
      db
        .prepare(
          `INSERT INTO reports(id,workspace_id,class_id,student_id,batch_id,month,status,general_comment,needs_republish,publication_count,published_at,version,created_at,updated_at,updated_by)
        SELECT lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),
          s.workspace_id,s.class_id,s.id,?,?,'draft','',0,0,NULL,1,?,?,?
        FROM students s WHERE s.workspace_id=? AND s.class_id=? AND s.enrolled_at<=? AND (s.left_at IS NULL OR s.left_at>=?)
        ORDER BY s.name,s.id`,
        )
        .bind(id, to.date.slice(0, 7), now, now, i.userId, i.workspaceId, classId, to.date, from.date),
    ]);
  } catch (error) {
    if (isConstraintError(error)) throw idConflict();
    throw error;
  }
  return { ...(await loadBatchWithReports(db, i.workspaceId, id)), created: true };
}

async function loadBatchWithReports(db: D1Database, workspaceId: string, batchId: string) {
  const [batch, reports] = await db.batch<Row>([
    db.prepare(`${BATCH_SELECT} WHERE b.workspace_id=? AND b.id=?`).bind(workspaceId, batchId),
    db
      .prepare(
        `SELECT r.id AS report_id,r.batch_id,r.student_id,s.name AS student_name,r.month,r.status,r.general_comment,
        r.needs_republish,r.publication_count,r.published_at,r.version
        FROM reports r JOIN students s ON s.id=r.student_id WHERE r.workspace_id=? AND r.batch_id=? ORDER BY s.name,r.student_id`,
      )
      .bind(workspaceId, batchId),
  ]);
  return { batch: mapBatch(batch!.results[0]!), reports: reports!.results };
}

export async function listClassReportBatches(db: D1Database, i: Identity, classId: string) {
  await classExists(db, i, classId);
  requireAccess(i, "comments_reports", "read", { classId });
  if (i.scopeKind === "linked_students") throw forbidden();
  const { results } = await db
    .prepare(`${BATCH_SELECT} WHERE b.workspace_id=? AND b.class_id=? ORDER BY b.to_key DESC,b.from_key DESC,b.id`)
    .bind(i.workspaceId, classId)
    .all<Row>();
  return results.map(mapBatch);
}

export async function listBatchReports(db: D1Database, i: Identity, batchId: string) {
  const batch = await db
    .prepare("SELECT class_id FROM report_batches WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, batchId)
    .first<{ class_id: string }>();
  if (!batch) throw notFound();
  requireAccess(i, "comments_reports", "read", { classId: batch.class_id });
  if (i.scopeKind === "linked_students") throw forbidden();
  return loadBatchWithReports(db, i.workspaceId, batchId);
}

type ReportRow = {
  id: string;
  class_id: string;
  student_id: string;
  batch_id: string;
  month: string;
  status: string;
  general_comment: string;
  publication_count: number;
};
async function loadReport(db: D1Database, i: Identity, reportId: string, level: "read" | "write") {
  const report = await db
    .prepare(
      `SELECT id,class_id,student_id,batch_id,month,status,general_comment,publication_count
      FROM reports WHERE workspace_id=? AND id=?`,
    )
    .bind(i.workspaceId, reportId)
    .first<ReportRow>();
  if (!report) throw notFound();
  requireAccess(i, "comments_reports", level, {
    classId: report.class_id,
    studentId: report.student_id,
  });
  if (i.scopeKind === "linked_students") throw forbidden();
  return report;
}

const SESSION_IN_RANGE = "(s.date||' '||s.start_time)>=? AND (s.date||' '||s.start_time)<=?";

async function buildBatchPreview(db: D1Database, workspaceId: string, report: ReportRow) {
  const batch = await db
    .prepare(`${BATCH_SELECT} WHERE b.workspace_id=? AND b.id=?`)
    .bind(workspaceId, report.batch_id)
    .first<Row>();
  if (!batch) throw notFound();
  const fromKey = batch.from_key as string,
    toKey = batch.to_key as string,
    studentId = report.student_id;
  const [attendance, tests, stars, homework, sessions, missingAttendance] = await db.batch<Row>([
    db
      .prepare(
        `SELECT a.status, count(*) AS count FROM attendance a JOIN class_sessions s ON s.id=a.session_id
        JOIN students st ON st.id=a.student_id WHERE a.workspace_id=? AND a.student_id=? AND s.status<>'cancelled'
        AND s.date>=st.enrolled_at AND (st.left_at IS NULL OR s.date<=st.left_at) AND ${SESSION_IN_RANGE} GROUP BY a.status`,
      )
      .bind(workspaceId, studentId, fromKey, toKey),
    db
      .prepare(
        `SELECT t.id AS test_id,t.name,t.date,t.max,s.value FROM tests t JOIN students st ON st.id=? LEFT JOIN scores s
        ON s.test_id=t.id AND s.student_id=st.id WHERE t.workspace_id=? AND t.class_id=? AND t.archived=0
        AND t.date>=? AND t.date<=? AND t.date>=st.enrolled_at AND (st.left_at IS NULL OR t.date<=st.left_at) ORDER BY t.date,t.id`,
      )
      .bind(studentId, workspaceId, report.class_id, fromKey.slice(0, 10), toKey.slice(0, 10)),
    db
      .prepare(
        `SELECT stars,count(*) AS count FROM session_comments c JOIN class_sessions s ON s.id=c.session_id
        JOIN students st ON st.id=c.student_id WHERE c.workspace_id=? AND c.student_id=? AND c.status='sent' AND s.status<>'cancelled'
        AND s.date>=st.enrolled_at AND (st.left_at IS NULL OR s.date<=st.left_at) AND ${SESSION_IN_RANGE} GROUP BY stars`,
      )
      .bind(workspaceId, studentId, fromKey, toKey),
    db
      .prepare(
        `SELECT hs.kind, g.level, count(*) AS count FROM homework_grades g JOIN homework_sections hs
        ON hs.id=g.section_id JOIN class_sessions s ON s.id=hs.session_id JOIN students st ON st.id=g.student_id
        WHERE g.workspace_id=? AND g.student_id=?
        AND g.level IS NOT NULL AND s.status<>'cancelled' AND s.date>=st.enrolled_at AND (st.left_at IS NULL OR s.date<=st.left_at)
        AND ${SESSION_IN_RANGE} GROUP BY hs.kind,g.level`,
      )
      .bind(workspaceId, studentId, fromKey, toKey),
    db
      .prepare(
        `SELECT count(*) AS session_count,COALESCE(SUM(s.status='held'),0) AS held_sessions FROM class_sessions s
        JOIN students st ON st.id=? WHERE s.workspace_id=? AND s.class_id=? AND s.status<>'cancelled'
        AND s.date>=st.enrolled_at AND (st.left_at IS NULL OR s.date<=st.left_at) AND ${SESSION_IN_RANGE}`,
      )
      .bind(studentId, workspaceId, report.class_id, fromKey, toKey),
    db
      .prepare(
          `SELECT count(*) AS count FROM class_sessions s JOIN students st ON st.id=?
            WHERE s.workspace_id=? AND s.class_id=? AND s.status<>'cancelled' AND ${SESSION_IN_RANGE}
          AND s.date>=st.enrolled_at AND (st.left_at IS NULL OR s.date<=st.left_at)
          AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.workspace_id=s.workspace_id AND a.session_id=s.id AND a.student_id=st.id)`,
      )
      .bind(studentId, workspaceId, report.class_id, fromKey, toKey),
  ]);
  const counts = Object.fromEntries(
    attendance!.results.map((x) => [x.status, x.count]),
  );
  const starCounts = Object.fromEntries(
    stars!.results.map((x) => [
      x.stars === 3 ? "three" : x.stars === 2 ? "two" : "one",
      x.count,
    ]),
  );
  const homeworkByKind = new Map<
    string,
    { kind: string; excellent: number; done: number; not_done: number }
  >();
  for (const row of homework!.results) {
    const summary = homeworkByKind.get(row.kind) ?? {
      kind: row.kind,
      excellent: 0,
      done: 0,
      not_done: 0,
    };
    if (row.level === "excellent" || row.level === "done" || row.level === "not_done") {
      summary[row.level as "excellent" | "done" | "not_done"] = row.count;
    }
    homeworkByKind.set(row.kind, summary);
  }
  const homeworkSummary = [...homeworkByKind.values()].sort((a, b) =>
    a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0,
  );
  const ddmm = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
  const dates = ddmm(fromKey) === ddmm(toKey) && fromKey.slice(0, 10) === toKey.slice(0, 10)
    ? ddmm(fromKey)
    : `${ddmm(fromKey)}–${ddmm(toKey)}`;
  const label =
    batch.from_number !== null && batch.to_number !== null
      ? `Buổi ${batch.from_number}–${batch.to_number} · ${dates}`
      : dates;
  const missing: string[] = [];
  if (missingAttendance!.results[0]!.count > 0) missing.push("attendance");
  if (tests!.results.some((test) => test.value === null)) missing.push("scores");
  if (!report.general_comment.trim()) missing.push("comment");
  return {
    report_id: report.id,
    batch_id: report.batch_id,
    student_id: studentId,
    month: report.month,
    range: {
      from_key: fromKey,
      to_key: toKey,
      from_number: batch.from_number,
      to_number: batch.to_number,
      session_count: sessions!.results[0]!.session_count,
      label,
    },
    attendance: {
      present: counts.present ?? 0,
      late: counts.late ?? 0,
      excused: counts.excused ?? 0,
      absent: counts.absent ?? 0,
      held_sessions: sessions!.results[0]!.held_sessions,
    },
    tests: tests!.results,
    stars: {
      three: starCounts.three ?? 0,
      two: starCounts.two ?? 0,
      one: starCounts.one ?? 0,
    },
    homework: homeworkSummary,
    general_comment: report.general_comment,
    ready: missing.length === 0,
    missing,
  };
}

export async function previewBatchReport(db: D1Database, i: Identity, reportId: string) {
  return buildBatchPreview(db, i.workspaceId, await loadReport(db, i, reportId, "read"));
}

export async function updateReportComment(
  db: D1Database,
  i: Identity,
  reportId: string,
  comment: string,
) {
  await loadReport(db, i, reportId, "write");
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE reports SET general_comment=?,needs_republish=CASE WHEN status='published' THEN 1 ELSE needs_republish END,
      version=version+1,updated_at=?,updated_by=? WHERE workspace_id=? AND id=?`,
    )
    .bind(comment, now, i.userId, i.workspaceId, reportId)
    .run();
  return db
    .prepare("SELECT id,batch_id,student_id,month,status,general_comment,needs_republish,version FROM reports WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, reportId)
    .first();
}

async function publishStatements(
  db: D1Database,
  i: Identity,
  report: ReportRow,
  now: string,
) {
  const preview = await buildBatchPreview(db, i.workspaceId, report),
    no = report.publication_count + 1,
    snapshot = preview;
  const notifications = await reportNotificationStatements(
    db,
    i,
    report.student_id,
    report.id,
    no,
    now,
  );
  return {
    snapshot,
    no,
    statements: [
      db
        .prepare(
          `INSERT INTO report_publications(id,workspace_id,class_id,student_id,report_id,batch_id,month,publication_no,snapshot,published_by,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          crypto.randomUUID(),
          i.workspaceId,
          report.class_id,
          report.student_id,
          report.id,
          report.batch_id,
          report.month,
          no,
          JSON.stringify(snapshot),
          i.userId,
          now,
        ),
      db
        .prepare(
          `UPDATE reports SET status='published',needs_republish=0,publication_count=?,published_at=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND workspace_id=?`,
        )
        .bind(no, now, now, i.userId, report.id, i.workspaceId),
      ...notifications,
    ],
  };
}

const concurrentPublish = () =>
  new ApiError(409, "conflict", "Conflict.", { reason: "concurrent_publish" });

export async function publishReport(db: D1Database, i: Identity, reportId: string) {
  const report = await loadReport(db, i, reportId, "write"),
    now = new Date().toISOString();
  const { snapshot, no, statements } = await publishStatements(db, i, report, now);
  if (!snapshot.ready)
    throw new ApiError(409, "conflict", "Report is not ready.", { reason: "report_not_ready", missing: snapshot.missing });
  try {
    await db.batch(statements);
  } catch (error) {
    if (isConstraintError(error)) throw concurrentPublish();
    throw error;
  }
  return { report_id: report.id, batch_id: report.batch_id, publication_no: no, published_at: now, snapshot };
}

export async function publishBatch(db: D1Database, i: Identity, batchId: string) {
  const batch = await db
    .prepare("SELECT class_id FROM report_batches WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, batchId)
    .first<{ class_id: string }>();
  if (!batch) throw notFound();
  requireAccess(i, "comments_reports", "write", { classId: batch.class_id });
  const { results } = await db
    .prepare(
      `SELECT id,class_id,student_id,batch_id,month,status,general_comment,publication_count FROM reports
      WHERE workspace_id=? AND batch_id=? AND (status='draft' OR needs_republish=1) ORDER BY id`,
    )
    .bind(i.workspaceId, batchId)
    .all<ReportRow>();
  const now = new Date().toISOString(),
    statements: D1PreparedStatement[] = [],
    published: { report_id: string; publication_no: number }[] = [],
    skipped: { report_id: string; missing: string[] }[] = [];
  for (const report of results) {
    const built = await publishStatements(db, i, report, now);
    if (!built.snapshot.ready) {
      skipped.push({ report_id: report.id, missing: built.snapshot.missing });
      continue;
    }
    statements.push(...built.statements);
    published.push({ report_id: report.id, publication_no: built.no });
  }
  if (statements.length)
    try {
      await db.batch(statements);
    } catch (error) {
      if (isConstraintError(error)) throw concurrentPublish();
      throw error;
    }
  return { published, skipped, published_at: now };
}

export async function listClassReports(
  db: D1Database,
  i: Identity,
  classId: string,
  month: string,
) {
  await classExists(db, i, classId);
  requireAccess(i, "comments_reports", "read", { classId });
  if (i.scopeKind === "linked_students") throw forbidden();
  return db
    .prepare(
      `SELECT r.id AS report_id, r.batch_id, r.student_id, r.month, r.status, r.needs_republish,
      r.publication_count, r.published_at, r.version FROM reports r
    WHERE r.workspace_id=? AND r.class_id=? AND r.month=? ORDER BY r.student_id, r.batch_id`,
    )
    .bind(i.workspaceId, classId, month)
    .all();
}

/** Xem trước theo tháng dương lịch (đường đọc cũ). Đợt mới dùng `previewBatchReport`. */
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
        `SELECT r.general_comment FROM reports r JOIN report_batches b ON b.id=r.batch_id
      WHERE r.workspace_id=? AND r.student_id=? AND r.month=? ORDER BY b.to_key DESC,r.id LIMIT 1`,
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
  cursor: [string, string] | null = null,
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
      `SELECT r.id AS report_id,r.batch_id,r.student_id,r.month,r.status,r.needs_republish,r.publication_count,r.published_at,r.version,
      b.from_key,b.to_key,${sessionNumberSql("from_session_id")} AS from_number,${sessionNumberSql("to_session_id")} AS to_number
    FROM reports r JOIN report_batches b ON b.id=r.batch_id WHERE r.workspace_id=? AND r.student_id=? ${guardian ? "AND r.status='published'" : ""}
    ${cursor ? "AND (b.to_key < ? OR (b.to_key = ? AND r.id > ?))" : ""} ORDER BY b.to_key DESC, r.id LIMIT ?`,
    )
    .bind(
      i.workspaceId,
      studentId,
      ...(cursor ? [cursor[0], cursor[0], cursor[1]] : []),
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
    batch_id: string | null;
    month: string;
    publication_no: number;
    snapshot: string;
    published_by: string;
    published_at: string;
  };
  const row = await db
    .prepare(
      `SELECT p.id,p.workspace_id,p.class_id,p.student_id,p.report_id,p.batch_id,p.month,p.publication_no,p.snapshot,p.published_by,p.published_at
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
