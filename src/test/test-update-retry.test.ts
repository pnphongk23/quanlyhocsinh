import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", comments_reports: "write" } as never };
const me = meFor("teacher", [membership]);
let server: ReturnType<typeof createFakeServer>;

beforeEach(() => {
  localStorage.clear();
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00" });
  server.put("test", { id: "t1", class_id: "c1", name: "Quiz", date: "2026-10-20", max: 10, archived: false });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("test.update payload repair", () => {
  it("includes the required id in newly created update commands", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const tests = await import("../data/repositories/tests");
    await tests.updateTestDurable("t1", { name: "Quiz mới" });
    await d.syncNow();
    expect([...server.rows.get("test")!.values()][0]).toMatchObject({ id: "t1", name: "Quiz mới" });
  });

  it("repairs a legacy rejected payload from the unique cached test and retries with a new command id", async () => {
    const d = await bootDevice(server, "t", me);
    await d.db.open();
    const id = d.identityKey();
    await d.db.tests.put(d.stored("test", `${id}|test|t1`, { id: "t1", class_id: "c1", name: "Quiz sửa", date: "2026-10-20", max: 10, archived: false, version: 1 }) as never);
    await d.db.outbox.put({ id: "legacy-rejected", identity: id, type: "test.update", payload: { name: "Quiz sửa" }, base_version: 1, membership_id: "m-staff", created_at: "2026-10-23T00:00:00Z", status: "rejected", error: "validation_error" } as never);
    const seen: Array<{ id: string; payload: Record<string, unknown> }> = [];
    server.hooks.rejectCommand = (command) => { seen.push({ id: command.id, payload: command.payload }); return undefined; };

    await d.retryRejectedCommands(["legacy-rejected"]);

    expect(seen).toHaveLength(1);
    expect(seen[0].id).not.toBe("legacy-rejected");
    expect(seen[0].payload).toEqual({ id: "t1", name: "Quiz sửa" });
    expect([...server.rows.get("test")!.values()][0]).toMatchObject({ id: "t1", name: "Quiz sửa" });
  });

  it("repairs a legacy pending payload when syncing, without a retry", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const id = d.identityKey();
    await d.db.outbox.put({ id: "legacy-pending", identity: id, type: "test.update", payload: { name: "Quiz sửa" }, base_version: 1, membership_id: "m-staff", created_at: "2026-10-23T00:00:00Z", status: "pending" } as never);
    await d.db.tests.put(d.stored("test", `${id}|test|t1`, { id: "t1", class_id: "c1", name: "Quiz sửa", date: "2026-10-20", max: 10, archived: false, version: 1 }) as never);
    await d.syncNow();
    expect([...server.rows.get("test")!.values()][0]).toMatchObject({ id: "t1", name: "Quiz sửa" });
    expect(await d.db.outbox.count()).toBe(0);
  });

  it("takes the id from the entity key even when another cached test has the same name", async () => {
    server.put("test", { id: "t2", class_id: "c1", name: "Quiz sửa", date: "2026-10-21", max: 10, archived: false });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const id = d.identityKey();
    await d.db.outbox.put({ id: "keyed", identity: id, type: "test.update", payload: { name: "Quiz sửa" }, base_version: 1, membership_id: "m-staff", created_at: "2026-10-23T00:00:00Z", status: "rejected", error: "validation_error", entity_key: `${id}|test|t1` } as never);
    await d.retryRejectedCommands(["keyed"]);
    expect(server.rows.get("test")!.get("t1")).toMatchObject({ name: "Quiz sửa" });
    expect(server.rows.get("test")!.get("t2")).toMatchObject({ date: "2026-10-21" });
  });

  it("does not guess the id when several legacy updates could belong to different tests", async () => {
    server.put("test", { id: "t2", class_id: "c1", name: "Quiz sửa", date: "2026-10-20", max: 20, archived: false });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const id = d.identityKey();
    await d.db.tests.put(d.stored("test", `${id}|test|t1`, { id: "t1", class_id: "c1", name: "Quiz sau", date: "2026-10-20", max: 20, archived: false, version: 1 }) as never);
    const base = { identity: id, type: "test.update", base_version: 1, membership_id: "m-staff", status: "rejected", error: "validation_error" };
    await d.db.outbox.bulkPut([
      { ...base, id: "old-1", payload: { name: "Quiz sửa", max: 20 }, created_at: "2026-10-23T00:00:01Z" },
      { ...base, id: "old-2", payload: { name: "Quiz sau" }, created_at: "2026-10-23T00:00:02Z" },
    ] as never);
    await d.retryRejectedCommands(["old-1", "old-2"]);
    expect(server.rows.get("test")!.get("t2")).toMatchObject({ name: "Quiz sửa", max: 20 });
    expect(server.rows.get("test")!.get("t1")).toMatchObject({ name: "Quiz" });
    expect((await d.db.outbox.toArray()).every((row: any) => row.status === "rejected")).toBe(true);
  });
});
