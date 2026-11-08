import { liveQuery } from "dexie";
import { useEffect, useRef, useState } from "react";
import type { CriteriaSet } from "../../data/api/types";
import { db, rowKey, type StoredCriteriaSet } from "../../data/db";
import { getCachedCriteriaSet, getCriteriaSet } from "../../data/repositories/criteriaSet";

type Listener = (set: CriteriaSet) => void;
const listeners = new Set<Listener>();
let watchingWrites = false;

function withoutCacheFields(row: StoredCriteriaSet): CriteriaSet {
  const { identity: _identity, key: _key, entity: _entity, ...set } = row;
  return set;
}

/**
 * Đăng ký một lần: báo ngay cho các màn đang mở khi hàng cache vừa được ghi trong tab này
 * (liveQuery lo phần còn lại), để màn không phải đọc lại định kỳ.
 */
function watchCriteriaWrites(): void {
  if (watchingWrites) return;
  watchingWrites = true;
  const currentKey = () => rowKey("criteria_set", ["current"]);
  const notify = (row: Partial<StoredCriteriaSet> | undefined) => {
    // Khoá đã giới hạn theo identity; bản ghi trong hook ghi có thể không kèm trường identity.
    if (!row || !Array.isArray(row.criteria) || typeof row.version !== "number") return;
    const set = withoutCacheFields(row as StoredCriteriaSet);
    for (const listener of listeners) listener(set);
  };
  db.criteriaSets.hook("updating", (modifications, key) => {
    if (String(key) !== currentKey()) return;
    notify(modifications as Partial<StoredCriteriaSet>);
  });
  db.criteriaSets.hook("creating", (key, row) => {
    if (String(key) !== currentKey()) return;
    notify(row as Partial<StoredCriteriaSet>);
  });
}

/**
 * Bộ tiêu chí hiện hành của workspace. Theo dõi hàng cache trong Dexie nên khi sync hoặc
 * tải lại ghi bản mới, màn đang mở nhận ngay bộ mới (theo sự kiện, không đọc định kỳ).
 */
export function useCriteriaSet(enabled: boolean): CriteriaSet | null {
  const [criteriaSet, setCriteriaSet] = useState<CriteriaSet | null>(null);
  const seenVersion = useRef(-1);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    // Chỉ nhận bộ mới hơn: bản đọc cũ về muộn không kéo màn hình lùi lại.
    const apply = (set: CriteriaSet | null) => {
      if (!active || !set || set.version < seenVersion.current) return;
      seenVersion.current = set.version;
      setCriteriaSet(set);
    };
    const listener: Listener = (set) => apply(set);
    watchCriteriaWrites();
    listeners.add(listener);
    const subscription = liveQuery(() => getCachedCriteriaSet()).subscribe({
      next: (cached) => apply(cached),
      error: () => undefined,
    });
    // Máy chưa có bản lưu và đang có mạng: tải một lần rồi để phần theo dõi lo tiếp.
    void (async () => {
      const cached = await getCachedCriteriaSet().catch(() => null);
      if (cached || !active || typeof navigator === "undefined" || !navigator.onLine) return;
      try {
        const fresh = await getCriteriaSet();
        apply(fresh);
      } catch {
        // Giữ bộ đã lưu trên máy khi không tải được.
      }
    })();
    return () => {
      active = false;
      listeners.delete(listener);
      subscription.unsubscribe();
    };
  }, [enabled]);
  return criteriaSet;
}
