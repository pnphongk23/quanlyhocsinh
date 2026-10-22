import type { SyncCommand } from "./api/types";
import { db, getCacheIdentity, identityKey, rowKey, stored, tableFor, type EntityName, type OutboxRow } from "./db";
import { getStore, replaceStore } from "./store";
import type { StoreState } from "./types";
import { setSaveStatus } from "./saveStatus";
import { scheduleSync } from "./sync";

export function commitState<T>(entity: string, key: string, change: (draft: StoreState) => T): T {
  const draft: StoreState = { ...getStore(), classes: [...getStore().classes], students: [...getStore().students], sessions: [...getStore().sessions], attendance: [...getStore().attendance], tests: [...getStore().tests], scores: [...getStore().scores], comments: [...getStore().comments], homeworkSections: [...getStore().homeworkSections], homeworkGrades: [...getStore().homeworkGrades], reports: [...getStore().reports], changeLogs: [...getStore().changeLogs], pending: [...getStore().pending] };
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
  const matching = cellKey ? await db.outbox.where("identity").equals(identity).and((row) => row.cell_key === cellKey && row.status === "pending").first() : undefined;
  const row: OutboxRow = { id: crypto.randomUUID(), identity, type: command.type, payload: command.payload, base_version: matching?.base_version ?? ("base_version" in command && command.base_version !== undefined ? command.base_version : 0), membership_id: cache.membershipId, created_at: command.created_at, status: "pending", cell_key: cellKey };
  const finalRow = matching ? { ...row, base_version: matching.base_version } : row;
  try {
    await db.transaction("rw", [recordTable, db.outbox], async () => {
      if (wireRecord) await recordTable.put(stored(entity, key, wireRecord) as any); else await recordTable.delete(key);
      if (matching) await db.outbox.delete(matching.id);
      await db.outbox.put(finalRow);
    });
    setSaveStatus("local");
    commitState("pending", row.id, (draft) => { draft.pending = [...draft.pending.filter((item) => item.id !== row.id), { id: row.id, entity: command.type, recordId: key, createdAt: row.created_at }]; });
    scheduleSync();
  } catch {
    setSaveStatus("error"); throw new Error("Không lưu được vào bộ nhớ trên thiết bị.");
  }
}
export async function pendingCommandCount(): Promise<number> { const identity = identityKey(); return db.outbox.where("identity").equals(identity).count(); }
export async function assertCanLogout(): Promise<void> { if (await pendingCommandCount()) throw new Error("Đồng bộ các thay đổi đang chờ trước khi đăng xuất."); }
