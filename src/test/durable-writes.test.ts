import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, setCacheIdentity } from "../data/db";
import { createSeed } from "../data/seed";
import type { StoreState } from "../data/types";

const outbox = vi.hoisted(() => ({ persistCommand: vi.fn() }));
vi.mock("../data/outbox", async (original) => ({ ...(await original<object>()), ...outbox }));
vi.mock("../data/sync", async (original) => ({ ...(await original<object>()), scheduleSync: vi.fn(), syncNow: vi.fn() }));
vi.mock("../data/repositories/access", async (original) => ({
  ...(await original<object>()),
  requirePermission: () => undefined,
  requireClassAccess: () => undefined,
  requireSessionAccess: (id: string) => ({ id, classId: "c1", date: "2026-10-01", status: "planned" }),
}));

const fail = new Error("Không lưu được vào bộ nhớ trên thiết bị.");
const base = (): StoreState => ({
  ...createSeed(),
  classes: [{ id: "c1", name: "A", status: "active", weekdays: [1], time: "18:00" } as never],
  students: [{ id: "st1", classId: "c1", name: "An", parentPhone: "", enrolledAt: "2026-09-01", leftAt: null, status: "active" } as never],
  sessions: [{ id: "s1", classId: "c1", date: "2026-10-01", time: "18:00", origin: "recurring", status: "held" } as never],
    tests: [{ id: "t1", classId: "c1", name: "Kiểm tra", date: "2026-10-01", max: 10, archived: false } as never],
    scores: [], attendance: [{ id: "s1:st1", sessionId: "s1", studentId: "st1", status: "present", note: "", lateAt: null } as never], comments: [], homeworkSections: [], homeworkGrades: [],
});
const store = async () => (await import("../data/store"));
const snapshot = (s: StoreState) => JSON.stringify({ a: s.attendance, sc: s.scores, c: s.comments, hs: s.homeworkSections, hg: s.homeworkGrades, t: s.tests });

beforeEach(async () => {
  setCacheIdentity({ userId: "u", workspaceId: "w", membershipId: "m" });
  await db.delete(); await db.open();
  (await store()).replaceStore(base());
  outbox.persistCommand.mockReset().mockRejectedValue(fail);
});
afterEach(async () => { setCacheIdentity(null); await db.delete(); vi.restoreAllMocks(); });

/** Chạy `run` khi ghi bền lỗi: phải ném lỗi gốc và bộ nhớ không đổi so với trước. */
async function expectRejectedUnchanged(run: () => Promise<unknown>): Promise<void> {
  const { getStore } = await store();
  const before = snapshot(getStore());
  await expect(run()).rejects.toBe(fail);
  expect(snapshot(getStore())).toBe(before);
}
async function seed(change: (s: StoreState) => void): Promise<void> {
  const { replaceStore, getStore } = await store(); const next = structuredClone(getStore()); change(next); replaceStore(next);
}

describe("…Durable repository writes reject and roll back when persisting fails", () => {
  it("saveAttendanceDurable", async () => {
    const { saveAttendanceDurable } = await import("../data/repositories/attendance");
    await seed((s) => { s.attendance = [{ id: "s1:st1", sessionId: "s1", studentId: "st1", status: "absent", note: "" } as never]; });
    await expectRejectedUnchanged(() => saveAttendanceDurable({ sessionId: "s1", studentId: "st1", status: "present", note: "", lateAt: null } as never));
  });
  it("saveScoreDurable", async () => {
    const { saveScoreDurable } = await import("../data/repositories/scores");
    await expectRejectedUnchanged(() => saveScoreDurable({ testId: "t1", studentId: "st1", value: 8 }));
  });
  it("saveSessionCommentDurable", async () => {
    const { saveSessionCommentDurable } = await import("../data/repositories/comments");
    await expectRejectedUnchanged(() => saveSessionCommentDurable({ sessionId: "s1", studentId: "st1", stars: 3, note: "tốt" }));
  });
  it("sendSessionTicketsDurable", async () => {
    const { sendSessionTicketsDurable } = await import("../data/repositories/comments");
    await seed((s) => { s.comments = [{ id: "s1:st1", classId: "c1", sessionId: "s1", studentId: "st1", stars: 3, note: "", status: "draft", sendQueued: false, sentAt: null, updatedAt: "x", createdAt: "x" } as never]; });
    vi.spyOn(db.outbox, "put").mockRejectedValue(fail);
    await expectRejectedUnchanged(() => sendSessionTicketsDurable("s1", ["st1"]));
  });
  it("createTestDurable", async () => {
    const { createTestDurable } = await import("../data/repositories/tests");
    await expectRejectedUnchanged(() => createTestDurable({ classId: "c1", name: "Mới", date: "2026-10-02" }));
  });
  it("updateTestDurable", async () => {
    const { updateTestDurable } = await import("../data/repositories/tests");
    await expectRejectedUnchanged(() => updateTestDurable("t1", { name: "Đổi tên" }));
  });
  it("deleteTestDurable (deleted and archived)", async () => {
    const { deleteTestDurable } = await import("../data/repositories/tests");
    await expectRejectedUnchanged(() => deleteTestDurable("t1"));
    await seed((s) => { s.scores = [{ id: "t1:st1", testId: "t1", studentId: "st1", value: 5 } as never]; });
    await expectRejectedUnchanged(() => deleteTestDurable("t1"));
  });
  it("deleteHomeworkSectionDurable", async () => {
    const { deleteHomeworkSectionDurable } = await import("../data/repositories/homework");
    await seed((s) => { s.homeworkSections = [{ id: "h1", sessionId: "s1", kind: "reading", title: "Đọc", description: "" } as never]; s.homeworkGrades = [{ sectionId: "h1", studentId: "st1", level: null } as never]; });
    await expectRejectedUnchanged(() => deleteHomeworkSectionDurable("h1"));
  });
  it("setHomeworkGradeDurable", async () => {
    const { setHomeworkGradeDurable } = await import("../data/repositories/homework");
    await seed((s) => { s.homeworkSections = [{ id: "h1", sessionId: "s1", kind: "reading", title: "Đọc", description: "" } as never]; s.homeworkGrades = [{ sectionId: "h1", studentId: "st1", level: "done" } as never]; });
    await expectRejectedUnchanged(() => setHomeworkGradeDurable("h1", "st1", "excellent" as never));
    await expectRejectedUnchanged(() => setHomeworkGradeDurable("h1", "st1", null));
  });

  it("saveAttendanceBatchDurable rolls back the whole batch when a later command fails", async () => {
    const { saveAttendanceBatchDurable } = await import("../data/repositories/attendance");
    await seed((s) => { s.students.push({ id: "st2", classId: "c1", name: "Bình", parentPhone: "", enrolledAt: "2026-09-01", leftAt: null, status: "active" } as never); });
    outbox.persistCommand.mockReset().mockResolvedValueOnce(undefined).mockRejectedValue(fail);
    await expectRejectedUnchanged(() => saveAttendanceBatchDurable([
      { sessionId: "s1", studentId: "st1", status: "present", note: "", lateAt: null },
      { sessionId: "s1", studentId: "st2", status: "absent", note: "", lateAt: null },
    ] as never));
  });
  it("setHomeworkGradeForAllDurable rolls back the whole batch when a later command fails", async () => {
    const { setHomeworkGradeForAllDurable } = await import("../data/repositories/homework");
    await seed((s) => {
      s.students.push({ id: "st2", classId: "c1", name: "Bình", parentPhone: "", enrolledAt: "2026-09-01", leftAt: null, status: "active" } as never);
      s.homeworkSections = [{ id: "h1", sessionId: "s1", kind: "reading", title: "Đọc", description: "" } as never];
      s.homeworkGrades = [{ sectionId: "h1", studentId: "st1", level: "not_done" } as never];
    });
    outbox.persistCommand.mockReset().mockResolvedValueOnce(undefined).mockRejectedValue(fail);
    await expectRejectedUnchanged(() => setHomeworkGradeForAllDurable("h1", "done" as never));
  });
  it("batch durable variants return results when every command persists", async () => {
    outbox.persistCommand.mockReset().mockResolvedValue(undefined);
    const { getStore } = await store();
    const { saveAttendanceBatchDurable } = await import("../data/repositories/attendance");
    const saved = await saveAttendanceBatchDurable([{ sessionId: "s1", studentId: "st1", status: "present", note: "", lateAt: null }] as never);
    expect(saved).toHaveLength(1);
    expect(getStore().attendance).toHaveLength(1);
  });
  it("durable variants keep the change and return the value once persisting succeeds", async () => {
    outbox.persistCommand.mockReset().mockResolvedValue(undefined);
    const { getStore } = await store();
    const { saveScoreDurable } = await import("../data/repositories/scores");
    const { deleteTestDurable } = await import("../data/repositories/tests");
    await expect(saveScoreDurable({ testId: "t1", studentId: "st1", value: 8 })).resolves.toMatchObject({ value: 8 });
    expect(getStore().scores).toHaveLength(1);
    await expect(deleteTestDurable("t1")).resolves.toBe("archived");
    expect(getStore().tests[0].archived).toBe(true);
  });
});
