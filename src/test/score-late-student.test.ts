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
  server.put("class", { id: "c2", name: "7B", status: "active", weekdays: [2], start_time: "10:00", teacher_name: null });
  server.put("student", { id: "old", class_id: "c1", name: "Cũ", enrolled_at: "2026-09-01", left_at: null, status: "active" });
  server.put("student", { id: "new", class_id: "c1", name: "Mới", enrolled_at: "2026-10-24", left_at: null, status: "active" });
  server.put("student", { id: "gone", class_id: "c1", name: "Nghỉ", enrolled_at: "2026-09-01", left_at: "2026-10-10", status: "left" });
  server.put("student", { id: "outside", class_id: "c2", name: "Ngoài lớp", enrolled_at: "2026-09-01", left_at: null, status: "active" });
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

  it("assigns the default to the supplied visible students, overwrites, and queues offline", async () => {
    const d = await bootDevice(server, "t", me);
    const scores = await import("../data/repositories/scores");
    const tests = await import("../data/repositories/tests");
      await d.syncNow();
      await expect(scores.assignDefaultScoreDurable("t1", ["outside"])).rejects.toThrow("Học sinh không thuộc bài kiểm tra này.");
      await scores.saveScoreDurable({ testId: "t1", studentId: "old", value: 4 });
    await d.syncNow();
    const originalOnline = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    try {
      await scores.saveScoreDurable({ testId: "t1", studentId: "old", value: 12 });
      await scores.assignDefaultScoreDurable("t1", ["old", "new"]);
      expect(d.getStore().scores.filter((score: any) => score.testId === "t1").map((score: any) => score.value)).toEqual([15, 15]);
      expect((await d.db.outbox.toArray()).filter((row: any) => row.type === "score.set")).toHaveLength(2);
      expect(await scores.assignDefaultScoreDurable("t1", ["old", "new"])).toEqual([]);
      expect((await d.db.outbox.toArray()).filter((row: any) => row.type === "score.set")).toHaveLength(2);
      const testB = await tests.createTestDurable({ classId: "c1", name: "Bài B", date: "2026-10-21" });
      await scores.assignDefaultScoreDurable(testB.id, ["old", "new"]);
      const pendingScores = d.getStore().pending.filter((item: any) => item.entity === "score.set");
      expect(pendingScores.map((item: any) => item.recordId).sort()).toEqual([
        `${d.identityKey()}|score|t1|new`, `${d.identityKey()}|score|t1|old`,
        `${d.identityKey()}|score|${testB.id}|new`, `${d.identityKey()}|score|${testB.id}|old`,
      ].sort());
      expect(new Set(pendingScores.map((item: any) => item.recordId)).size).toBe(4);
      expect(pendingScores.every((item: any) => item.entity === "score.set")).toBe(true);
      expect(serverScore("gone")).toBeUndefined();
      expect(d.getStore().scores.some((score: any) => score.studentId === "outside")).toBe(false);
    } finally {
      if (originalOnline) Object.defineProperty(navigator, "onLine", originalOnline);
      else delete (navigator as any).onLine;
    }
  });

  it("rolls back every local score when the atomic durable transaction fails", async () => {
    const d = await bootDevice(server, "t", me);
    const scores = await import("../data/repositories/scores");
    await d.syncNow();
    vi.spyOn(d.db.scores, "put").mockRejectedValueOnce(new Error("disk"));
    await expect(scores.assignDefaultScoreDurable("t1", ["old", "new"])).rejects.toThrow("Không lưu được vào bộ nhớ trên thiết bị.");
    expect(d.getStore().scores.filter((score: any) => score.testId === "t1")).toEqual([]);
    expect((await d.db.outbox.toArray()).filter((row: any) => row.type === "score.set")).toEqual([]);
  });

  it("rolls back the successful first row when the second durable put fails", async () => {
    const d = await bootDevice(server, "t", me);
    const scores = await import("../data/repositories/scores");
    await d.syncNow();
    const put = d.db.scores.put.bind(d.db.scores);
    vi.spyOn(d.db.scores, "put").mockImplementationOnce((...args: Parameters<typeof d.db.scores.put>) => put(...args)).mockRejectedValueOnce(new Error("disk"));
    await expect(scores.assignDefaultScoreDurable("t1", ["old", "new"])).rejects.toThrow("Không lưu được vào bộ nhớ trên thiết bị.");
    expect(d.getStore().scores.filter((score: any) => score.testId === "t1")).toEqual([]);
    expect((await d.db.scores.toArray()).filter((row: any) => row.test_id === "t1")).toEqual([]);
    expect((await d.db.outbox.toArray()).filter((row: any) => row.type === "score.set")).toEqual([]);
  });

  it("does not push max from legacy test.create/update rows, including an update without id", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const createdAt = "2026-10-24T00:00:00.000Z";
    const base = { identity: d.identityKey(), membership_id: "m-staff", base_version: 0, status: "pending" as const };
    await d.db.outbox.bulkPut([
      { ...base, id: "legacy-create", type: "test.create", payload: { id: "t2", class_id: "c1", name: "Tạo cũ", date: "2026-10-22", max: 20 }, created_at: createdAt },
      { ...base, id: "legacy-update-id", type: "test.update", payload: { id: "t1", name: "Quiz mới", date: "2026-10-20", max: 30 }, created_at: "2026-10-24T00:00:01.000Z", entity_key: `${d.identityKey()}|test|t1` },
      { ...base, id: "legacy-update-no-id", type: "test.update", payload: { name: "Quiz cũ", date: "2026-10-20", max: 40 }, created_at: "2026-10-24T00:00:02.000Z", entity_key: `${d.identityKey()}|test|t1` },
    ] as any);
    await d.syncNow();
    const sent = server.hooks.pushBatches.flat().filter((command: any) => command.id.startsWith("legacy-"));
    expect(sent).toHaveLength(3);
    expect(sent.every((command: any) => !Object.hasOwn(command.payload, "max"))).toBe(true);
    expect(sent.find((command: any) => command.id === "legacy-update-no-id")?.payload).toMatchObject({ id: "t1", name: "Quiz cũ" });
    expect(await d.db.outbox.count()).toBe(0);
  });

  it("pushes a default assignment for more than 50 students in ordered batches", async () => {
    for (let i = 0; i < 53; i++) server.put("student", { id: `bulk-${String(i).padStart(2, "0")}`, class_id: "c1", name: `Bulk ${i}`, enrolled_at: "2026-09-01", left_at: null, status: "active" });
    const d = await bootDevice(server, "t", me);
    const scores = await import("../data/repositories/scores");
    await d.syncNow();
    await scores.assignDefaultScoreDurable("t1", Array.from({ length: 53 }, (_, i) => `bulk-${String(i).padStart(2, "0")}`));
    await d.syncNow();
    const pushes = server.requests.filter((request) => request.path === "/sync/push");
    expect(pushes.length).toBe(2);
    expect(server.hooks.pushBatches.map((batch) => batch.length)).toEqual([50, 3]);
    expect(server.hooks.pushBatches.flat().map((command: any) => command.payload.student_id)).toEqual(Array.from({ length: 53 }, (_, i) => `bulk-${String(i).padStart(2, "0")}`));
    expect(await d.db.outbox.count()).toBe(0);
    expect(Array.from({ length: 53 }, (_, i) => serverScore(`bulk-${String(i).padStart(2, "0")}`)?.value)).toEqual(Array(53).fill(15));
  });

  it("waits for a pending test.create before dependent scores and continues after a rejected peer", async () => {
    for (let i = 0; i < 53; i++) server.put("student", { id: `dep-${String(i).padStart(2, "0")}`, class_id: "c1", name: `Dep ${i}`, enrolled_at: "2026-09-01", left_at: null, status: "active" });
    server.put("class_session", { id: "s1", class_id: "c1", date: "2026-10-24", start_time: "09:00", origin: "recurring", is_makeup: false, status: "held" });
    const d = await bootDevice(server, "t", me);
    const scores = await import("../data/repositories/scores");
    const tests = await import("../data/repositories/tests");
    const attendance = await import("../data/repositories/attendance");
    await d.syncNow();
    const originalOnline = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    let testB: { id: string };
    try {
      testB = await tests.createTestDurable({ classId: "c1", name: "Bài chưa đồng bộ", date: "2026-10-24" });
      await attendance.saveAttendanceDurable({ sessionId: "s1", studentId: "old", status: "present", note: "", lateAt: null });
      await scores.assignDefaultScoreDurable(testB.id, Array.from({ length: 53 }, (_, i) => `dep-${String(i).padStart(2, "0")}`));
    } finally {
      if (originalOnline) Object.defineProperty(navigator, "onLine", originalOnline);
      else delete (navigator as any).onLine;
    }
    const pending = await d.db.outbox.toArray();
    const create = pending.find((row: any) => row.type === "test.create")!;
    const dependent = pending.filter((row: any) => row.type === "score.set" && (row.payload as any).test_id === testB!.id);
    expect(dependent).toHaveLength(53);
    expect(dependent.every((row: any) => row.depends_on === create.id)).toBe(true);
    expect(server.rows.get("test")?.has(testB!.id)).toBe(false);
    server.hooks.rejectCommand = (command) => command.type === "attendance.set" ? "invalid_attendance" : undefined;
    await d.syncNow();
    expect(server.hooks.pushBatches[0].map((command: any) => command.type).sort()).toEqual(["attendance.set", "test.create"]);
    expect(server.hooks.pushBatches.slice(1).map((batch) => batch.length)).toEqual([50, 3]);
    expect(server.hooks.pushBatches.slice(1).flat().every((command: any) => command.payload.test_id === testB!.id)).toBe(true);
    expect(server.rows.get("test")?.has(testB!.id)).toBe(true);
    expect(Array.from({ length: 53 }, (_, i) => serverScore(`dep-${String(i).padStart(2, "0")}`)?.value)).toEqual(Array(53).fill(15));
    expect((await d.db.outbox.toArray()).some((row: any) => row.type === "attendance.set" && row.status === "rejected")).toBe(true);
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

  it("retrying a rejected create and its dependent score repoints the dependency", async () => {
    const { d, status } = await boot();
    const base = { identity: d.identityKey(), membership_id: "m-staff", base_version: 0 };
    await d.db.outbox.bulkPut([
      { ...base, id: "create-1", type: "test.create", payload: {} as never, created_at: "2026-10-24T00:00:01.000Z", status: "rejected", error: "forbidden" },
      { ...base, id: "score-1", type: "score.set", payload: {} as never, created_at: "2026-10-24T00:00:02.000Z", status: "rejected", error: "forbidden", depends_on: "create-1" },
    ]);
    server.hooks.rejectCommand = () => "forbidden";
    await d.retryRejectedCommands(["create-1", "score-1"]);
    const rows = await d.db.outbox.toArray();
    const create = rows.find((r: any) => r.type === "test.create")!;
    const score = rows.find((r: any) => r.type === "score.set")!;
    expect(create.id).not.toBe("create-1");
    expect(score.depends_on).toBe(create.id);
    expect(status.getRejectedCommands()).toHaveLength(2);
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
