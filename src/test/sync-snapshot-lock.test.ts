import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const me = meFor("teacher", [staffMembership()]);
let server: ReturnType<typeof createFakeServer>;
const snapshots = () => server.requests.filter((request) => request.path === "/sync/snapshot").length;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("repeated snapshot lock", () => {
  it("allows the first snapshot, suppresses repeated 409 snapshots for five minutes, then retries", async () => {
    const device = await bootDevice(server, "t", me);
    server.hooks.respond = (request) => request.path === "/sync/pull" ? { status: 409, code: "snapshot_required" } : undefined;

    await device.syncNow();
    expect(snapshots()).toBe(2);
    await device.syncNow();
    expect(snapshots()).toBe(2);

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await device.syncNow();
    expect(snapshots()).toBe(3);
  });
});
