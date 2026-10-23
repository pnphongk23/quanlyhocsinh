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
const apiError = (status: number, code: string) => json({ error: { code, message: code, request_id: "fake" } }, status);

export function createFakeServer() {
  const rows = new Map<string, Map<string, Row>>();
  const log: Array<{ seq: number; entity: string; item?: Row; gone?: { k1: string; k2: string } }> = [];
  const tokens = new Map<string, Scope>();
  const requests: TracedRequest[] = [];
  const hooks = { failEntity: null as string | null, hold: null as ((req: TracedRequest) => Promise<void> | void) | null, afterPull: null as (() => void) | null, respond: null as ((req: TracedRequest) => { status: number; code: string } | undefined) | null, onSnapshotPage: null as ((entity: string) => void) | null };
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
    return !["report_publication"].includes(entity);
  };

  function apply(command: Row): Row {
    const p = command.payload;
    switch (command.type) {
      case "attendance.set": put("attendance", { session_id: p.session_id, student_id: p.student_id, status: p.status, note: p.note ?? "", late_at: p.late_at ?? null }); break;
      case "test.create": put("test", { id: p.id, class_id: p.class_id, name: p.name, date: p.date, max: p.max ?? 10, archived: false }); break;
      case "score.set": put("score", { test_id: p.test_id, student_id: p.student_id, value: p.value }); break;
      case "slip.set": put("slip", { session_id: p.session_id, student_id: p.student_id, stars: p.stars, note: p.note, status: "sent", sent_at: "2026-10-23T00:00:00Z" }); break;
      case "homework.assign": for (const s of p.sections) put("homework_section", { ...s, class_id: "class-1", session_id: p.session_id }); break;
      case "homework.grade.set": put("homework_grade", { section_id: p.section_id, student_id: p.student_id, level: p.level }); break;
      default: return { id: command.id, status: "rejected", error: { code: "unsupported", message: "unsupported", request_id: "fake" } };
    }
    return { id: command.id, status: "applied" };
  }

  async function fetchFake(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "http://fake.local");
    const token = String((init.headers as Record<string, string>)?.Authorization ?? "").replace("Bearer ", "");
    const path = url.pathname.replace(/^\/v1/, "");
    const query = Object.fromEntries(url.searchParams);
    const request: TracedRequest = { token, method: init.method ?? "GET", path, query };
    requests.push(request);
    await hooks.hold?.(request);
    const forced = hooks.respond?.(request);
    if (forced) return apiError(forced.status, forced.code);
    const scope = tokens.get(token);
    if (!scope) return apiError(401, "unauthorized");
    if (path === "/me") return scope.me ? json(scope.me) : apiError(404, "not_found");
    const cursor = log.length;
    if (path === "/sync/snapshot") return json({ cursor, epoch: 1, window: { from: "", to: "" }, entities: ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report", "report_publication"] });
    const snap = path.match(/^\/sync\/snapshot\/(\w+)$/);
    if (snap) {
      if (hooks.failEntity === snap[1]) return apiError(500, "internal");
      hooks.onSnapshotPage?.(snap[1]);
      const all = [...table(snap[1]).values()].filter((item) => visible(scope, snap[1], item));
      const start = Number(query.after ?? 0), size = Number(query.limit ?? 300);
      const items = all.slice(start, start + size);
      return json({ items, next_after: start + size < all.length ? String(start + size) : null });
    }
    if (path === "/sync/pull") {
      const since = Number(query.cursor), upserts: Record<string, Row[]> = {}, deleted: Array<{ entity: string; k1: string; k2: string }> = [];
      for (const entry of log.slice(since)) {
        if (entry.item) { if (visible(scope, entry.entity, entry.item)) (upserts[entry.entity] ??= []).push(entry.item); }
        else deleted.push({ entity: entry.entity, ...entry.gone! });
      }
      const response = json({ cursor, epoch: 1, has_more: false, server_time: "2026-10-23T00:00:00Z", upserts, deleted });
      hooks.afterPull?.();
      return response;
    }
    if (path === "/sync/push") {
      const body = JSON.parse(String(init.body));
      const results = body.commands.map(apply);
      return json({ epoch: 1, cursor: log.length, results });
    }
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const addStudent = path.match(/^\/classes\/([^/]+)\/students$/);
    if (addStudent && request.method === "POST") return json(put("student", { id: body.id, class_id: addStudent[1], name: body.name, parent_phone: body.parent_phone ?? null, enrolled_at: body.enrolled_at, left_at: null, status: "active" }), 201);
    const addSession = path.match(/^\/classes\/([^/]+)\/sessions$/);
    if (addSession && request.method === "POST") return json(put("class_session", { id: body.id, class_id: addSession[1], date: body.date, start_time: body.start_time, origin: "manual", is_makeup: body.is_makeup ?? false, status: "planned", note: body.note ?? "" }), 201);
    const cancel = path.match(/^\/sessions\/([^/]+)\/cancel$/);
    if (cancel && request.method === "POST") {
      const current = table("class_session").get(cancel[1]);
      return current ? json(put("class_session", { ...current, status: "cancelled" })) : apiError(404, "not_found");
    }
    return apiError(404, "not_found");
  }
  return { put, remove, fetch: fetchFake, tokens, requests, hooks, log, rows };
}
