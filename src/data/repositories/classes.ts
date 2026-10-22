import type { Class } from "../types";
import { getStore } from "../store";
import { commitState } from "../outbox";
import { api } from "../sync";
import { can } from "./access";

function requireNetwork(action: string): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error(`${action} cần kết nối mạng.`);
}
export const listClasses = (): Class[] => getStore().classes.filter((c) => c.status === "active");
export const getClass = (id: string): Class | undefined => getStore().classes.find((c) => c.id === id);
export const hasClass = (id: string): boolean => Boolean(getClass(id));
export function createClass(input: Omit<Class, "id" | "status">): Promise<Class> {
  if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp.");
  requireNetwork("Tạo lớp");
  const item: Class = { ...input, weekdays: [...new Set(input.weekdays)].sort(), id: crypto.randomUUID(), status: "active" };
  return api.request("POST /classes", { body: { name: item.name, weekdays: item.weekdays, start_time: item.time } }).then((remote) => {
    const confirmed = { ...item, id: remote.id, status: remote.status };
    commitState("classes", confirmed.id, (draft) => { draft.classes.push(confirmed); draft.currentClassId ??= confirmed.id; });
    return confirmed;
  });
}
export async function updateClass(id: string, patch: Partial<Pick<Class, "name" | "weekdays" | "time">>): Promise<void> {
  const current = getClass(id); if (!current) throw new Error("Không tìm thấy lớp.");
  if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp.");
  requireNetwork("Sửa lớp");
  const next = { ...current, ...patch };
  const saved: any = await api.request(`PATCH /classes/${id}` as any, { body: { name: next.name, weekdays: next.weekdays, start_time: next.time } } as any);
  commitState("classes", id, (draft) => { draft.classes = draft.classes.map((c) => c.id === id ? { ...next, name: saved.name, weekdays: saved.weekdays, time: saved.start_time } : c); });
}
export async function archiveClass(id: string): Promise<void> {
  const current = getClass(id); if (!current) throw new Error("Không tìm thấy lớp.");
  if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp.");
  requireNetwork("Lưu trữ lớp");
  await api.request(`PATCH /classes/${id}` as any, { body: { status: "archived" } } as any);
  commitState("classes", id, (draft) => { draft.classes = draft.classes.map((c) => c.id === id ? { ...current, status: "archived" } : c); });
}
export const getCurrentClassId = (): string | null => getStore().currentClassId;
export function setCurrentClass(id: string): void { if (!getClass(id)) throw new Error("Không tìm thấy lớp."); commitState("currentClassId", id, (draft) => { draft.currentClassId = id; }); }
