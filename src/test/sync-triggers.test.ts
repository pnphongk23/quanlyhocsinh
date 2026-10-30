import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const me = meFor("teacher", [staffMembership()]);
let server: ReturnType<typeof createFakeServer>;
let visibility = "visible";
const requests = () => server.requests;
const pulls = () => requests().filter((request) => request.path === "/sync/pull").length;
const setVisibility = (value: string) => {
  visibility = value;
  document.dispatchEvent(new Event("visibilitychange"));
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => {
  localStorage.clear();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("sync triggers", () => {
  it("does not poll or pull on focus, pageshow, or visibility changes", async () => {
    const device = await bootDevice(server, "t", me);
    await device.syncNow();
    const before = pulls();

    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("pageshow"));
    setVisibility("hidden");
    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    await flush();

    expect(pulls()).toBe(before);
    expect(requests().some((request) => request.path === "/sync/push")).toBe(false);
  });

  it("pushes on online and only pulls after a successful push", async () => {
    const device = await bootDevice(server, "t", me);
    await device.syncNow();
    const baseline = requests().length;
    await device.db.outbox.put({ id: "o1", identity: device.identity, type: "attendance.set", payload: { session_id: "x1", student_id: "s1", status: "present" }, base_version: 0, membership_id: "m-staff", created_at: "2026-10-23T00:00:00Z", status: "pending" });

    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(requests().slice(baseline).some((request) => request.path === "/sync/push")).toBe(true));
    const tail = requests().slice(baseline).map((request) => request.path);
    expect(tail.indexOf("/sync/push")).toBeGreaterThanOrEqual(0);
    expect(tail.indexOf("/sync/pull")).toBeGreaterThan(tail.indexOf("/sync/push"));

    const beforeNoopOnline = pulls();
    window.dispatchEvent(new Event("online"));
    await flush();
    expect(pulls()).toBe(beforeNoopOnline);
  });

  it("does not pull after an online push failure", async () => {
    const device = await bootDevice(server, "t", me);
    await device.syncNow();
    const before = pulls();
    await device.db.outbox.put({ id: "o-fail", identity: device.identity, type: "attendance.set", payload: { session_id: "x1", student_id: "s1", status: "present" }, base_version: 0, membership_id: "m-staff", created_at: "2026-10-23T00:00:00Z", status: "pending" });
    server.hooks.respond = (request) => request.path === "/sync/push" ? { status: 503, code: "unavailable" } : undefined;

    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(requests().some((request) => request.path === "/sync/push")).toBe(true));
    await flush();
    expect(pulls()).toBe(before);
  });

  it("pulls once when an existing session opens, after activation, and after a successful queued write", async () => {
    const device = await bootDevice(server, "t", me);
    await device.initializeSession();
    await vi.waitFor(() => expect(pulls()).toBe(1));
    await device.initializeSession();
    await flush();
    expect(pulls()).toBe(1);

    await device.clearSession();
    await device.activateSession("t", me.user, me, "m-staff");
    await vi.waitFor(() => expect(pulls()).toBe(2));

    await device.db.outbox.put({ id: "o2", identity: device.identity, type: "attendance.set", payload: { session_id: "x1", student_id: "s1", status: "present" }, base_version: 0, membership_id: "m-staff", created_at: "2026-10-23T00:00:00Z", status: "pending" });
    device.scheduleSync(0);
    await vi.waitFor(() => expect(pulls()).toBe(3));
  });

  it("pulls after a role change", async () => {
    const other = staffMembership("m-other", "ws-2");
    const multi = meFor("teacher", [staffMembership(), other]);
    server.tokens.set("t", { membershipId: "m-staff", me: multi });
    const device = await bootDevice(server, "t", multi);
    const before = pulls();
    const auth = await import("../data/auth/index");
    await auth.switchMembership("m-other");
    await vi.waitFor(() => expect(pulls()).toBe(before + 1));
  });

  it("refreshNow reports success, offline, and request failure", async () => {
    const device = await bootDevice(server, "t", me);
    expect(await device.refreshNow()).toEqual({ status: "ok" });

    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    expect(await device.refreshNow()).toEqual({ status: "offline" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    server.hooks.hold = (request) => { if (request.path === "/sync/pull") throw new TypeError("offline"); };
    expect(await device.refreshNow()).toEqual({ status: "error" });
  });

  it("keeps one sync round in flight and queues one explicit follow-up", async () => {
    const device = await bootDevice(server, "t", me);
    await device.syncNow();
    const before = pulls();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.hooks.hold = (request) => request.path === "/sync/pull" ? gate : undefined;
    const first = device.syncNow();
    await vi.waitFor(() => expect(pulls()).toBe(before + 1));
    const second = device.syncNow();
    server.hooks.hold = null;
    release();
    await Promise.all([first, second]);
    expect(pulls()).toBe(before + 2);
  });
});
