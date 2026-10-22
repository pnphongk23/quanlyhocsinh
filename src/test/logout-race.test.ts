import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, setCacheIdentity } from "../data/db";

const user = { id: "logout-user", phone: "", display_name: "Fixture", must_change_password: false };
const membership = { id: "membership-a", workspace: { id: "workspace-a", name: "Workspace" }, role: { id: "role-a", name: "Teacher", system_key: null, scope_kind: "workspace" as const }, status: "active" as const, scope_epoch: 1, permissions: {} as never };
const me = { user, active_membership_id: membership.id, memberships: [membership] };

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

describe("logout and cross-tab writes", () => {
  it("rejects a new outbox command while the server logout is pending", async () => {
    const { api } = await import("../data/sync");
    const { activateSession } = await import("../data/auth/session");
    const { logout } = await import("../data/auth");
    const { persistCommand } = await import("../data/outbox");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await activateSession("fixture-token", user, me as never, membership.id);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    let finishLogout!: () => void;
    const serverLogout = new Promise<void>((resolve) => { finishLogout = resolve; });
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string) => {
      if (endpoint === "POST /auth/logout") return serverLogout;
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);
    const logoutPending = logout();
    await vi.waitFor(() => expect(api.request).toHaveBeenCalledWith("POST /auth/logout"));

    await expect(persistCommand("attendance", ["session-a", "student-a"], {
      session_id: "session-a", student_id: "student-a", status: "present", note: "", late_at: null,
    }, {
      id: "command-racing-logout", type: "attendance.set",
      payload: { session_id: "session-a", student_id: "student-a", status: "present" },
      base_version: 0, created_at: "2026-10-23T00:00:00.000Z",
    })).rejects.toThrow("Đang đăng xuất, thử lại sau.");

    finishLogout();
    await logoutPending;
    expect(await db.outbox.where("identity").startsWith("logout-user:").count()).toBe(0);
  });
});
