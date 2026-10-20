import type { Attendance } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { eligible, requirePermission, requireSession, requireStudent } from "./helpers";
import { canAccessSession, requireSessionAccess } from "./access";
import { isFutureSession } from "../logic";
/** Điểm danh của buổi trong phạm vi (lớp được gán hoặc đúng buổi dạy thay). */
export const listAttendance = (sessionId: string): Attendance[] =>
  canAccessSession(sessionId)
    ? getStore().attendance.filter((a) => a.sessionId === sessionId)
    : [];
export function saveAttendance(input: Omit<Attendance, "id">): Attendance {
  return saveAttendanceBatch([input])[0];
}

/** Validate every row before committing any row; the batch becomes one store/outbox write. */
export function saveAttendanceBatch(
  inputs: Omit<Attendance, "id">[],
): Attendance[] {
  if (inputs.length === 0) return [];
  requirePermission("sessions_attendance", "write");
  const state = getStore();
  const sessionId = inputs[0].sessionId;
  const session = requireSessionAccess(sessionId);
  const seenStudents = new Set<string>();
  if (session.status === "cancelled")
    throw new Error("Không thể điểm danh buổi đã hủy.");
  if (isFutureSession(session.date))
    throw new Error("Chỉ có thể điểm danh từ ngày học trở đi.");
  const items = inputs.map((input) => {
    if (input.sessionId !== sessionId || seenStudents.has(input.studentId))
      throw new Error("Danh sách điểm danh không hợp lệ.");
    seenStudents.add(input.studentId);
    const student = requireStudent(input.studentId, state);
    if (session.classId !== student.classId || !eligible(student, session.date))
      throw new Error("Học sinh không thuộc buổi học này.");
    const old = state.attendance.find(
      (record) => record.sessionId === sessionId && record.studentId === student.id,
    );
    return { ...input, id: old?.id ?? crypto.randomUUID() };
  });

  const changes = items.filter((item) => {
    const before = state.attendance.find((record) => record.id === item.id);
    return !before || before.status !== item.status || before.note !== item.note || before.lateAt !== item.lateAt;
  });
  if (changes.length === 0 && session.status === "held") return items;
  commit("attendance", `session:${sessionId}`, (draft) => {
    for (const item of changes) {
      const before = draft.attendance.find((record) => record.id === item.id);
      if (before) {
        draft.changeLogs.push({
          id: crypto.randomUUID(),
          entity: "attendance",
          recordId: item.id,
          before: { ...before },
          after: { ...item },
          changedAt: new Date().toISOString(),
          actor: draft.auth?.email ?? "prototype",
        });
        draft.attendance = draft.attendance.map((record) => record.id === item.id ? item : record);
      } else {
        draft.attendance.push(item);
      }
    }
    const currentSession = requireSession(sessionId, draft);
    if (currentSession.status !== "held") currentSession.status = "held";
  });
  return items;
}
