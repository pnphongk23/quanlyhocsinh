import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, identityKey, setCacheIdentity } from "../data/db";

vi.mock("../data/auth/session", () => ({
  getToken: () => "fake-token",
  clearSession: vi.fn(),
  invalidateActiveMembership: vi.fn(),
}));

const identity = { userId: "merge-user", workspaceId: "merge-workspace", membershipId: "merge-membership" };
const identityId = `${identity.userId}:${identity.workspaceId}:${identity.membershipId}`;
const SESSION = "session-a";
/** Hai em đang học của buổi: máy chủ chỉ nhận phiếu khi cả hai đã có điểm danh. */
const STUDENTS = ["student-a", "student-b"];

type PushedCommand = { id: string; type: string; payload: Record<string, string>; created_at: string };

const attendancePayload = (studentId: string) => ({ session_id: SESSION, student_id: studentId, status: "present" as const, note: "", late_at: null });
const attendanceRecord = (studentId: string) => ({ ...attendancePayload(studentId), version: 0, updated_at: "2026-10-31T00:00:00.000Z" });
const attendanceCommand = (studentId: string, createdAt: string) => ({
  id: crypto.randomUUID(), type: "attendance.set" as const, payload: { session_id: SESSION, student_id: studentId, status: "present" as const }, base_version: 0, created_at: createdAt,
});
const slipPayload = (studentId: string, comment: string) => ({ session_id: SESSION, student_id: studentId, criteria: 31, comment, note: "" });

/** Máy chủ giả có kiểm điểm danh: `slip.set` bị từ chối `attendance_incomplete` khi buổi còn em chưa điểm danh. */
function fakeServer() {
  const marked = new Map<string, string>();
  const pushed: PushedCommand[] = [];
  vi.spyOn(api, "request").mockImplementation((async (endpoint: string, init?: { body?: { commands?: PushedCommand[] } }) => {
    if (endpoint === "POST /sync/push") {
      const commands = init?.body?.commands ?? [];
      pushed.push(...commands);
      const results = commands.map((command) => {
        if (command.type === "attendance.set") {
          marked.set(command.payload.student_id, command.payload.status);
          return { id: command.id, status: "applied", version: 1 };
        }
        if (command.type === "slip.set" || command.type === "slip.send") {
          const missing = STUDENTS.filter((studentId) => !marked.has(studentId));
          if (missing.length) return { id: command.id, status: "rejected", error: { code: "attendance_incomplete", message: "Attendance is incomplete.", request_id: "fixture", details: { missing_count: missing.length } } };
        }
        return { id: command.id, status: "applied", version: 1 };
      });
      return { epoch: 1, cursor: 1, results };
    }
    if (endpoint === "GET /sync/pull") return { cursor: 1, epoch: 1, has_more: false, server_time: "2026-10-31T00:00:00Z", upserts: {}, deleted: [] };
    throw new Error(`Unexpected fake endpoint: ${endpoint}`);
  }) as never);
  return pushed;
}

let api: typeof import("../data/sync").api;

beforeEach(async () => {
  setCacheIdentity(identity);
  await db.delete();
  await db.open();
  await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
  ({ api } = await import("../data/sync"));
});

afterEach(async () => {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  setCacheIdentity(null);
  await db.delete();
  vi.restoreAllMocks();
});

describe("merged outbox commands keep their place in the queue", () => {
  it("keeps a merged attendance command before the slip already queued for the same session", async () => {
    const { persistCommand } = await import("../data/outbox");
    const { syncNow } = await import("../data/sync");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    // Ngoại tuyến: điểm danh em A, điểm danh em B, soạn phiếu em A, rồi sửa điểm danh em B (gộp vào lệnh chờ của B).
    await persistCommand("attendance", [SESSION, "student-a"], attendanceRecord("student-a"), attendanceCommand("student-a", "2026-10-31T00:00:00.000Z"));
    await persistCommand("attendance", [SESSION, "student-b"], attendanceRecord("student-b"), attendanceCommand("student-b", "2026-10-31T00:00:01.000Z"));
    await persistCommand("slip", [SESSION, "student-a"], { ...slipPayload("student-a", "Nháp"), scale: 5, status: "draft", version: 0, updated_at: "2026-10-31T00:00:02.000Z" }, {
      id: crypto.randomUUID(), type: "slip.set", payload: slipPayload("student-a", "Nháp"), base_version: 0, created_at: "2026-10-31T00:00:02.000Z",
    });
    await persistCommand("attendance", [SESSION, "student-b"], attendanceRecord("student-b"), attendanceCommand("student-b", "2026-10-31T00:00:03.000Z"));
    expect(await db.outbox.count()).toBe(3);

    const pushed = fakeServer();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await syncNow();

    // Điểm danh em B vẫn đứng trước phiếu em A dù lệnh vừa được gộp lúc 00:00:03.
    expect(pushed.map(({ type, payload }) => `${type}:${payload.student_id}`)).toEqual([
      "attendance.set:student-a",
      "attendance.set:student-b",
      "slip.set:student-a",
    ]);
    expect(await db.outbox.count()).toBe(0);
  });

  it("keeps merging slip edits into one command, with the latest payload and the newest queue position", async () => {
    const { persistCommand } = await import("../data/outbox");
    const { syncNow } = await import("../data/sync");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    await persistCommand("slip", [SESSION, "student-a"], { ...slipPayload("student-a", "Câu cũ"), scale: 5, status: "draft", version: 3, updated_at: "2026-10-31T00:00:00.000Z" }, {
      id: crypto.randomUUID(), type: "slip.set", payload: { session_id: SESSION, student_id: "student-a", criteria: 31, note: "" }, base_version: 3, created_at: "2026-10-31T00:00:00.000Z",
    });
    await persistCommand("slip", [SESSION, "student-a"], { ...slipPayload("student-a", "Câu mới"), scale: 5, status: "draft", version: 3, updated_at: "2026-10-31T00:00:05.000Z" }, {
      id: crypto.randomUUID(), type: "slip.set", payload: { session_id: SESSION, student_id: "student-a", comment: "Câu mới", note: "" }, base_version: 3, created_at: "2026-10-31T00:00:05.000Z",
    });

    const rows = await db.outbox.toArray();
    expect(rows).toHaveLength(1);
    // Gộp giữ tiêu chí đã soạn trước đó và giữ `base_version` của lệnh cũ, như trước khi sửa.
    expect(rows[0].payload).toMatchObject({ criteria: 31, comment: "Câu mới" });
    expect(rows[0].base_version).toBe(3);
    expect(rows[0].created_at).toBe("2026-10-31T00:00:05.000Z");

    const pushed = fakeServer();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await syncNow();
    expect(pushed.map(({ type }) => type)).toEqual(["slip.set"]);
  });
});
