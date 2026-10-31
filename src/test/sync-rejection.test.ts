import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, identityKey, setCacheIdentity, stored } from "../data/db";
import { getSaveStatus, setSaveStatus } from "../data/saveStatus";
import { ApiError } from "../data/api/client";

const auth = vi.hoisted(() => ({ clearSession: vi.fn(), invalidateActiveMembership: vi.fn() }));
vi.mock("../data/auth/session", () => ({ getToken: () => "fake-token", ...auth }));

const identity = { userId: "test-user", workspaceId: "test-workspace", membershipId: "test-membership" };
const identityId = `${identity.userId}:${identity.workspaceId}:${identity.membershipId}`;

type PushedCommand = { id: string; type: string; payload: { session_id?: string; student_id?: string; student_ids?: string[] }; created_at: string };

/** Dựng một dòng hàng đợi đúng hình dạng lệnh thật: `slip.send` gửi theo `student_ids`. */
const queueRow = (id: string, type: string, payload: object, createdAt: string, status: "pending" | "rejected" = "rejected") => ({
  id, identity: identityKey(), type, payload, base_version: 0, membership_id: identity.membershipId, created_at: createdAt, status,
});

/** Ghi lại đúng thứ tự máy chủ nhận lệnh trong một lượt đẩy. */
const capturePushes = async () => {
  const { api } = await import("../data/sync");
  const pushed: PushedCommand[] = [];
  vi.spyOn(api, "request").mockImplementation((async (endpoint: string, init?: { body?: { commands?: PushedCommand[] } }) => {
    if (endpoint === "POST /sync/push") {
      const commands = init?.body?.commands ?? [];
      pushed.push(...commands);
      return { epoch: 1, cursor: 1, results: commands.map(({ id: commandId }) => ({ id: commandId, status: "applied", version: 1 })) };
    }
    if (endpoint === "GET /sync/pull") return { cursor: 1, epoch: 1, has_more: false, server_time: "2026-10-31T00:00:00Z", upserts: {}, deleted: [] };
    throw new Error(`Unexpected fake endpoint: ${endpoint}`);
  }) as never);
  return pushed;
};

const positionOf = (pushed: PushedCommand[], type: string, sessionId: string, studentId?: string) => {
  const index = pushed.findIndex(({ type: pushedType, payload }) => pushedType === type && payload.session_id === sessionId &&
    (studentId === undefined || payload.student_id === studentId || payload.student_ids?.includes(studentId)));
  if (index < 0) throw new Error(`Không thấy lệnh ${type} của ${sessionId}${studentId ? `/${studentId}` : ""} trong lượt đẩy`);
  return index;
};

beforeEach(async () => {
  setCacheIdentity(identity);
  await db.delete();
  await db.open();
  setSaveStatus("synced");
});
afterEach(async () => { setCacheIdentity(null); await db.delete(); vi.restoreAllMocks(); });

describe("sync rejection persistence", () => {
  it("keeps a rejected command and exposes the error state", async () => {
    const { api, syncNow } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    await db.outbox.put({
      id: "cmd-rejected", identity: identityKey(), type: "attendance.set",
      payload: { session_id: "session-a", student_id: "student-a", status: "present" },
      base_version: 2, membership_id: identity.membershipId, created_at: "2026-10-23T00:00:00Z", status: "pending",
    });
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string) => {
      if (endpoint === "POST /sync/push") return { epoch: 1, cursor: 1, results: [{ id: "cmd-rejected", status: "rejected", error: { code: "forbidden", message: "No access", request_id: "fake" } }] };
      if (endpoint === "GET /sync/pull") return { cursor: 1, epoch: 1, has_more: false, server_time: "2026-10-23T00:00:00Z", upserts: {}, deleted: [] };
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    await syncNow();

    expect(await db.outbox.get("cmd-rejected")).toMatchObject({ status: "rejected", error: "forbidden" });
    expect(getSaveStatus()).toBe("error");
  });

  it("retains a slip draft on attendance_incomplete rejection and retries with a fresh command id", async () => {
    const { api, retryRejectedCommands, syncNow } = await import("../data/sync");
    const { rejectionMessage } = await import("../data/rejectionMessages");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    await db.slips.put(stored("slip", `${identityId}|slip|session-a|student-a`, {
      session_id: "session-a", student_id: "student-a", criteria: 31, comment: "Phiếu nháp", scale: 5,
      stars: 5, note: "", status: "draft", sent_at: null, version: 0, updated_at: "2026-10-31T00:00:00Z",
    }) as never);
    await db.outbox.put({
      id: "slip-rejected", identity: identityKey(), type: "slip.set",
      payload: { session_id: "session-a", student_id: "student-a", criteria: 31, comment: "Phiếu nháp", note: "" },
      base_version: 0, membership_id: identity.membershipId, created_at: "2026-10-31T00:00:00Z", status: "pending",
    });
    const pushedIds: string[] = [];
    let firstPush = true;
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string, init?: { body?: { commands?: Array<{ id: string }> } }) => {
      if (endpoint === "POST /sync/push") {
        const commands = init?.body?.commands ?? [];
        pushedIds.push(...commands.map(({ id }) => id));
        if (firstPush) {
          firstPush = false;
          return { epoch: 1, cursor: 1, results: commands.map(({ id }) => ({ id, status: "rejected", error: { code: "attendance_incomplete", message: "Attendance is incomplete.", request_id: "fixture", details: { missing_count: 1 } } })) };
        }
        return { epoch: 1, cursor: 2, results: commands.map(({ id }) => ({ id, status: "applied", version: 1 })) };
      }
      if (endpoint === "GET /sync/pull") return { cursor: 2, epoch: 1, has_more: false, server_time: "2026-10-31T00:00:00Z", upserts: {}, deleted: [] };
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    await syncNow();
    expect(await db.outbox.get("slip-rejected")).toMatchObject({ status: "rejected", error: "attendance_incomplete" });
    expect(await db.slips.get(`${identityId}|slip|session-a|student-a`)).toMatchObject({ status: "draft", comment: "Phiếu nháp" });
    expect(rejectionMessage("attendance_incomplete")).toBe("Điểm danh chưa đồng bộ xong, thử lại sau.");

    await retryRejectedCommands(["slip-rejected"]);
    expect(pushedIds).toHaveLength(2);
    expect(pushedIds[1]).not.toBe(pushedIds[0]);
    expect(await db.outbox.get("slip-rejected")).toBeUndefined();
    expect(await db.slips.get(`${identityId}|slip|session-a|student-a`)).toMatchObject({ status: "draft", comment: "Phiếu nháp" });
  });

  it("orders attendance before slip commands sharing a queue timestamp", async () => {
    const { api, syncNow } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    const createdAt = "2026-10-31T00:00:00Z";
    await db.outbox.bulkPut([
      { id: "slip-first", identity: identityKey(), type: "slip.set", payload: { session_id: "session-a", student_id: "student-a", criteria: 31, comment: "x", note: "" }, base_version: 0, membership_id: identity.membershipId, created_at: createdAt, status: "pending" },
      { id: "attendance-second", identity: identityKey(), type: "attendance.set", payload: { session_id: "session-a", student_id: "student-a", status: "present" }, base_version: 0, membership_id: identity.membershipId, created_at: createdAt, status: "pending" },
    ] as never);
    let pushedTypes: string[] = [];
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string, init?: { body?: { commands?: Array<{ id: string; type: string }> } }) => {
      if (endpoint === "POST /sync/push") {
        pushedTypes = (init?.body?.commands ?? []).map(({ type }) => type);
        return { epoch: 1, cursor: 1, results: (init?.body?.commands ?? []).map(({ id }) => ({ id, status: "applied", version: 1 })) };
      }
      if (endpoint === "GET /sync/pull") return { cursor: 1, epoch: 1, has_more: false, server_time: "2026-10-31T00:00:00Z", upserts: {}, deleted: [] };
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    await syncNow();
    expect(pushedTypes).toEqual(["attendance.set", "slip.set"]);
  });

  it("retries a rejected slip after pending attendance for the same session", async () => {
    const { api, retryRejectedCommands } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    await db.outbox.bulkPut([
      { id: "attendance-pending", identity: identityKey(), type: "attendance.set", payload: { session_id: "session-a", student_id: "student-a", status: "present" }, base_version: 0, membership_id: identity.membershipId, created_at: "2026-10-31T00:00:02.000Z", status: "pending" },
      { id: "slip-rejected", identity: identityKey(), type: "slip.set", payload: { session_id: "session-a", student_id: "student-a", criteria: 31, comment: "Draft", note: "" }, base_version: 0, membership_id: identity.membershipId, created_at: "2026-10-31T00:00:00.000Z", status: "rejected", error: "attendance_incomplete" },
    ] as never);
    let pushed: Array<{ id: string; type: string; created_at: string }> = [];
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string, init?: { body?: { commands?: typeof pushed } }) => {
      if (endpoint === "POST /sync/push") {
        pushed = init?.body?.commands ?? [];
        return { epoch: 1, cursor: 1, results: pushed.map(({ id }) => ({ id, status: "applied", version: 1 })) };
      }
      if (endpoint === "GET /sync/pull") return { cursor: 1, epoch: 1, has_more: false, server_time: "2026-10-31T00:00:00Z", upserts: {}, deleted: [] };
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    await retryRejectedCommands(["slip-rejected"]);

    expect(pushed.map(({ type }) => type)).toEqual(["attendance.set", "slip.set"]);
    expect(pushed[1].id).not.toBe("slip-rejected");
    expect(Date.parse(pushed[1].created_at)).toBeGreaterThan(Date.parse(pushed[0].created_at));
  });

  it("retries commands from multiple sessions with attendance and set dependencies first", async () => {
    const { api, retryRejectedCommands } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    const common = { identity: identityKey(), base_version: 0, membership_id: identity.membershipId, status: "rejected" as const };
    await db.outbox.bulkPut([
      { ...common, id: "send-b", type: "slip.send", payload: { session_id: "session-b", student_ids: ["student-b"] }, created_at: "2026-10-31T00:00:04.000Z" },
      { ...common, id: "set-a", type: "slip.set", payload: { session_id: "session-a", student_id: "student-a", criteria: 31, comment: "A", note: "" }, created_at: "2026-10-31T00:00:01.000Z" },
      { ...common, id: "attendance-b", type: "attendance.set", payload: { session_id: "session-b", student_id: "student-b", status: "present" }, created_at: "2026-10-31T00:00:00.000Z" },
      { ...common, id: "set-b", type: "slip.set", payload: { session_id: "session-b", student_id: "student-b", criteria: 31, comment: "B", note: "" }, created_at: "2026-10-31T00:00:02.000Z" },
      { ...common, id: "send-a", type: "slip.send", payload: { session_id: "session-a", student_ids: ["student-a"] }, created_at: "2026-10-31T00:00:03.000Z" },
      { ...common, id: "attendance-a", type: "attendance.set", payload: { session_id: "session-a", student_id: "student-a", status: "present" }, created_at: "2026-10-31T00:00:00.500Z" },
    ] as never);

    const pushed = await capturePushes();
    await retryRejectedCommands(["send-b", "set-a", "attendance-b", "set-b", "send-a", "attendance-a"]);

    expect(pushed.map(({ type, payload }) => `${type}:${payload.session_id}:${payload.student_id ?? payload.student_ids?.join("+")}`)).toEqual([
      "attendance.set:session-b:student-b",
      "attendance.set:session-a:student-a",
      "slip.set:session-a:student-a",
      "slip.set:session-b:student-b",
      "slip.send:session-a:student-a",
      "slip.send:session-b:student-b",
    ]);
    expect(pushed.every((row, index) => index === 0 || Date.parse(row.created_at) > Date.parse(pushed[index - 1].created_at))).toBe(true);
    expect(pushed.every(({ id }) => !["send-b", "set-a", "attendance-b", "set-b", "send-a", "attendance-a"].includes(id))).toBe(true);
  });

  it("retries attendance, sets and sends in dependency order across sessions and students", async () => {
    const { retryRejectedCommands } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    const same = "2026-10-31T00:00:00.000Z";
    const rejected = [
      queueRow("cmd-01", "slip.send", { session_id: "session-a", student_ids: ["student-x"] }, same),
      queueRow("cmd-02", "slip.set", { session_id: "session-a", student_id: "student-y", criteria: 31, comment: "Y", note: "" }, same),
      queueRow("cmd-03", "attendance.set", { session_id: "session-a", student_id: "student-x", status: "present" }, same),
      queueRow("cmd-04", "slip.send", { session_id: "session-b", student_ids: ["student-z", "student-w"] }, same),
      queueRow("cmd-05", "slip.set", { session_id: "session-a", student_id: "student-x", criteria: 31, comment: "X", note: "" }, same),
      queueRow("cmd-06", "attendance.set", { session_id: "session-b", student_id: "student-z", status: "present" }, same),
      queueRow("cmd-07", "slip.set", { session_id: "session-b", student_id: "student-z", criteria: 31, comment: "Z", note: "" }, same),
      queueRow("cmd-08", "slip.set", { session_id: "session-b", student_id: "student-w", criteria: 31, comment: "W", note: "" }, same),
      queueRow("cmd-09", "attendance.set", { session_id: "session-a", student_id: "student-y", status: "present" }, same),
    ];
    await db.outbox.bulkPut(rejected as never);

    const pushed = await capturePushes();
    await retryRejectedCommands(rejected.map(({ id }) => id));

    expect(pushed).toHaveLength(rejected.length);
    // Buổi A: điểm danh của từng em trước phiếu của em đó, phiếu trước lệnh gửi.
    expect(positionOf(pushed, "attendance.set", "session-a", "student-x")).toBeLessThan(positionOf(pushed, "slip.set", "session-a", "student-x"));
    expect(positionOf(pushed, "attendance.set", "session-a", "student-y")).toBeLessThan(positionOf(pushed, "slip.set", "session-a", "student-y"));
    expect(positionOf(pushed, "slip.set", "session-a", "student-x")).toBeLessThan(positionOf(pushed, "slip.send", "session-a", "student-x"));
    // Buổi B: lệnh gửi cả lớp chỉ sau phiếu của mọi em có trong lệnh gửi.
    expect(positionOf(pushed, "attendance.set", "session-b", "student-z")).toBeLessThan(positionOf(pushed, "slip.set", "session-b", "student-z"));
    for (const studentId of ["student-z", "student-w"]) {
      expect(positionOf(pushed, "slip.set", "session-b", studentId)).toBeLessThan(positionOf(pushed, "slip.send", "session-b", studentId));
    }
    expect(pushed.every((row, index) => index === 0 || Date.parse(row.created_at) > Date.parse(pushed[index - 1].created_at))).toBe(true);
    expect(pushed.every(({ id }) => !rejected.some((row) => row.id === id))).toBe(true);
  });

  it("keeps a retried set before a pending attendance and send of the same students", async () => {
    const { retryRejectedCommands } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    await db.outbox.bulkPut([
      queueRow("attendance-pending", "attendance.set", { session_id: "session-a", student_id: "student-a", status: "present" }, "2026-10-30T00:00:00.000Z", "pending"),
      queueRow("send-pending", "slip.send", { session_id: "session-a", student_ids: ["student-a", "student-b"] }, "2026-10-30T00:00:01.000Z", "pending"),
      queueRow("set-rejected", "slip.set", { session_id: "session-a", student_id: "student-a", criteria: 31, comment: "A", note: "" }, "2026-10-30T00:00:02.000Z"),
    ] as never);

    const pushed = await capturePushes();
    await retryRejectedCommands(["set-rejected"]);

    const setIndex = positionOf(pushed, "slip.set", "session-a", "student-a"), sendIndex = positionOf(pushed, "slip.send", "session-a", "student-a");
    expect(pushed[setIndex].id).not.toBe("set-rejected");
    expect(positionOf(pushed, "attendance.set", "session-a", "student-a")).toBeLessThan(setIndex);
    expect(setIndex).toBeLessThan(sendIndex);
    expect(Date.parse(pushed[setIndex].created_at)).toBeLessThan(Date.parse(pushed[sendIndex].created_at));
  });

  it("waits for every set of a class-wide send, including sets already pending", async () => {
    const { retryRejectedCommands } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    const same = "2026-10-31T00:00:00.000Z";
    await db.outbox.bulkPut([
      queueRow("send-class", "slip.send", { session_id: "session-a", student_ids: ["student-a", "student-b", "student-c"] }, same),
      queueRow("set-c-pending", "slip.set", { session_id: "session-a", student_id: "student-c", criteria: 31, comment: "C", note: "" }, same, "pending"),
      queueRow("set-a", "slip.set", { session_id: "session-a", student_id: "student-a", criteria: 31, comment: "A", note: "" }, same),
      queueRow("set-b", "slip.set", { session_id: "session-a", student_id: "student-b", criteria: 31, comment: "B", note: "" }, same),
    ] as never);

    const pushed = await capturePushes();
    await retryRejectedCommands(["send-class", "set-a", "set-b"]);

    const sendIndex = positionOf(pushed, "slip.send", "session-a");
    expect(sendIndex).toBe(pushed.length - 1);
    for (const studentId of ["student-a", "student-b", "student-c"]) expect(positionOf(pushed, "slip.set", "session-a", studentId)).toBeLessThan(sendIndex);
  });

  it("leaves commands of sessions that are not retried untouched", async () => {
    const { retryRejectedCommands } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    await db.outbox.bulkPut([
      queueRow("other-attendance", "attendance.set", { session_id: "session-z", student_id: "student-z", status: "present" }, "2026-10-30T00:00:00.000Z", "pending"),
      queueRow("other-slip", "slip.set", { session_id: "session-z", student_id: "student-z", criteria: 31, comment: "Z", note: "" }, "2026-10-30T00:00:01.000Z", "pending"),
      queueRow("retried-send", "slip.send", { session_id: "session-a", student_ids: ["student-a"] }, "2026-10-30T00:00:02.000Z"),
    ] as never);

    const pushed = await capturePushes();
    await retryRejectedCommands(["retried-send"]);

    expect(pushed.filter(({ payload }) => payload.session_id === "session-z").map(({ type, created_at }) => [type, created_at])).toEqual([
      ["attendance.set", "2026-10-30T00:00:00.000Z"],
      ["slip.set", "2026-10-30T00:00:01.000Z"],
    ]);
    expect(positionOf(pushed, "slip.send", "session-a")).toBe(2);
  });

  it("hides membership cache and preserves its rejected outbox on a permission revoke", async () => {
    const { api, syncNow } = await import("../data/sync");
    const id = identityKey();
    await db.classes.put(stored("class", `${id}|class|class-a`, { id: "class-a", name: "Fixture", status: "active", weekdays: [1], start_time: "09:00" } as never) as never);
    await db.outbox.put({
      id: "cmd-revoked", identity: id, type: "attendance.set",
      payload: { session_id: "session-a", student_id: "student-a", status: "present" },
      base_version: 2, membership_id: identity.membershipId, created_at: "2026-10-23T00:00:00Z", status: "pending",
    });
    vi.spyOn(api, "request").mockRejectedValue(new ApiError(403, { code: "account_disabled", message: "Disabled", request_id: "fixture" }));

    await syncNow();

    expect(await db.classes.get(`${id}|class|class-a`)).toBeUndefined();
    expect(await db.outbox.get("cmd-revoked")).toMatchObject({ status: "rejected", error: "account_disabled" });
    expect(auth.invalidateActiveMembership).toHaveBeenCalledOnce();
  });

  it("clears the session on 401 but retains the pending command", async () => {
    const { api, syncNow } = await import("../data/sync");
    const id = identityKey();
    await db.meta.put({ key: id, identity: id, cursor: 0, epoch: 1 });
    await db.outbox.put({
      id: "cmd-expired", identity: id, type: "attendance.set",
      payload: { session_id: "session-a", student_id: "student-a", status: "present" },
      base_version: 2, membership_id: identity.membershipId, created_at: "2026-10-23T00:00:00Z", status: "pending",
    });
    vi.spyOn(api, "request").mockRejectedValue(new ApiError(401, { code: "unauthorized", message: "Expired", request_id: "fixture" }));

    await syncNow();

    expect(await db.outbox.get("cmd-expired")).toMatchObject({ status: "pending" });
    expect(auth.clearSession).toHaveBeenCalledOnce();
  });
});

describe("sync cleans queued attendance commands from older builds", () => {
  it("sends excused as absent and drops arrival time and note", async () => {
    const { api, syncNow } = await import("../data/sync");
    await db.meta.put({ key: identityId, identity: identityId, cursor: 0, epoch: 1 });
    await db.outbox.put({
      id: "cmd-old-excused", identity: identityKey(), type: "attendance.set",
      payload: { session_id: "session-a", student_id: "student-a", status: "excused", note: "x", late_at: "18:10" },
      base_version: 0, membership_id: identity.membershipId, created_at: "2026-10-23T00:00:00Z", status: "pending",
    });
    const pushed: Array<{ payload: Record<string, unknown> }> = [];
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string, init?: { body?: { commands?: Array<{ payload: Record<string, unknown> }> } }) => {
      if (endpoint === "POST /sync/push") { pushed.push(...(init?.body?.commands ?? [])); return { epoch: 1, cursor: 1, results: [{ id: "cmd-old-excused", status: "applied" }] }; }
      if (endpoint === "GET /sync/pull") return { cursor: 1, epoch: 1, has_more: false, server_time: "2026-10-23T00:00:00Z", upserts: {}, deleted: [] };
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    await syncNow();

    expect(pushed).toHaveLength(1);
    expect(pushed[0].payload).toEqual({ session_id: "session-a", student_id: "student-a", status: "absent" });
  });
});

describe("sync claims pending commands", () => {
  it("does not resurrect a command that was merged away after it was read", async () => {
    const { api, syncNow } = await import("../data/sync");
    const id = identityKey();
    await db.meta.put({ key: id, identity: id, cursor: 0, epoch: 1 });
    const base = { identity: id, membership_id: identity.membershipId, status: "pending" as const };
    const slip = (payload: object) => ({ type: "slip.set" as const, payload: { session_id: "s", student_id: "st", ...payload }, base_version: 0 });
    await db.outbox.put({ ...base, ...slip({ criteria: 23, note: "" }), id: "stale", created_at: "2026-10-23T00:00:01Z", depends_on: "missing-dependency" } as never);
    const realGet = db.outbox.get.bind(db.outbox);
    let merged = false;
    vi.spyOn(db.outbox, "get").mockImplementation(((key: string) => {
      if (key !== "missing-dependency" || merged) return realGet(key);
      merged = true;
      return db.transaction("rw", db.outbox, async () => {
        await db.outbox.delete("stale");
        await db.outbox.put({ ...base, ...slip({ criteria: 23, note: "Gộp" }), id: "merged", created_at: "2026-10-23T00:00:02Z" } as never);
      }).then(() => realGet(key));
    }) as never);
    const pushed: string[][] = [];
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string, options?: { body?: { commands?: Array<{ id: string }> } }) => {
      if (endpoint === "POST /sync/push") {
        const ids = (options?.body?.commands ?? []).map((command) => command.id);
        pushed.push(ids);
        return { epoch: 1, cursor: 1, results: ids.map((commandId) => ({ id: commandId, status: "applied", version: 1 })) };
      }
      if (endpoint === "GET /sync/pull") return { cursor: 1, epoch: 1, has_more: false, server_time: "2026-10-23T00:00:00Z", upserts: {}, deleted: [] };
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    await syncNow();

    expect(pushed.flat()).toEqual(["merged"]);
    expect(await realGet("stale")).toBeUndefined();
  });
});
