/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import { todayISO } from "../../shared/format";
import type { Class, Session } from "../types";
import { getStore } from "../store";
import { commitState } from "../outbox";
import { requirePermission, requireClassAccess } from "./access";

export function localToday(): string { return todayISO(); }

export const listSessions: (classId: string) => Session[] = () => [];

export const getSession: (id: string) => Session | undefined = () => undefined;

export const hasSession: (id: string) => boolean = () => false;

export function getSessionClass(sessionId: string): Class | undefined { return undefined; }

export function createSession(input: Omit<Session, "id">): Session { return foundationUnavailable(); }

export function createExtraSession(input: {
    classId: string;
    date: string;
    time: string;
    note?: string;
}, today?: string): Session { return foundationUnavailable(); }

/** Kept in sync with the prototype signature; edit is local pending API support. */
export function updateExtraSession(id: string, patch: { date?: string; time?: string; note?: string }, today = localToday()): void {
  requirePermission("sessions_attendance", "write");
  const current = getStore().sessions.find((session) => session.id === id);
  if (!current) throw new Error("Không tìm thấy buổi học.");
  requireClassAccess(current.classId);
  if (current.origin !== "manual" || current.status !== "planned") throw new Error("Chỉ sửa được buổi lẻ đang chờ học.");
  const next = { ...current, ...patch };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || next.date < today) throw new Error("Không thể chuyển buổi về ngày trong quá khứ.");
  if (!next.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(next.time)) throw new Error("Giờ học không hợp lệ.");
  if (getStore().sessions.some((session) => session.id !== id && session.classId === current.classId && session.date === next.date && session.time === next.time)) throw new Error("Đã có buổi học vào thời gian này.");
  commitState("session", id, (draft) => { draft.sessions = draft.sessions.map((session) => session.id === id ? next : session); });
}

type Schedule = {
    weekdays: number[];
    time: string;
};

type SchedulePreview = {
    toRemove: Session[];
    toAdd: {
        date: string;
        time: string;
    }[];
    kept: Session[];
    retimed: Session[];
};

export function previewScheduleChange(classId: string, next: Schedule, today?: string): SchedulePreview { return foundationUnavailable(); }

export function updateClassSchedule(classId: string, next: Schedule, today?: string): {
    removed: number;
    added: number;
    retimed: number;
} { return foundationUnavailable(); }

export function updateClassScheduleWithName(classId: string, next: Schedule, name: string, today?: string): {
    removed: number;
    added: number;
    retimed: number;
} { return foundationUnavailable(); }

export function setSessionStatus(id: string, status: Session["status"]): void { return foundationUnavailable(); }

export const cancelSession: (id: string) => void = foundationUnavailable;

export const heldSessionCount: (classId: string) => number = () => 0;

export function listPlannedSessions(classId?: string): Session[] { return []; }

export function sessionNumber(session: Session): number | null { return null; }

export function sessionPrefix(session: Session): string { return foundationUnavailable(); }
