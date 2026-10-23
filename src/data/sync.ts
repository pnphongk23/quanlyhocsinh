import { ApiError, createApiClient } from "./api/client";
import type { ApiClass, CommandResult, EntityMap, PullResponse, SyncCommand } from "./api/types";
import { db, getCacheIdentity, identityKey, rowKey, stored, tableFor, type EntityName, type OutboxRow } from "./db";
import { clearSession, getToken, invalidateActiveMembership } from "./auth/session";
import { hydrateStore } from "./store";
import { setSaveStatus } from "./saveStatus";
import { logoutLockKey } from "./outbox";
import { classFromApi } from "./api/mapping";
const defaultBase = "https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1";
export const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || defaultBase, getToken: () => getToken() });
let running: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const entities: Array<EntityName> = ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report", "report_publication"];
function keyParts(entity: EntityName, item: Record<string, unknown>): Array<string | number | null> {
  switch (entity) {
    case "attendance": case "slip": return [item.session_id as string, item.student_id as string];
    case "score": return [item.test_id as string, item.student_id as string];
    case "homework_grade": return [item.section_id as string, item.student_id as string];
    default: return [item.id as string];
  }
}
function toView(entity: EntityName, item: Record<string, any>): Record<string, any> {
  switch (entity) {
    case "class": return classFromApi(item as unknown as ApiClass);
    case "student": return { id: item.id, classId: item.class_id, name: item.name, parentPhone: item.parent_phone ?? "", enrolledAt: item.enrolled_at, leftAt: item.left_at, status: item.status };
      case "class_session": return { id: item.id, classId: item.class_id, date: item.date, time: item.start_time, origin: item.origin, makeup: item.is_makeup, status: item.status, note: item.note, version: item.version };
    case "attendance": return { id: `${item.session_id}:${item.student_id}`, sessionId: item.session_id, studentId: item.student_id, status: item.status, note: item.note ?? "", lateAt: item.late_at ?? null, version: item.version };
    case "test": return { id: item.id, classId: item.class_id, name: item.name, date: item.date, max: item.max, archived: item.archived, version: item.version };
    case "score": return { id: `${item.test_id}:${item.student_id}`, testId: item.test_id, studentId: item.student_id, value: item.value, version: item.version };
    case "slip": return { id: `${item.session_id}:${item.student_id}`, classId: "", studentId: item.student_id, sessionId: item.session_id, stars: item.stars, note: item.note, status: item.status, sendQueued: false, sentAt: item.sent_at, updatedAt: item.updated_at, createdAt: item.updated_at };
    case "homework_section": return { id: item.id, sessionId: item.session_id, kind: item.kind, title: item.title, description: item.description, version: item.version };
    case "homework_grade": return { sectionId: item.section_id, studentId: item.student_id, level: item.level ?? null, version: item.version };
    case "report": return { id: item.id, classId: item.class_id, studentId: item.student_id, month: item.month, status: item.status, generalComment: item.general_comment, needsRepublish: item.needs_republish, publishedAt: item.published_at };
    case "report_publication": return item;
  }
}
function updateStoreView(entity: EntityName, item: Record<string, any>): void {
  const view = toView(entity, item); const state = window.__QLH_STATE__;
  if (!state) return;
    if (entity === "report_publication") {
      const publications = state.reportPublications;
      const existing = publications.findIndex((entry) => entry.id === item.id);
      if (existing >= 0) publications[existing] = item as typeof publications[number]; else publications.push(item as typeof publications[number]);
      const report = { id: item.report_id, classId: item.class_id, studentId: item.student_id, month: item.month, status: "published", generalComment: "", needsRepublish: false, publishedAt: item.published_at };
      const reportIndex = state.reports.findIndex((entry) => entry.id === report.id && entry.studentId === report.studentId && entry.month === report.month);
      if (reportIndex >= 0) state.reports[reportIndex] = report as typeof state.reports[number]; else state.reports.push(report as typeof state.reports[number]);
      return;
    }
    const target = ({ class: "classes", student: "students", class_session: "sessions", attendance: "attendance", test: "tests", score: "scores", slip: "comments", homework_section: "homeworkSections", homework_grade: "homeworkGrades", report: "reports" } as const)[entity];
  const list = state[target] as Array<Record<string, any>>; const k = entity === "attendance" ? `${item.session_id}:${item.student_id}` : entity === "score" ? `${item.test_id}:${item.student_id}` : entity === "slip" ? `${item.session_id}:${item.student_id}` : entity === "homework_grade" ? `${item.section_id}:${item.student_id}` : item.id;
  const index = list.findIndex((entry) => entry.id === k || entry.id === item.id || (entry.sectionId === item.section_id && entry.studentId === item.student_id));
  if (index >= 0) list[index] = view; else list.push(view);
}
declare global { interface Window { __QLH_STATE__?: import("./types").StoreState } }
async function applyPull(page: PullResponse, identity: string): Promise<boolean> {
  await db.transaction("rw", [db.meta, ...entities.map((entity) => tableFor(entity))], async () => {
    for (const entity of entities) for (const item of page.upserts?.[entity] ?? []) {
      const parts = keyParts(entity, item as unknown as Record<string, unknown>), key = `${identity}|${entity}|${parts.join("|")}`;
      const table = tableFor(entity); const existing = await table.get(key) as any;
      if (!existing || Number((item as any).version ?? 0) >= Number(existing.version ?? 0)) await table.put(stored(entity, key, item as object, identity) as any);
    }
    for (const deleted of page.deleted ?? []) {
      const entity = deleted.entity as EntityName; if (!entities.includes(entity)) continue;
      await tableFor(entity).delete(`${identity}|${entity}|${[deleted.k1, deleted.k2].filter(Boolean).join("|")}`);
    }
    await db.meta.put({ key: identity, identity, cursor: page.cursor, epoch: page.epoch });
  });
  return Object.values(page.upserts ?? {}).some((items) => items?.length) || Boolean(page.deleted?.length);
}
const snapshotConcurrency = 4;
const firstPaintEntities: ReadonlyArray<EntityName> = ["class", "student", "class_session"];
async function snapshotEntity(identity: string, membershipId: string, entity: EntityName, isCancelled: () => boolean): Promise<void> {
  const table = tableFor(entity);
  let after: string | undefined;
  do {
    if (isCancelled()) return;
    const page = await api.request(`GET /sync/snapshot/${entity}` as any, { query: { membership_id: membershipId, after, limit: 300 } }) as { items: unknown[]; next_after: string | null };
    await table.bulkPut((page.items as unknown as Array<Record<string, unknown>>).map((item) => stored(entity, `${identity}|${entity}|${keyParts(entity, item).join("|")}`, item, identity) as any));
    after = page.next_after ?? undefined;
  } while (after);
  if (firstPaintEntities.includes(entity) && identityKey() === identity) await hydrateStore();
}
async function snapshot(identity: string, membershipId: string): Promise<void> {
  const header = await api.request("GET /sync/snapshot", { query: { membership_id: membershipId } });
  await clearIdentityCache(identity);
  const queue = (header.entities as string[]).filter((entity): entity is EntityName => entities.includes(entity as EntityName))
    .sort((x, y) => Number(firstPaintEntities.includes(y)) - Number(firstPaintEntities.includes(x)));
  let failure: { error: unknown } | null = null;
  const worker = async () => {
    for (let entity = queue.shift(); entity && !failure; entity = queue.shift()) {
      try { await snapshotEntity(identity, membershipId, entity, () => failure !== null); } catch (error) { failure ??= { error }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(snapshotConcurrency, queue.length) }, worker));
  if (failure) throw (failure as { error: unknown }).error;
  await db.meta.put({ key: identity, identity, cursor: header.cursor, epoch: header.epoch });
  await pull(identity, membershipId);
}
/** Returns whether the local cache changed. */
async function pull(identity: string, membershipId: string): Promise<boolean> {
  let meta = await db.meta.get(identity); if (!meta) { await snapshot(identity, membershipId); return true; }
  let changed = false;
  do {
    try {
      const page: PullResponse = await api.request("GET /sync/pull", { query: { membership_id: membershipId, cursor: meta.cursor, epoch: meta.epoch, limit: 200 } }) as PullResponse;
      changed = await applyPull(page, identity) || changed; meta = { ...meta, cursor: page.cursor, epoch: page.epoch };
      if (!page.has_more) break;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && ["resync_required", "snapshot_required"].includes(error.error.code)) {
        await snapshot(identity, membershipId); return true;
      }
      if (error instanceof ApiError && error.status === 401) { await clearIdentityCache(identity); await clearSession(); return true; }
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        await clearIdentityCache(identity); await invalidateActiveMembership(); return true;
      }
      throw error;
    }
  } while (true);
  return changed;
}
async function clearIdentityCache(identity: string): Promise<void> {
  await db.transaction("rw", [db.meta, ...entities.map((entity) => tableFor(entity))], async () => {
    for (const entity of entities) await tableFor(entity).where("identity").equals(identity).delete();
    await db.meta.delete(identity);
  });
}
export async function clearUserCache(userId: string): Promise<boolean> {
  const identityPrefix = `${userId}:`;
  return db.transaction("rw", [db.meta, db.outbox, ...entities.map((entity) => tableFor(entity))], async () => {
    const racedRows = await db.outbox.where("identity").startsWith(identityPrefix).count();
    if (racedRows) {
      await db.meta.put({ key: logoutLockKey(userId), identity: `logout:${userId}`, cursor: 0, epoch: 0, logoutState: "needs_login", updatedAt: Date.now() });
      setSaveStatus("error");
      return false;
    }
    for (const entity of entities) await tableFor(entity).where("identity").startsWith(identityPrefix).delete();
    await db.meta.where("identity").startsWith(identityPrefix).delete();
    await db.outbox.where("identity").startsWith(identityPrefix).delete();
    await db.meta.delete(logoutLockKey(userId));
    return true;
  });
}
export const clearMembershipCache = clearIdentityCache;
let again = false;
export function syncNow(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = undefined; }
  if (running) { again = true; return running; }
  if (!getCacheIdentity() || !getToken() || (typeof navigator !== "undefined" && !navigator.onLine)) return Promise.resolve();
  running = (async () => {
    await Promise.resolve();
    try {
      do {
        again = false;
        const cache = getCacheIdentity(); if (!cache || !getToken()) break;
        await syncRound(cache.membershipId, identityKey());
      } while (again);
    } finally { running = null; }
  })();
  return running;
}
async function syncRound(membershipId: string, identity: string): Promise<void> {
  let outboxChanged = false;
  try {
    await db.outbox.where("identity").equals(identity).and((row) => row.status === "sending").modify({ status: "pending" });
    while (true) {
      const rows = await db.outbox.where("identity").equals(identity).and((x) => x.status === "pending").sortBy("created_at");
      if (!rows.length) break;
      const batch = [] as typeof rows;
      for (const row of rows) {
        if (batch.length >= 50) break;
        if (row.depends_on) {
          const dependency = await db.outbox.get(row.depends_on);
          if (dependency && dependency.status !== "rejected") continue;
        }
        batch.push(row);
      }
      if (!batch.length) break;
      const commands = batch.map(({ id, type, payload, base_version, created_at }) => ({ id, type, payload, base_version, created_at })) as SyncCommand[];
      await db.outbox.bulkPut(batch.map((row) => ({ ...row, status: "sending" as const })));
      outboxChanged = true;
      let response;
      try { response = await api.request("POST /sync/push", { body: { membership_id: membershipId, device_id: getDeviceId(), commands } }); }
      catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await db.outbox.bulkPut(batch.map((row) => ({ ...row, status: "pending" as const })));
          await clearIdentityCache(identity); await clearSession();
        } else if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
          await db.outbox.bulkPut(batch.map((row) => ({ ...row, status: "rejected" as const, error: e.error.code })));
          await clearIdentityCache(identity); await invalidateActiveMembership();
        } else await db.outbox.bulkPut(batch.map((row) => ({ ...row, status: "pending" as const })));
        throw e;
      }
      const returned = new Set<string>();
      for (const result of response.results) { returned.add(result.id); await applyCommandResult(result, identity); }
      for (const row of batch) if (!returned.has(row.id)) await db.outbox.update(row.id, { status: "pending" });
      if (batch.some((row) => !returned.has(row.id))) break;
    }
    const changed = await pull(identity, membershipId);
    if (changed || outboxChanged) await hydrateStore();
    const remaining = await db.outbox.where("identity").equals(identity).toArray();
    setSaveStatus(remaining.some((x) => x.status === "rejected") ? "error" : remaining.length ? "local" : "synced");
  } catch {
    if (outboxChanged) await hydrateStore();
    if (await db.outbox.where("identity").equals(identity).count()) setSaveStatus("error");
  }
}
async function applyCommandResult(result: CommandResult, identity: string): Promise<void> {
  const row = await db.outbox.get(result.id); if (!row) return;
    if (result.status === "rejected") { await db.outbox.put({ ...row, status: "rejected", error: result.error.code }); return; }
    if (result.status === "duplicate" && (result as { original_status?: string }).original_status === "rejected") {
      await db.outbox.put({ ...row, status: "rejected", error: (result as { error?: { code?: string } }).error?.code ?? row.error ?? "rejected" }); return;
    }
  await db.outbox.delete(result.id);
}
function getDeviceId(): string {
  const key = "qlh.device.v1"; let id = localStorage.getItem(key); if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); } return id;
}
export function scheduleSync(delay = 2_000): void { if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = undefined; void syncNow(); }, delay); }
const pollInterval = 60_000;
if (typeof window !== "undefined") {
  let poll: ReturnType<typeof setInterval> | undefined;
  const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
  const startPoll = () => { if (!poll && visible()) poll = setInterval(() => void syncNow(), pollInterval); };
  const stopPoll = () => { if (poll) { clearInterval(poll); poll = undefined; } };
  // Several foreground events fire together on iOS; one already-running round pulls after them all.
  const onForeground = () => { if (!running) void syncNow(); };
  window.addEventListener("online", onForeground);
  window.addEventListener("focus", onForeground);
  window.addEventListener("pageshow", onForeground);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
    if (visible()) { startPoll(); onForeground(); } else stopPoll();
  });
  startPoll();
}
