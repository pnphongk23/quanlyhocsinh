/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Attendance } from "../types";

export const listAttendance: (sessionId: string) => Attendance[] = () => [];

export function saveAttendance(input: Omit<Attendance, "id">): Attendance { return foundationUnavailable(); }

export function saveAttendanceBatch(inputs: Omit<Attendance, "id">[]): Attendance[] { return foundationUnavailable(); }
