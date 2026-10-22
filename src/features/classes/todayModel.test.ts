import { describe, expect, it } from "vitest";
import { createSeed } from "../../test/fixtures/seed";
import { buildTodayAgenda } from "./todayModel";

describe("buildTodayAgenda", () => {
  it("omits cancelled sessions and returns unfinished work with the right tabs", () => {
    const state = createSeed();
    const session = state.sessions.find((item) => item.id === "6a-session-8")!;
    session.date = "2026-10-20";
    session.status = "planned";
    state.sessions = [session, ...state.sessions.filter((item) => item.id === "6a-extra-cancelled")];
    state.comments = state.comments.filter((item) => item.sessionId !== session.id);
    const agenda = buildTodayAgenda(state, "2026-10-23");
    expect(agenda.tasks.some((task) => task.session.id === session.id && task.tab === "diem-danh")).toBe(true);
    expect(agenda.tasks.some((task) => task.session.id === session.id && task.tab === "nhan-xet")).toBe(true);
  });

  it("uses the next planned session when there is none today", () => {
    const agenda = buildTodayAgenda(createSeed(), "2026-10-23");
    expect(agenda.todaySessions).toEqual([]);
    expect(agenda.nextSession).not.toBeNull();
  });
});
