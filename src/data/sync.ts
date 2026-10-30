import { ApiError, createApiClient } from "./api/client";
import type { ApiClass, ApiReport, ApiReportBatch, CommandResult, EntityMap, PullResponse, SyncCommand } from "./api/types";
import { db, getCacheIdentity, identityKey, rowKey, stored, tableFor, type EntityName, type OutboxRow } from "./db";
import { clearSession, getToken, invalidateActiveMembership } from "./auth/session";
import { hydrateStore } from "./store";
import { setRejectedCommands, setSaveStatus } from "./saveStatus";
import { logoutLockKey } from "./outbox";
import { classFromApi, reportBatchFromApi, reportFromApi } from "./api/mapping";
import { starsFromCriteria } from "./slip";
import { clearReportBatchTombstones, isReportBatchDeleted, isReportDeleted } from "./reportBatchTombstones";
import { resolveApiBase } from "./api/baseUrl";
export const api = createApiClient({ baseUrl: resolveApiBase(import.meta.env.VITE_API_BASE), getToken: () => getToken() });
let running: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let pullWhenIdleRequested = false;
let syncFailureVersion = 0;
const entities: Array<EntityName> = ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report_batch", "report", "report_publication"];
function keyParts(entity: EntityName, item: Record<string, unknown>): Array<string | number | null> {
  switch (entity) {
    case "attendance": case "slip": return [item.session_id as string, item.student_id as string];
    case "score": return [item.test_id as string, item.student_id as string];
    case "homework_grade": return [item.section_id as string, item.student_id as string];
    default: return [item.id as string];
  }
}
function isDeletedReportUpsert(entity: EntityName, item: Record<string, unknown>, identity: string): boolean {
  if (entity === "report_batch") return isReportBatchDeleted(identity, item.id);
  if (entity === "report") return isReportBatchDeleted(identity, item.batch_id) || isReportDeleted(identity, item.id);
  if (entity === "report_publication") return isReportBatchDeleted(identity, item.batch_id) || isReportDeleted(identity, item.report_id);
  return false;
}
function toView(entity: EntityName, item: Record<string, any>): Record<string, any> {
  switch (entity) {
    case "class": return classFromApi(item as unknown as ApiClass);
    case "student": return { id: item.id, classId: item.class_id, name: item.name, parentPhone: item.parent_phone ?? "", enrolledAt: item.enrolled_at, leftAt: item.left_at, status: item.status };
    case "class_session": return { id: item.id, classId: item.class_id, date: item.date, time: item.start_time, origin: item.origin, makeup: item.is_makeup, status: item.status === "excused" ? "absent" : item.status, note: item.note, version: item.version };
    case "attendance": return { id: `${item.session_id}:${item.student_id}`, sessionId: item.session_id, studentId: item.student_id, status: item.status, note: item.note ?? "", lateAt: item.late_at ?? null, version: item.version };
    case "test": return { id: item.id, classId: item.class_id, name: item.name, date: item.date, archived: item.archived, version: item.version };
    case "score": return { id: `${item.test_id}:${item.student_id}`, testId: item.test_id, studentId: item.student_id, value: item.value, version: item.version };
    case "slip": { const scale = item.scale ?? (item.criteria == null ? 3 : 5); const criteria = item.criteria ?? null; return { id: `${item.session_id}:${item.student_id}`, classId: "", studentId: item.student_id, sessionId: item.session_id, criteria, comment: item.comment ?? null, scale, stars: scale === 5 && criteria !== null ? starsFromCriteria(criteria) : item.stars ?? null, note: item.note ?? "", hwManual: item.hw_manual === true || item.hw_manual === 1, status: item.status, sendQueued: false, sentAt: item.sent_at, updatedAt: item.updated_at, createdAt: item.updated_at }; }
    case "homework_section": return { id: item.id, sessionId: item.session_id, kind: item.kind, title: item.title, description: item.description, version: item.version };
    case "homework_grade": return { sectionId: item.section_id, studentId: item.student_id, level: item.level ?? null, version: item.version };
    case "report_batch": return reportBatchFromApi(item as unknown as ApiReportBatch);
    case "report": return reportFromApi(item as unknown as ApiReport);
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
    const known = state.reports.findIndex((entry) => entry.id === item.report_id);
    if (known >= 0) state.reports[known] = { ...state.reports[known], status: "published", publishedAt: item.published_at };
    else state.reports.push({ id: item.report_id, classId: item.class_id, studentId: item.student_id, batchId: item.batch_id ?? "", month: item.month, status: "published", generalComment: "", needsRepublish: false, publishedAt: item.published_at });
    return;
  }
  const target = ({ class: "classes", student: "students", class_session: "sessions", attendance: "attendance", test: "tests", score: "scores", slip: "comments", homework_section: "homeworkSections", homework_grade: "homeworkGrades", report_batch: "reportBatches", report: "reports" } as const)[entity];
  const list = state[target] as Array<Record<string, any>>; const k = entity === "attendance" ? `${item.session_id}:${item.student_id}` : entity === "score" ? `${item.test_id}:${item.student_id}` : entity === "slip" ? `${item.session_id}:${item.student_id}` : entity === "homework_grade" ? `${item.section_id}:${item.student_id}` : item.id;
  const index = list.findIndex((entry) => entry.id === k || entry.id === item.id || (entry.sectionId === item.section_id && entry.studentId === item.student_id));
  // Phiếu đang chờ gửi chưa có kết quả từ máy chủ: một lần kéo về không được xoá cờ chờ gửi, nếu không phiếu hiện lại như nháp.
  if (entity === "slip" && index >= 0 && list[index].sendQueued && view.status !== "sent") view.sendQueued = true;
  if (index >= 0) list[index] = view; else list.push(view);
}
declare global { interface Window { __QLH_STATE__?: import("./types").StoreState } }
async function applyPull(page: PullResponse, identity: string): Promise<boolean> {
  await db.transaction("rw", [db.meta, ...entities.map((entity) => tableFor(entity))], async () => {
    for (const entity of entities) for (const item of page.upserts?.[entity] ?? []) {
      if (isDeletedReportUpsert(entity, item as unknown as Record<string, unknown>, identity)) continue;
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
type EntityRows = Array<ReturnType<typeof stored>>;
async function fetchEntity(identity: string, membershipId: string, entity: EntityName, isCancelled: () => boolean, sink: (rows: EntityRows) => Promise<void>): Promise<void> {
  let after: string | undefined;
  do {
    if (isCancelled()) return;
    const page = await api.request(`GET /sync/snapshot/${entity}` as any, { query: { membership_id: membershipId, after, limit: 300 } }) as { items: unknown[]; next_after: string | null };
    await sink((page.items as unknown as Array<Record<string, unknown>>).map((item) => stored(entity, `${identity}|${entity}|${keyParts(entity, item).join("|")}`, item, identity)));
    after = page.next_after ?? undefined;
  } while (after);
}
async function hasLocalData(identity: string): Promise<boolean> {
  if (await db.meta.get(identity)) return true;
  for (const entity of entities) if (await tableFor(entity).where("identity").equals(identity).count()) return true;
  return false;
}
const SNAPSHOT_COOLDOWN_MS = 5 * 60_000;
const lastResyncSnapshotAt = new Map<string, number>();
async function snapshot(identity: string, membershipId: string, causedBy409 = false): Promise<void> {
  const header = await api.request("GET /sync/snapshot", { query: { membership_id: membershipId } });
  // With data already on screen, download everything first and swap it in one transaction so the store never shows a half-loaded cache.
  const swap = await hasLocalData(identity);
  const buffered = new Map<EntityName, EntityRows>();
  if (!swap) await clearIdentityCache(identity);
  const queue = (header.entities as string[]).filter((entity): entity is EntityName => entities.includes(entity as EntityName))
    .sort((x, y) => Number(firstPaintEntities.includes(y)) - Number(firstPaintEntities.includes(x)));
  let failure: { error: unknown } | null = null;
  const worker = async () => {
    for (let entity = queue.shift(); entity && !failure; entity = queue.shift()) {
      const current = entity;
      try {
        await fetchEntity(identity, membershipId, current, () => failure !== null, async (rows) => {
          const acceptedRows = rows.filter((row) => !isDeletedReportUpsert(current, row as unknown as Record<string, unknown>, identity));
          if (swap) buffered.set(current, [...(buffered.get(current) ?? []), ...acceptedRows]);
          else await tableFor(current).bulkPut(acceptedRows as any);
        });
        if (!swap && firstPaintEntities.includes(current) && identityKey() === identity) await hydrateStore();
      } catch (error) { failure ??= { error }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(snapshotConcurrency, queue.length) }, worker));
  if (failure) throw (failure as { error: unknown }).error;
  await db.transaction("rw", [db.meta, ...entities.map((entity) => tableFor(entity))], async () => {
    if (swap) {
      for (const entity of entities) {
        await tableFor(entity).where("identity").equals(identity).delete();
        const acceptedRows = (buffered.get(entity) ?? []).filter((row) => !isDeletedReportUpsert(entity, row as unknown as Record<string, unknown>, identity));
        await tableFor(entity).bulkPut(acceptedRows as any);
      }
    }
    await db.meta.put({ key: identity, identity, cursor: header.cursor, epoch: header.epoch });
  });
  if (causedBy409) lastResyncSnapshotAt.set(identity, Date.now());
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
        if (Date.now() - (lastResyncSnapshotAt.get(identity) ?? Number.NEGATIVE_INFINITY) < SNAPSHOT_COOLDOWN_MS) throw error;
        await snapshot(identity, membershipId, true); return true;
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
  lastResyncSnapshotAt.delete(identity);
  clearReportBatchTombstones(identity);
}
export async function clearUserCache(userId: string): Promise<boolean> {
  const identityPrefix = `${userId}:`;
  const cleared = await db.transaction("rw", [db.meta, db.outbox, ...entities.map((entity) => tableFor(entity))], async () => {
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
  if (cleared) for (const identity of lastResyncSnapshotAt.keys()) if (identity.startsWith(identityPrefix)) lastResyncSnapshotAt.delete(identity);
  return cleared;
}
export const clearMembershipCache = clearIdentityCache;
let again = false;
function runSync(pullWhenIdle: boolean): Promise<void> {
  if (timer) { clearTimeout(timer); timer = undefined; }
  firstScheduledAt = null;
  if (running) { again = true; pullWhenIdleRequested ||= pullWhenIdle; return running; }
  if (!getCacheIdentity() || !getToken() || (typeof navigator !== "undefined" && !navigator.onLine)) return Promise.resolve();
  running = (async () => {
    await Promise.resolve();
    try {
      do {
        again = false;
        const cache = getCacheIdentity(); if (!cache || !getToken()) break;
        const roundPullWhenIdle = pullWhenIdle || pullWhenIdleRequested;
        pullWhenIdleRequested = false;
        await syncRound(cache.membershipId, identityKey(), roundPullWhenIdle);
      } while (again);
    } finally { running = null; }
  })();
  return running;
}
export function syncNow(): Promise<void> { return runSync(true); }
export type RefreshResult = { status: "ok" } | { status: "offline" | "error" };
export async function refreshNow(): Promise<RefreshResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { status: "offline" };
  if (!getCacheIdentity() || !getToken()) return { status: "error" };
  const identityBefore = identityKey();
  const failuresBefore = syncFailureVersion;
  await syncNow();
  // Phiên hết hạn hoặc mất quyền thì bộ nhớ đệm bị xoá giữa chừng: không tính là đã tải lại.
  if (!getToken() || !getCacheIdentity() || identityKey() !== identityBefore) return { status: "error" };
  return syncFailureVersion === failuresBefore ? { status: "ok" } : { status: "error" };
}
async function syncRound(membershipId: string, identity: string, pullWhenIdle: boolean): Promise<void> {
  let outboxChanged = false;
  try {
    await db.outbox.where("identity").equals(identity).and((row) => row.status === "sending").modify({ status: "pending" });
    while (true) {
      const rows = await db.outbox.where("identity").equals(identity).and((x) => x.status === "pending").sortBy("created_at");
      if (!rows.length) break;
      let batch = [] as typeof rows;
      for (const row of rows) {
        if (batch.length >= 50) break;
        if (row.depends_on) {
          const dependency = await db.outbox.get(row.depends_on);
          if (dependency && dependency.status !== "rejected") continue;
        }
        batch.push(row);
      }
      if (!batch.length) break;
      for (let i = 0; i < batch.length; i++) batch[i] = await withTestUpdateId(batch[i], identity);
      // Lệnh có thể đã bị gộp hoặc xoá từ lúc đọc; chỉ nhận lệnh vẫn đang chờ để không dựng lại bản cũ.
      batch = await db.transaction("rw", db.outbox, async () => {
        const claimed = [] as typeof batch;
        for (const row of batch) {
          if ((await db.outbox.get(row.id))?.status !== "pending") continue;
          await db.outbox.put({ ...row, status: "sending" });
          claimed.push(row);
        }
        return claimed;
      });
      if (!batch.length) continue;
      const commands = batch.map(({ id, type, payload, base_version, created_at }) => ({
        id, type, payload: payloadWithoutLegacyFields(type, payload), base_version, created_at,
      })) as SyncCommand[];
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
    if (!outboxChanged && !pullWhenIdle) return;
    const changed = await pull(identity, membershipId);
    if (changed || outboxChanged) await hydrateStore();
    const remaining = await db.outbox.where("identity").equals(identity).toArray();
    publishRejected(remaining);
    setSaveStatus(remaining.some((x) => x.status === "rejected") ? "error" : remaining.length ? "local" : "synced");
  } catch {
    syncFailureVersion++;
    if (outboxChanged) await hydrateStore();
    publishRejected(await db.outbox.where("identity").equals(identity).toArray());
    if (await db.outbox.where("identity").equals(identity).count()) setSaveStatus("error");
  }
}
/** Lệnh còn trong hàng đợi từ bản cũ: bỏ `max` của bài kiểm tra; điểm danh "có phép" gửi thành vắng, không gửi giờ đến và ghi chú. */
function payloadWithoutLegacyFields(type: string, payload: SyncCommand["payload"]): SyncCommand["payload"] {
  if (type === "attendance.set") {
    const { note: _note, late_at: _lateAt, ...current } = payload as Record<string, unknown>;
    return (current.status === "excused" ? { ...current, status: "absent" } : current) as SyncCommand["payload"];
  }
  if (type !== "test.create" && type !== "test.update") return payload;
  const { max: _legacyMax, ...currentPayload } = payload as Record<string, unknown>;
  return currentPayload as SyncCommand["payload"];
}
function publishRejected(rows: OutboxRow[]): void {
  setRejectedCommands(rows.filter((x) => x.status === "rejected").map((x) => ({ id: x.id, type: x.type, error: x.error ?? "rejected" })));
}
/** Lệnh ghi một ô (điểm, điểm danh, phiếu, chấm BTVN): có thể bỏ vì ô đó lấy lại được từ máy chủ. */
const cellEntity: Record<string, EntityName> = { "score.set": "score", "attendance.set": "attendance", "slip.set": "slip", "homework.grade.set": "homework_grade" };
export const canDiscardRejected = (type: string): boolean => type in cellEntity;
/** Lệnh test.update cũ thiếu `id`: lấy id từ khoá thực thể của dòng; dòng cũ chưa có khoá thì chỉ nhận khi đó là lệnh cũ duy nhất và đúng một bài trong bộ nhớ đệm khớp phần sửa. */
async function withTestUpdateId(row: OutboxRow, identity: string): Promise<OutboxRow> {
  if (row.type !== "test.update" || (row.payload as { id?: string }).id) return row;
  const prefix = `${identity}|test|`;
  const patch = row.payload as { name?: string; date?: string };
  let id = row.entity_key?.startsWith(prefix) ? row.entity_key.slice(prefix.length) : undefined;
  if (!id) {
    // Nhiều lệnh cũ có thể cùng sửa một bài; khi đó khớp theo nội dung không phân biệt được, nên không đoán.
    const legacy = await db.outbox.where("identity").equals(identity).and((x) => x.type === "test.update" && !x.entity_key && !(x.payload as { id?: string }).id).count();
    if (legacy !== 1) return row;
    const matches = await db.tests.where("identity").equals(identity).and((test) =>
      (patch.name === undefined || test.name === patch.name) &&
        (patch.date === undefined || test.date === patch.date),
    ).toArray();
    if (matches.length === 1) id = matches[0].id;
  }
  return id ? { ...row, payload: { id, ...patch } as typeof row.payload } : row;
}
/** Đưa lại các lệnh bị từ chối (theo id) vào hàng đợi và đẩy ngay; còn bị từ chối thì mã lỗi mới hiện lại. */
export async function retryRejectedCommands(ids: string[]): Promise<void> {
  const identity = identityKey(), wanted = new Set(ids);
  // Máy chủ trả lại kết quả đã lưu cho cùng id, nên lệnh thử lại phải mang id mới mới được xét lại.
  await db.transaction("rw", [db.outbox, db.tests], async () => {
    const rows = await db.outbox.where("identity").equals(identity).and((row) => row.status === "rejected" && wanted.has(row.id)).toArray();
    const renamed = new Map(rows.map((row) => [row.id, crypto.randomUUID()]));
    for (const row of rows) {
      const fixed = await withTestUpdateId(row, identity);
      await db.outbox.delete(row.id);
      await db.outbox.put({ ...fixed, id: renamed.get(row.id)!, depends_on: row.depends_on && renamed.get(row.depends_on) || row.depends_on, status: "pending", error: undefined });
    }
    await db.outbox.where("identity").equals(identity).and((other) => !!other.depends_on && renamed.has(other.depends_on)).modify((other) => { other.depends_on = renamed.get(other.depends_on!); });
  });
  publishRejected(await db.outbox.where("identity").equals(identity).toArray());
  setSaveStatus("local");
  await syncNow();
}
/** Bỏ các lệnh ghi ô bị từ chối (theo id) rồi lấy lại giá trị hiện tại của từng ô từ máy chủ, không động tới lệnh khác. */
export async function discardRejectedCommands(ids: string[]): Promise<void> {
  const cache = getCacheIdentity(); if (!cache) return;
  const identity = identityKey(), wanted = new Set(ids);
  const rows = (await db.outbox.where("identity").equals(identity).toArray()).filter((row) => row.status === "rejected" && wanted.has(row.id) && canDiscardRejected(row.type));
  if (!rows.length) return;
  const restore = new Map<EntityName, Map<string, string | undefined>>();
  for (const row of rows) {
    const entity = cellEntity[row.type];
    const key = `${identity}|${entity}|${keyParts(entity, row.payload as unknown as Record<string, unknown>).join("|")}`;
    restore.set(entity, (restore.get(entity) ?? new Map()).set(key, row.cell_key));
  }
  // Lấy bản máy chủ trước khi xoá lệnh: lỗi mạng thì giữ nguyên, người dùng thử lại được.
  const fresh = new Map<string, ReturnType<typeof stored>>();
  for (const entity of restore.keys()) await fetchEntity(identity, cache.membershipId, entity, () => false, async (page) => { for (const item of page) fresh.set(item.key, item); });
  await db.transaction("rw", [db.outbox, ...[...restore.keys()].map((entity) => tableFor(entity))], async () => {
    // Kiểm lại trong giao dịch: ô vừa được ghi lại trong lúc tải bản máy chủ thì giữ giá trị mới.
    const live = await db.outbox.where("identity").equals(identity).toArray();
    const stillRejected = rows.filter((row) => live.some((x) => x.id === row.id && x.status === "rejected"));
    const touched = new Set(live.filter((row) => !stillRejected.some((old) => old.id === row.id) && row.cell_key).map((row) => row.cell_key));
    await db.outbox.bulkDelete(stillRejected.map((row) => row.id));
    const restorable = new Set(stillRejected.map((row) => row.cell_key));
    for (const [entity, keys] of restore) for (const [key, cell] of keys) {
      // Ô đã có lệnh khác (kể cả bị từ chối) hoặc lệnh bị bỏ đã bị thay thế thì giữ giá trị hiện có.
      if (!restorable.has(cell) || (cell && touched.has(cell))) continue;
      const item = fresh.get(key);
      if (item) await tableFor(entity).put(item as any); else await tableFor(entity).delete(key);
    }
  });
  await hydrateStore();
  publishRejected(await db.outbox.where("identity").equals(identity).toArray());
  setSaveStatus((await db.outbox.where("identity").equals(identity).count()) ? "local" : "synced");
  await syncNow();
}
async function applyCommandResult(result: CommandResult, identity: string): Promise<void> {
  const row = await db.outbox.get(result.id); if (!row) return;
  if (result.status === "rejected") { await db.outbox.put({ ...row, status: "rejected", error: result.error.code }); return; }
  if (result.status === "duplicate" && (result as { original_status?: string }).original_status === "rejected") {
    await db.outbox.put({ ...row, status: "rejected", error: (result as { error?: { code?: string } }).error?.code ?? row.error ?? "rejected" }); return;
  }
  if (row.type === "slip.send" && result.status === "applied") {
    // Gửi xong: ghi ngay trạng thái đã gửi vào máy để tải lại trước lần kéo về kế tiếp không hiện lại phiếu như nháp.
    const payload = row.payload as { session_id: string; student_ids: string[] };
    const skipped = new Set((result.skipped ?? []).map((item) => item.student_id));
    await db.transaction("rw", [db.slips, db.outbox], async () => {
      for (const studentId of payload.student_ids) {
        if (skipped.has(studentId)) continue;
        const key = `${identity}|slip|${payload.session_id}|${studentId}`;
        const slip = await db.slips.get(key);
        if (slip && (slip as { status?: string }).status !== "sent") await db.slips.put({ ...slip, status: "sent", sent_at: (slip as { sent_at?: string | null }).sent_at ?? new Date().toISOString() } as typeof slip);
      }
      await db.outbox.delete(result.id);
    });
    return;
  }
  await db.outbox.delete(result.id);
}
function getDeviceId(): string {
  const key = "qlh.device.v1"; let id = localStorage.getItem(key); if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); } return id;
}
/** Quiet time after the last change before pushing; each new change restarts it. */
export const SYNC_TRAILING_MS = 400;
/** Upper bound from the first change not yet pushed, so continuous typing still pushes within about a second. */
export const SYNC_MAX_WAIT_MS = 1_000;
let firstScheduledAt: number | null = null;
/** No argument: debounce (trailing + max wait). With a delay: push that long from now, no debounce. */
export function scheduleSync(delay?: number): void {
  if (timer) clearTimeout(timer);
  const now = Date.now();
  if (delay === undefined) firstScheduledAt ??= now; else firstScheduledAt = null;
  const wait = delay ?? Math.min(SYNC_TRAILING_MS, Math.max(0, firstScheduledAt! + SYNC_MAX_WAIT_MS - now));
  timer = setTimeout(() => { timer = undefined; void syncNow(); }, wait);
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { void runSync(false); });
}
