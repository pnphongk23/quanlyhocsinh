import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, setCacheIdentity } from "../db";
import { createSeed } from "../seed";
import { replaceStore } from "../store";

vi.mock("../sync", async (original) => ({
  ...(await original<typeof import("../sync")>()),
  scheduleSync: vi.fn(),
}));

beforeEach(async () => {
  setCacheIdentity({ userId: "teacher", workspaceId: "workspace", membershipId: "member" });
  await db.delete();
  await db.open();
  const seed = createSeed();
  const session = seed.sessions.find((item) => item.id === "6a-session-7")!;
  seed.comments = [{
    id: `${session.id}:6a-student-0`, classId: "6a", sessionId: session.id,
      studentId: "6a-student-0", stars: 3, note: "", hwManual: false, status: "draft",
    sendQueued: false, sentAt: null, updatedAt: "2026-10-14", createdAt: "2026-10-14",
  }];
  replaceStore(seed);
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

afterEach(async () => {
  setCacheIdentity(null);
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  await db.delete();
});

describe("phiếu nhận xét khi mất mạng", () => {
  it("gộp lệnh chờ: đổi tiêu chí rồi gõ ghi chú vẫn gửi tiêu chí", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const { saveSessionCommentDurable } = await import("./comments");
    await saveSessionCommentDurable({ sessionId: "6a-session-7", studentId: "6a-student-1", criteria: 23 });
    await saveSessionCommentDurable({ sessionId: "6a-session-7", studentId: "6a-student-1", note: "Ghi thêm" });
    const sets = (await db.outbox.toArray()).filter((row) => row.type === "slip.set");
    expect(sets).toHaveLength(1);
    expect(sets[0].payload).toMatchObject({ criteria: 23, note: "Ghi thêm" });
  });

  it("phiếu mới chỉ gõ ghi chú vẫn gửi criteria để máy chủ nhận", async () => {
    const { saveSessionCommentDurable } = await import("./comments");
    await saveSessionCommentDurable({ sessionId: "6a-session-7", studentId: "6a-student-1", note: "Chỉ ghi chú" });
    const [set] = (await db.outbox.toArray()).filter((row) => row.type === "slip.set");
    expect(set.payload).toMatchObject({ criteria: 31, note: "Chỉ ghi chú" });
  });

  it("phiếu đã có chỉ sửa ghi chú thì không gửi criteria cũ đè lên máy chủ", async () => {
    const { saveSessionCommentDurable } = await import("./comments");
    await saveSessionCommentDurable({ sessionId: "6a-session-7", studentId: "6a-student-0", note: "Sửa ghi chú" });
    const [set] = (await db.outbox.toArray()).filter((row) => row.type === "slip.set");
    expect(set.payload).not.toHaveProperty("criteria");
  });

  it("chặn gửi, không thêm slip.send, và giữ nguyên slip.send cũ trong outbox", async () => {
    const { identityKey } = await import("../db");
    const identity = identityKey();
    const oldCommand = {
      id: "already-queued", identity, type: "slip.send" as const,
      payload: { session_id: "6a-session-6", student_ids: ["6a-student-0"] },
      base_version: 0, membership_id: "member", created_at: "2026-10-13T00:00:00.000Z", status: "pending" as const,
    };
    await db.outbox.put(oldCommand);
    const { getStore } = await import("../store");
    const stateBefore = structuredClone(getStore());
    const slipsBefore = await db.slips.toArray();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    const { sendSessionTicketsDurable } = await import("./comments");
    await expect(sendSessionTicketsDurable("6a-session-7", ["6a-student-0"]))
      .rejects.toThrow("Cần có mạng để gửi phiếu.");
    expect(getStore()).toEqual(stateBefore);
    expect(await db.outbox.toArray()).toEqual([oldCommand]);
    expect(await db.slips.toArray()).toEqual(slipsBefore);
  });

  it("cho phép slip.set offline và xếp hàng slip.send khi online", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const { saveSessionCommentDurable, sendSessionTicketsDurable } = await import("./comments");
    await saveSessionCommentDurable({ sessionId: "6a-session-7", studentId: "6a-student-0", stars: 2, note: "Đã soạn" });
    expect((await db.outbox.toArray()).map((row) => row.type)).toContain("slip.set");
    expect((await db.outbox.toArray()).map((row) => row.type)).not.toContain("slip.send");

    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await sendSessionTicketsDurable("6a-session-7", ["6a-student-0"]);
    expect((await db.outbox.toArray()).map((row) => row.type)).toContain("slip.send");
  });

  it("cập nhật riêng note giữ nguyên phiếu năm sao và bỏ criteria khỏi payload", async () => {
    const { getStore } = await import("../store");
    const state = getStore();
    state.comments = [{
      id: "6a-session-7:6a-student-0",
      classId: "6a",
      sessionId: "6a-session-7",
      studentId: "6a-student-0",
      criteria: 15,
      comment: "Câu nhận xét đã lưu.",
      scale: 5,
      stars: 4,
      note: "Ghi chú đã lưu.",
      hwManual: true,
      status: "draft",
      sendQueued: false,
      sentAt: null,
      updatedAt: "2026-10-14",
      createdAt: "2026-10-14",
    }];
    replaceStore(state);

    const { getSessionComment, saveSessionCommentDurable } = await import("./comments");
    await saveSessionCommentDurable({ sessionId: "6a-session-7", studentId: "6a-student-0", note: "Ghi chú mới." });

    expect(getSessionComment("6a-session-7", "6a-student-0")).toMatchObject({
      criteria: 15,
      stars: 4,
      scale: 5,
      hwManual: true,
      comment: "Câu nhận xét đã lưu.",
      note: "Ghi chú mới.",
    });
    const command = (await db.outbox.toArray()).find((row) => row.type === "slip.set");
    expect(command?.payload).not.toHaveProperty("criteria");
    expect(command?.payload).toMatchObject({ note: "Ghi chú mới." });
  });

  it("gửi phiếu mặc định chỉ cho Có mặt/Muộn và giữ phiếu đã mở cho em vắng", async () => {
    const { getStore } = await import("../store");
    const seed = getStore();
    seed.attendance = seed.attendance.map((item) => item.sessionId === "6a-session-6" && item.studentId === "6a-student-0" ? { ...item, status: "absent" } : item);
    replaceStore(seed);
    const { sendSessionTicketsDurable } = await import("./comments");
    const result = await sendSessionTicketsDurable("6a-session-6");
    expect(result.sent).not.toContain("6a-student-0");
    expect(result.skipped).toContain("6a-student-0");
    expect(result.skippedReasons).toContainEqual({ studentId: "6a-student-0", reason: "not_attended" });
    const created = getStore().comments.find((item) => item.sessionId === "6a-session-6" && item.studentId === "6a-student-1");
    expect(created).toMatchObject({ criteria: 31, stars: 5, scale: 5, comment: null, sendQueued: true });
  });
});
