/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Student } from "../types";

export const listStudents: (classId: string, includeLeft?: boolean) => Student[] = () => [];

export const getStudent: (id: string) => Student | undefined = () => undefined;

export function listStudentsForSession(sessionId: string, includeLeft?: boolean): Student[] { return []; }

export function createStudent(input: Omit<Student, "id" | "status" | "leftAt">): Student { return foundationUnavailable(); }

export function updateStudent(id: string, patch: Partial<Pick<Student, "name">>): void { return foundationUnavailable(); }

export function updateStudentPhone(id: string, parentPhone: string): void { return foundationUnavailable(); }

export function markStudentLeft(id: string, leftAt: string): void { return foundationUnavailable(); }

export const studentAttendanceRate: (id: string) => number | null = () => null;

export const classAttendanceRate: (classId: string) => number | null = () => null;

export const studentAbsenceWarning: (id: string) => boolean = () => false;
