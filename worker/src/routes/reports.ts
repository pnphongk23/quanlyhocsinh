import { Hono } from "hono";
import type { AppEnv } from "../types";
import { notFound, validationError } from "../lib/errors";
import { requireAccess } from "../db/authz";
import {
  getPublication,
  listClassReports,
  listStudentReports,
  previewReport,
  reportNotificationStatements,
} from "../db/reports";

export const reportsRoutes = new Hono<AppEnv>();
const validMonth = (s: string | undefined): s is string =>
  !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
reportsRoutes.get("/classes/:id/reports", async (c) => {
  const month = c.req.query("month");
  if (!validMonth(month)) throw validationError({ month: "Expected YYYY-MM." });
  const result = await listClassReports(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
    month,
  );
  return c.json({ items: result.results });
});
reportsRoutes.get("/students/:id/report-preview", async (c) => {
  const month = c.req.query("month");
  if (!validMonth(month)) throw validationError({ month: "Expected YYYY-MM." });
  const result = await previewReport(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
    month,
  );
  if (!result) throw notFound();
  return c.json(result);
});
reportsRoutes.put("/students/:id/reports/:month", async (c) => {
  const { id, month } = c.req.param();
  if (!validMonth(month)) throw validationError({ month: "Expected YYYY-MM." });
  const body = await c.req.json<{ general_comment?: unknown }>();
  if (
    typeof body.general_comment !== "string" ||
    body.general_comment.length > 4000
  )
    throw validationError({
      general_comment: "Expected text up to 4000 characters.",
    });
  const db = c.env.DB,
    i = c.get("identity");
  const student = await db
    .prepare("SELECT class_id FROM students WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, id)
    .first<{ class_id: string }>();
  if (!student) throw notFound();
  requireAccess(i, "comments_reports", "write", {
    classId: student.class_id,
    studentId: id,
  });
  const now = new Date().toISOString(),
    rid = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO reports(id,workspace_id,class_id,student_id,month,status,general_comment,needs_republish,publication_count,published_at,version,created_at,updated_at,updated_by)
  VALUES(?,?,?,?,?,'draft',?,0,0,NULL,1,?,?,?) ON CONFLICT(student_id,month) DO UPDATE SET general_comment=excluded.general_comment,needs_republish=CASE WHEN reports.status='published' THEN 1 ELSE reports.needs_republish END,version=reports.version+1,updated_at=excluded.updated_at,updated_by=excluded.updated_by`,
    )
    .bind(
      rid,
      i.workspaceId,
      student.class_id,
      id,
      month,
      body.general_comment,
      now,
      now,
      i.userId,
    )
    .run();
  const row = await db
    .prepare(
      "SELECT id,student_id,month,status,general_comment,version FROM reports WHERE workspace_id=? AND student_id=? AND month=?",
    )
    .bind(i.workspaceId, id, month)
    .first();
  return c.json(row);
});
reportsRoutes.post("/students/:id/reports/:month/publish", async (c) => {
  const { id, month } = c.req.param();
  if (!validMonth(month)) throw validationError({ month: "Expected YYYY-MM." });
  const i = c.get("identity"),
    db = c.env.DB;
  const preview = await previewReport(db, i, id, month);
  if (!preview) throw notFound();
  const student = await db
    .prepare("SELECT class_id FROM students WHERE workspace_id=? AND id=?")
    .bind(i.workspaceId, id)
    .first<{ class_id: string }>();
  if (!student) throw notFound();
  requireAccess(i, "comments_reports", "write", {
    classId: student.class_id,
    studentId: id,
  });
  const now = new Date().toISOString(),
    rid = crypto.randomUUID(),
    pid = crypto.randomUUID();
  const existing = await db
    .prepare(
      "SELECT id,publication_count,general_comment FROM reports WHERE workspace_id=? AND student_id=? AND month=?",
    )
    .bind(i.workspaceId, id, month)
    .first<{
      id: string;
      publication_count: number;
      general_comment: string;
    }>();
  const reportId = existing?.id ?? rid;
  const no = (existing?.publication_count ?? 0) + 1;
  const snapshot = {
    ...preview,
    general_comment: existing?.general_comment ?? "",
  };
  const snapshotText = JSON.stringify(snapshot);
  const notifications = await reportNotificationStatements(
    db,
    i,
    id,
    reportId,
    no,
    now,
  );
  if (existing) {
    await db.batch([
      db
        .prepare(
          `INSERT INTO report_publications(id,workspace_id,class_id,student_id,report_id,month,publication_no,snapshot,published_by,published_at) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          pid,
          i.workspaceId,
          student.class_id,
          id,
          reportId,
          month,
          no,
          snapshotText,
          i.userId,
          now,
        ),
      db
        .prepare(
          `UPDATE reports SET status='published',needs_republish=0,publication_count=?,published_at=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND workspace_id=?`,
        )
        .bind(no, now, now, i.userId, reportId, i.workspaceId),
      ...notifications,
    ]);
  } else {
    await db.batch([
      db
        .prepare(
          `INSERT INTO reports(id,workspace_id,class_id,student_id,month,status,general_comment,needs_republish,publication_count,published_at,version,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,'published','',0,?,?,1,?,?,?)`,
        )
        .bind(
          reportId,
          i.workspaceId,
          student.class_id,
          id,
          month,
          no,
          now,
          now,
          now,
          i.userId,
        ),
      db
        .prepare(
          `INSERT INTO report_publications(id,workspace_id,class_id,student_id,report_id,month,publication_no,snapshot,published_by,published_at) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          pid,
          i.workspaceId,
          student.class_id,
          id,
          reportId,
          month,
          no,
          snapshotText,
          i.userId,
          now,
        ),
      ...notifications,
    ]);
  }
  return c.json(
    { report_id: reportId, publication_no: no, published_at: now, snapshot },
    201,
  );
});
reportsRoutes.get("/students/:id/reports", async (c) => {
  const limit = Math.max(
    1,
    Math.min(200, Number(c.req.query("limit") ?? 50) || 50),
  );
  let cursorMonth: string | null = null;
  const cursor = c.req.query("cursor");
  if (cursor) {
    try {
      cursorMonth = atob(cursor);
      if (!validMonth(cursorMonth)) throw new Error();
    } catch {
      throw validationError({ cursor: "Invalid cursor." });
    }
  }
  const result = await listStudentReports(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
    limit + 1,
    cursorMonth,
  );
  if (!result) throw notFound();
  const hasMore = result.results.length > limit;
  const items = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = items[items.length - 1] as { month: string } | undefined;
  const next_cursor = hasMore && lastItem ? btoa(lastItem.month) : null;
  return c.json({ items, next_cursor });
});
reportsRoutes.get("/reports/:id/publications/:no", async (c) => {
  const no = Number(c.req.param("no"));
  if (!Number.isInteger(no) || no < 1)
    throw validationError({ publication_no: "Expected positive integer." });
  const row = await getPublication(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
    no,
  );
  if (!row) throw notFound();
  return c.json(row);
});
