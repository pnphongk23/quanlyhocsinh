import { beforeEach, describe, expect, it } from "vitest";
import { createSeed } from "../../data/seed";
import { buildTicketRows, ungradedHomeworkNotice } from "../../data/homework";
import type { StoreState } from "../../data/types";
import { buildTodayAgenda } from "./todayModel";

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
    const entry = buildTodayAgenda(state, today).entries.find(
      (e) => e.session.id === "6a-session-8",
    )!;
    expect(entry.tasks.map((t) => t.kind)).not.toContain("attendance");
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
    const today = day.toISOString().slice(0, 10);
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
    expect(far.backlogMore).toBe(0);
  });

  it("buổi đã qua còn planned báo điểm danh chưa lưu; cắt 5 dòng và đếm phần còn lại", () => {
    const last = state.sessions.find((s) => s.id === "6a-session-7")!;
    last.status = "planned";
    const today = dayBefore(last.date, 1);
    const agenda = buildTodayAgenda(state, today);
    expect(agenda.backlog.some((i) => i.session.id === last.id && i.task.kind === "attendance")).toBe(true);
    expect(agenda.backlog.length).toBeLessThanOrEqual(5);
    if (agenda.backlogMore > 0) expect(agenda.backlog).toHaveLength(5);
  });
});
