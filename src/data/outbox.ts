import type { SyncCommand } from "./api/types";
import { db, getCacheIdentity, identityKey, rowKey, stored, tableFor, type EntityName, type OutboxRow } from "./db";
import { getStore, replaceStore } from "./store";
import type { StoreState } from "./types";
import { setSaveStatus } from "./saveStatus";
import { scheduleSync } from "./sync";

export function commitState<T>(entity: string, key: string, change: (draft: StoreState) => T): T {
    const draft: StoreState = { ...getStore(), classes: [...getStore().classes], students: [...getStore().students], sessions: [...getStore().sessions], attendance: [...getStore().attendance], tests: [...getStore().tests], scores: [...getStore().scores], comments: [...getStore().comments], homeworkSections: [...getStore().homeworkSections], homeworkGrades: [...getStore().homeworkGrades], reportBatches: [...getStore().reportBatches], reports: [...getStore().reports], reportPublications: [...getStore().reportPublications], changeLogs: [...getStore().changeLogs], pending: [...getStore().pending] };
  const result = change(draft); replaceStore(draft); return result;
}
function keyForCommand(command: SyncCommand): string | undefined {
  const p = command.payload as Record<string, string>;
  switch (command.type) {
    case "attendance.set": return `${command.type}:${p.session_id}:${p.student_id}`;
    case "score.set": return `${command.type}:${p.test_id}:${p.student_id}`;
    case "slip.set": return `${command.type}:${p.session_id}:${p.student_id}`;
    case "homework.grade.set": return `${command.type}:${p.section_id}:${p.student_id}`;
    default: return undefined;
  }
}
export async function persistCommand(entity: EntityName, parts: Array<string | number | null>, wireRecord: Record<string, unknown> | null, command: SyncCommand): Promise<void> {
  const identity = identityKey(); const cache = getCacheIdentity(); if (!cache) throw new Error("Đăng nhập để lưu thay đổi.");
  const key = rowKey(entity, parts), cellKey = keyForCommand(command);
  const recordTable = tableFor(entity);
  const row: OutboxRow = { id: crypto.randomUUID(), identity, type: command.type, payload: command.payload, base_version: ("base_version" in command && command.base_version !== undefined ? command.base_version : 0), membership_id: cache.membershipId, created_at: command.created_at, status: "pending", cell_key: cellKey, entity_key: key };
  try {
      await db.transaction("rw", [recordTable, db.outbox, db.meta], async () => {
        if (await db.meta.get(logoutLockKey(cache.userId))) throw new Error("Đang đăng xuất, thử lại sau.");
        if (wireRecord) await recordTable.put(stored(entity, key, wireRecord) as any); else await recordTable.delete(key);
        const matching = cellKey ? await db.outbox.where("identity").equals(identity).and((candidate) => candidate.cell_key === cellKey && candidate.status === "pending").first() : undefined;
        const finalRow = matching ? { ...row, base_version: matching.base_version } : row;
        if (matching) await db.outbox.delete(matching.id);
        // Lệnh mới cho cùng ô thay thế lệnh cũ đã bị từ chối, để lỗi cũ không kẹt mãi.
        if (cellKey) await db.outbox.where("identity").equals(identity).and((candidate) => candidate.cell_key === cellKey && candidate.status === "rejected").delete();
        await db.outbox.put(finalRow);
        if (command.type === "score.set") {
          const testId = (command.payload as { test_id: string }).test_id;
          const create = await db.outbox.where("identity").equals(identity).and((candidate) => candidate.type === "test.create" && (candidate.payload as { id: string }).id === testId && candidate.status === "pending").first();
          if (create) await db.outbox.update(finalRow.id, { depends_on: create.id });
        }
    });
    setSaveStatus("local");
      commitState("pending", row.id, (draft) => { draft.pending = [...draft.pending.filter((item) => item.entity !== command.type || item.recordId !== key), { id: row.id, entity: command.type, recordId: key, createdAt: row.created_at }]; });
    scheduleSync();
    } catch (error) {
      setSaveStatus("error");
      if (error instanceof Error && error.message === "Đang đăng xuất, thử lại sau.") throw error;
      throw new Error("Không lưu được vào bộ nhớ trên thiết bị.");
  }
}
export async function pendingCommandCount(): Promise<number> {
  const cache = getCacheIdentity();
  if (!cache) return 0;
  const prefix = `${cache.userId}:`;
  return (await db.outbox.toArray()).filter((row) => row.identity.startsWith(prefix)).length;
}
export const logoutLockKey = (userId: string): string => `logout:${userId}`;
export async function beginLogout(userId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await db.transaction("rw", [db.meta, db.outbox], async () => {
    if (await db.meta.get(logoutLockKey(userId))) throw new Error("Đang đăng xuất, thử lại sau.");
    if ((await db.outbox.toArray()).some((row) => row.identity.startsWith(`${userId}:`))) {
      throw new Error("Đồng bộ các thay đổi đang chờ trước khi đăng xuất.");
    }
    await db.meta.put({ key: logoutLockKey(userId), identity: `logout:${userId}`, cursor: 0, epoch: 0, logoutState: "pending", updatedAt: Date.now() });
  });
}
export async function cancelLogout(userId: string): Promise<void> {
  await db.transaction("rw", db.meta, async () => {
    const lock = await db.meta.get(logoutLockKey(userId));
    if (lock?.logoutState === "pending") await db.meta.delete(lock.key);
  });
}
export async function clearLogoutLock(userId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await db.meta.delete(logoutLockKey(userId));
}
