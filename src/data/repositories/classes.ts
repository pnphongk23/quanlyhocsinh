import type { Class } from "../types";
import { getStore } from "../store";
import { commitState } from "../outbox";
import { api } from "../sync";
import { identityKey } from "../db";
import { can } from "./access";
import { commitRemote, createOnce } from "./rest-cache";

function requireNetwork(action: string): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error(`${action} cần kết nối mạng.`);
}
export const listClasses = (): Class[] => getStore().classes.filter((c) => c.status === "active");
export const getClass = (id: string): Class | undefined => getStore().classes.find((c) => c.id === id);
export const hasClass = (id: string): boolean => Boolean(getClass(id));
const classWire = (c: Class) => ({ id: c.id, name: c.name, status: c.status, weekdays: c.weekdays, start_time: c.time, teacher_name: c.teacherName ?? null });
export function createClass(input: Omit<Class, "id" | "status">): Promise<Class> {
  if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp.");
  requireNetwork("Tạo lớp");
  const item: Class = { ...input, weekdays: [...new Set(input.weekdays)].sort(), id: "", status: "active" };
  const body = { name: item.name, weekdays: item.weekdays, start_time: item.time };
  const identity = identityKey();
  return createOnce("class", body, (id) => api.request("POST /classes", { body: { id, ...body } })).then(async (remote) => {
    const confirmed = { ...item, id: remote.id, status: remote.status };
    await commitRemote(identity, "class", remote as never, classWire(confirmed), () => commitState("classes", confirmed.id, (draft) => {
      draft.classes = [...draft.classes.filter((c) => c.id !== confirmed.id), confirmed]; draft.currentClassId ??= confirmed.id;
    }));
    return confirmed;
  });
}
export async function updateClass(id: string, patch: Partial<Pick<Class, "name" | "weekdays" | "time">>): Promise<void> {
  const current = getClass(id); if (!current) throw new Error("Không tìm thấy lớp.");
  if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp.");
  requireNetwork("Sửa lớp");
  const next = { ...current, ...patch };
  const identity = identityKey();
  const saved: any = await api.request(`PATCH /classes/${id}` as any, { body: { name: next.name, weekdays: next.weekdays, start_time: next.time } } as any);
  await commitRemote(identity, "class", { id, ...saved }, classWire(current), () => commitState("classes", id, (draft) => { draft.classes = draft.classes.map((c) => c.id === id ? { ...next, name: saved.name, weekdays: saved.weekdays, time: saved.start_time } : c); }));
}
export async function archiveClass(id: string): Promise<void> {
  const current = getClass(id); if (!current) throw new Error("Không tìm thấy lớp.");
  if (!can("classes", "write")) throw new Error("Bạn không có quyền sửa lớp.");
  requireNetwork("Lưu trữ lớp");
  const identity = identityKey();
  const saved: any = await api.request(`PATCH /classes/${id}` as any, { body: { status: "archived" } } as any);
  await commitRemote(identity, "class", { id, ...saved, status: "archived" }, classWire(current), () => commitState("classes", id, (draft) => { draft.classes = draft.classes.map((c) => c.id === id ? { ...current, status: "archived" } : c); }));
}
export const getCurrentClassId = (): string | null => getStore().currentClassId;
export function setCurrentClass(id: string): void { if (!getClass(id)) throw new Error("Không tìm thấy lớp."); commitState("currentClassId", id, (draft) => { draft.currentClassId = id; }); }
