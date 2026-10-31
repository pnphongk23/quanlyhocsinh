import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

/** Measurement only: MEASURE_SYNC=1 npx vitest run src/test/sync-latency-measure.test.ts */
const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "none", comments_reports: "write" } as never };
const me = meFor("teacher", [membership]);
const LATENCY_MS = 150;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let server: ReturnType<typeof createFakeServer>;

beforeEach(() => {
  localStorage.clear();
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
  for (let i = 1; i <= 30; i++) server.put("student", { id: `s${i}`, class_id: "c1", name: `HS ${i}`, enrolled_at: "2019-09-01", left_at: null, status: "active" });
  server.put("class_session", { id: "x1", class_id: "c1", date: "2020-01-06", start_time: "09:00", origin: "recurring", is_makeup: false, status: "planned" });
  server.put("test", { id: "t1", class_id: "c1", name: "Quiz", date: "2020-01-06", max: 10, archived: false });
});
afterEach(() => { vi.unstubAllGlobals(); });

async function measure(name: string, act: (repos: { scores: typeof import("../data/repositories/scores"); attendance: typeof import("../data/repositories/attendance") }) => Promise<void>) {
  const d = await bootDevice(server, "t", me);
  const scores = await import("../data/repositories/scores");
  const attendance = await import("../data/repositories/attendance");
  await d.syncNow();
  server.hooks.latencyMs = LATENCY_MS;
  const base = server.requests.length;
  const pushesBefore = server.hooks.pushDoneAt.length;
  await act({ scores, attendance });
  const lastCommandAt = performance.now();
  await vi.waitFor(async () => expect(await d.db.outbox.count()).toBe(0), { timeout: 15_000, interval: 20 });
  await sleep(600);
  const made = server.requests.slice(base);
  const pushes = made.filter((r) => r.path === "/sync/push").length;
  const pulls = made.filter((r) => r.path === "/sync/pull").length;
  const doneAt = server.hooks.pushDoneAt.slice(pushesBefore).at(-1) ?? lastCommandAt;
  console.log(`MEASURE ${JSON.stringify({ name, push_requests: pushes, pull_requests: pulls, total_requests: pushes + pulls, last_command_to_last_push_ms: Math.round(doneAt - lastCommandAt) })}`);
}

describe.skipIf(!process.env.MEASURE_SYNC)("sync latency", () => {
  it("one score", async () => {
    await measure("single save", async ({ scores }) => { await scores.saveScoreDurable({ testId: "t1", studentId: "s1", value: 8 }); });
  }, 30_000);
  it("8 scores 150 ms apart", async () => {
    await measure("8 scores, 150 ms apart", async ({ scores }) => {
      for (let i = 1; i <= 8; i++) { await scores.saveScoreDurable({ testId: "t1", studentId: `s${i}`, value: 5 + (i % 5) }); if (i < 8) await sleep(150); }
    });
  }, 30_000);
  it("attendance of 30 students", async () => {
    await measure("attendance 30 students", async ({ attendance }) => {
      await attendance.saveAttendanceBatchDurable(Array.from({ length: 30 }, (_, i) => ({ sessionId: "x1", studentId: `s${i + 1}`, status: "present", note: "", lateAt: null }) as never));
    });
  }, 30_000);
});
