import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Comment, Session } from "../data/types";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, meFor, staffMembership } from "./fixtures/device";

const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", comments_reports: "write" } as never };
const me = meFor("teacher", [membership]);
let server: ReturnType<typeof createFakeServer>;

const LEVELS = { focus: "good", participation: "good", mastery: "ok", notes: "good", homework: "good" } as const;

beforeEach(() => {
  localStorage.clear();
  server = createFakeServer();
  server.tokens.set("t", { membershipId: "m-staff", me });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00" });
  server.put("student", { id: "s1", class_id: "c1", name: "An", enrolled_at: "2026-09-01", left_at: null, status: "active" });
  server.put("student", { id: "s2", class_id: "c1", name: "Bình", enrolled_at: "2026-09-01", left_at: null, status: "active" });
  server.put("class_session", { id: "session-1", class_id: "c1", date: "2026-10-20", start_time: "09:00", origin: "manual", status: "held", today_topics: ["vocabulary", "speaking"], graded_skills: ["speaking"] });
  server.put("class_session", { id: "session-2", class_id: "c1", date: "2026-10-21", start_time: "09:00", origin: "manual", status: "held" });
  server.put("attendance", { session_id: "session-1", student_id: "s1", status: "present" });
  server.put("attendance", { session_id: "session-1", student_id: "s2", status: "present" });
});
afterEach(() => { vi.unstubAllGlobals(); });

const sessionOf = (d: Awaited<ReturnType<typeof bootDevice>>, id: string) =>
  d.getStore().sessions.find((session) => session.id === id) as Session | undefined;
const commentOf = (d: Awaited<ReturnType<typeof bootDevice>>, studentId: string) =>
  d.getStore().comments.find((comment) => comment.sessionId === "session-1" && comment.studentId === studentId) as Comment | undefined;

describe("parser dữ liệu mức (snapshot/pull)", () => {
  it("đọc levels/skill_levels và today_topics/graded_skills khi có", async () => {
    server.put("slip", {
      session_id: "session-1", student_id: "s1", comment: "Câu mới", note: "",
      levels: LEVELS, skill_levels: { speaking: "good", reading: "needs_work" },
      hw_manual: 0, status: "sent", sent_at: "2026-10-20T10:00:00Z",
    });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();

      // Migration Dexie thêm bảng tiêu chí, giữ dữ liệu cũ.
      expect(d.db.verno).toBe(4);
    expect(sessionOf(d, "session-1")).toMatchObject({ todayTopics: ["vocabulary", "speaking"], gradedSkills: ["speaking"] });
    const slip = commentOf(d, "s1")!;
    expect(slip.levels).toEqual(LEVELS);
    expect(slip.skillLevels).toEqual({ speaking: "good", reading: "needs_work" });
    // Máy chủ suy criteria/stars từ mức Tốt; client cũng tự suy để không lệch bất biến.
    expect(slip.criteria).toBe(27);
    expect(slip.stars).toBe(4);
  });

  it("phiếu cũ không có levels: vắng khoá và hiện theo bit/sao", async () => {
    server.put("slip", { session_id: "session-1", student_id: "s2", criteria: 23, comment: "Câu cũ", scale: 5, note: "", hw_manual: 0, status: "sent", sent_at: null });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();

    const slip = commentOf(d, "s2")!;
    expect(slip.criteria).toBe(23);
    expect(slip.stars).toBe(4);
    expect("levels" in slip && slip.levels !== undefined).toBe(false);
    expect("skillLevels" in slip && slip.skillLevels !== undefined).toBe(false);
  });

  it("buổi chưa lưu Hôm nay học: vắng khoá, không ghi mảng rỗng", async () => {
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    const session = sessionOf(d, "session-2")!;
    expect("todayTopics" in session && session.todayTopics !== undefined).toBe(false);
    expect("gradedSkills" in session && session.gradedSkills !== undefined).toBe(false);
  });

  it("pull cập nhật mức/phiếu cũ theo version mới", async () => {
    server.put("slip", { session_id: "session-1", student_id: "s1", comment: "Câu mới", note: "", levels: LEVELS, skill_levels: {}, status: "draft", sent_at: null });
    const d = await bootDevice(server, "t", me);
    await d.syncNow();
    expect(commentOf(d, "s1")?.levels).toEqual(LEVELS);

    server.put("slip", { session_id: "session-1", student_id: "s1", criteria: 31, comment: "Ghi từ bản cũ", scale: 5, note: "", status: "draft", sent_at: null });
    await d.syncNow();
    const reverted = commentOf(d, "s1")!;
    expect(reverted.levels).toBeUndefined();
    expect(reverted.criteria).toBe(31);
    expect(reverted.stars).toBe(5);
  });
});
