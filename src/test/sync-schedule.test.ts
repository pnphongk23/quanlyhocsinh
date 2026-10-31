import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "none", comments_reports: "write" } as never };
const me = meFor("teacher", [membership]);
let server: ReturnType<typeof createFakeServer>;
const pushes = () => server.requests.filter((r) => r.path === "/sync/push").length;

beforeEach(() => {
  localStorage.clear();
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
  for (let i = 1; i <= 4; i++) server.put("student", { id: `s${i}`, class_id: "c1", name: `HS ${i}`, enrolled_at: "2019-09-01", left_at: null, status: "active" });
  server.put("test", { id: "t1", class_id: "c1", name: "Quiz", date: "2020-01-06", max: 10, archived: false });
});
afterEach(() => { vi.unstubAllGlobals(); });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const SLACK_MS = 250;

async function boot() {
  const d = await bootDevice(server, "t", me);
  const scores = await import("../data/repositories/scores");
  await d.syncNow();
  return { d, scores };
}

describe("scheduleSync", () => {
  it("pushes once after the trailing quiet period, restarted by each change", async () => {
    const { scores } = await boot();
    const base = pushes();
    await scores.saveScoreDurable({ testId: "t1", studentId: "s1", value: 5 });
    await sleep(250);
    await scores.saveScoreDurable({ testId: "t1", studentId: "s2", value: 6 });
    await sleep(300);
    expect(pushes()).toBe(base);
    await vi.waitFor(() => expect(pushes()).toBe(base + 1));
    await sleep(100);
    expect([...server.rows.get("score")!.values()]).toHaveLength(2);
  });

  it("pushes within the max wait while changes keep arriving", async () => {
    const { scores } = await boot();
    const base = pushes();
    const first = performance.now();
    for (let i = 0; i < 12; i++) { await scores.saveScoreDurable({ testId: "t1", studentId: `s${(i % 4) + 1}`, value: i % 10 }); await sleep(150); }
    expect(pushes()).toBeGreaterThan(base);
    expect(server.hooks.pushDoneAt[0] - first).toBeLessThanOrEqual(1_000 + SLACK_MS);
    expect(server.hooks.pushDoneAt[0] - first).toBeGreaterThan(600);
  });

  it("keeps one push in flight and runs one follow-up round for commands that arrive meanwhile", async () => {
    const { d, scores } = await boot();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let held = true;
    server.hooks.hold = (req) => (held && req.path === "/sync/push" ? gate : undefined);
    const base = pushes();
    await scores.saveScoreDurable({ testId: "t1", studentId: "s1", value: 5 });
    await vi.waitFor(() => expect(pushes()).toBe(base + 1));

    await scores.saveScoreDurable({ testId: "t1", studentId: "s2", value: 6 });
    await sleep(1_300);
    expect(pushes()).toBe(base + 1);

    held = false; release();
    await vi.waitFor(async () => expect(await d.db.outbox.count()).toBe(0));
    await sleep(100);
    expect(pushes()).toBe(base + 2);
    expect([...server.rows.get("score")!.values()]).toHaveLength(2);
  });

  it("merges repeated edits of the same cell into one command", async () => {
    const { d, scores } = await boot();
    const base = pushes();
    for (const value of [3, 4, 9]) { await scores.saveScoreDurable({ testId: "t1", studentId: "s1", value }); await sleep(100); }
    expect(await d.db.outbox.count()).toBe(1);
    await vi.waitFor(() => expect(pushes()).toBe(base + 1));
    await sleep(200);
    expect([...server.rows.get("score")!.values()].map((row) => row.value)).toEqual([9]);
  });
});
