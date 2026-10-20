import type { Class, Session, StoreState } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requireClass, requirePermission, requireSession } from "./helpers";
import {
  canAccessClass,
  getAccessibleSession,
  requireClassAccess,
  visibleClassIds,
} from "./access";
const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
const validWeekdays = (weekdays: number[]) => weekdays.length > 0 && weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
function validateSchedule(weekdays: number[], time: string): void {
  if (!validWeekdays(weekdays) || !validTime(time))
    throw new Error("Chọn ít nhất một ngày và kiểm tra giờ học.");
}
export function localToday(): string {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function dateAtOffset(today: string, offset: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(year, month - 1, day + offset, 12);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function validDate(dateText: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new Error("Ngày không hợp lệ.");
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    throw new Error("Ngày không hợp lệ.");
}
function scheduleDates(weekdays: number[], today: string): string[] {
  const result: string[] = [];
  for (let offset = 0; offset < 28; offset++) {
    const date = dateAtOffset(today, offset);
    const [year, month, day] = date.split("-").map(Number);
    if (weekdays.includes(new Date(year, month - 1, day, 12).getDay())) result.push(date);
  }
  return result;
}
function hasAttendance(state: StoreState, sessionId: string): boolean {
  return state.attendance.some((item) => item.sessionId === sessionId);
}
export function generateClassSessions(state: StoreState, item: Class, today = localToday()): void {
  for (const date of scheduleDates(item.weekdays, today)) {
    if (state.sessions.some((session) => session.classId === item.id && session.date === date)) continue;
    state.sessions.push({ id: crypto.randomUUID(), classId: item.id, date, time: item.time, origin: "recurring", status: "planned" });
  }
}
/** Buổi của lớp trong phạm vi vai trò đang dùng; ngoài phạm vi trả rỗng. */
export const listSessions = (classId: string): Session[] =>
  canAccessClass(classId)
    ? getStore()
        .sessions.filter((s) => s.classId === classId)
        .sort((a, b) =>
          `${a.date} ${a.time ?? "00:00"}`.localeCompare(
            `${b.date} ${b.time ?? "00:00"}`,
          ),
        )
    : [];

/**
 * Buổi đọc được theo ngữ cảnh: lớp được gán, hoặc ĐÚNG buổi mình dạy thay.
 * Màn chi tiết buổi dùng hàm này thay cho listSessions để không đọc cả lớp.
 */
export const getSession = (id: string): Session | undefined =>
  getAccessibleSession(id);

/** Buổi có tồn tại không (chỉ để phân biệt 404 với 403). */
export const hasSession = (id: string): boolean =>
  getStore().sessions.some((s) => s.id === id);

/** Metadata lớp tối thiểu của một buổi đọc được (kể cả buổi dạy thay). */
export function getSessionClass(sessionId: string): Class | undefined {
  const session = getAccessibleSession(sessionId);
  if (!session) return undefined;
  return getStore().classes.find((item) => item.id === session.classId);
}
export function createSession(input: Omit<Session, "id">): Session {
  requirePermission("sessions_attendance", "write");
  requireClassAccess(input.classId);
  requireClass(input.classId);
  const item = { ...input, id: crypto.randomUUID() };
  commit("sessions", item.id, (d) => {
    d.sessions.push(item);
  });
  return item;
}
export function createExtraSession(
  input: { classId: string; date: string; time: string; note?: string },
  today = localToday(),
): Session {
  requirePermission("sessions_attendance", "write");
  validDate(today);
  requireClassAccess(input.classId);
  const itemClass = requireClass(input.classId);
  if (itemClass.status !== "active") throw new Error("Không thể thêm buổi cho lớp đã lưu trữ.");
  validDate(input.date);
  if (input.date < today) throw new Error("Không thể thêm buổi trong quá khứ.");
  if (!validTime(input.time)) throw new Error("Giờ học không hợp lệ.");
  if (getStore().sessions.some((session) => session.classId === input.classId && session.date === input.date && session.time === input.time))
    throw new Error("Đã có buổi học vào thời gian này.");
  const item: Session = { ...input, id: crypto.randomUUID(), origin: "manual", status: "planned" };
  commit("sessions", item.id, (draft) => draft.sessions.push(item));
  return item;
}
type Schedule = { weekdays: number[]; time: string };
type SchedulePreview = { toRemove: Session[]; toAdd: { date: string; time: string }[]; kept: Session[]; retimed: Session[] };
export function previewScheduleChange(classId: string, next: Schedule, today = localToday()): SchedulePreview {
  validDate(today);
  if (!canAccessClass(classId))
    return { toRemove: [], toAdd: [], kept: [], retimed: [] };
  requireClass(classId);
  validateSchedule(next.weekdays, next.time);
  const state = getStore();
  const eligible = state.sessions.filter((session) => session.classId === classId && session.date >= today && session.origin === "recurring" && session.status === "planned" && !hasAttendance(state, session.id));
  const toRemove = eligible.filter((session) => {
    const [year, month, day] = session.date.split("-").map(Number);
    return !next.weekdays.includes(new Date(year, month - 1, day, 12).getDay());
  });
  const kept = eligible.filter((session) => !toRemove.includes(session) && session.time === next.time);
  const retimed = eligible.filter((session) => !toRemove.includes(session) && session.time !== next.time);
  const removedIds = new Set(toRemove.map((session) => session.id));
  const existingDates = new Set(state.sessions.filter((session) => session.classId === classId && !removedIds.has(session.id)).map((session) => session.date));
  const toAdd = scheduleDates(next.weekdays, today).filter((date) => !existingDates.has(date)).map((date) => ({ date, time: next.time }));
  return { toRemove, toAdd, kept, retimed };
}
function applyClassSchedule(classId: string, next: Schedule, today: string, name?: string): { removed: number; added: number; retimed: number } {
  requirePermission("classes", "write");
  requireClassAccess(classId);
  const item = requireClass(classId);
  if (item.status !== "active") throw new Error("Không thể sửa lịch lớp đã lưu trữ.");
  const preview = previewScheduleChange(classId, next, today);
  const ids = new Set(preview.toRemove.map((session) => session.id));
  const retimedIds = new Set(preview.retimed.map((session) => session.id));
  commit("classes", classId, (draft) => {
    const current = requireClass(classId, draft);
    current.weekdays = [...next.weekdays];
    current.time = next.time;
    if (name !== undefined) current.name = name;
    draft.sessions = draft.sessions.filter((session) => !ids.has(session.id));
    for (const session of draft.sessions) if (retimedIds.has(session.id)) session.time = next.time;
    for (const entry of preview.toAdd) {
      draft.sessions.push({ id: crypto.randomUUID(), classId, ...entry, origin: "recurring", status: "planned" });
    }
  });
  return { removed: preview.toRemove.length, added: preview.toAdd.length, retimed: preview.retimed.length };
}
export function updateClassSchedule(classId: string, next: Schedule, today = localToday()): { removed: number; added: number; retimed: number } {
  return applyClassSchedule(classId, next, today);
}
export function updateClassScheduleWithName(classId: string, next: Schedule, name: string, today = localToday()): { removed: number; added: number; retimed: number } {
  return applyClassSchedule(classId, next, today, name);
}
export function updateExtraSession(id: string, patch: { date?: string; time?: string; note?: string }, today = localToday()): void {
  requirePermission("sessions_attendance", "write");
  validDate(today);
  const current = requireSession(id);
  requireClassAccess(current.classId);
  if (current.origin !== "manual" || current.status !== "planned") throw new Error("Chỉ sửa được buổi lẻ đang chờ học.");
  const next = { ...current, ...patch };
  validDate(next.date);
  if (next.date < today) throw new Error("Không thể chuyển buổi về ngày trong quá khứ.");
  if (!next.time || !validTime(next.time)) throw new Error("Giờ học không hợp lệ.");
  if (getStore().sessions.some((session) => session.id !== id && session.classId === current.classId && session.date === next.date && session.time === next.time))
    throw new Error("Đã có buổi học vào thời gian này.");
  commit("sessions", id, (draft) => Object.assign(requireSession(id, draft), patch));
}
export function setSessionStatus(id: string, status: Session["status"]): void {
  requirePermission("sessions_attendance", "write");
  const current = requireSession(id);
  requireClassAccess(current.classId);
  commit("sessions", id, (d) => {
    requireSession(id, d).status = status;
  });
}
export const cancelSession = (id: string): void =>
  setSessionStatus(id, "cancelled");
export const heldSessionCount = (classId: string): number =>
  listSessions(classId).filter((s) => s.status === "held").length;
export function listPlannedSessions(classId?: string): Session[] {
  const state = getStore();
  const scope = visibleClassIds();
  const activeClasses = new Set(
    state.classes.filter((item) => item.status === "active").map((item) => item.id),
  );
  return state.sessions
    .filter(
      (session) =>
        session.status === "planned" &&
        activeClasses.has(session.classId) &&
        (scope === null || scope.has(session.classId)) &&
        (!classId || session.classId === classId),
    )
      .sort((a, b) => `${a.date} ${a.time ?? "00:00"}`.localeCompare(`${b.date} ${b.time ?? "00:00"}`));
}
/** Số buổi chỉ đếm buổi chưa hủy (spec mục 4); buổi đã hủy không có số. */
export function sessionNumber(session: Session): number | null {
  if (session.status === "cancelled") return null;
  const ordered = getStore()
    .sessions.filter(
      (item) => item.classId === session.classId && item.status !== "cancelled",
    )
    .sort((a, b) => `${a.date} ${a.time ?? "00:00"}`.localeCompare(`${b.date} ${b.time ?? "00:00"}`));
  return ordered.findIndex((item) => item.id === session.id) + 1;
}
/** Nhãn đứng trước ngày: "Buổi 9", hoặc "Buổi bù" / "Buổi học" khi buổi đã hủy (không có số). */
export function sessionPrefix(session: Session): string {
  const number = sessionNumber(session);
  if (number !== null) return `Buổi ${number}`;
  return session.makeup ? "Buổi bù" : "Buổi học";
}
