import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, setCacheIdentity } from "../db";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../store";

vi.mock("../sync", async original => ({
  ...(await original<typeof import("../sync")>()),
  scheduleSync: vi.fn(),
}));

const identity = { userId: "teacher", workspaceId: "workspace", membershipId: "member" };
const me = {
  user: { id: identity.userId, phone: "fixture", display_name: "Giáo viên", must_change_password: false, email: null },
  active_membership_id: identity.membershipId,
  memberships: [{
    id: identity.membershipId,
    workspace: { id: identity.workspaceId, name: "Lớp học" },
    role: { id: "admin", name: "Quản trị viên", system_key: "admin", scope_kind: "workspace" },
    permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", comments_reports: "write" },
    status: "active", scope_epoch: 1,
  }],
};

async function setup(count: number) {
  setCacheIdentity(identity);
  await db.delete();
  await db.open();
  await db.meta.put({ key: "teacher:workspace:member", identity: "teacher:workspace:member", cursor: 0, epoch: 1 });
  const state = createSeed();
    for (let index = 0; index < count; index++) {
      const studentId = `extra-${index}`;
      state.students.push({ id: studentId, classId: "6a", name: `Học sinh ${index}`, parentPhone: "", enrolledAt: "2026-01-01", leftAt: null, status: "active" });
      state.attendance.push({ id: `6a-session-7:${studentId}`, sessionId: "6a-session-7", studentId, status: "present", note: "", lateAt: null });
    }
  replaceStore(state);
  const auth = await import("../auth/session");
  await auth.activateSession("fixture-token", me.user, me as never, identity.membershipId);
  replaceStore(state);
}

afterEach(async () => {
  setCacheIdentity(null);
  localStorage.clear();
  await db.delete();
});

beforeEach(() => localStorage.clear());

describe("nhập ghi chú theo lô", () => {
  it("đẩy 20 phiếu trong một yêu cầu", async () => {
    await setup(20);
    const sync = await import("../sync");
    const pushed: number[] = [];
    vi.spyOn(sync.api, "request").mockImplementation(async (endpoint, options) => {
      if (endpoint === "POST /sync/push") {
        const commands = (options as { body: { commands: Array<{ id: string }> } }).body.commands;
        pushed.push(commands.length);
        return { epoch: 1, cursor: 0, results: commands.map(command => ({ id: command.id, status: "applied", version: 1 })) } as never;
      }
      return { cursor: 0, epoch: 1, has_more: false, server_time: "2026-10-29T00:00:00Z", upserts: {}, deleted: [] } as never;
    });
    const { saveNotesImportDurable } = await import("./comments");
      await saveNotesImportDurable("6a-session-7", Array.from({ length: 20 }, (_, index) => ({ studentId: `extra-${index}`, uncheckMask: 1 })));
    await sync.syncNow();
    expect(pushed).toEqual([20]);
  });

  it("chia 120 phiếu thành ba yêu cầu, không gửi từng em riêng", async () => {
    await setup(120);
    const sync = await import("../sync");
    const pushed: number[] = [];
    vi.spyOn(sync.api, "request").mockImplementation(async (endpoint, options) => {
      if (endpoint === "POST /sync/push") {
        const commands = (options as { body: { commands: Array<{ id: string }> } }).body.commands;
        pushed.push(commands.length);
        return { epoch: 1, cursor: 0, results: commands.map(command => ({ id: command.id, status: "applied", version: 1 })) } as never;
      }
      return { cursor: 0, epoch: 1, has_more: false, server_time: "2026-10-29T00:00:00Z", upserts: {}, deleted: [] } as never;
    });
    const { saveNotesImportDurable } = await import("./comments");
      await saveNotesImportDurable("6a-session-7", Array.from({ length: 120 }, (_, index) => ({ studentId: `extra-${index}`, uncheckMask: 1 })));
    await sync.syncNow();
    expect(pushed).toEqual([50, 50, 20]);
  });

  it("giữ lệnh bị máy chủ từ chối và tách số phiếu bị từ chối khỏi số lưu cục bộ", async () => {
    await setup(1);
    const sync = await import("../sync");
    vi.spyOn(sync.api, "request").mockImplementation(async endpoint => endpoint === "POST /sync/push"
      ? { epoch: 1, cursor: 0, results: [{ id: (await db.outbox.toArray())[0].id, status: "rejected", error: { code: "forbidden", message: "Forbidden", request_id: "fixture" } }] } as never
      : { cursor: 0, epoch: 1, has_more: false, server_time: "2026-10-29T00:00:00Z", upserts: {}, deleted: [] } as never);
    const { saveNotesImportDurable } = await import("./comments");
      const result = await saveNotesImportDurable("6a-session-7", [{ studentId: "extra-0", uncheckMask: 1 }]);
      expect(result).toEqual({ locallySaved: 1, waiting: 0, applied: 0, rejected: 1 });
      expect((await db.outbox.toArray()).map(row => row.status)).toEqual(["rejected"]);
  });

  it("rebases removals and appended notes on the latest slip at save time", async () => {
    await setup(1);
      const state = createSeed();
      state.students.push({ id: "extra-0", classId: "6a", name: "Học sinh thêm", parentPhone: "", enrolledAt: "2026-01-01", leftAt: null, status: "active" });
      state.attendance.push({ id: "6a-session-7:extra-0", sessionId: "6a-session-7", studentId: "extra-0", status: "present", note: "", lateAt: null });
    state.comments.push({ id: "6a-session-7:extra-0", classId: "6a", sessionId: "6a-session-7", studentId: "extra-0", criteria: 31, comment: null, scale: 5, stars: 5, note: "Ghi chú mới từ máy khác\nCâu đã có", hwManual: false, status: "draft", sendQueued: false, sentAt: null, updatedAt: "", createdAt: "", version: 8 } as never);
    replaceStore(state);
    const sync = await import("../sync");
    let payload: Record<string, unknown> | undefined;
    vi.spyOn(sync.api, "request").mockImplementation(async (endpoint, options) => {
      if (endpoint === "POST /sync/push") {
        const commands = (options as { body: { commands: Array<{ id: string; payload: Record<string, unknown> }> } }).body.commands;
        payload = commands[0].payload;
        return { epoch: 1, cursor: 0, results: commands.map(command => ({ id: command.id, status: "applied", version: 9 })) } as never;
      }
      return { cursor: 0, epoch: 1, has_more: false, server_time: "2026-10-29T00:00:00Z", upserts: {}, deleted: [] } as never;
    });
    const { saveNotesImportDurable } = await import("./comments");
    const result = await saveNotesImportDurable("6a-session-7", [{ studentId: "extra-0", uncheckMask: 1, appendNote: ["Câu đã có", "Câu mới từ bản dán"] }]);
    expect(payload).toMatchObject({ criteria: 30, note: "Ghi chú mới từ máy khác\nCâu đã có\nCâu mới từ bản dán" });
    expect(result).toEqual({ locallySaved: 1, waiting: 0, applied: 1, rejected: 0 });
  });

  it("reports commands left pending after a network failure as waiting for sync", async () => {
    await setup(1);
    const sync = await import("../sync");
    vi.spyOn(sync.api, "request").mockRejectedValue(new Error("network unavailable"));
    const { saveNotesImportDurable } = await import("./comments");
    const result = await saveNotesImportDurable("6a-session-7", [{ studentId: "extra-0", uncheckMask: 1 }]);
    expect(result).toEqual({ locallySaved: 1, waiting: 1, applied: 0, rejected: 0 });
    expect((await db.outbox.toArray()).map(row => row.status)).toEqual(["pending"]);
  });
});
