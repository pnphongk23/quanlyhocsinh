import type { Class } from "../types";
import { getStore, updateStore } from "../store";
import { commit } from "../outbox";
import { requireClass, requireOnline, requirePermission } from "./helpers";
import { canAccessClass, requireClassAccess, visibleClassIds } from "./access";
import { generateClassSessions, updateClassSchedule, updateClassScheduleWithName } from "./sessions";
export const listClasses = (): Class[] => {
  const scope = visibleClassIds();
  const classes = getStore().classes;
  if (scope === null) return classes;
  return classes.filter((item) => scope.has(item.id));
};

/** Chỉ trả lớp trong phạm vi vai trò đang dùng; Admin thấy mọi lớp. */
export const getClass = (id: string): Class | undefined =>
  canAccessClass(id)
    ? getStore().classes.find((c) => c.id === id)
    : undefined;

/** Lớp có tồn tại trong workspace không (chỉ để phân biệt 404 với 403). */
export const hasClass = (id: string): boolean =>
  getStore().classes.some((c) => c.id === id);

function validateClassDetails(name: string, weekdays: number[], time: string): void {
  if (
    !name.trim() ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !weekdays.length ||
    weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new Error("Nhập tên lớp, chọn ít nhất một ngày và kiểm tra giờ học.");
  }
}

export function createClass(input: Omit<Class, "id" | "status">): Class {
  requirePermission("classes", "write");
  const item: Class = {
    ...input,
    name: input.name.trim(),
    id: crypto.randomUUID(),
    status: "active",
  };
  validateClassDetails(item.name, item.weekdays, item.time);
  commit("classes", item.id, (d) => {
    d.classes.push(item);
    generateClassSessions(d, item);
  });
  return item;
}
export function updateClass(
  id: string,
  patch: Partial<Pick<Class, "name" | "weekdays" | "time">>,
): void {
  requirePermission("classes", "write");
  requireClassAccess(id);
  const current = requireClass(id);
  const next = { ...current, ...patch, name: (patch.name ?? current.name).trim() };
  validateClassDetails(next.name, next.weekdays, next.time);
  if (patch.weekdays !== undefined || patch.time !== undefined) {
    if (patch.name !== undefined)
      updateClassScheduleWithName(id, { weekdays: next.weekdays, time: next.time }, next.name);
    else updateClassSchedule(id, { weekdays: next.weekdays, time: next.time });
    return;
  }
  commit("classes", id, (d) => {
    const item = requireClass(id, d);
    Object.assign(item, { ...patch, name: next.name });
  });
}
export function archiveClass(id: string): void {
  requirePermission("classes", "write");
  requireOnline();
  requireClassAccess(id);
  requireClass(id);
  commit("classes", id, (d) => {
    requireClass(id, d).status = "archived";
  });
}
export const getCurrentClassId = (): string | null => getStore().currentClassId;
export function setCurrentClass(id: string): void {
  requireClassAccess(id);
  requireClass(id);
  updateStore((d) => {
    d.currentClassId = id;
  });
}
