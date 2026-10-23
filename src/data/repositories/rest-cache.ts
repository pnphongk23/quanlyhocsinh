import { db, getCacheIdentity, identityKey, rowKey, tableFor, stored, type EntityName } from "../db";
import { ApiError } from "../api/client";
import { setSaveStatus } from "../saveStatus";
import { scheduleSync } from "../sync";

type Wire = Record<string, unknown> & { id: string; version?: number };

/** Ghi bản ghi máy chủ vừa trả về vào Dexie đúng khoá và hình dạng như pull; bản có version thấp hơn bản đang lưu bị bỏ qua. */
async function cacheRemote(entity: EntityName, item: Wire, base?: Record<string, unknown>): Promise<void> {
  if (!getCacheIdentity()) return;
  const key = rowKey(entity, [item.id]), table = tableFor(entity);
  try {
    await db.transaction("rw", table, async () => {
      const existing = await table.get(key) as Record<string, unknown> | undefined;
      if (existing && item.version !== undefined && item.version < Number(existing.version ?? 0)) return;
      const { identity: _identity, key: _key, entity: _entity, ...current } = existing ?? {};
      await table.put(stored(entity, key, { ...(existing ? current : base), ...item }) as never);
    });
  } catch { setSaveStatus("error"); }
}

/**
 * Sau một ghi REST thành công: ghi cache bền, rồi bộ nhớ, rồi kéo đồng bộ ngay.
 * Bỏ qua nếu người dùng đã đổi vai trò trong lúc chờ máy chủ (lần kéo của vai đó sẽ lấy bản ghi).
 */
export async function commitRemote(identity: string, entity: EntityName, remote: Wire | undefined, base: Record<string, unknown> | undefined, apply: () => void): Promise<void> {
  if (identityKey() !== identity) return;
  if (remote && typeof remote.id === "string") await cacheRemote(entity, remote, base);
  if (identityKey() !== identity) return;
  apply();
  if (getCacheIdentity()) scheduleSync(0);
}

const pendingIds = new Map<string, string>();
/**
 * Sinh `id` UUID một lần cho mỗi thao tác tạo và giữ nó qua các lần thử lại cùng nội dung,
 * để máy chủ trả 200 thay vì tạo bản thứ hai khi phản hồi lần trước bị mất.
 */
export async function createOnce<T>(scope: string, payload: unknown, send: (id: string) => Promise<T>): Promise<T> {
  const key = `${identityKey()}|${scope}|${JSON.stringify(payload)}`;
  const id = pendingIds.get(key) ?? crypto.randomUUID();
  pendingIds.set(key, id);
  try {
    const result = await send(id);
    pendingIds.delete(key);
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && error.error.code === "id_conflict") {
      pendingIds.delete(key);
      throw new Error("Không tạo được vì mã bị trùng. Hãy thử lại.");
    }
    throw error;
  }
}
