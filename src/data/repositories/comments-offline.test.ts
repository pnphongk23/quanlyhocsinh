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
    studentId: "6a-student-0", stars: 3, note: "", status: "draft",
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
});
