import { Hono } from "hono";
import type { AppEnv } from "../types";
import { ApiError, notFound, validationError } from "../lib/errors";
import {
  createReportBatch,
  getPublication,
  listBatchReports,
  listClassReportBatches,
  listClassReports,
  listStudentReports,
  previewBatchReport,
  previewReport,
  publishBatch,
  publishReport,
  updateReportComment,
} from "../db/reports";

export const reportsRoutes = new Hono<AppEnv>();
const validMonth = (s: string | undefined): s is string =>
  !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const endpointRetired = () =>
  new ApiError(410, "endpoint_retired", "Endpoint retired; use report batches.");
const jsonBody = async (c: { req: { json: () => Promise<unknown> } }) => {
  const body = await c.req.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw validationError({ body: "must_be_object" });
  return body as Record<string, unknown>;
};

reportsRoutes.post("/classes/:id/report-batches", async (c) => {
  const { created, ...result } = await createReportBatch(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
    await jsonBody(c),
  );
  return c.json(result, created ? 201 : 200);
});
reportsRoutes.get("/classes/:id/report-batches", async (c) => {
  const items = await listClassReportBatches(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
  );
  return c.json({ items });
});
reportsRoutes.get("/report-batches/:id/reports", async (c) => {
  const { batch, reports } = await listBatchReports(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
  );
  return c.json({ batch, items: reports });
});
reportsRoutes.post("/report-batches/:id/publish", async (c) =>
  c.json(await publishBatch(c.env.DB, c.get("identity"), c.req.param("id"))),
);
reportsRoutes.get("/reports/:id/preview", async (c) =>
  c.json(
    await previewBatchReport(c.env.DB, c.get("identity"), c.req.param("id")),
  ),
);
reportsRoutes.put("/reports/:id", async (c) => {
  const body = await jsonBody(c);
  if (
    typeof body.general_comment !== "string" ||
    body.general_comment.length > 4000
  )
    throw validationError({
      general_comment: "Expected text up to 4000 characters.",
    });
  return c.json(
    await updateReportComment(
      c.env.DB,
      c.get("identity"),
      c.req.param("id"),
      body.general_comment,
    ),
  );
});
reportsRoutes.post("/reports/:id/publish", async (c) =>
  c.json(await publishReport(c.env.DB, c.get("identity"), c.req.param("id")), 201),
);

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
reportsRoutes.put("/students/:id/reports/:month", () => {
  throw endpointRetired();
});
reportsRoutes.post("/students/:id/reports/:month/publish", () => {
  throw endpointRetired();
});
reportsRoutes.get("/students/:id/reports", async (c) => {
  const limit = Math.max(
    1,
    Math.min(200, Number(c.req.query("limit") ?? 50) || 50),
  );
  let cursorKey: [string, string] | null = null;
  const cursor = c.req.query("cursor");
  if (cursor) {
    try {
      const parsed = JSON.parse(atob(cursor));
      if (
        !Array.isArray(parsed) ||
        parsed.length !== 2 ||
        parsed.some((x) => typeof x !== "string")
      )
        throw new Error();
      cursorKey = [parsed[0], parsed[1]];
    } catch {
      throw validationError({ cursor: "Invalid cursor." });
    }
  }
  const result = await listStudentReports(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
    limit + 1,
    cursorKey,
  );
  if (!result) throw notFound();
  const hasMore = result.results.length > limit;
  const items = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = items[items.length - 1] as
    | { to_key: string; report_id: string }
    | undefined;
  const next_cursor =
    hasMore && lastItem
      ? btoa(JSON.stringify([lastItem.to_key, lastItem.report_id]))
      : null;
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
