import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "none", comments_reports: "write" } as never };
const teacherMe = meFor("teacher", [membership]);
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
let server: ReturnType<typeof createFakeServer>;
const pullsOf = (token: string) => server.requests.filter((r) => r.token === token && r.path === "/sync/pull").length;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  server = createFakeServer();
  server.tokens.set("tA", { membershipId: "m-staff", me: teacherMe });
  server.tokens.set("tB", { membershipId: "m-staff", me: teacherMe });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
  server.put("student", { id: "s1", class_id: "c1", name: "An", enrolled_at: "2019-09-01", left_at: null, status: "active" });
  server.put("class_session", { id: "x1", class_id: "c1", date: "2020-01-06", start_time: "09:00", origin: "recurring", is_makeup: false, status: "planned" });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("two devices, device A writing through the real repositories", () => {
  it("shows REST writes (student, extra session, cancel) on B after one visibilitychange", async () => {
    const A = await bootDevice(server, "tA", teacherMe);
    // Imported before B boots so the repositories belong to A's module graph.
    const students = await import("../data/repositories/students");
    const sessions = await import("../data/repositories/sessions");
    const B = await bootDevice(server, "tB", teacherMe);
    await Promise.all([A.syncNow(), B.syncNow()]);
    await A.hydrateStore();

    const added = await students.createStudent({ classId: "c1", name: "Chi", parentPhone: "", enrolledAt: "2026-10-23" });
    const extra = await sessions.createExtraSession({ classId: "c1", date: "2099-01-01", time: "10:00" });
    await sessions.cancelSession(extra.id);
    await settle();

    const before = pullsOf("tB");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(B.getStore().students.map((s) => s.id)).toContain(added.id));
    await settle();
    expect(pullsOf("tB")).toBe(before + 1);
    expect(B.getStore().sessions.find((s) => s.id === extra.id)).toMatchObject({ status: "cancelled", makeup: true });
  });

  it("opens the server-created extra session after a cached device reloads its snapshot", async () => {
    const serverSessionId = "ses-server-extra";
    const serverForA = {
      ...server,
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "http://fake.local");
        if (url.pathname === "/v1/classes/c1/sessions" && init?.method === "POST") {
          const body = JSON.parse(String(init.body));
          return server.fetch(input, { ...init, body: JSON.stringify({ ...body, id: serverSessionId }) });
        }
        return server.fetch(input, init);
      },
    };
    const A = await bootDevice(serverForA, "tA", teacherMe);
    const sessions = await import("../data/repositories/sessions");
    const B = await bootDevice(server, "tB", teacherMe);
    const sessionsOnB = await import("../data/repositories/sessions");
    await Promise.all([A.syncNow(), B.syncNow()]);
    await Promise.all([A.hydrateStore(), B.hydrateStore()]);

    const extra = await sessions.createExtraSession({ classId: "c1", date: "2099-01-02", time: "10:30" });
    expect(extra.id).toBe(serverSessionId);
    expect(A.getStore().sessions.find((session) => session.id === extra.id)).toMatchObject({ id: serverSessionId, makeup: true });

    let rejectNextPull = true;
    server.hooks.respond = (request) => {
      if (request.token === "tB" && request.path === "/sync/pull" && rejectNextPull) {
        rejectNextPull = false;
        return { status: 409, code: "snapshot_required" };
      }
      return undefined;
    };
    await B.syncNow();

    // A link carrying the 201 id resolves through the same local repository used by the detail page.
    const opened = sessionsOnB.getSession(extra.id);
    expect(opened).toMatchObject({ id: serverSessionId, makeup: true });
    expect(B.getStore().attendance).toEqual([]);
    const { studentsForSession } = await import("../features/attendance/sessionRoster");
    expect(studentsForSession(B.getStore().students, opened!)).toHaveLength(1);
  });

  it("shows attendance saved through the repository (real outbox) on B after one focus", async () => {
    const A = await bootDevice(server, "tA", teacherMe);
    const attendance = await import("../data/repositories/attendance");
    const B = await bootDevice(server, "tB", teacherMe);
    await Promise.all([A.syncNow(), B.syncNow()]);
    await A.hydrateStore();

    await attendance.saveAttendanceDurable({ sessionId: "x1", studentId: "s1", status: "absent", note: "ốm", lateAt: null } as never);
    await vi.waitFor(async () => expect(await A.db.outbox.count()).toBe(1));
    await A.syncNow();
    expect(await A.db.outbox.count()).toBe(0);
    await settle();

    const before = pullsOf("tB");
    window.dispatchEvent(new Event("focus"));
    await vi.waitFor(() => expect(B.getStore().attendance).toHaveLength(1));
    await settle();
    expect(pullsOf("tB")).toBe(before + 1);
    expect(B.getStore().attendance[0]).toMatchObject({ studentId: "s1", status: "absent" });
  });
});
