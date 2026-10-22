import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, setCacheIdentity } from "../data/db";
import { getStore } from "../data/store";
import { ApiError } from "../data/api/client";

const user = { id: "user-revoked", phone: "", display_name: "Fixture", must_change_password: false };
const membership = (id: string, workspaceId: string) => ({
  id, workspace: { id: workspaceId, name: workspaceId }, role: { id: `role-${id}`, name: id, system_key: null, scope_kind: "workspace" as const },
  status: "active" as const, scope_epoch: 1, permissions: {} as never,
});
const me = (active: string | null, memberships: ReturnType<typeof membership>[]) => ({ user, active_membership_id: active, memberships });

beforeEach(async () => {
  localStorage.clear();
  setCacheIdentity(null);
  await db.delete();
  await db.open();
});

afterEach(async () => {
  setCacheIdentity(null);
  localStorage.clear();
  await db.delete();
  vi.restoreAllMocks();
});

describe("membership revocation", () => {
  it("keeps the store empty until GET /me confirms the other membership", async () => {
    const { api, syncNow } = await import("../data/sync");
    const { activateSession, getSession } = await import("../data/auth/session");
    const a = membership("membership-a", "workspace-a");
    const b = membership("membership-b", "workspace-b");
    const idA = "user-revoked:workspace-a:membership-a";
    const idB = "user-revoked:workspace-b:membership-b";
    await db.classes.put({ id: "a", name: "A private", status: "active", weekdays: [1], start_time: "09:00", identity: idA, key: `${idA}|class|a`, entity: "class" } as never);
    await db.classes.put({ id: "b", name: "B private", status: "active", weekdays: [1], start_time: "09:00", identity: idB, key: `${idB}|class|b`, entity: "class" } as never);
    await db.outbox.put({ id: "revoke-a", identity: idA, type: "attendance.set", payload: { session_id: "s", student_id: "p", status: "present" }, base_version: 0, membership_id: "membership-a", created_at: "2026-10-23T00:00:00Z", status: "pending" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await activateSession("fixture-token", user, me("membership-a", [a, b]) as never, "membership-a");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    let confirm!: (value: ReturnType<typeof me>) => void;
    const confirmation = new Promise<ReturnType<typeof me>>((resolve) => { confirm = resolve; });
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string) => {
      if (endpoint === "POST /sync/push") throw new ApiError(403, { code: "membership_inactive", message: "Denied", request_id: "fixture" });
      if (endpoint === "GET /me") return confirmation;
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    const syncing = syncNow();
    await vi.waitFor(() => expect(getStore().classes).toEqual([]));
    expect(getSession()?.activeMembershipId).toBeNull();
    confirm(me("membership-b", [b]));
    await syncing;

    expect(getStore().classes.map((item) => item.name)).toEqual(["B private"]);
    expect(getSession()?.activeMembershipId).toBe("membership-b");
  });

  it("clears the session and store when confirmed /me has no memberships", async () => {
    const { api, syncNow } = await import("../data/sync");
    const { activateSession, getSession } = await import("../data/auth/session");
    const a = membership("membership-a", "workspace-a");
    const b = membership("membership-b", "workspace-b");
    const idB = "user-revoked:workspace-b:membership-b";
    await db.classes.put({ id: "b", name: "B private", status: "active", weekdays: [1], start_time: "09:00", identity: idB, key: `${idB}|class|b`, entity: "class" } as never);
    await db.outbox.put({ id: "revoke-a", identity: "user-revoked:workspace-a:membership-a", type: "attendance.set", payload: { session_id: "s", student_id: "p", status: "present" }, base_version: 0, membership_id: "membership-a", created_at: "2026-10-23T00:00:00Z", status: "pending" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await activateSession("fixture-token", user, me("membership-a", [a, b]) as never, "membership-a");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string) => {
      if (endpoint === "POST /sync/push") throw new ApiError(403, { code: "membership_inactive", message: "Denied", request_id: "fixture" });
      if (endpoint === "GET /me") return me(null, []);
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    await syncNow();

    expect(getSession()).toBeNull();
    expect(getStore().classes).toEqual([]);
  });

  it("does not hydrate a fallback when the initial GET /me is rejected", async () => {
    const { api } = await import("../data/sync");
    const { activateSession, getSession, initializeSession } = await import("../data/auth/session");
    const a = membership("membership-a", "workspace-a");
    const b = membership("membership-b", "workspace-b");
    const idA = "user-revoked:workspace-a:membership-a";
    const idB = "user-revoked:workspace-b:membership-b";
    await db.classes.put({ id: "a", name: "A private", status: "active", weekdays: [1], start_time: "09:00", identity: idA, key: `${idA}|class|a`, entity: "class" } as never);
    await db.classes.put({ id: "b", name: "B private", status: "active", weekdays: [1], start_time: "09:00", identity: idB, key: `${idB}|class|b`, entity: "class" } as never);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await activateSession("fixture-token", user, me("membership-a", [a, b]) as never, "membership-a");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    let confirm!: (value: ReturnType<typeof me>) => void;
    const confirmation = new Promise<ReturnType<typeof me>>((resolve) => { confirm = resolve; });
    let meRequests = 0;
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string) => {
      if (endpoint === "GET /me") {
        meRequests += 1;
        if (meRequests === 1) throw new ApiError(404, { code: "membership_not_found", message: "Denied", request_id: "fixture" });
        return confirmation;
      }
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);

    const initializing = initializeSession();
    await vi.waitFor(() => expect(getStore().classes).toEqual([]));
    expect(getSession()?.activeMembershipId).toBeNull();
    confirm(me("membership-b", [b]));
    await initializing;

    expect(getStore().classes.map((item) => item.name)).toEqual(["B private"]);
    expect(getSession()?.activeMembershipId).toBe("membership-b");
  });
});
