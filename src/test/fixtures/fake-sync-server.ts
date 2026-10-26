import { generatedSlipSentence } from "../../data/slip";

/** In-memory stand-in for the sync endpoints: a shared change log, per-token scope, request tracing and failure injection. */
type Row = Record<string, any>;
export interface Scope { membershipId: string; studentIds?: Set<string>; me?: unknown }
export interface TracedRequest { token: string; method: string; path: string; query: Record<string, string> }

const keyOf = (entity: string, item: Row): string[] => {
  switch (entity) {
    case "attendance": case "slip": return [item.session_id, item.student_id];
    case "score": return [item.test_id, item.student_id];
    case "homework_grade": return [item.section_id, item.student_id];
    default: return [item.id];
  }
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const apiError = (status: number, code: string, details?: Record<string, unknown>) => json({ error: { code, message: code, ...(details ? { details } : {}), request_id: "fake" } }, status);

export function createFakeServer() {
  const rows = new Map<string, Map<string, Row>>();
  const log: Array<{ seq: number; entity: string; item?: Row; gone?: { k1: string; k2: string } }> = [];
  const tokens = new Map<string, Scope>();
  const requests: TracedRequest[] = [];
  const hooks = { failEntity: null as string | null, hold: null as ((req: TracedRequest) => Promise<void> | void) | null, latencyMs: 0, pushDoneAt: [] as number[], pushBatches: [] as Row[][], afterPull: null as (() => void) | null, respond: null as ((req: TracedRequest) => { status: number; code: string } | undefined) | null, onSnapshotPage: null as ((entity: string) => void) | null, rejectCommand: null as ((command: Row) => string | undefined) | null };
  const table = (entity: string) => { let t = rows.get(entity); if (!t) rows.set(entity, t = new Map()); return t; };

  const put = (entity: string, item: Row): Row => {
    const key = keyOf(entity, item).join("|");
    const previous = table(entity).get(key);
    const next = { ...item, version: (previous?.version ?? 0) + 1, updated_at: "2026-10-23T00:00:00Z" };
    table(entity).set(key, next);
    log.push({ seq: log.length + 1, entity, item: next });
    return next;
  };
  const remove = (entity: string, ...parts: string[]) => {
    table(entity).delete(parts.join("|"));
    log.push({ seq: log.length + 1, entity, gone: { k1: parts[0], k2: parts[1] ?? "" } });
  };
  const visible = (scope: Scope, entity: string, item: Row): boolean => {
    if (!scope.studentIds) return true;
    if (entity === "student") return scope.studentIds.has(item.id);
    if (["attendance", "score", "homework_grade", "report"].includes(entity)) return scope.studentIds.has(item.student_id);
    if (entity === "slip") return scope.studentIds.has(item.student_id) && item.status === "sent";
    return !["report_publication", "report_batch"].includes(entity);
  };
  const forScope = (scope: Scope, entity: string, item: Row): Row => {
    if (scope.studentIds && entity === "slip") {
      const { criteria: _criteria, hw_manual: _hwManual, ...guardianSlip } = item;
      return guardianSlip;
    }
    return item;
  };

  function apply(command: Row): Row {
    const p = command.payload;
    let skipped: Array<{ student_id: string; reason: "not_attended" }> | undefined;
    if (command.type === "score.set" && p.value !== null) {
      if (!Number.isFinite(p.value) || p.value < 0 || p.value > 1000) return { id: command.id, status: "rejected", error: { code: "invalid_score", message: "invalid_score", request_id: "fake" } };
      if (Math.round(p.value * 2) !== p.value * 2) return { id: command.id, status: "rejected", error: { code: "invalid_score_step", message: "invalid_score_step", request_id: "fake" } };
    }
      if (command.type === "slip.set") {
        if (p.criteria !== undefined && (!Number.isInteger(p.criteria) || p.criteria < 0 || p.criteria > 31)) return { id: command.id, status: "rejected", error: { code: "invalid_criteria", message: "invalid_criteria", request_id: "fake" } };
        if (p.comment !== undefined && p.comment !== null && typeof p.comment !== "string") return { id: command.id, status: "rejected", error: { code: "invalid_comment", message: "invalid_comment", request_id: "fake" } };
        if (p.hw_manual !== undefined && typeof p.hw_manual !== "boolean") return { id: command.id, status: "rejected", error: { code: "invalid_hw_manual", message: "invalid_hw_manual", request_id: "fake" } };
    }
    switch (command.type) {
      case "attendance.set": if (!["present", "late", "absent"].includes(p.status)) return { id: command.id, status: "rejected", error: { code: "validation_error", message: "invalid_status", request_id: "fake" } }; put("attendance", { session_id: p.session_id, student_id: p.student_id, status: p.status }); break;
        case "test.create": put("test", { id: p.id, class_id: p.class_id, name: p.name, date: p.date, archived: false }); break;
        case "test.update": { const current = table("test").get(p.id); if (!current) return { id: command.id, status: "rejected", error: { code: "not_found", message: "not_found", request_id: "fake" } }; const { max: _oldMax, ...withoutMax } = current; const { max: _ignoredMax, ...patch } = p; put("test", { ...withoutMax, ...patch }); break; }
      case "test.delete": { const current = table("test").get(p.id); if (current?.archived) put("test", { ...current, archived: true }); else remove("test", p.id); break; }
        case "score.set": put("score", { test_id: p.test_id, student_id: p.student_id, value: p.value }); break;
          case "slip.set": { const previous = table("slip").get(`${p.session_id}|${p.student_id}`); const hasCriteria = p.criteria !== undefined; const criteria = hasCriteria ? p.criteria : previous?.criteria ?? null; const comment = hasCriteria ? generatedSlipSentence(criteria) : previous?.comment ?? (typeof p.comment === "string" && !p.comment.trim() ? null : p.comment ?? null); put("slip", { session_id: p.session_id, student_id: p.student_id, ...(criteria === null ? { stars: p.stars ?? previous?.stars, scale: 3 } : { criteria, comment, scale: 5 }), note: p.note ?? previous?.note ?? "", hw_manual: p.hw_manual ?? previous?.hw_manual ?? false, status: "sent", sent_at: "2026-10-23T00:00:00Z" }); break; }
        case "slip.send": for (const studentId of p.student_ids) { const current = table("slip").get(`${p.session_id}|${studentId}`); if (current) put("slip", { ...current, status: "sent", sent_at: "2026-10-23T00:00:00Z" }); else { const attendance = table("attendance").get(`${p.session_id}|${studentId}`); if (attendance?.status === "present" || attendance?.status === "late") put("slip", { session_id: p.session_id, student_id: studentId, criteria: 31, comment: "Con học rất tốt, chăm chỉ, tích cực tham gia phát biểu", scale: 5, stars: 5, note: "", status: "sent", sent_at: "2026-10-23T00:00:00Z" }); else (skipped ??= []).push({ student_id: studentId, reason: "not_attended" }); } } break;
      case "homework.assign": for (const s of p.sections) put("homework_section", { ...s, class_id: "class-1", session_id: p.session_id }); break;
      case "homework.section.upsert": { const session = table("class_session").get(p.session_id); put("homework_section", { ...p, class_id: session?.class_id ?? "class-1" }); break; }
      case "homework.section.delete": remove("homework_section", p.id); break;
      case "homework.grade.set": put("homework_grade", { section_id: p.section_id, student_id: p.student_id, level: p.level }); break;
      default: return { id: command.id, status: "rejected", error: { code: "unsupported", message: "unsupported", request_id: "fake" } };
    }
      return { id: command.id, status: "applied", ...(skipped?.length ? { skipped } : {}) };
  }

  async function fetchFake(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "http://fake.local");
    const token = String((init.headers as Record<string, string>)?.Authorization ?? "").replace("Bearer ", "");
    const path = url.pathname.replace(/^\/v1/, "");
    const query = Object.fromEntries(url.searchParams);
    const request: TracedRequest = { token, method: init.method ?? "GET", path, query };
    requests.push(request);
    await hooks.hold?.(request);
    if (hooks.latencyMs) await new Promise((resolve) => setTimeout(resolve, hooks.latencyMs));
    const forced = hooks.respond?.(request);
    if (forced) return apiError(forced.status, forced.code);
    const scope = tokens.get(token);
    if (!scope) return apiError(401, "unauthorized");
    if (path === "/me") return scope.me ? json(scope.me) : apiError(404, "not_found");
    const cursor = log.length;
    if (path === "/sync/snapshot") return json({ cursor, epoch: 1, window: { from: "", to: "" }, entities: ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report_batch", "report", "report_publication"] });
    const snap = path.match(/^\/sync\/snapshot\/(\w+)$/);
    if (snap) {
      if (hooks.failEntity === snap[1]) return apiError(500, "internal");
      hooks.onSnapshotPage?.(snap[1]);
      const all = [...table(snap[1]).values()].filter((item) => visible(scope, snap[1], item));
      const start = Number(query.after ?? 0), size = Number(query.limit ?? 300);
        const items = all.slice(start, start + size).map((item) => forScope(scope, snap[1], item));
      return json({ items, next_after: start + size < all.length ? String(start + size) : null });
    }
    if (path === "/sync/pull") {
      const since = Number(query.cursor), upserts: Record<string, Row[]> = {}, deleted: Array<{ entity: string; k1: string; k2: string }> = [];
      for (const entry of log.slice(since)) {
          if (entry.item) { if (visible(scope, entry.entity, entry.item)) (upserts[entry.entity] ??= []).push(forScope(scope, entry.entity, entry.item)); }
        else deleted.push({ entity: entry.entity, ...entry.gone! });
      }
      const response = json({ cursor, epoch: 1, has_more: false, server_time: "2026-10-23T00:00:00Z", upserts, deleted });
      hooks.afterPull?.();
      return response;
    }
        if (path === "/sync/push") {
          const body = JSON.parse(String(init.body));
          if (body.commands.length > 50) return apiError(422, "validation_error");
          hooks.pushBatches.push(body.commands);
        const results = body.commands.map((command: Row) => {
            const required: Record<string, string[]> = { "attendance.set": ["session_id", "student_id", "status"], "test.create": ["id", "class_id", "name", "date"], "test.update": ["id"], "test.delete": ["id"], "score.set": ["test_id", "student_id", "value"], "slip.set": ["session_id", "student_id", "note"], "slip.send": ["session_id", "student_ids"], "homework.assign": ["session_id", "sections"], "homework.section.upsert": ["id", "session_id", "kind", "title", "description"], "homework.section.delete": ["id"], "homework.grade.set": ["section_id", "student_id", "level"], "conflict.resolve": ["conflict_id", "choice"] };
          if ((required[command.type] ?? []).some((key) => !Object.hasOwn(command.payload, key))) return { id: command.id, status: "rejected", error: { code: "validation_error", message: "missing_required_field", request_id: "fake" } };
          const code = hooks.rejectCommand?.(command);
        return code ? { id: command.id, status: "rejected", error: { code, message: code, request_id: "fake" } } : apply(command);
      });
      hooks.pushDoneAt.push(performance.now());
      return json({ epoch: 1, cursor: log.length, results });
    }
    const body = init.body ? JSON.parse(String(init.body)) : {};
    if (path === "/session/membership" && request.method === "PUT") {
      const me = scope.me as { memberships?: Array<{ id: string; status: string }>; active_membership_id?: string | null } | undefined;
      const membership = me?.memberships?.find((item) => item.id === body.membership_id && item.status === "active");
      if (!membership) return apiError(403, "membership_inactive");
      scope.membershipId = membership.id;
      scope.me = { ...me, active_membership_id: membership.id };
      return json({ active_membership_id: membership.id, device_registration_cleared: true });
    }
    const addStudent = path.match(/^\/classes\/([^/]+)\/students$/);
    if (addStudent && request.method === "POST") return json(put("student", { id: body.id, class_id: addStudent[1], name: body.name, parent_phone: body.parent_phone ?? null, enrolled_at: body.enrolled_at, left_at: null, status: "active" }), 201);
    const addSession = path.match(/^\/classes\/([^/]+)\/sessions$/);
    if (addSession && request.method === "POST") return json(put("class_session", { id: body.id, class_id: addSession[1], date: body.date, start_time: body.start_time, origin: "manual", is_makeup: body.is_makeup ?? false, status: "planned", note: body.note ?? "" }), 201);
    const cancel = path.match(/^\/sessions\/([^/]+)\/cancel$/);
    if (cancel && request.method === "POST") {
      const current = table("class_session").get(cancel[1]);
      return current ? json(put("class_session", { ...current, status: "cancelled" })) : apiError(404, "not_found");
    }
    const reportResponse = reportRoutes(path, request.method, query, body, scope);
    if (reportResponse) return reportResponse;
    return apiError(404, "not_found");
  }

  /** Báo cáo theo đợt: tạo đợt (idempotent theo `id`), xem trước, lưu nhận xét, phát hành, danh sách và bản phát hành của phụ huynh. */
  const publications = new Map<string, Row>();
  const keyOfSession = (session: Row) => `${session.date} ${session.start_time}`;
    function reportRoutes(path: string, method: string, query: Record<string, string>, body: Row, scope: Scope): Response | null {
      const deleteBatch = path.match(/^\/report-batches\/([^/]+)$/);
      if (deleteBatch && method === "DELETE") {
        const batchId = deleteBatch[1];
        const reportIds = new Set([...table("report").values()].filter((report) => report.batch_id === batchId).map((report) => report.id));
        const removedPublications = new Set<string>();
        for (const publication of table("report_publication").values()) {
          if (publication.batch_id === batchId || reportIds.has(publication.report_id)) removedPublications.add(publication.id);
        }
        for (const [key, publication] of publications) {
          if (publication.batch_id === batchId || reportIds.has(publication.report_id)) {
            removedPublications.add(publication.id);
            publications.delete(key);
          }
        }
        for (const publicationId of removedPublications) remove("report_publication", publicationId);
        for (const reportId of reportIds) remove("report", reportId);
        remove("report_batch", batchId);
        return json({ id: batchId, deleted: true });
      }
      const createBatch = path.match(/^\/classes\/([^/]+)\/report-batches$/);
      if (createBatch && method === "POST") {
      if (typeof body.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) return apiError(422, "invalid_month", { fields: { month: "must_be_month" } });
      const [year, monthNumber] = body.month.split("-").map(Number);
      const monthStart = `${body.month}-01`;
      const monthEnd = `${body.month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
      const existing = body.id ? table("report_batch").get(body.id) : undefined;
      const batch = existing ?? put("report_batch", { id: body.id ?? crypto.randomUUID(), class_id: createBatch[1], month: body.month, from_session_id: null, to_session_id: null, from_key: `${monthStart} 00:00`, to_key: `${monthEnd} 23:59` });
      const students = [...table("student").values()].filter((student) => student.class_id === createBatch[1] && student.enrolled_at <= monthEnd && (!student.left_at || student.left_at >= monthStart));
      const reports = existing
        ? [...table("report").values()].filter((report) => report.batch_id === batch.id)
        : students.map((student) => put("report", { id: crypto.randomUUID(), class_id: createBatch[1], student_id: student.id, batch_id: batch.id, month: body.month, status: "draft", general_comment: "", needs_republish: false, publication_count: 0, published_at: null }));
      const item = (report: Row) => ({ report_id: report.id, batch_id: report.batch_id, student_id: report.student_id, student_name: table("student").get(report.student_id)?.name, month: report.month, status: report.status, general_comment: report.general_comment, needs_republish: report.needs_republish, publication_count: report.publication_count, published_at: report.published_at, version: report.version });
      return json({ batch: { id: batch.id, class_id: batch.class_id, from_session_id: batch.from_session_id, to_session_id: batch.to_session_id, from_key: batch.from_key, to_key: batch.to_key, month: batch.month, from_number: null, to_number: null, counts: { total: reports.length, draft: reports.length, published: 0, needs_republish: 0 }, created_at: "2026-10-24T00:00:00Z" }, reports: reports.map(item) }, existing ? 200 : 201);
    }
    const snapshotOf = (report: Row) => {
      const batch = table("report_batch").get(report.batch_id)!;
      return { report_id: report.id, batch_id: batch.id, student_id: report.student_id, month: report.month, range: { from_key: batch.from_key, to_key: batch.to_key, month: batch.month ?? null, from_number: batch.month ? null : 1, to_number: batch.month ? null : 8, session_count: 8, label: batch.month ? `Tháng ${Number(batch.month.slice(5, 7))}/${batch.month.slice(0, 4)}` : "Buổi 1–8 · 01/10–24/10" }, attendance: { present: 7, late: 1, excused: 0, absent: 0, held_sessions: 8 }, tests: [{ test_id: "t1", name: "Từ vựng", date: "2026-10-05", value: 8 }], stars: { three: 2, two: 1, one: 0 }, stars5: { s5: 4, s4: 2, s3: 0, s2: 0, s1: 0, s0: 0 }, homework: [{ kind: "vocabulary", excellent: 1, done: 1, not_done: 0 }], general_comment: report.general_comment, ready: true };
    };
    const preview = path.match(/^\/reports\/([^/]+)\/preview$/);
    if (preview && method === "GET") {
      const report = table("report").get(preview[1]);
      return report ? json(snapshotOf(report)) : apiError(404, "not_found");
    }
    const one = path.match(/^\/reports\/([^/]+)$/);
    if (one && method === "PUT") {
      const report = table("report").get(one[1]);
      if (!report) return apiError(404, "not_found");
      const next = put("report", { ...report, general_comment: body.general_comment, needs_republish: report.status === "published" ? true : report.needs_republish });
      return json({ id: next.id, batch_id: next.batch_id, student_id: next.student_id, month: next.month, status: next.status, general_comment: next.general_comment, needs_republish: next.needs_republish, version: next.version });
    }
    const publish = (report: Row, at: string) => {
      const no = report.publication_count + 1;
      const next = put("report", { ...report, status: "published", needs_republish: false, publication_count: no, published_at: at });
        const publication = put("report_publication", { id: `${report.id}-${no}`, report_id: report.id, batch_id: report.batch_id, class_id: report.class_id, student_id: report.student_id, month: report.month, publication_no: no, published_at: at, snapshot: snapshotOf(report) });
        publications.set(`${report.id}|${no}`, publication);
      return { next, no };
    };
    const publishOne = path.match(/^\/reports\/([^/]+)\/publish$/);
    if (publishOne && method === "POST") {
      const report = table("report").get(publishOne[1]);
      if (!report) return apiError(404, "not_found");
      const { no } = publish(report, "2026-10-25T01:00:00Z");
      return json({ report_id: report.id, batch_id: report.batch_id, publication_no: no, published_at: "2026-10-25T01:00:00Z", snapshot: snapshotOf(report) }, 201);
    }
    const publishAll = path.match(/^\/report-batches\/([^/]+)\/publish$/);
    if (publishAll && method === "POST") {
      const waiting = [...table("report").values()].filter((report) => report.batch_id === publishAll[1] && (report.status === "draft" || report.needs_republish));
      const published = waiting.map((report) => ({ report_id: report.id, publication_no: publish(report, "2026-10-25T01:00:00Z").no }));
      return json({ published, published_at: "2026-10-25T01:00:00Z" });
    }
    const studentReports = path.match(/^\/students\/([^/]+)\/reports$/);
    if (studentReports && method === "GET") {
      const guardian = Boolean(scope.studentIds);
      const rowsFor = [...table("report").values()]
        .filter((report) => report.student_id === studentReports[1] && (!guardian || report.status === "published"))
        .map((report) => ({ report, batch: table("report_batch").get(report.batch_id)! }))
        .sort((a, b) => b.batch.to_key.localeCompare(a.batch.to_key) || a.report.id.localeCompare(b.report.id));
      const start = query.cursor ? rowsFor.findIndex(({ batch, report }) => JSON.stringify([batch.to_key, report.id]) === atob(query.cursor)) + 1 : 0;
      const limit = Number(query.limit ?? 50), page = rowsFor.slice(start, start + limit);
      const last = page.at(-1);
      return json({
        items: page.map(({ report, batch }) => ({ report_id: report.id, batch_id: report.batch_id, student_id: report.student_id, month: report.month, status: report.status, needs_republish: report.needs_republish, publication_count: report.publication_count, published_at: report.published_at, version: report.version, from_key: batch.from_key, to_key: batch.to_key, from_number: null, to_number: null })),
        next_cursor: start + limit < rowsFor.length && last ? btoa(JSON.stringify([last.batch.to_key, last.report.id])) : null,
      });
    }
    const publication = path.match(/^\/reports\/([^/]+)\/publications\/(\d+)$/);
    if (publication && method === "GET") {
      const row = publications.get(`${publication[1]}|${publication[2]}`);
      return row ? json(row) : apiError(404, "not_found");
    }
    return null;
  }
  return { put, remove, fetch: fetchFake, tokens, requests, hooks, log, rows };
}
