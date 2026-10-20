import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../../data/seed";
import { getStore, replaceStore } from "../../data/store";
import { saveAttendanceBatch } from "../../data/repositories/attendance";

const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  replaceStore(createSeed());
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("saveAttendanceBatch", () => {
  it("kiểm tra toàn bộ danh sách trước khi ghi và không lưu một phần", () => {
    const state = createSeed();
    const session = state.sessions.find((item) => item.classId === "6a" && item.status === "held")!;
    const eligible = state.students.find((student) => student.classId === session.classId && student.enrolledAt <= session.date && (!student.leftAt || student.leftAt >= session.date))!;
    const tomorrow = new Date(`${session.date}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const lateStudent = { ...eligible, id: "enrolled-after-session", name: "Mới nhập học", enrolledAt: tomorrow.toISOString().slice(0, 10), leftAt: null, status: "active" as const };
    state.students.push(lateStudent);
    replaceStore(state);
    const before = getStore();
    const attendanceBefore = structuredClone(before.attendance);
    const existing = before.attendance.find((record) => record.sessionId === session.id && record.studentId === eligible.id);

    expect(() => saveAttendanceBatch([
      { sessionId: session.id, studentId: eligible.id, status: "late", note: "", lateAt: "18:10" },
      { sessionId: session.id, studentId: lateStudent.id, status: "present", note: "", lateAt: null },
    ])).toThrow("Học sinh không thuộc buổi học này.");

    expect(getStore()).toBe(before);
    expect(getStore().attendance).toEqual(attendanceBefore);
    expect(getStore().changeLogs).toEqual([]);
    expect(getStore().pending).toEqual([]);
    expect(existing).toBeDefined();
  });

  it("ghi các dòng hợp lệ trong một lần cập nhật và vẫn ghi lịch sử sửa", () => {
    const state = getStore();
    const session = state.sessions.find((item) => item.classId === "6a" && item.status === "held")!;
    const students = state.students.filter((student) => student.classId === session.classId && student.enrolledAt <= session.date && (!student.leftAt || student.leftAt >= session.date)).slice(0, 2);
    const before = students.map((student) => state.attendance.find((record) => record.sessionId === session.id && record.studentId === student.id)!);

    saveAttendanceBatch(students.map((student, index) => {
      const previous = before[index];
      const status = previous.status === "late" ? "present" as const : "late" as const;
      return { sessionId: session.id, studentId: student.id, status, note: "", lateAt: status === "late" ? "18:10" : null };
    }));

    expect(getStore().pending).toHaveLength(1);
    expect(getStore().changeLogs).toHaveLength(2);
    expect(getStore().changeLogs.map((entry) => entry.before)).toEqual(before);
  });
});
