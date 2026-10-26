import type { Student } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requireClass, requirePermission, requireStudent } from "./helpers";
import {
  canAccessClass,
  canAccessSession,
  canAccessStudent,
  requireClassAccess,
  substitutedSessionIds,
} from "./access";
import { attendanceRate, hasAbsenceWarning } from "../logic";
import { relinkStudentGuardians } from "./guardian";

/** Học sinh của lớp trong phạm vi vai trò đang dùng. */
export const listStudents = (classId: string, includeLeft = true): Student[] =>
  canAccessClass(classId)
    ? getStore().students.filter(
        (s) => s.classId === classId && (includeLeft || s.status === "active"),
      )
    : [];

/** Hồ sơ học sinh: chỉ lớp trong phạm vi (dạy thay KHÔNG mở hồ sơ); phụ huynh chỉ con được liên kết. */
export const getStudent = (id: string): Student | undefined => {
  const student = getStore().students.find((s) => s.id === id);
  if (!student || !canAccessStudent(id)) return undefined;
  return student;
};

/**
 * Danh sách học sinh của ĐÚNG một buổi người dùng được xem — cần cho bảng điểm
 * danh/nhận xét của buổi dạy thay. Không mở hồ sơ hay điểm của lớp.
 */
export function listStudentsForSession(
  sessionId: string,
  includeLeft = true,
): Student[] {
  if (!canAccessSession(sessionId)) return [];
  const session = getStore().sessions.find((item) => item.id === sessionId);
  if (!session) return [];
  return getStore().students.filter(
    (s) =>
      s.classId === session.classId && (includeLeft || s.status === "active"),
  );
}

/** Học sinh thuộc lớp mình dạy thay: chỉ đủ để hiện roster/cảnh báo của buổi. */
function canReadStudentContext(student: Student): boolean {
  if (canAccessClass(student.classId)) return true;
  const substituted = substitutedSessionIds();
  if (!substituted.size) return false;
  return getStore().sessions.some(
    (session) =>
      session.classId === student.classId && substituted.has(session.id),
  );
}

export function createStudent(
  input: Omit<Student, "id" | "status" | "leftAt">,
): Student {
  requirePermission("students", "write");
  requireClassAccess(input.classId);
  requireClass(input.classId);
  if (!input.name.trim()) throw new Error("Nhập tên học sinh.");
  const item: Student = {
    ...input,
    id: crypto.randomUUID(),
    status: "active",
    leftAt: null,
  };
  commit("students", item.id, (d) => {
    d.students.push(item);
    // Khai SĐT phụ huynh ngay khi thêm học sinh thì liên kết tài khoản phụ
    // huynh đã đăng ký trước đó bằng đúng SĐT này (spec mục 4 "Tài khoản").
    relinkStudentGuardians(d, requireStudent(item.id, d));
  });
  return item;
}
export function updateStudent(
  id: string,
  patch: Partial<Pick<Student, "name">>,
): void {
  requirePermission("students", "write");
  requireClassAccess(requireStudent(id).classId);
  commit("students", id, (d) => {
    Object.assign(requireStudent(id, d), patch);
  });
}
/**
 * Sửa SĐT phụ huynh trên hồ sơ học sinh. SĐT khớp tài khoản phụ huynh nào thì
 * tự liên kết em với tài khoản đó; đổi sang số khác thì gỡ liên kết cũ (spec
 * mục 4 "Tài khoản", vẫn liên kết được khi hồ sơ khai SĐT sau khi phụ huynh
 * đã đăng ký).
 */
export function updateStudentPhone(id: string, parentPhone: string): void {
  requirePermission("students", "write");
  const student = requireStudent(id);
  requireClassAccess(student.classId);
  const phone = parentPhone.trim();
  if (phone && !/^[0-9+().\s-]{6,20}$/.test(phone))
    throw new Error("Số điện thoại không hợp lệ.");
  commit("students", id, (d) => {
    const target = requireStudent(id, d);
    target.parentPhone = phone;
    relinkStudentGuardians(d, target);
  });
}

export function markStudentLeft(id: string, leftAt: string): void {
  requirePermission("students", "write");
  const student = requireStudent(id);
  requireClassAccess(student.classId);
  if (leftAt < student.enrolledAt)
    throw new Error("Ngày nghỉ phải sau ngày vào lớp.");
  commit("students", id, (d) => {
    Object.assign(requireStudent(id, d), { status: "left", leftAt });
  });
}
export const studentAttendanceRate = (id: string): number | null => {
  const student = getStore().students.find((s) => s.id === id);
  if (!student || !canAccessClass(student.classId)) return null;
  const d = getStore();
  const held = new Set(
    d.sessions.filter((s) => s.status === "held").map((s) => s.id),
  );
  return attendanceRate(
    d.attendance.filter((a) => a.studentId === id && held.has(a.sessionId)),
  );
};
export const classAttendanceRate = (classId: string): number | null => {
  if (!canAccessClass(classId)) return null;
  const d = getStore();
  const held = new Set(
    d.sessions
      .filter((s) => s.classId === classId && s.status === "held")
      .map((s) => s.id),
  );
  return attendanceRate(d.attendance.filter((a) => held.has(a.sessionId)));
};
export const studentAbsenceWarning = (id: string): boolean => {
  const student = getStore().students.find((s) => s.id === id);
  if (!student || !canReadStudentContext(student)) return false;
  return hasAbsenceWarning(
    student,
    getStore().sessions,
    getStore().attendance,
  );
};
