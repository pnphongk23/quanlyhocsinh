import { getStore, updateStore, useStore } from "../store";
import type { Member, PermissionGroup, Role, StoreState } from "../types";
import { GUARDIAN_GROUP_IDS } from "../defaults";

/** Sáu nhóm quyền tuỳ chỉnh, nhãn hiển thị tiếng Việt. */
export const PERMISSION_GROUPS: { id: PermissionGroup; label: string }[] = [
  { id: "classes", label: "Lớp" },
  { id: "students", label: "Học sinh" },
  { id: "sessions_attendance", label: "Buổi học và điểm danh" },
  { id: "scores", label: "Điểm" },
  { id: "lectures", label: "Bài giảng" },
  { id: "comments_reports", label: "Nhận xét và báo cáo" },
];

/** Nhóm mà role phụ huynh được Admin bật, luôn tối đa mức Đọc. */
export const GUARDIAN_GROUPS: PermissionGroup[] = [...GUARDIAN_GROUP_IDS];

function memberById(state: StoreState, id: string | null): Member | null {
  if (!id) return null;
  return state.members.find((member) => member.id === id) ?? null;
}

export function getActiveMember(): Member | null {
  const state = getStore();
  const id = state.activeMemberId;
  if (!state.auth || !id || !state.auth.memberIds.includes(id)) return null;
  const member = memberById(state, id);
  if (!member || member.status === "disabled") return null;
  return member;
}

export function getActiveRole(): Role | null {
  const state = getStore();
  const member = getActiveMember();
  if (!member) return null;
  return state.roles.find((role) => role.id === member.roleId) ?? null;
}

export function listMyMemberships(): Array<{ member: Member; role: Role }> {
  const state = getStore();
  if (!state.auth) return [];
  return state.auth.memberIds
    .map((id) => state.members.find((member) => member.id === id))
    .filter((member): member is Member => member !== undefined)
    .map((member) => {
      const role = state.roles.find((item) => item.id === member.roleId);
      return role ? { member, role } : null;
    })
    .filter((item): item is { member: Member; role: Role } => item !== null);
}

/** Đổi membership đang hoạt động; memberId phải thuộc phiên đăng nhập. */
export function switchRole(memberId: string): void {
  const state = getStore();
  if (!state.auth || !state.auth.memberIds.includes(memberId))
    throw new Error("Không thể đổi sang vai trò này.");
  const member = memberById(state, memberId);
  if (!member || member.status === "disabled")
    throw new Error("Vai trò này đã bị vô hiệu hoá.");
  updateStore((draft) => {
    draft.activeMemberId = memberId;
  });
}

export function isAdmin(): boolean {
  return getActiveRole()?.system === true;
}

export function can(group: PermissionGroup, level: "read" | "write"): boolean {
  const role = getActiveRole();
  if (!role) return false;
  if (role.system) return true;
  const permission = role.permissions[group] ?? "none";
  if (level === "write")
    return permission === "write" && role.kind !== "guardian";
  return permission === "read" || permission === "write";
}

export function requirePermission(
  group: PermissionGroup,
  level: "read" | "write",
): void {
  if (!can(group, level))
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
}

/** Lớp mà vai trò đang dùng nhìn thấy; null nghĩa là mọi lớp (Admin). */
export function visibleClassIds(): Set<string> | null {
  const role = getActiveRole();
  if (role?.system) return null;
  const member = getActiveMember();
  if (!member) return new Set();
  return new Set(member.classIds);
}

/** Thông báo dùng chung khi chặn theo phạm vi lớp/buổi (không lộ dữ liệu). */
export const CLASS_ACCESS_ERROR = "Bạn không có quyền truy cập lớp này.";
export const SESSION_ACCESS_ERROR =
  "Bạn không có quyền truy cập buổi học này.";

/** Vai trò đang dùng có được gán lớp này không (Admin luôn đúng). */
export function canAccessClass(classId: string): boolean {
  const scope = visibleClassIds();
  return scope === null || scope.has(classId);
}

/** Vai trò đang dùng là phụ huynh (chỉ đọc, chỉ thấy con được liên kết). */
export function isGuardian(): boolean {
  return getActiveRole()?.kind === "guardian";
}

/** Học sinh mà membership phụ huynh đang dùng được liên kết. */
export function linkedStudentIds(): Set<string> {
  const member = getActiveMember();
  if (!member) return new Set();
  return new Set(member.studentIds ?? []);
}

/**
 * Quyền đọc một học sinh: Admin và nhân sự theo lớp được gán; phụ huynh chỉ
 * với con được liên kết. Dùng cho màn phụ huynh đọc hồ sơ/phiếu của con.
 */
export function canAccessStudent(studentId: string): boolean {
  const student = getStore().students.find((item) => item.id === studentId);
  if (!student) return false;
  if (isGuardian()) return linkedStudentIds().has(studentId);
  return canAccessClass(student.classId);
}

/**
 * Buổi mà thành viên đang dùng ĐÚNG LÀ người dạy thay (đổi người dạy một buổi).
 * Đây là ngoại lệ hẹp: chỉ mở đúng buổi đó, không mở cả lớp.
 */
export function substitutedSessionIds(): Set<string> {
  const member = getActiveMember();
  if (!member) return new Set();
  return new Set(
    getStore()
      .sessionSubstitutes.filter(
        (item) => item.substituteMemberId === member.id,
      )
      .map((item) => item.sessionId),
  );
}

/**
 * Quyền theo ngữ cảnh một buổi: lớp được gán, hoặc đúng buổi mình dạy thay
 * (điểm danh và nhận xét của buổi đó). Không mở các buổi khác của lớp.
 */
export function canAccessSession(sessionId: string): boolean {
  const session = getStore().sessions.find((item) => item.id === sessionId);
  if (!session) return false;
  if (isAdmin()) return true;
  if (canAccessClass(session.classId)) return true;
  return substitutedSessionIds().has(sessionId);
}

/**
 * Quyền theo ngữ cảnh buổi khi payload mang theo classId: hoặc có lớp, hoặc
 * đúng buổi dạy thay thuộc lớp đó (nhận xét/điểm danh của buổi).
 */
export function canAccessSessionContext(
  classId: string,
  sessionId: string | null | undefined,
): boolean {
  if (canAccessClass(classId)) return true;
  if (!sessionId) return false;
  const session = getStore().sessions.find((item) => item.id === sessionId);
  return Boolean(
    session &&
      session.classId === classId &&
      substitutedSessionIds().has(sessionId),
  );
}

/** Buổi đọc được; undefined khi không tồn tại hoặc ngoài phạm vi. */
export function getAccessibleSession(sessionId: string) {
  if (!canAccessSession(sessionId)) return undefined;
  return getStore().sessions.find((item) => item.id === sessionId);
}

export function requireClassAccess(classId: string): void {
  if (!canAccessClass(classId)) throw new Error(CLASS_ACCESS_ERROR);
}

export function requireSessionAccess(sessionId: string) {
  const session = getAccessibleSession(sessionId);
  if (!session) throw new Error(SESSION_ACCESS_ERROR);
  return session;
}

export function useAccess(): {
  member: Member | null;
  role: Role | null;
  isAdmin: boolean;
  can: (group: PermissionGroup, level: "read" | "write") => boolean;
  multipleRoles: boolean;
} {
  useStore();
  return {
    member: getActiveMember(),
    role: getActiveRole(),
    isAdmin: isAdmin(),
    can,
    multipleRoles: (getStore().auth?.memberIds.length ?? 0) > 1,
  };
}
