import { db, getCacheIdentity, identityKey, rowKey, tableFor, stored, type EntityName } from "../db";
import { ApiError } from "../api/client";
import { setSaveStatus } from "../saveStatus";
import { scheduleSync, syncNow } from "../sync";

type Wire = Record<string, unknown> & { id: string; version?: number };

/** Ghi bản ghi máy chủ vừa trả về vào Dexie đúng khoá và hình dạng như pull; bản có version thấp hơn bản đang lưu bị bỏ qua. */
async function cacheRemote(entity: EntityName, item: Wire, base?: Record<string, unknown>): Promise<boolean> {
  if (!getCacheIdentity()) return true;
  const key = rowKey(entity, [item.id]), table = tableFor(entity);
  try {
    await db.transaction("rw", table, async () => {
      const existing = await table.get(key) as Record<string, unknown> | undefined;
      if (existing && item.version !== undefined && item.version < Number(existing.version ?? 0)) return;
      const { identity: _identity, key: _key, entity: _entity, ...current } = existing ?? {};
      await table.put(stored(entity, key, { ...(existing ? current : base), ...item }) as never);
    });
    return true;
  } catch { return false; }
}

async function recovered(entity: EntityName, id: string): Promise<boolean> {
  try { return Boolean(await tableFor(entity).get(rowKey(entity, [id]))); } catch { return false; }
}

/**
 * Sau một ghi REST thành công: ghi cache bền, rồi bộ nhớ, rồi kéo đồng bộ ngay.
 * Nếu ghi cache lỗi thì vẫn cập nhật bộ nhớ, kéo lại để bù cache và chỉ đặt trạng thái lỗi nếu bản ghi vẫn chưa về cache.
 * Bỏ qua nếu người dùng đã đổi vai trò trong lúc chờ máy chủ (lần kéo của vai đó sẽ lấy bản ghi).
 */
export async function commitRemote(identity: string, entity: EntityName, remote: Wire | undefined, base: Record<string, unknown> | undefined, apply: () => void): Promise<void> {
  if (identityKey() !== identity) return;
  const cached = remote && typeof remote.id === "string" ? await cacheRemote(entity, remote, base) : true;
  if (identityKey() !== identity) return;
  apply();
  if (cached) { if (getCacheIdentity()) scheduleSync(0); return; }
  // Máy chủ đã nhận nên thao tác đã thành công; cache máy lỗi thì kéo lại để bù, chỉ báo lỗi đồng bộ nếu bù cũng không được.
  await syncNow();
  if (remote && !(await recovered(entity, remote.id))) setSaveStatus("error");
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
