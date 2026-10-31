import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, guardianMembership, meFor, staffMembership } from "./fixtures/device";

type Device = Awaited<ReturnType<typeof bootDevice>>;
const teacherMe = meFor("teacher", [staffMembership("m-staff", "ws-1")]);
const parentMe = meFor("parent", [guardianMembership("m-parent", "ws-1")]);
const settle = () => new Promise((resolve) => setTimeout(resolve, 40));
let server: ReturnType<typeof createFakeServer>;

const student = (id: string, name: string) => ({ id, class_id: "c1", name, enrolled_at: "2026-09-01", left_at: null, status: "active" });
const outbox = (d: Device, id: string, type: string, payload: unknown) =>
  d.db.outbox.put({ id, identity: d.identity, type, payload, base_version: 0, membership_id: "m-staff", created_at: new Date().toISOString(), status: "pending" } as never);
const pullsOf = (token: string) => server.requests.filter((r) => r.token === token && r.path === "/sync/pull").length;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  server = createFakeServer();
  server.tokens.set("tA", { membershipId: "m-staff", me: teacherMe });
  server.tokens.set("tB", { membershipId: "m-staff", me: teacherMe });
  server.tokens.set("tC", { membershipId: "m-parent", me: parentMe, studentIds: new Set(["s1"]) });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
  server.put("student", student("s1", "An"));
  server.put("student", student("s2", "Binh"));
  server.put("class_session", { id: "x1", class_id: "c1", date: "2026-10-23", start_time: "09:00", origin: "recurring", is_makeup: false, status: "planned" });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("two devices on one workspace", () => {
  it("shows every kind of change on device B after a single trigger, and keeps the parent's cache scoped to their child", async () => {
    const A = await bootDevice(server, "tA", teacherMe);
    const B = await bootDevice(server, "tB", teacherMe);
    const C = await bootDevice(server, "tC", parentMe);
    await Promise.all([A.syncNow(), B.syncNow(), C.syncNow()]);
    expect(B.getStore().students).toHaveLength(2);

      // 1) REST writes on A, picked up when B manually refreshes.
    server.put("student", student("s3", "Chi"));
    server.put("class_session", { id: "x2", class_id: "c1", date: "2026-10-24", start_time: "10:00", origin: "manual", is_makeup: false, status: "planned" });
    server.put("class_session", { id: "x1", class_id: "c1", date: "2026-10-23", start_time: "09:00", origin: "recurring", is_makeup: false, status: "cancelled" });
    let before = pullsOf("tB");
      await B.syncNow();
    await vi.waitFor(() => expect(B.getStore().students).toHaveLength(3));
    await settle();
    expect(pullsOf("tB")).toBe(before + 1);
    expect(B.getStore().sessions.map((s) => `${s.id}:${s.status}`).sort()).toEqual(["x1:cancelled", "x2:planned"]);

      // 2) Outbox commands pushed by A (attendance, test, score), picked up on refresh.
    await outbox(A, "o1", "attendance.set", { session_id: "x2", student_id: "s1", status: "late", note: "", late_at: null });
    await outbox(A, "o2", "attendance.set", { session_id: "x2", student_id: "s2", status: "absent", note: "" });
    await outbox(A, "o3", "test.create", { id: "t1", class_id: "c1", name: "Quiz 1", date: "2026-10-24", max: 10 });
    await outbox(A, "o4", "score.set", { test_id: "t1", student_id: "s1", value: 9 });
    await outbox(A, "o5", "score.set", { test_id: "t1", student_id: "s2", value: 4 });
    await A.syncNow();
    expect(await A.db.outbox.count()).toBe(0);
    before = pullsOf("tB");
      await B.syncNow();
    await vi.waitFor(() => expect(B.getStore().scores).toHaveLength(2));
    await settle();
    expect(pullsOf("tB")).toBe(before + 1);
    expect(B.getStore().attendance.map((r) => r.status).sort()).toEqual(["absent", "late"]);
    expect(B.getStore().tests.map((t) => t.name)).toEqual(["Quiz 1"]);

      // 3) Slip and homework from A, picked up by manual refresh.
    await outbox(A, "o6", "slip.set", { session_id: "x2", student_id: "s1", criteria: 31, comment: "Con học tốt.", note: "Tốt" });
    await outbox(A, "o7", "slip.set", { session_id: "x2", student_id: "s2", criteria: 1, comment: "Con cần cố gắng thêm.", note: "Cần cố gắng" });
    await outbox(A, "o8", "homework.assign", { session_id: "x2", sections: [{ id: "h1", kind: "reading", title: "Bài đọc", description: "" }] });
    await outbox(A, "o9", "homework.grade.set", { section_id: "h1", student_id: "s1", level: "done" });
    await outbox(A, "o10", "homework.grade.set", { section_id: "h1", student_id: "s2", level: "not_done" });
    await A.syncNow();
    before = pullsOf("tB");
      await B.syncNow();
    await vi.waitFor(() => expect(B.getStore().homeworkGrades).toHaveLength(2));
    await settle();
    expect(pullsOf("tB")).toBe(before + 1);
    expect(B.getStore().comments).toHaveLength(2);
    expect(B.getStore().homeworkSections).toHaveLength(1);

      // Parent pulls explicitly and still sees only the child's rows.
      await C.syncNow();
    await vi.waitFor(() => expect(C.getStore().homeworkGrades).toHaveLength(1));
    expect(C.getStore().students.map((s) => s.id)).toEqual(["s1"]);
    expect(C.getStore().attendance.map((r) => r.studentId)).toEqual(["s1"]);
    expect(C.getStore().scores.map((r) => r.studentId)).toEqual(["s1"]);
    expect(C.getStore().comments.map((r) => r.studentId)).toEqual(["s1"]);
    expect(C.getStore().homeworkGrades.map((r) => r.studentId)).toEqual(["s1"]);
    for (const table of [C.db.students, C.db.attendance, C.db.scores, C.db.slips, C.db.homeworkGrades, C.db.classes, C.db.sessions]) {
      for (const row of await table.toArray()) expect(row.identity).toBe(C.identity);
    }
    expect(C.getStore().comments[0]).toMatchObject({ classId: "c1" });
  });
});
