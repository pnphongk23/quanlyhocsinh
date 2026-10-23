import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const a = staffMembership("m-a", "ws-a");
const b = staffMembership("m-b", "ws-b");
let server: ReturnType<typeof createFakeServer>;
beforeEach(() => { localStorage.clear(); server = createFakeServer(); });
afterEach(() => { vi.unstubAllGlobals(); });

async function seedCache(d: Awaited<ReturnType<typeof bootDevice>>, membership: string, workspace: string, name: string) {
  const identity = `teacher:${workspace}:${membership}`;
  await d.db.classes.put({ id: name, name, status: "active", weekdays: [1], start_time: "09:00", identity, key: `${identity}|class|${name}`, entity: "class" } as never);
}

describe("background session check", () => {
  it("opens from the stored session without waiting for a hanging GET /me, and navigation costs no request", async () => {
    const me = meFor("teacher", [a], "m-a");
    server.tokens.set("t", { membershipId: "m-a", me });
    server.hooks.hold = (req) => (req.path === "/me" ? new Promise<void>(() => undefined) : undefined);
    const d = await bootDevice(server, "t", me);
    await seedCache(d, "m-a", "ws-a", "Cached");
    d.setCacheIdentity(null);

    await d.initializeSession();
    expect(d.getStore().classes.map((c) => c.name)).toEqual(["Cached"]);
    const meRequests = () => server.requests.filter((r) => r.path === "/me").length;
    expect(meRequests()).toBe(1);

    const classQuery = vi.spyOn(d.db.classes, "where");
    await d.initializeSession();
    await d.initializeSession();
    expect(meRequests()).toBe(1);
    expect(classQuery).not.toHaveBeenCalled();
  });

  it("drops a late GET /me that answers after the user picked another role", async () => {
    const stored = meFor("teacher", [a, b], "m-a");
    server.tokens.set("t", { membershipId: "m-a", me: stored });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.hooks.hold = (req) => (req.path === "/me" ? gate : undefined);
    const d = await bootDevice(server, "t", stored);
    await seedCache(d, "m-a", "ws-a", "A class"); await seedCache(d, "m-b", "ws-b", "B class");
    d.setCacheIdentity(null);

    await d.initializeSession();
    const pending = d.checkSessionInBackground();
    d.setActiveMembershipId("m-b");
    await d.activateMembershipCache("m-b");
    release();
    await pending;

    expect(d.getSession()?.activeMembershipId).toBe("m-b");
    expect(d.getStore().classes.map((c) => c.name)).toEqual(["B class"]);
  });

  it.each([
    ["401", { status: 401, code: "unauthorized" }],
    ["403 account_disabled", { status: 403, code: "account_disabled" }],
  ])("clears the session when the background check answers %s", async (_name, answer) => {
    const me = meFor("teacher", [a], "m-a");
    server.tokens.set("t", { membershipId: "m-a", me });
    server.hooks.respond = (req) => (req.path === "/me" ? answer : undefined);
    const d = await bootDevice(server, "t", me);
    await seedCache(d, "m-a", "ws-a", "Cached");
    d.setCacheIdentity(null);
    await d.initializeSession();
    await d.checkSessionInBackground();
    expect(d.getSession()).toBeNull();
    expect(localStorage.getItem("qlh.session.v1")).toBeNull();
    expect(d.getStore().classes).toEqual([]);
  });
});
