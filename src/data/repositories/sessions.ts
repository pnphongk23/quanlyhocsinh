/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import { todayISO } from "../../shared/format";
import type { Class, Session } from "../types";

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
