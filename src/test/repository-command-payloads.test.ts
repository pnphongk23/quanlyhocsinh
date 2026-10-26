import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandPayloads } from "../data/api/types";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";
import { todayISO } from "../shared/date";
import { generatedSlipSentence } from "../data/slip";

process.env.TZ = "Asia/Ho_Chi_Minh";

type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
const payloadFields = {
  "attendance.set": ["session_id", "student_id", "status", "note", "late_at"],
  "test.create": ["id", "class_id", "name", "date"],
  "test.update": ["id", "name", "date"],
  "test.delete": ["id"],
  "score.set": ["test_id", "student_id", "value"],
    "slip.set": ["session_id", "student_id", "criteria", "comment", "note", "hw_manual"],
  "slip.send": ["session_id", "student_ids", "defaults"],
  "homework.assign": ["session_id", "sections"],
  "homework.section.upsert": ["id", "session_id", "kind", "title", "description"],
  "homework.section.delete": ["id"],
  "homework.grade.set": ["section_id", "student_id", "level"],
  "conflict.resolve": ["conflict_id", "choice"],
} satisfies { [K in keyof CommandPayloads]: readonly (keyof CommandPayloads[K])[] };
const requiredFields = {
  "attendance.set": ["session_id", "student_id", "status"], "test.create": ["id", "class_id", "name", "date"],
  "test.update": ["id"], "test.delete": ["id"], "score.set": ["test_id", "student_id", "value"],
      "slip.set": ["session_id", "student_id", "note"], "slip.send": ["session_id", "student_ids"],
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
  it("stores the caller-supplied slip comment (hand-edited sentence) with the criteria", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionCommentDurable } = await import("../data/repositories/comments");
    const longComment = "Nhận xét ".repeat(40);

      await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", criteria: 31, comment: longComment, note: "" });
      await d.syncNow();

      expect(server.rows.get("slip")?.get("session-1|s1")?.comment).toBe(longComment.trim());
  });

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

      await expect(saveAttendanceDurable({ sessionId: "session-1", studentId: "s1", status: "present" })).resolves.toMatchObject({ sessionId: "session-1" });
      expect(() => saveAttendanceDurable({ sessionId: "session-future", studentId: "s1", status: "present" })).toThrow("Chưa thể điểm danh");
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
      await attendance.saveAttendanceDurable({ sessionId: "session-1", studentId: "s1", status: "present" });
      await comments.sendSessionTicketsDurable("session-1", ["s1"]);
        await comments.saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", stars: 3, note: "" });
        await d.syncNow();
        await comments.saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", criteria: 15, note: "Ghi chú tay", hwManual: true });
    const section = await homework.saveHomeworkSectionDurable({ sessionId: "session-1", kind: "vocabulary", title: "Words" });
    await homework.setHomeworkGradeDurable(section.id, "s1", "done");
    await homework.setHomeworkGradeDurable(section.id, "s1", null);
    await homework.deleteHomeworkSectionDurable(section.id);
    await tests.deleteTestDurable("test-1");
      await d.syncNow();

      const slipCommands = emitted.filter((command) => command.type === "slip.set");
      expect(slipCommands[0].payload).not.toHaveProperty("hw_manual");
      expect(slipCommands[1].payload).toHaveProperty("hw_manual", true);

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

  it("sends attendance with status only, no arrival time or note", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveAttendanceDurable } = await import("../data/repositories/attendance");
    await saveAttendanceDurable({ sessionId: "session-1", studentId: "s1", status: "late" });
    await d.syncNow();

    const sent = server.hooks.pushBatches.flat().find((command) => command.type === "attendance.set");
    expect(Object.keys(sent?.payload ?? {}).sort()).toEqual(["session_id", "status", "student_id"]);
  });

  it("keeps a hand-edited comment while editing note, and a toggled criterion regenerates it", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionCommentDurable } = await import("../data/repositories/comments");
    const { getStore } = await import("../data/store");

    const initial = await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", criteria: 31, comment: "caller text", note: "first" });
    await d.syncNow();
    const noteEdit = await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", note: "second" });
    await d.syncNow();
    const criteriaEdit = await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", criteria: 15, note: "second" });
    await d.syncNow();

    expect(initial.comment).toBe("caller text");
    expect(noteEdit.comment).toBe(initial.comment);
    expect(criteriaEdit.comment).toBe(generatedSlipSentence(15));
    expect(getStore().comments[0]).toMatchObject({ comment: generatedSlipSentence(15), note: "second" });
    expect(server.rows.get("slip")?.get("session-1|s1")?.comment).toBe(generatedSlipSentence(15));
    expect(server.hooks.pushBatches.flat().find((command) => command.type === "slip.set" && command.payload.note === "second")?.payload).not.toHaveProperty("criteria");
  });

  it("keeps a legacy hand-written comment when only note changes", async () => {
    server.put("slip", { session_id: "session-1", student_id: "s1", criteria: 31, comment: "Câu tay cũ", note: "old", status: "sent", sent_at: null });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionCommentDurable } = await import("../data/repositories/comments");

    const saved = await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", note: "Ghi chú mới" });
    await d.syncNow();

    expect(saved.comment).toBe("Câu tay cũ");
    expect(server.rows.get("slip")?.get("session-1|s1")?.comment).toBe("Câu tay cũ");
  });

  it("maps hw_manual 0, 1, and missing to false, true, and false", async () => {
    server.put("slip", { session_id: "session-1", student_id: "s1", criteria: 31, comment: "old", note: "", status: "sent", sent_at: null, hw_manual: 0 });
    server.put("slip", { session_id: "session-1", student_id: "s2", criteria: 31, comment: "old", note: "", status: "sent", sent_at: null, hw_manual: 1 });
    server.put("slip", { session_id: "session-1", student_id: "s3", criteria: 31, comment: "old", note: "", status: "sent", sent_at: null });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { getStore } = await import("../data/store");

    expect(getStore().comments.map(({ studentId, hwManual }) => [studentId, hwManual])).toEqual([["s1", false], ["s2", true], ["s3", false]]);
  });

  it("hand-edit followed by a criteria toggle reaches the server as the regenerated sentence", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionCommentDurable } = await import("../data/repositories/comments");
    await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", criteria: 31, comment: "Câu sửa tay", note: "" });
    await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", criteria: 15 });
    await d.syncNow();
    expect(server.rows.get("slip")?.get("session-1|s1")?.comment).toBe(generatedSlipSentence(15));
    for (const command of server.hooks.pushBatches.flat().filter((item) => item.type === "slip.set" && (item.payload as any).criteria !== undefined)) {
      expect((command.payload as any).comment, "criteria always travels with a non-empty comment").toBeTruthy();
    }
  });

  it("rejects scale-5 criteria without a comment in the fake sync server", async () => {
    const response = await server.fetch("http://fake.local/v1/sync/push", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: JSON.stringify({ commands: [{ id: "no-comment", type: "slip.set", payload: { session_id: "session-1", student_id: "s1", criteria: 31, note: "" } }] }),
    });
    expect((await response.json() as any).results[0]).toMatchObject({ status: "rejected", error: { message: "comment_required" } });
  });

  it("slip.send carries client-generated defaults for students without a slip", async () => {
    server.put("attendance", { session_id: "session-1", student_id: "s1", status: "present" });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { sendSessionTicketsDurable } = await import("../data/repositories/comments");
    await sendSessionTicketsDurable("session-1", ["s1"]);
    await d.syncNow();
    const send = server.hooks.pushBatches.flat().find((command) => command.type === "slip.send");
    expect((send?.payload as any).defaults).toEqual([expect.objectContaining({ student_id: "s1", criteria: expect.any(Number), comment: expect.stringMatching(/\S/) })]);
    expect(server.rows.get("slip")?.get("session-1|s1")).toMatchObject({ status: "sent" });
  });

  it("assign-all-defaults rewrites unsent slips to the full default and clears the manual homework choice", async () => {
    server.put("attendance", { session_id: "session-1", student_id: "s1", status: "present" });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionCommentDurable, assignDefaultSlipsDurable } = await import("../data/repositories/comments");
    await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", criteria: 3, hwManual: true, note: "giữ" });
    const changed = await assignDefaultSlipsDurable("session-1");
    await d.syncNow();
    expect(changed).toBe(1);
    expect(server.rows.get("slip")?.get("session-1|s1")).toMatchObject({ criteria: 31, note: "giữ", comment: generatedSlipSentence(31) });
    const row = server.rows.get("slip")?.get("session-1|s1");
    expect(row?.hw_manual).toBeFalsy();
  });

  it("regrading homework enqueues slip.set with criteria and comment for the next session's draft", async () => {
    server.put("class_session", { id: "session-2", class_id: "c1", date: "2026-10-22", start_time: "09:00", origin: "manual", status: "held" });
    server.put("slip", { session_id: "session-2", student_id: "s1", criteria: 31, comment: generatedSlipSentence(31), scale: 5, stars: 5, note: "", hw_manual: false, status: "draft", sent_at: null });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const homework = await import("../data/repositories/homework");
    const section = await homework.saveHomeworkSectionDurable({ sessionId: "session-1", kind: "vocabulary", title: "Words" });
    await homework.setHomeworkGradeDurable(section.id, "s1", "not_done");
    await d.syncNow();
    const row = server.rows.get("slip")?.get("session-2|s1");
    expect(row?.criteria).toBe(15);
    expect(row?.comment).toBe(generatedSlipSentence(15));
  });

  it("rejects a non-boolean hw_manual in the fake sync server", async () => {
    const response = await server.fetch("http://fake.local/v1/sync/push", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: JSON.stringify({ commands: [{ id: "bad-hw-manual", type: "slip.set", payload: { session_id: "session-1", student_id: "s1", criteria: 31, comment: null, note: "", hw_manual: 1 } }] }),
    });

    expect((await response.json() as any).results[0]).toMatchObject({ status: "rejected", error: { code: "invalid_hw_manual" } });
  });

  it("does not expose criteria or hw_manual in guardian snapshots", async () => {
    server.put("slip", { session_id: "session-1", student_id: "s1", criteria: 31, comment: "generated", note: "", status: "sent", sent_at: null, hw_manual: true });
    server.tokens.set("parent", { membershipId: "m-parent", studentIds: new Set(["s1"]) });
    const response = await server.fetch("http://fake.local/v1/sync/snapshot/slip", { headers: { Authorization: "Bearer parent" } });
    const slip = (await response.json() as any).items[0];

    expect(slip).not.toHaveProperty("criteria");
    expect(slip).not.toHaveProperty("hw_manual");
  });
});
