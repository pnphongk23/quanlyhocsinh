import { beforeEach, describe, expect, it } from "vitest";
import { createSeed } from "../../test/fixtures/seed";
import { buildTicketRows, ungradedHomeworkNotice } from "../../data/homework";
import type { StoreState } from "../../data/types";
import { buildTodayAgenda, collapsedBacklogItems, groupBacklog } from "./todayModel";
import { dateISO } from "../../shared/date";

let state: StoreState;
beforeEach(() => {
  state = createSeed();
});

const plannedDate = (id: string) => state.sessions.find((s) => s.id === id)!.date;

describe("khối Hôm nay", () => {
  it("buổi hôm nay chưa điểm danh báo thiếu điểm danh và đếm đúng phiếu, BTVN theo seed", () => {
    const today = plannedDate("6a-session-8");
    const agenda = buildTodayAgenda(state, today);
    const entry = agenda.entries.find((e) => e.session.id === "6a-session-8")!;
    expect(agenda.next).toBeNull();
    expect(entry.tasks.map((t) => t.kind)).toContain("attendance");
    const unsent = buildTicketRows(state, "6a-session-8").filter(
      (r) => r.status !== "sent",
    ).length;
    const ungraded = ungradedHomeworkNotice(state, "6a-session-8").students.length;
    expect(entry.tasks.find((t) => t.kind === "tickets")?.label).toBe(
      unsent ? `Phiếu chưa gửi (${unsent} em)` : undefined,
    );
    expect(entry.tasks.find((t) => t.kind === "homework")?.label).toBe(
      ungraded ? `BTVN chưa chấm (${ungraded} em)` : undefined,
    );
    expect(unsent).toBeGreaterThan(0);
  });

  it("buổi đã điểm danh không báo điểm danh thiếu", () => {
    const today = plannedDate("6a-session-8");
    state.sessions.find((s) => s.id === "6a-session-8")!.status = "held";
    const roster = state.students.filter(
      (student) =>
        student.classId === "6a" &&
        student.enrolledAt <= today &&
        (student.leftAt === null || student.leftAt >= today),
    );
    state.attendance.push(
      ...roster.map((student, index) => ({
        id: `test-attendance-${index}`,
        sessionId: "6a-session-8",
        studentId: student.id,
        status: "present" as const,
        note: "",
        lateAt: null,
      })),
    );
    const entry = buildTodayAgenda(state, today).entries.find(
      (e) => e.session.id === "6a-session-8",
    )!;
    expect(entry.tasks.map((t) => t.kind)).not.toContain("attendance");
    expect(entry.statusLabel).toBe("Đã điểm danh");
    expect(entry.statusTone).toBe("success");
  });

  it("buổi held mới có 1/N bản ghi vẫn nhắc điểm danh và báo trạng thái thiếu", () => {
    const today = plannedDate("6a-session-8");
    state.sessions.find((s) => s.id === "6a-session-8")!.status = "held";
    const roster = state.students.filter(
      (student) =>
        student.classId === "6a" &&
        student.enrolledAt <= today &&
        (student.leftAt === null || student.leftAt >= today),
    );
    expect(roster.length).toBeGreaterThan(1);
    state.attendance.push({
      id: "test-attendance-partial",
      sessionId: "6a-session-8",
      studentId: roster[0].id,
      status: "present",
      note: "",
      lateAt: null,
    });

    const entry = buildTodayAgenda(state, today).entries.find(
      (e) => e.session.id === "6a-session-8",
    )!;
    expect(entry.tasks.map((task) => task.kind)).toContain("attendance");
    expect(entry.statusLabel).toBe("Chưa điểm danh đủ");
    expect(entry.statusTone).toBe("warning");
  });

  it("không tính em đã rời lớp trước ngày buổi vào danh sách thiếu điểm danh", () => {
    const session = state.sessions.find((item) => item.id === "6a-session-7")!;
    const today = session.date;
    const roster = state.students.filter(
      (student) =>
        student.classId === session.classId &&
        student.enrolledAt <= session.date &&
        (student.leftAt === null || student.leftAt >= session.date),
    );
    const leftStudent = state.students.find(
      (student) => student.classId === session.classId && student.leftAt !== null && student.leftAt < session.date,
    )!;
    expect(state.attendance.some((record) => record.sessionId === session.id && record.studentId === leftStudent.id)).toBe(false);
    expect(state.attendance.filter((record) => record.sessionId === session.id && roster.some((student) => student.id === record.studentId))).toHaveLength(roster.length);

    const entry = buildTodayAgenda(state, today).entries.find((item) => item.session.id === session.id)!;
    expect(entry.tasks.map((task) => task.kind)).not.toContain("attendance");
    expect(entry.statusLabel).toBe("Đã điểm danh");
  });

  it("buổi huỷ bị bỏ qua", () => {
    const today = plannedDate("6a-session-8");
    state.sessions.find((s) => s.id === "6a-session-8")!.status = "cancelled";
    const agenda = buildTodayAgenda(state, today);
    expect(agenda.entries.find((e) => e.session.id === "6a-session-8")).toBeUndefined();
  });

  it("không có buổi hôm nay thì chỉ hiện buổi kế tiếp và không báo việc thiếu", () => {
    const before = plannedDate("6a-session-8");
    const day = new Date(before + "T12:00:00");
    day.setDate(day.getDate() - 1);
    const today = dateISO(day);
    const agenda = buildTodayAgenda(state, today);
    expect(agenda.entries).toHaveLength(0);
    expect(agenda.next!.session.date > today).toBe(true);
    expect(agenda.next?.tasks).toEqual([]);
  });

  it("chỉ lấy lớp trong phạm vi và bỏ lớp đã đóng", () => {
    const today = plannedDate("6a-session-8");
    expect(buildTodayAgenda(state, today, new Set(["ielts"])).entries.every((e) => e.classId === "ielts")).toBe(true);
    state.classes.find((c) => c.id === "6a")!.status = "archived";
    expect(buildTodayAgenda(state, today).entries.some((e) => e.classId === "6a")).toBe(false);
  });
});

describe("việc còn dở", () => {
  const dayBefore = (iso: string, n: number) => {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  };

  it("chỉ lấy buổi đã diễn ra trong 14 ngày, bỏ buổi huỷ, mới nhất trước", () => {
    const last = state.sessions.find((s) => s.id === "6a-session-7")!;
    const today = dayBefore(last.date, 1);
    const agenda = buildTodayAgenda(state, today);
    const all = [...agenda.backlog];
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((i) => i.session.date < today && i.session.date >= dayBefore(today, -14))).toBe(true);
    expect(all.every((i) => i.session.status !== "cancelled")).toBe(true);
    const dates = all.map((i) => i.session.date);
    expect(dates).toEqual([...dates].sort().reverse());
    // quá 14 ngày thì ẩn hẳn
    const far = buildTodayAgenda(state, dayBefore(today, 60));
    expect(far.backlog).toEqual([]);
  });

  it("buổi đã qua còn planned báo điểm danh chưa lưu; gộp theo loại, mỗi loại một nhóm", () => {
    const last = state.sessions.find((s) => s.id === "6a-session-7")!;
    last.status = "planned";
    const today = dayBefore(last.date, 1);
    const agenda = buildTodayAgenda(state, today);
    expect(agenda.backlog.some((i) => i.session.id === last.id && i.task.kind === "attendance")).toBe(true);
    const groups = groupBacklog(agenda.backlog);
    expect(groups.map((g) => g.kind)).toEqual([...new Set(groups.map((g) => g.kind))]);
    expect(groups.flatMap((g) => g.items)).toHaveLength(agenda.backlog.length);
    expect(groups.every((g) => g.items.every((i) => i.task.kind === g.kind))).toBe(true);
    expect(groups[0].kind).toBe("attendance");
  });

  it("thu gọn backlog lấy tối đa 2 việc theo ưu tiên điểm danh, phiếu, BTVN", () => {
    const agenda = buildTodayAgenda(state, "2026-10-30");
    const backlog = [
      agenda.backlog.find((item) => item.task.kind === "homework")!,
      agenda.backlog.find((item) => item.task.kind === "tickets")!,
      agenda.backlog.find((item) => item.task.kind === "attendance")!,
    ];
    const collapsed = collapsedBacklogItems(backlog);
    expect(collapsed).toHaveLength(2);
    expect(collapsed.map((item) => item.task.kind)).toEqual(["attendance", "tickets"]);
  });
});
