import { describe, it, expect } from "vitest";
import {
  attendanceRate,
  hasAbsenceWarning,
  isFutureSession,
  orderScoreGridStudents,
} from "./logic";
import { createSeed } from "./seed";
describe("Bảng điểm", () => {
  it("giữ học sinh đang học trước học sinh đã nghỉ", () => {
    const students = [
      { id: "left", status: "left" as const },
      { id: "active-1", status: "active" as const },
      { id: "active-2", status: "active" as const },
    ];
    expect(orderScoreGridStudents(students).map(({ id }) => id)).toEqual([
      "active-1",
      "active-2",
      "left",
    ]);
  });
});
describe("Ngày điểm danh", () => {
  it("chỉ coi buổi sau hôm nay là tương lai", () => {
    const today = new Date(2026, 9, 18, 12);
    expect(isFutureSession("2026-10-19", today)).toBe(true);
    expect(isFutureSession("2026-10-18", today)).toBe(false);
    expect(isFutureSession("2026-10-17", today)).toBe(false);
  });
});
describe("Chuyên cần", () => {
  it("có phép không bị trừ, muộn là có đi học", () =>
    expect(
      attendanceRate([
        { status: "present" },
        { status: "late" },
        { status: "excused" },
        { status: "absent" },
      ]),
    ).toBeCloseTo(200 / 3));
  it("toàn có phép chưa có mẫu tính", () =>
    expect(attendanceRate([{ status: "excused" }])).toBeNull());
});
describe("Cảnh báo vắng", () => {
  it("hai buổi đã diễn ra liên tiếp, bỏ buổi hủy và kế hoạch", () => {
    const d = createSeed();
    const student = d.students[0];
    d.sessions.push({
      id: "cancel",
      classId: student.classId,
      date: "2026-10-16",
      status: "cancelled",
    });
    expect(hasAbsenceWarning(student, d.sessions, d.attendance)).toBe(true);
  });
  it("có phép chặn chuỗi vắng", () => {
    const d = createSeed();
    const student = d.students[0];
    d.attendance.find(
      (a) => a.studentId === student.id && a.sessionId === "6a-session-7",
    )!.status = "excused";
    expect(hasAbsenceWarning(student, d.sessions, d.attendance)).toBe(false);
  });
  it("không cảnh báo học sinh đã nghỉ", () => {
    const d = createSeed();
    d.students[0].status = "left";
    expect(hasAbsenceWarning(d.students[0], d.sessions, d.attendance)).toBe(
      false,
    );
  });
});
