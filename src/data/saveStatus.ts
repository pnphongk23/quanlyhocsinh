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

/** Lệnh bị máy chủ từ chối (đang giữ trong outbox) để màn hình hiện lỗi cụ thể. */
export interface RejectedCommand { id: string; type: string; error: string }
let rejected: RejectedCommand[] = [];
export const getRejectedCommands = (): RejectedCommand[] => rejected;
export function setRejectedCommands(next: RejectedCommand[]): void {
  if (next.length === rejected.length && next.every((row, i) => row.id === rejected[i].id && row.error === rejected[i].error)) return;
  rejected = next;
  listeners.forEach((listener) => listener());
}
