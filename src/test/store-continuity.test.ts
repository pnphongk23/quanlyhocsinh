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
  server.put("class", { id: "c2", name: "7B", status: "active", weekdays: [2], start_time: "10:00", teacher_name: null });
  server.put("student", { id: "s1", class_id: "c1", name: "An", enrolled_at: "2026-09-01", left_at: null, status: "active" });
  server.put("class_session", { id: "x1", class_id: "c1", date: "2026-10-23", start_time: "09:00", origin: "recurring", is_makeup: false, status: "planned" });
  server.put("test", { id: "t1", class_id: "c1", name: "Quiz 1", date: "2026-10-23", max: 10, archived: false });
  server.put("score", { test_id: "t1", student_id: "s1", value: 8 });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("store continuity", () => {
  it("keeps the selected class across hydrations and drops it only when the class is gone", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    d.replaceStore({ ...d.getStore(), currentClassId: "c1" });
    server.put("student", { id: "s2", class_id: "c1", name: "Binh", enrolled_at: "2026-09-01", left_at: null, status: "active" });
    await d.syncNow();
    expect(d.getStore().students).toHaveLength(2);
    expect(d.getStore().currentClassId).toBe("c1");

    server.remove("class", "c1");
    await d.syncNow();
    expect(d.getStore().classes.map((c) => c.id)).toEqual(["c2"]);
    expect(d.getStore().currentClassId).toBeNull();
  });

  it.each([
    ["resync (409)", true],
    ["plain pull", false],
  ])("never shows an empty tests list while the data is unchanged: %s", async (_name, forceResync) => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    expect(d.getStore().tests).toHaveLength(1);

    const seen: Array<{ tests: number; scores: number; classes: number; students: number; sessions: number }> = [];
    d.subscribe(() => { const s = d.getStore(); seen.push({ tests: s.tests.length, scores: s.scores.length, classes: s.classes.length, students: s.students.length, sessions: s.sessions.length }); });
    let forced = false;
    server.hooks.respond = (req) => {
      if (forceResync && req.path === "/sync/pull" && !forced) { forced = true; return { status: 409, code: "resync_required" }; }
      return undefined;
    };
    server.put("class", { id: "c3", name: "8C", status: "active", weekdays: [3], start_time: "11:00", teacher_name: null });
    await d.syncNow();

    expect(d.getStore().classes).toHaveLength(3);
    expect(seen.length).toBeGreaterThan(0);
    for (const state of seen) expect(state).toMatchObject({ tests: 1, scores: 1, students: 1, sessions: 1 });
    expect(seen.every((state) => state.classes >= 2)).toBe(true);
  });

  it("ignores an older hydration that finishes after a newer one for the same identity", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    expect(d.getStore().tests).toHaveLength(1);
    await d.db.tests.clear();
    await d.hydrateStore();
    expect(d.getStore().tests).toHaveLength(0);

    const original = d.db.transaction.bind(d.db);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    vi.spyOn(d.db, "transaction").mockImplementation(((...args: unknown[]) => {
      const first = ++calls === 1;
      const result = (original as (...a: unknown[]) => Promise<unknown>)(...args);
      return first ? result.then(async (value) => { await gate; return value; }) : result;
    }) as never);

    const older = d.hydrateStore();
    await vi.waitFor(() => expect(calls).toBe(1));
    const row = server.rows.get("test")!.get("t1")!;
    await d.db.tests.put(d.stored("test", `${d.identity}|test|t1`, row as never, d.identity) as never);
    await d.hydrateStore();
    expect(d.getStore().tests).toHaveLength(1);

    release();
    await older;
    expect(d.getStore().tests).toHaveLength(1);
  });
});
