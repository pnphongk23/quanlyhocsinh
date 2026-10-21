/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Member, PermissionGroup, Role } from "../types";

export const PERMISSION_GROUPS: {
    id: PermissionGroup;
    label: string;
}[] = [
  { id: "classes", label: "Lớp" },
  { id: "students", label: "Học sinh" },
  { id: "sessions_attendance", label: "Buổi học và điểm danh" },
  { id: "scores", label: "Điểm" },
  { id: "comments_reports", label: "Nhận xét và báo cáo" },
];

export const GUARDIAN_GROUPS: PermissionGroup[] = ["scores", "sessions_attendance", "comments_reports"];

export function getActiveMember(): Member | null { return null; }

export function getActiveRole(): Role | null { return null; }

export function listMyMemberships(): Array<{
    member: Member;
    role: Role;
}> { return []; }

export function switchRole(memberId: string): void { return foundationUnavailable(); }

export function isAdmin(): boolean { return false; }

export function can(group: PermissionGroup, level: "read" | "write"): boolean { return false; }

export function requirePermission(group: PermissionGroup, level: "read" | "write"): void { return foundationUnavailable(); }

export function visibleClassIds(): Set<string> | null { return new Set(); }

export const CLASS_ACCESS_ERROR = "Bạn không có quyền truy cập lớp này.";

export const SESSION_ACCESS_ERROR = "Bạn không có quyền truy cập buổi học này.";

export function canAccessClass(classId: string): boolean { return false; }

export function isGuardian(): boolean { return false; }

export function linkedStudentIds(): Set<string> { return new Set(); }

export function canAccessStudent(studentId: string): boolean { return false; }

export function canAccessSession(sessionId: string): boolean { return false; }

export function canAccessSessionContext(classId: string, sessionId: string | null | undefined): boolean { return false; }

export function getAccessibleSession(sessionId: string): import("../types").Session | undefined { return undefined; }

export function requireClassAccess(classId: string): void { return foundationUnavailable(); }

export function requireSessionAccess(sessionId: string): import("../types").Session { return foundationUnavailable(); }

export function useAccess(): {
    member: Member | null;
    role: Role | null;
    isAdmin: boolean;
    can: (group: PermissionGroup, level: "read" | "write") => boolean;
    multipleRoles: boolean;
} { return { member: null, role: null, isAdmin: false, can, multipleRoles: false }; }
