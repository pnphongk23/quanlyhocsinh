import { getStore } from "../store";
import type { StoreState, Student, Session, Test } from "../types";
export { requirePermission } from "./access";
export function requireClass(id: string, draft: StoreState = getStore()) {
  const value = draft.classes.find((c) => c.id === id);
  if (!value) throw new Error("Không tìm thấy lớp.");
  return value;
}
export function requireStudent(
  id: string,
  draft: StoreState = getStore(),
): Student {
  const value = draft.students.find((s) => s.id === id);
  if (!value) throw new Error("Không tìm thấy học sinh.");
  return value;
}
export function requireSession(
  id: string,
  draft: StoreState = getStore(),
): Session {
  const value = draft.sessions.find((s) => s.id === id);
  if (!value) throw new Error("Không tìm thấy buổi học.");
  return value;
}
export function requireTest(id: string, draft: StoreState = getStore()): Test {
  const value = draft.tests.find((s) => s.id === id);
  if (!value) throw new Error("Không tìm thấy bài kiểm tra.");
  return value;
}
export function requireOnline(): void {
  if (typeof navigator !== "undefined" && !navigator.onLine)
    throw new Error("Thao tác này cần có mạng.");
}
export function eligible(student: Student, date: string): boolean {
  return (
    date >= student.enrolledAt && (!student.leftAt || date <= student.leftAt)
  );
}
