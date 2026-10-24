import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "none", comments_reports: "write" } as never };
const me = meFor("teacher", [membership]);
let server: ReturnType<typeof createFakeServer>;

beforeEach(() => {
  localStorage.clear();
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
  server.put("student", { id: "old", class_id: "c1", name: "Cũ", enrolled_at: "2026-09-01", left_at: null, status: "active" });
  server.put("student", { id: "new", class_id: "c1", name: "Mới", enrolled_at: "2026-10-24", left_at: null, status: "active" });
  server.put("student", { id: "gone", class_id: "c1", name: "Nghỉ", enrolled_at: "2026-09-01", left_at: "2026-10-10", status: "left" });
  server.put("test", { id: "t1", class_id: "c1", name: "Quiz", date: "2026-10-20", max: 10, archived: false });
});
afterEach(() => { vi.unstubAllGlobals(); });

const serverScore = (studentId: string) => [...(server.rows.get("score")?.values() ?? [])].find((row: any) => row.student_id === studentId);

describe("score for a student enrolled after the test date", () => {
  it("is saved locally and reaches the server", async () => {
    const d = await bootDevice(server, "t", me);
    const scores = await import("../data/repositories/scores");
    await d.syncNow();
    await scores.saveScoreDurable({ testId: "t1", studentId: "new", value: 7 });
    await d.syncNow();
    expect(serverScore("new")).toMatchObject({ value: 7 });
    expect(await d.db.outbox.count()).toBe(0);
  });

  it("still refuses a student who left before the test date", async () => {
    const d = await bootDevice(server, "t", me);
    const scores = await import("../data/repositories/scores");
    await d.syncNow();
    expect(() => scores.saveScoreDurable({ testId: "t1", studentId: "gone", value: 7 })).toThrow("Học sinh không thuộc bài kiểm tra này.");
  });
});

describe("rejected commands", () => {
  async function boot() {
    const d = await bootDevice(server, "t", me);
    const scores = await import("../data/repositories/scores");
    const status = await import("../data/saveStatus");
    await d.syncNow();
    return { d, scores, status };
  }

  it("keeps the rejected command, names the reason, and does not block other commands", async () => {
    const { d, scores, status } = await boot();
    server.hooks.rejectCommand = (c) => (c.payload.student_id === "new" ? "invalid_score" : undefined);
    await scores.saveScoreDurable({ testId: "t1", studentId: "new", value: 7 });
    await scores.saveScoreDurable({ testId: "t1", studentId: "old", value: 9 });
    await d.syncNow();
    expect(serverScore("old")).toMatchObject({ value: 9 });
    expect(status.getRejectedCommands()).toMatchObject([{ type: "score.set", error: "invalid_score" }]);
    expect(status.getSaveStatus()).toBe("error");
  });

  it("retry pushes the rejected command again", async () => {
    const { d, scores, status } = await boot();
    server.hooks.rejectCommand = () => "session_cancelled";
    await scores.saveScoreDurable({ testId: "t1", studentId: "new", value: 7 });
    await d.syncNow();
    expect(status.getRejectedCommands()).toHaveLength(1);
    server.hooks.rejectCommand = null;
    await d.retryRejectedCommands(status.getRejectedCommands().map((r: any) => r.id));
    expect(serverScore("new")).toMatchObject({ value: 7 });
    expect(status.getRejectedCommands()).toHaveLength(0);
    expect(status.getSaveStatus()).toBe("synced");
  });

  it("retry sends the command under a new id so the server evaluates it again", async () => {
    const { d, scores, status } = await boot();
    const seen: string[] = [];
    server.hooks.rejectCommand = (c) => { seen.push(c.id); return "score_above_max"; };
    await scores.saveScoreDurable({ testId: "t1", studentId: "new", value: 7 });
    await d.syncNow();
    server.hooks.rejectCommand = (c) => { seen.push(c.id); return undefined; };
    await d.retryRejectedCommands(status.getRejectedCommands().map((r: any) => r.id));
    expect(seen).toHaveLength(2);
    expect(seen[1]).not.toBe(seen[0]);
    expect(serverScore("new")).toMatchObject({ value: 7 });
  });

  it("discard drops the command and restores the server value", async () => {
    const { d, scores, status } = await boot();
    server.hooks.rejectCommand = () => "score_above_max";
    await scores.saveScoreDurable({ testId: "t1", studentId: "new", value: 7 });
    await d.syncNow();
    await d.discardRejectedCommands(status.getRejectedCommands().map((r: any) => r.id));
    expect(await d.db.outbox.count()).toBe(0);
    expect(status.getRejectedCommands()).toHaveLength(0);
    expect(status.getSaveStatus()).toBe("synced");
    expect(d.getStore().scores.find((s: any) => s.studentId === "new")).toBeUndefined();
  });

  it("discard touches only the given commands and leaves other rejected ones", async () => {
    const { d, scores, status } = await boot();
    server.hooks.rejectCommand = () => "invalid_score";
    await scores.saveScoreDurable({ testId: "t1", studentId: "new", value: 7 });
    await scores.saveScoreDurable({ testId: "t1", studentId: "old", value: 9 });
    await d.syncNow();
    const rows = status.getRejectedCommands();
    expect(rows).toHaveLength(2);
    await d.discardRejectedCommands([rows[0].id]);
    expect(status.getRejectedCommands().map((r: any) => r.id)).toEqual([rows[1].id]);
    expect(await d.db.outbox.count()).toBe(1);
    expect(status.getSaveStatus()).toBe("error");
  });

  it("a new write to the same cell replaces the rejected one", async () => {
    const { d, scores, status } = await boot();
    server.hooks.rejectCommand = () => "invalid_score";
    await scores.saveScoreDurable({ testId: "t1", studentId: "new", value: 7 });
    await d.syncNow();
    server.hooks.rejectCommand = null;
    await scores.saveScoreDurable({ testId: "t1", studentId: "new", value: 8 });
    await d.syncNow();
    expect(serverScore("new")).toMatchObject({ value: 8 });
    expect(status.getRejectedCommands()).toHaveLength(0);
    expect(status.getSaveStatus()).toBe("synced");
  });
});
