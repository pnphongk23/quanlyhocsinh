import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "../data/api/types";

const server = vi.hoisted(() => ({ request: vi.fn() }));
const store = vi.hoisted(() => ({ hydrateStore: vi.fn(async () => undefined), setCacheIdentity: vi.fn() }));
vi.mock("../data/sync", () => ({ api: { request: server.request }, syncNow: vi.fn(), clearMembershipCache: vi.fn(async () => undefined) }));
vi.mock("../data/store", () => store);

const user = { id: "user-test", phone: "fixture", display_name: "Fixture", must_change_password: false };
const membership = { id: "membership-test", status: "active" as const, scope_epoch: 1, workspace: { id: "workspace-test", name: "Fixture" }, role: { id: "role-test", name: "Teacher", system_key: null, scope_kind: "workspace" as const }, permissions: { classes: "write" as const, students: "write" as const, sessions_attendance: "write" as const, scores: "write" as const, lectures: "none" as const, comments_reports: "write" as const } };
const me: MeResponse = { user, active_membership_id: membership.id, memberships: [membership] };
const saved = { token: "fixture-token", user, me, activeMembershipId: membership.id };

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
  server.request.mockReset().mockResolvedValue(me);
});

describe("web session persistence", () => {
  it("restores a session after module reload and removes it on logout", async () => {
    const first = await import("../data/auth/session");
    await first.activateSession(saved.token, user, me, membership.id);
    vi.resetModules();
    const reopened = await import("../data/auth/session");
    expect(reopened.getToken()).toBe(saved.token);
    await reopened.clearSession();
    expect(localStorage.getItem("qlh.session.v1")).toBeNull();
  });

  it("migrates and removes the legacy sessionStorage copy once", async () => {
    sessionStorage.setItem("qlh.session.v1", JSON.stringify(saved));
    const session = await import("../data/auth/session");
    expect(session.getToken()).toBe(saved.token);
    expect(localStorage.getItem("qlh.session.v1")).not.toBeNull();
    expect(sessionStorage.getItem("qlh.session.v1")).toBeNull();
  });

  it("clears persisted credentials when the server rejects the session", async () => {
    localStorage.setItem("qlh.session.v1", JSON.stringify(saved));
    const { ApiError } = await import("../data/api/client");
    server.request.mockRejectedValue(new ApiError(401, { code: "unauthorized", message: "Expired", request_id: "fixture" }));
    const session = await import("../data/auth/session");
    await session.initializeSession();
    await session.checkSessionInBackground();
    expect(session.getSession()).toBeNull();
    expect(localStorage.getItem("qlh.session.v1")).toBeNull();
  });

  it("keeps an offline session and avoids hydrating a membership the server marks inactive", async () => {
    localStorage.setItem("qlh.session.v1", JSON.stringify(saved));
    server.request.mockRejectedValueOnce(new TypeError("offline"));
    const offline = await import("../data/auth/session");
    await offline.initializeSession();
    await offline.checkSessionInBackground();
    expect(offline.getToken()).toBe(saved.token);

    vi.resetModules();
    store.setCacheIdentity.mockClear();
    server.request.mockResolvedValueOnce({ ...me, memberships: [{ ...membership, status: "disabled" }], active_membership_id: membership.id });
    const inactive = await import("../data/auth/session");
    await inactive.initializeSession();
    await inactive.checkSessionInBackground();
    expect(inactive.getSession()?.activeMembershipId).toBeNull();
    expect(store.setCacheIdentity).toHaveBeenCalledWith(null);
  });
});
