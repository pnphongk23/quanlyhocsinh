import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, identityKey, setCacheIdentity } from "../data/db";
import { getSaveStatus, setSaveStatus } from "../data/saveStatus";

vi.mock("../data/auth/session", () => ({ getToken: () => "fake-token" }));

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
});
