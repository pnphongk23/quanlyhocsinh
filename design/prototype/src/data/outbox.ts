import {
  getStore,
  hasStorageError,
  subscribe,
  updateStore,
  useStore,
} from "./store";
import type { StoreState, SaveState } from "./types";
let timer: ReturnType<typeof setTimeout> | undefined;
export function enqueue(
  draft: StoreState,
  entity: string,
  recordId: string,
): void {
  draft.pending.push({
    id: crypto.randomUUID(),
    entity,
    recordId,
    createdAt: new Date().toISOString(),
  });
}
export function scheduleSync(): void {
  if (
    timer ||
    !getStore().pending.length ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  )
    return;
  const acknowledged = getStore().pending.map((item) => item.id);
  timer = setTimeout(() => {
    timer = undefined;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      updateStore((draft) => {
        draft.pending = draft.pending.filter(
          (item) => !acknowledged.includes(item.id),
        );
      });
      scheduleSync();
    } catch {
      /* Keep pending changes on storage failure. */
    }
  }, 800);
}
export function commit(
  entity: string,
  recordId: string,
  change: (draft: StoreState) => void,
): void {
  updateStore((draft) => {
    change(draft);
    enqueue(draft, entity, recordId);
  });
  scheduleSync();
}
export function usePendingCount(): number {
  return useStore((s) => s.pending.length);
}
export function getSaveStatus(): SaveState {
  return hasStorageError()
    ? "error"
    : getStore().pending.length
      ? "local"
      : "synced";
}
export function subscribeSaveStatus(listener: () => void) {
  return subscribe(listener);
}
if (typeof window !== "undefined") {
  window.addEventListener("online", scheduleSync);
  window.addEventListener("focus", scheduleSync);
  scheduleSync();
}
