import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandPayloads } from "../data/api/types";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";
import { todayISO } from "../shared/date";

process.env.TZ = "Asia/Ho_Chi_Minh";

type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
const payloadFields = {
  "attendance.set": ["session_id", "student_id", "status", "note", "late_at"],
  "test.create": ["id", "class_id", "name", "date"],
  "test.update": ["id", "name", "date"],
  "test.delete": ["id"],
  "score.set": ["test_id", "student_id", "value"],
  "slip.set": ["session_id", "student_id", "stars", "note"],
  "slip.send": ["session_id", "student_ids"],
  "homework.assign": ["session_id", "sections"],
  "homework.section.upsert": ["id", "session_id", "kind", "title", "description"],
  "homework.section.delete": ["id"],
  "homework.grade.set": ["section_id", "student_id", "level"],
  "conflict.resolve": ["conflict_id", "choice"],
} satisfies { [K in keyof CommandPayloads]: readonly (keyof CommandPayloads[K])[] };
const requiredFields = {
  "attendance.set": ["session_id", "student_id", "status"], "test.create": ["id", "class_id", "name", "date"],
  "test.update": ["id"], "test.delete": ["id"], "score.set": ["test_id", "student_id", "value"],
  "slip.set": ["session_id", "student_id", "stars", "note"], "slip.send": ["session_id", "student_ids"],
  "homework.assign": ["session_id", "sections"], "homework.section.upsert": ["id", "session_id", "kind", "title", "description"],
  "homework.section.delete": ["id"], "homework.grade.set": ["section_id", "student_id", "level"],
  "conflict.resolve": ["conflict_id", "choice"],
} satisfies { [K in keyof CommandPayloads]: readonly RequiredKeys<CommandPayloads[K]>[] };

const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", comments_reports: "write" } as never };
const me = meFor("teacher", [membership]);
let server: ReturnType<typeof createFakeServer>;

beforeEach(() => {
  localStorage.clear();
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00" });
  server.put("student", { id: "s1", class_id: "c1", name: "Student", enrolled_at: "2026-09-01", left_at: null, status: "active" });
  server.put("class_session", { id: "session-1", class_id: "c1", date: "2026-10-20", start_time: "09:00", origin: "manual", status: "held" });
  server.put("test", { id: "test-1", class_id: "c1", name: "Quiz", date: "2026-10-20", archived: false });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("repository command payload contracts", () => {
  it.each(["2026-10-24T17:30:00.000Z", "2026-10-24T23:59:00.000Z"])(
    "cho điểm danh ngày 25/10 và chặn ngày 26/10 tại %s",
    async (instant) => {
      server.put("class_session", { id: "session-1", class_id: "c1", date: "2026-10-25", start_time: "09:00", origin: "manual", status: "planned" });
      server.put("class_session", { id: "session-future", class_id: "c1", date: "2026-10-26", start_time: "09:00", origin: "manual", status: "planned" });
      const d = await bootDevice(server, "t", me);
      await d.syncNow();
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(instant));
      expect(todayISO()).toBe("2026-10-25");
      const { saveAttendanceDurable } = await import("../data/repositories/attendance");

      await expect(saveAttendanceDurable({ sessionId: "session-1", studentId: "s1", status: "present", note: "", lateAt: null })).resolves.toMatchObject({ sessionId: "session-1" });
      expect(() => saveAttendanceDurable({ sessionId: "session-future", studentId: "s1", status: "present", note: "", lateAt: null })).toThrow("Chưa thể điểm danh");
    },
  );

  it("emits all repository command payloads with the required CommandPayloads fields", async () => {
    const d = await bootDevice(server, "t", me);
    const emitted: Array<{ type: keyof CommandPayloads; payload: Record<string, unknown> }> = [];
    server.hooks.rejectCommand = (command) => { emitted.push({ type: command.type, payload: command.payload }); return undefined; };
    await d.syncNow();

    const [tests, scores, attendance, comments, homework] = await Promise.all([
      import("../data/repositories/tests"), import("../data/repositories/scores"),
      import("../data/repositories/attendance"), import("../data/repositories/comments"),
      import("../data/repositories/homework"),
    ]);
  await tests.createTestDurable({ classId: "c1", name: "New", date: "2026-10-20" });
    await tests.updateTestDurable("test-1", { name: "Quiz updated" });
    await scores.saveScoreDurable({ testId: "test-1", studentId: "s1", value: 7 });
    await attendance.saveAttendanceDurable({ sessionId: "session-1", studentId: "s1", status: "present", note: "", lateAt: null });
    await comments.saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", stars: 3, note: "" });
    await comments.sendSessionTicketsDurable("session-1", ["s1"]);
    const section = await homework.saveHomeworkSectionDurable({ sessionId: "session-1", kind: "vocabulary", title: "Words" });
    await homework.setHomeworkGradeDurable(section.id, "s1", "done");
    await homework.setHomeworkGradeDurable(section.id, "s1", null);
    await homework.deleteHomeworkSectionDurable(section.id);
    await tests.deleteTestDurable("test-1");
    await d.syncNow();

    const sentTypes = new Set(emitted.map((command) => command.type));
    expect([...sentTypes]).toEqual(expect.arrayContaining([
      "test.create", "test.update", "test.delete", "score.set", "attendance.set", "slip.set", "slip.send",
      "homework.section.upsert", "homework.grade.set", "homework.section.delete",
    ]));
    for (const command of emitted) {
      for (const key of requiredFields[command.type]) expect(Object.hasOwn(command.payload, key), `${command.type} missing ${String(key)}`).toBe(true);
      for (const key of Object.keys(command.payload)) expect(payloadFields[command.type], `${command.type} unexpected ${key}`).toContain(key);
    }
  });
});
