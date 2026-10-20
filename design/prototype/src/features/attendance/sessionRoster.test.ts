import { describe, expect, it } from "vitest";
import { createSeed } from "../../data/seed";
import { studentsForSession } from "./sessionRoster";

describe("danh sách điểm danh theo ngày buổi học", () => {
  it("giữ học sinh đã nghỉ sau buổi và loại học sinh nhập học sau buổi", () => {
    const state = createSeed();
    const session = state.sessions.find((item) => item.classId === "6a" && item.status === "held")!;
    const sample = state.students.find((student) => student.classId === "6a")!;
    const nextDay = new Date(`${session.date}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDate = nextDay.toISOString().slice(0, 10);
    const beforeSession = { ...sample, id: "left-later", name: "Đã nghỉ sau buổi", leftAt: nextDate, status: "left" as const };
    const joinedLater = { ...sample, id: "joined-later", name: "Mới nhập học", enrolledAt: nextDate, leftAt: null, status: "active" as const };
    const leftEarlier = { ...sample, id: "left-earlier", name: "Đã nghỉ trước buổi", leftAt: "2020-01-01", status: "left" as const };

    const roster = studentsForSession([...state.students, beforeSession, joinedLater, leftEarlier], session);

    expect(roster.some((student) => student.id === beforeSession.id)).toBe(true);
    expect(roster.some((student) => student.id === joinedLater.id)).toBe(false);
    expect(roster.some((student) => student.id === leftEarlier.id)).toBe(false);
  });
});
