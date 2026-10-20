import { useSyncExternalStore } from "react";
import type { StoreState } from "./types";
import { createSeed } from "./seed";
import { migrateStore } from "./migrations";
const KEY = "teacher-prototype-v1";
const listeners = new Set<() => void>();
let error = false;
function load(): StoreState {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed.classes) &&
        Array.isArray(parsed.pending) &&
        Array.isArray(parsed.changeLogs)
      )
          return migrateStore(parsed) as StoreState;
    }
  } catch {
    error = true;
  }
  return createSeed();
}
let state = load();
export const getStore = (): StoreState => state;
export const hasStorageError = (): boolean => error;
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emit() {
  listeners.forEach((listener) => listener());
}
export function updateStore(change: (draft: StoreState) => void): void {
  const next = structuredClone(state);
  change(next);
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    error = true;
    emit();
    throw new Error("Không thể lưu trên máy. Hãy kiểm tra dung lượng lưu trữ.");
  }
  state = next;
  error = false;
  emit();
}
export function replaceStore(next: StoreState): void {
  updateStore((draft) => Object.assign(draft, next));
}
export function useStore<T = StoreState>(
  selector: (state: StoreState) => T = (s) => s as T,
): T {
  const snapshot = useSyncExternalStore(subscribe, getStore, getStore);
  return selector(snapshot);
}
