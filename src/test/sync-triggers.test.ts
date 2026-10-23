import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const me = meFor("teacher", [staffMembership()]);
let server: ReturnType<typeof createFakeServer>;
let visibility = "visible";
const pulls = () => server.requests.filter((r) => r.path === "/sync/pull").length;
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
const setVisibility = (value: string) => { visibility = value; document.dispatchEvent(new Event("visibilitychange")); };

beforeEach(() => {
  localStorage.clear();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("sync triggers", () => {
  it("pulls when the page becomes visible, on pageshow, on focus and on a 60 s tick only while visible", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    let before = pulls();

    let n = 0;
    for (const fire of [() => setVisibility("visible"), () => window.dispatchEvent(new Event("pageshow")), () => window.dispatchEvent(new Event("focus"))]) {
      n++; fire();
      await vi.waitFor(() => expect(pulls(), `event ${n}`).toBe(before + 1));
      await settle(); before = pulls();
    }

    vi.advanceTimersByTime(60_000);
    await vi.waitFor(() => expect(pulls()).toBe(before + 1));
    await settle(); before = pulls();

    setVisibility("hidden");
    vi.advanceTimersByTime(180_000);
    await Promise.resolve();
    expect(pulls()).toBe(before);

    setVisibility("visible");
    await vi.waitFor(() => expect(pulls()).toBe(before + 1));
    await settle(); before = pulls();
    vi.advanceTimersByTime(60_000);
    await vi.waitFor(() => expect(pulls()).toBe(before + 1));
  });

  it("runs one more round when syncNow is called during a running round", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const before = pulls();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.hooks.hold = (req) => (req.path === "/sync/pull" ? gate : undefined);
    const first = d.syncNow();
    await vi.waitFor(() => expect(pulls()).toBe(before + 1));
    const second = d.syncNow();
    const third = d.syncNow();
    server.hooks.hold = null;
    release();
    await Promise.all([first, second, third]);
    expect(pulls()).toBe(before + 2);
  });

  it("does not raise the save error when a pull fails on the network with an empty outbox", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const status = await import("../data/saveStatus");
    status.setSaveStatus("synced");
    server.hooks.hold = () => { throw new TypeError("offline"); };
    await d.syncNow();
    expect(status.getSaveStatus()).toBe("synced");
    await d.db.outbox.put({ id: "o1", identity: d.identity, type: "attendance.set", payload: { session_id: "x", student_id: "s", status: "present" }, base_version: 0, membership_id: "m-staff", created_at: "2026-10-23T00:00:00Z", status: "pending" });
    await d.syncNow();
    expect(status.getSaveStatus()).toBe("error");
  });

  it("hydrates only when the pull changed something", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const where = vi.spyOn(d.db.classes, "where");
    await d.syncNow();
    expect(where).not.toHaveBeenCalled();
    server.put("class", { id: "c2", name: "7B", status: "active", weekdays: [2], start_time: "10:00", teacher_name: null });
    await d.syncNow();
    expect(where).toHaveBeenCalledTimes(1);
    expect(d.getStore().classes).toHaveLength(2);
  });
});
