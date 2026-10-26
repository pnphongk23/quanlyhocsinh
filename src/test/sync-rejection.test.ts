import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, identityKey, setCacheIdentity, stored } from "../data/db";
import { getSaveStatus, setSaveStatus } from "../data/saveStatus";
import { ApiError } from "../data/api/client";

const auth = vi.hoisted(() => ({ clearSession: vi.fn(), invalidateActiveMembership: vi.fn() }));
vi.mock("../data/auth/session", () => ({ getToken: () => "fake-token", ...auth }));

const identity = { userId: "test-user", workspaceId: "test-workspace", membershipId: "test-membership" };
const identityId = `${identity.userId}:${identity.workspaceId}:${identity.membershipId}`;

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
