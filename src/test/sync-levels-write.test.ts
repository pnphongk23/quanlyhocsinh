import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";
import { composeComment, type Levels } from "../data/criteriaLevels";

const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", comments_reports: "write" } as never };
const me = meFor("teacher", [membership]);
let server: ReturnType<typeof createFakeServer>;

const LEVELS: Levels = { focus: "good", participation: "good", mastery: "good", notes: "good", homework: "good" };
const TOPICS = ["vocabulary", "speaking"] as const;
const GRADED = ["speaking"] as const;
const NOTE = "Giữ ghi chú";

type Device = Awaited<ReturnType<typeof bootDevice>>;
const storeSlip = (d: Device, studentId = "s1", sessionId = "session-1") =>
  d.getStore().comments.find((comment) => comment.sessionId === sessionId && comment.studentId === studentId);
const pushed = (command: string) => server.hooks.pushBatches.flat().filter((row) => row.type === command);
const online = (value: boolean) => Object.defineProperty(navigator, "onLine", { configurable: true, value });

beforeEach(() => {
  localStorage.clear();
  online(true);
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00" });
  for (const [id, name] of [["s1", "An"], ["s2", "Bình"], ["s3", "Chi"]]) {
    server.put("student", { id, class_id: "c1", name, enrolled_at: "2026-09-01", left_at: null, status: "active" });
  }
  // Buổi trước: có BTVN, s1 bị chấm "Chưa hoàn thành" → phiếu mặc định của s1 phải là Cần cố gắng.
  server.put("class_session", { id: "session-0", class_id: "c1", date: "2026-10-19", start_time: "09:00", origin: "manual", status: "held" });
  server.put("homework_section", { id: "sec1", class_id: "c1", session_id: "session-0", kind: "vocabulary", title: "Từ vựng", description: "" });
  server.put("homework_grade", { section_id: "sec1", student_id: "s1", level: "not_done" });
  server.put("class_session", { id: "session-1", class_id: "c1", date: "2026-10-20", start_time: "09:00", origin: "manual", status: "held", today_topics: TOPICS, graded_skills: GRADED });
  server.put("attendance", { session_id: "session-1", student_id: "s1", status: "present" });
  server.put("attendance", { session_id: "session-1", student_id: "s2", status: "absent" });
  server.put("attendance", { session_id: "session-1", student_id: "s3", status: "present" });
  server.put("slip", {
    session_id: "session-1", student_id: "s1", comment: composeComment({ levels: LEVELS, skillLevels: { speaking: "good", reading: "needs_work" }, topics: [...TOPICS], gradedSkills: [...GRADED] }),
    levels: LEVELS, skill_levels: { speaking: "good", reading: "needs_work" }, scale: 5, note: NOTE, hw_manual: 0, status: "draft", sent_at: null,
  });
  server.put("slip", {
    session_id: "session-1", student_id: "s3", comment: "Phiếu đã gửi", levels: { ...LEVELS, mastery: "ok" }, skill_levels: {}, scale: 5, note: "Đã gửi",
    hw_manual: 0, status: "sent", sent_at: "2026-10-20T10:00:00Z",
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); online(true); });

describe("payload cờ tắt giữ nguyên kiểu cũ", () => {
  it("slip.set không có levels/skill_levels", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionCommentDurable } = await import("../data/repositories/comments");

    await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", criteria: 30, note: "" });
    await d.syncNow();
    const command = pushed("slip.set").at(-1)!;
    expect(Object.keys(command.payload).sort()).toEqual(["comment", "criteria", "note", "session_id", "student_id"]);
  });

  it("Gán tất cả mặc định không ghi đè phiếu 3 mức khi cờ tắt", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { assignDefaultSlipsDurable } = await import("../data/repositories/comments");
    const before = storeSlip(d, "s1")!;
    expect(await assignDefaultSlipsDurable("session-1")).toBe(0);
    expect(storeSlip(d, "s1")).toMatchObject({ levels: before.levels, skillLevels: before.skillLevels, comment: before.comment });
    expect(pushed("slip.set")).toHaveLength(0);
  });

  it("session.lesson.set bị chặn khi cờ tắt, không tạo lệnh chờ", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionLessonDurable } = await import("../data/repositories/sessions");
    expect(() => saveSessionLessonDurable("session-1", { topics: ["speaking"], gradedSkills: [] })).toThrow("chưa bật");
    expect(await d.db.outbox.count()).toBe(0);
    expect(d.getStore().sessions.find((session) => session.id === "session-1")?.todayTopics).toEqual(TOPICS);
  });
});

describe("ghi phiếu 3 mức và Gán tất cả mặc định", () => {
  beforeEach(() => vi.stubEnv("VITE_CRITERIA_LEVELS", "1"));

  it("slip.set gửi levels đủ 5 khoá + skill_levels đầy đủ, không gửi criteria/stars", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionCommentDurable } = await import("../data/repositories/comments");
    const levels: Levels = { ...LEVELS, mastery: "ok", notes: "needs_work" };
    const skillLevels = { speaking: "ok", reading: "needs_work" } as const;
    const comment = composeComment({ levels, skillLevels, topics: [...TOPICS], gradedSkills: [...GRADED] });

    await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", levels, skillLevels, comment, note: "gõ thêm" });
    await d.syncNow();

    const command = pushed("slip.set").at(-1)!;
    expect(command.payload).toMatchObject({ session_id: "session-1", student_id: "s1", levels, skill_levels: skillLevels, comment, note: "gõ thêm" });
    expect(command.payload).not.toHaveProperty("criteria");
    expect(command.payload).not.toHaveProperty("stars");
    expect(server.rows.get("slip")!.get("session-1|s1")).toMatchObject({ levels, skill_levels: skillLevels, comment, criteria: 1 + 2 + 16 });
    expect(storeSlip(d, "s1")).toMatchObject({ levels, skillLevels, criteria: 19, note: "gõ thêm" });
  });

  it("Gán tất cả mặc định: BTVN theo chấm, kỹ năng đang chấm về Đạt, giữ ghi chú, bỏ em Vắng và phiếu đã gửi", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { assignDefaultSlipsDurable } = await import("../data/repositories/comments");

    expect(await assignDefaultSlipsDurable("session-1")).toBe(1);
    await d.syncNow();

    expect(storeSlip(d, "s1")).toMatchObject({
      levels: { focus: "good", participation: "good", mastery: "ok", notes: "good", homework: "needs_work" },
      skillLevels: { speaking: "ok", reading: "needs_work" },
      note: NOTE,
      hwManual: false,
    });
    expect(storeSlip(d, "s1")?.comment).toContain("từ vựng và nói");
    expect(storeSlip(d, "s2")).toBeUndefined();
    expect(storeSlip(d, "s3")).toMatchObject({ comment: "Phiếu đã gửi", levels: { ...LEVELS, mastery: "ok" } });
    const written = pushed("slip.set").at(-1)!;
    expect(written.payload).toMatchObject({ student_id: "s1", levels: { homework: "needs_work" }, skill_levels: { speaking: "ok", reading: "needs_work" } });
  });

  it("slip.send defaults[] kèm levels/skill_levels khi cờ bật", async () => {
    server.put("student", { id: "s4", class_id: "c1", name: "Dũng", enrolled_at: "2026-09-01", left_at: null, status: "active" });
    server.put("attendance", { session_id: "session-1", student_id: "s4", status: "present" });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    // Phiếu nháp thang 3 chỉ có trên máy (chưa đồng bộ): máy chủ chưa có phiếu nên dùng defaults[].
    const id = d.identityKey();
    await d.db.slips.put(d.stored("slip", `${id}|slip|session-1|s4`, { session_id: "session-1", student_id: "s4", stars: null, scale: 3, note: "", hw_manual: 0, status: "draft", sent_at: null, version: 0, updated_at: "2026-10-20T00:00:00Z" }) as never);
    await d.hydrateStore();
    const { sendSessionTicketsDurable } = await import("../data/repositories/comments");

    await sendSessionTicketsDurable("session-1", ["s4"]);
    await d.syncNow();

    const command = pushed("slip.send").at(-1)! as { payload: { defaults: Array<Record<string, unknown>> } };
    const fallback = command.payload.defaults[0];
    expect(fallback).toMatchObject({
      student_id: "s4",
      levels: { focus: "good", participation: "good", mastery: "ok", notes: "good", homework: "good" },
      skill_levels: { speaking: "ok" },
      comment: expect.stringContaining("nắm được phần chính của từ vựng và nói hôm nay"),
    });
    expect(fallback).not.toHaveProperty("criteria");
    expect(server.rows.get("slip")!.get("session-1|s4")).toMatchObject({ levels: fallback.levels, skill_levels: fallback.skill_levels, status: "sent" });
  });

  it("chấm lại BTVN chỉ tính lại phiếu 3 mức chưa gửi, giữ phần gõ thêm", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { setHomeworkGradeDurable } = await import("../data/repositories/homework");

    await setHomeworkGradeDurable("sec1", "s1", "not_done");
    const slip = storeSlip(d, "s1")!;
    expect(slip.levels?.homework).toBe("needs_work");
    expect(slip.note).toBe(NOTE);
    expect(slip.comment).toContain("Con chưa hoàn thành bài tập về nhà");

    await setHomeworkGradeDurable("sec1", "s3", "not_done");
    expect(storeSlip(d, "s3")).toMatchObject({ comment: "Phiếu đã gửi", levels: { ...LEVELS, mastery: "ok" } });
  });

  it("đổi Hôm nay học rồi sinh lại câu chỉ áp phiếu chưa gửi", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionLessonDurable } = await import("../data/repositories/sessions");
    const { regenerateSlipCommentsDurable } = await import("../data/repositories/comments");

    await saveSessionLessonDurable("session-1", { topics: ["speaking"], gradedSkills: ["speaking"] });
    await regenerateSlipCommentsDurable("session-1");
    await d.syncNow();

    const slip = storeSlip(d, "s1")!;
    expect(slip.comment).toContain("nắm chắc nói hôm nay");
    expect(slip.comment).toContain("và nói tốt");
    expect(slip.note).toBe(NOTE);
    expect(storeSlip(d, "s3")).toMatchObject({ comment: "Phiếu đã gửi", levels: { ...LEVELS, mastery: "ok" } });
    expect(pushed("session.lesson.set").at(-1)!.payload).toEqual({ session_id: "session-1", topics: ["speaking"], graded_skills: ["speaking"] });
  });
});

describe("outbox lệnh cấp buổi", () => {
  beforeEach(() => vi.stubEnv("VITE_CRITERIA_LEVELS", "1"));

  it("gộp lệnh theo buổi, giữ lệnh mới nhất và base_version của lệnh chờ đầu tiên", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionLessonDurable } = await import("../data/repositories/sessions");
    online(false);
    await saveSessionLessonDurable("session-1", { topics: ["vocabulary"], gradedSkills: [] });
    const first = (await d.db.outbox.toArray()).find((row) => row.type === "session.lesson.set")!;
    await saveSessionLessonDurable("session-1", { topics: ["speaking", "reading"], gradedSkills: ["reading"] });

    const rows = (await d.db.outbox.toArray()).filter((row) => row.type === "session.lesson.set");
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toEqual({ session_id: "session-1", topics: ["speaking", "reading"], graded_skills: ["reading"] });
    expect(rows[0].base_version).toBe(first.base_version);
    expect(d.getStore().sessions.find((session) => session.id === "session-1")).toMatchObject({ todayTopics: ["speaking", "reading"], gradedSkills: ["reading"] });
  });

  it("gộp lệnh phiếu 3 mức: lệnh mới thắng, không còn criteria/stars", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const { saveSessionCommentDurable } = await import("../data/repositories/comments");
    online(false);
    const first = composeComment({ levels: LEVELS, topics: [...TOPICS] });
    await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", levels: LEVELS, skillLevels: { speaking: "good" }, comment: first, note: "" });
    const next: Levels = { ...LEVELS, focus: "needs_work" };
    const second = composeComment({ levels: next, topics: [...TOPICS], gradedSkills: [...GRADED] });
    await saveSessionCommentDurable({ sessionId: "session-1", studentId: "s1", levels: next, skillLevels: { speaking: "ok" }, comment: second, note: "Mới" });

    const rows = (await d.db.outbox.toArray()).filter((row) => row.type === "slip.set");
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toMatchObject({ levels: next, skill_levels: { speaking: "ok" }, comment: second, note: "Mới" });
    expect(rows[0].payload).not.toHaveProperty("criteria");
    expect(rows[0].payload).not.toHaveProperty("stars");
  });

  it("thứ tự đẩy: điểm danh → Hôm nay học → phiếu → gửi phiếu", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const id = d.identityKey();
    const same = "2026-10-31T00:00:00.000Z";
    const base = { identity: id, membership_id: "m-staff", created_at: same, status: "pending" as const, base_version: 1 };
    await d.db.outbox.bulkPut([
      { ...base, id: "send", type: "slip.send", payload: { session_id: "session-1", student_ids: ["s1"] } },
      { ...base, id: "slip", type: "slip.set", payload: { session_id: "session-1", student_id: "s1", levels: LEVELS, skill_levels: {}, comment: "x", note: "" } },
      { ...base, id: "lesson", type: "session.lesson.set", payload: { session_id: "session-1", topics: ["speaking"], graded_skills: ["speaking"] } },
      { ...base, id: "attendance", type: "attendance.set", payload: { session_id: "session-1", student_id: "s1", status: "present" } },
    ] as never);

    await d.syncNow();
    expect(server.hooks.pushBatches.at(0)!.map((row) => row.type)).toEqual([
      "attendance.set", "session.lesson.set", "slip.set", "slip.send",
    ]);
  });
});

describe("từ chối và base_version của session.lesson.set", () => {
  beforeEach(() => vi.stubEnv("VITE_CRITERIA_LEVELS", "1"));

  it("base_version_ahead: pull rồi tự gửi lại MỘT lần với command ID mới", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    // Máy cục bộ đang giữ version mới hơn máy chủ (mô phỏng dữ liệu lệch).
    const raw = await d.db.sessions.get(`${d.identityKey()}|class_session|session-1`) as { version: number };
    await d.db.sessions.update(`${d.identityKey()}|class_session|session-1`, { version: 5 } as never);
    await d.hydrateStore();
    expect(d.getStore().sessions.find((session) => session.id === "session-1")?.version).toBe(5);
    // Máy khác ghi trong lúc push bị từ chối: pull ngay sau đó thấy version 6 rồi mới gửi lại.
    let firstAttempt = true;
    server.hooks.rejectCommand = (command) => {
      if (command.type !== "session.lesson.set" || !firstAttempt) return undefined;
      firstAttempt = false;
      for (let index = 0; index < 5; index++) {
        server.put("class_session", { id: "session-1", class_id: "c1", date: "2026-10-20", start_time: "09:00", origin: "manual", status: "held", today_topics: ["vocabulary"], graded_skills: [] });
      }
      return "base_version_ahead";
    };
    const { saveSessionLessonDurable } = await import("../data/repositories/sessions");
    await saveSessionLessonDurable("session-1", { topics: ["speaking"], gradedSkills: [] });
    expect(raw.version).toBe(1);

    await d.syncNow();
    await vi.waitFor(() => expect(pushed("session.lesson.set")).toHaveLength(2), { timeout: 2000 });

    const commands = pushed("session.lesson.set");
    expect(commands).toHaveLength(2);
    expect(commands[0].id).not.toBe(commands[1].id);
    expect(commands.map((row) => row.base_version)).toEqual([5, 6]);
    expect(await d.db.outbox.count()).toBe(0);
    expect(server.rows.get("class_session")!.get("session-1")).toMatchObject({ today_topics: ["speaking"], graded_skills: [] });
  });

  it("base_version_ahead quá một lần thì giữ rejected, không lặp vô hạn", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const key = `${d.identityKey()}|class_session|session-1`;
    await d.db.sessions.update(key, { version: 9 } as never);
    await d.hydrateStore();
    const { saveSessionLessonDurable } = await import("../data/repositories/sessions");
    await saveSessionLessonDurable("session-1", { topics: ["speaking"], gradedSkills: [] });

    await d.syncNow();
    await d.syncNow();
    const rows = await d.db.outbox.where("identity").equals(d.identityKey()).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "rejected", error: "base_version_ahead", retries: 1 });
    expect(pushed("session.lesson.set")).toHaveLength(2);
    // Giữ giá trị cục bộ để người dùng thấy lỗi dòng, không tự xoá.
    expect(d.getStore().sessions.find((session) => session.id === "session-1")?.todayTopics).toEqual(["speaking"]);
  });

  it.each([
    ["feature_disabled", undefined],
    ["invalid_topics", undefined],
    ["session_cancelled", "cancelled"],
  ] as const)("mã %s là rejected cuối, không retry", async (code, sessionStatus) => {
    if (sessionStatus) server.put("class_session", { id: "session-1", class_id: "c1", date: "2026-10-20", start_time: "09:00", origin: "manual", status: sessionStatus, today_topics: TOPICS, graded_skills: GRADED });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    if (!sessionStatus) server.hooks.rejectCommand = (command) => command.type === "session.lesson.set" ? code : undefined;
    const { saveSessionLessonDurable } = await import("../data/repositories/sessions");
    await saveSessionLessonDurable("session-1", { topics: ["speaking"], gradedSkills: [] });

    await d.syncNow();
    await d.syncNow();

    const rows = await d.db.outbox.where("identity").equals(d.identityKey()).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "rejected", error: code });
    expect(pushed("session.lesson.set")).toHaveLength(1);
    expect(d.getStore().sessions.find((session) => session.id === "session-1")?.todayTopics).toEqual(["speaking"]);
  });
});
