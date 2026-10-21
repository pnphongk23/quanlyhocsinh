import type { SaveState } from "./types";
let status: SaveState = "synced";
const listeners = new Set<() => void>();
export const getSaveStatus = (): SaveState => status;
export function subscribeSaveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setSaveStatus(next: SaveState): void {
  status = next;
  listeners.forEach((listener) => listener());
}
