import type { Class } from "../types";
import { getStore } from "../store";
import { commitState } from "../outbox";
import { api } from "../sync";
import { can } from "./access";
export const listClasses = (): Class[] => getStore().classes.filter((c) => c.status === "active");
export const getClass = (id: string): Class | undefined => getStore().classes.find((c) => c.id === id);
export const hasClass = (id: string): boolean => Boolean(getClass(id));
export function createClass(input: Omit<Class, "id" | "status">): Class {
  if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp.");
  const item: Class = { ...input, weekdays: [...new Set(input.weekdays)].sort(), id: crypto.randomUUID(), status: "active" };
  commitState("classes", item.id, (draft) => { draft.classes.push(item); draft.currentClassId ??= item.id; });
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Tạo lớp cần kết nối mạng.");
  void api.request("POST /classes", { body: { name: item.name, weekdays: item.weekdays, start_time: item.time } }).then((remote: any) => commitState("classes", item.id, (draft) => { draft.classes = draft.classes.map((c) => c.id === item.id ? { ...item, id: remote.id, status: remote.status } : c); }));
  return item;
}
export function updateClass(id: string, patch: Partial<Pick<Class, "name" | "weekdays" | "time">>): void {
  const current = getClass(id); if (!current) throw new Error("Không tìm thấy lớp.");
  if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp.");
  const next = { ...current, ...patch }; commitState("classes", id, (draft) => { draft.classes = draft.classes.map((c) => c.id === id ? next : c); });
  void api.request(`PATCH /classes/${id}` as any, { body: { name: next.name, weekdays: next.weekdays, start_time: next.time } } as any).catch(() => { });
}
export function archiveClass(id: string): void { const current = getClass(id); if (!current) throw new Error("Không tìm thấy lớp."); if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp."); const next = { ...current, status: "archived" as const }; commitState("classes", id, (draft) => { draft.classes = draft.classes.map((c) => c.id === id ? next : c); }); void api.request(`PATCH /classes/${id}` as any, { body: { status: "archived" } } as any).catch(() => { }); }
export const getCurrentClassId = (): string | null => getStore().currentClassId;
export function setCurrentClass(id: string): void { if (!getClass(id)) throw new Error("Không tìm thấy lớp."); commitState("currentClassId", id, (draft) => { draft.currentClassId = id; }); }
