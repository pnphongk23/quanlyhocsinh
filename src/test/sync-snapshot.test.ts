import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const me = meFor("teacher", [staffMembership()]);
let server: ReturnType<typeof createFakeServer>;
beforeEach(() => {
  localStorage.clear();
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
  server.put("student", { id: "s1", class_id: "c1", name: "An", enrolled_at: "2026-09-01", left_at: null, status: "active" });
  server.put("student", { id: "s2", class_id: "c1", name: "Binh", enrolled_at: "2026-09-01", left_at: null, status: "active" });
  server.put("class_session", { id: "x1", class_id: "c1", date: "2026-10-23", start_time: "09:00", origin: "recurring", is_makeup: false, status: "planned" });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("snapshot", () => {
  it("writes no cursor when one entity fails after the others finished, then recovers on retry", async () => {
    const d = await bootDevice(server, "t", me);
    server.hooks.failEntity = "attendance";
    await d.syncNow();
    expect(await d.db.meta.get(d.identity)).toBeUndefined();
    expect(await d.db.students.count()).toBe(2);

    server.hooks.failEntity = null;
    server.put("student", { id: "s3", class_id: "c1", name: "Chi", enrolled_at: "2026-09-01", left_at: null, status: "active" });
    await d.syncNow();
    expect(await d.db.meta.get(d.identity)).toMatchObject({ cursor: server.log.length, epoch: 1 });
    expect(await d.db.students.count()).toBe(3);
    expect(d.getStore().students).toHaveLength(3);
  });

  it("picks up changes made while the snapshot was running", async () => {
    const d = await bootDevice(server, "t", me);
    let injected = false;
    server.hooks.onSnapshotPage = (entity) => {
      if (!injected && entity === "student") { injected = true; server.put("student", { id: "s9", class_id: "c1", name: "Late", enrolled_at: "2026-09-01", left_at: null, status: "active" }); }
    };
    await d.syncNow();
    expect((await d.db.students.toArray()).map((s) => s.name).sort()).toEqual(["An", "Binh", "Late"]);
    expect((await d.db.meta.get(d.identity))?.cursor).toBe(server.log.length);
  });

  it("drops a record loaded by an aborted attempt when the server deleted it before the retry", async () => {
    const d = await bootDevice(server, "t", me);
    server.hooks.failEntity = "attendance";
    await d.syncNow();
    expect(await d.db.students.count()).toBe(2);

    server.hooks.failEntity = null;
    server.remove("student", "s2");
    await d.syncNow();
    expect((await d.db.students.toArray()).map((s) => s.id)).toEqual(["s1"]);
  });

  it("keeps rejected outbox commands through a snapshot", async () => {
    const d = await bootDevice(server, "t", me);
    await d.db.outbox.put({ id: "rej", identity: d.identity, type: "attendance.set", payload: { session_id: "x1", student_id: "s1", status: "present" }, base_version: 0, membership_id: "m-staff", created_at: "2026-10-23T00:00:00Z", status: "rejected", error: "forbidden" });
    await d.syncNow();
    expect(await d.db.meta.get(d.identity)).toBeDefined();
    expect(await d.db.outbox.get("rej")).toMatchObject({ status: "rejected" });
  });

  it("never runs more than four entity requests at once", async () => {
    const d = await bootDevice(server, "t", me);
    let open = 0, peak = 0;
    server.hooks.hold = async (req) => {
      if (!req.path.startsWith("/sync/snapshot/")) return;
      open++; peak = Math.max(peak, open);
      await new Promise((r) => setTimeout(r, 5));
      open--;
    };
    await d.syncNow();
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(4);
  });
});
