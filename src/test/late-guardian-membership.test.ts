import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "../data/api/types";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, guardianMembership, meFor, staffMembership } from "./fixtures/device";

const userId = "late-parent";
const user = { id: userId, phone: "", display_name: "Parent", must_change_password: false };
const child = { id: "child-1", name: "Child", class_id: "class-child", class_name: "English", teacher_name: null };
const guardian = { ...guardianMembership("guardian-1", "workspace-parent"), students: [child] };
const lateGuardianMe: MeResponse = { user, active_membership_id: null, memberships: [guardian] };
const noMembershipMe: MeResponse = meFor(userId, [], null);

let server: ReturnType<typeof createFakeServer>;
let tokenScope: { membershipId: string; me: unknown };

beforeEach(() => {
  localStorage.clear();
  server = createFakeServer();
  tokenScope = { membershipId: "", me: noMembershipMe };
  server.tokens.set("parent-token", tokenScope);
  server.put("class", { id: child.class_id, name: child.class_name, status: "active", weekdays: [1], start_time: "09:00" });
  server.put("student", { id: child.id, class_id: child.class_id, name: child.name, enrolled_at: "2026-10-01", left_at: null, status: "active" });
});

afterEach(() => vi.unstubAllGlobals());

async function bootParent() {
  const d = await bootDevice(server, "parent-token", noMembershipMe);
  await d.activateSession("parent-token", user, noMembershipMe, null, true);
  tokenScope.me = lateGuardianMe;
  return d;
}

describe("late guardian membership", () => {
  it("selects the only newly linked membership during the background /me check", async () => {
    const d = await bootParent();

    await d.checkSessionInBackground();
    await d.syncNow();

    const { isGuardian } = await import("../data/repositories/access");
    const { listMyChildren } = await import("../data/repositories/guardian");
    expect(d.getSession()?.activeMembershipId).toBe("guardian-1");
    expect(isGuardian()).toBe(true);
    expect(listMyChildren().map((item) => item.student.id)).toEqual([child.id]);
    expect(server.requests.filter((request) => request.path === "/session/membership")).toHaveLength(1);
  });

  it("also selects the only newly linked membership during refreshSession", async () => {
    const d = await bootParent();
    const auth = await import("../data/auth");

    await auth.refreshSession();

    expect(d.getSession()?.activeMembershipId).toBe("guardian-1");
    expect(server.requests.filter((request) => request.path === "/session/membership")).toHaveLength(1);
  });

  it("discards a late membership switch after the session changes", async () => {
    const d = await bootParent();
    let release!: () => void;
    const heldPut = new Promise<void>((resolve) => { release = resolve; });
    server.hooks.hold = (request) => request.path === "/session/membership" ? heldPut : undefined;

    const pending = d.checkSessionInBackground();
    await vi.waitFor(() => expect(server.requests.some((request) => request.path === "/session/membership")).toBe(true));
    await d.clearSession();
    release();
    await pending;

    expect(d.getSession()).toBeNull();
    expect(localStorage.getItem("qlh.session.v1")).toBeNull();
  });

  it("keeps the role picker when /me returns two active memberships", async () => {
    await bootParent();
    const second = staffMembership("staff-1", "workspace-staff");
    tokenScope.me = { ...lateGuardianMe, memberships: [guardian, second] };
    const auth = await import("../data/auth");

    await auth.refreshSession();

    expect((await import("../data/auth/session")).getSession()?.activeMembershipId).toBeNull();
    expect(auth.authRedirect("guardian")).toBe("/chon-vai-tro");
    expect(server.requests.filter((request) => request.path === "/session/membership")).toHaveLength(0);
  });

  it("preserves the existing guardian session and does not retry if the automatic PUT is rejected", async () => {
    await bootParent();
    server.hooks.respond = (request) => request.path === "/session/membership"
      ? { status: 403, code: "membership_inactive" }
      : undefined;
    const session = await import("../data/auth/session");

    await session.checkSessionInBackground();

    const current = (await import("../data/auth/session")).getSession();
    expect(current?.token).toBe("parent-token");
    expect(current?.guardianAccount).toBe(true);
    expect(current?.me.memberships).toEqual([]);
    expect(server.requests.filter((request) => request.path === "/me")).toHaveLength(1);
    expect(server.requests.filter((request) => request.path === "/session/membership")).toHaveLength(1);
  });
});
