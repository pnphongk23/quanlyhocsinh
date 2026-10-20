import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { saveScore } from "./scores";
import { saveAttendance, saveAttendanceBatch } from "./attendance";
import { login, logout } from "./auth";
import { markStudentLeft, classAttendanceRate } from "./students";
import { listPlannedSessions, sessionNumber, cancelSession, createExtraSession, updateExtraSession, previewScheduleChange, updateClassSchedule } from "./sessions";
import { updateClass } from "./classes";
import { getSaveStatus, scheduleSync } from "../outbox";
const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  replaceStore(createSeed());
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("Repositories và hàng đợi", () => {
  it("ghi điểm, lịch sử, báo cáo cần phát hành lại và lưu hàng đợi nguyên tử", () => {
    const old = getStore().scores.find(
      (score) =>
        score.studentId === "6a-student-0" && score.testId === "6a-test-1",
    )!;
    saveScore({ ...old, value: 9 });
    expect(getStore().scores.find((score) => score.id === old.id)!.value).toBe(
      9,
    );
    expect(getStore().changeLogs[0].before).toEqual(old);
    expect(getStore().changeLogs[0].after).toMatchObject({ value: 9 });
    expect(getStore().reports[0].needsRepublish).toBe(true);
    const saved = JSON.parse(memory.get("teacher-prototype-v1")!);
    expect(saved.pending).toHaveLength(1);
    expect(
      saved.scores.find((score: { id: string }) => score.id === old.id).value,
    ).toBe(9);
    expect(getSaveStatus()).toBe("local");
    vi.advanceTimersByTime(800);
    expect(getStore().pending).toHaveLength(0);
    expect(getSaveStatus()).toBe("synced");
  });
    it("sửa điểm danh ghi giá trị trước và sau", () => {
    const old = getStore().attendance[0];
    saveAttendance({ ...old, status: "late", lateAt: "18:10" });
      expect(getStore().changeLogs[0]).toMatchObject({
        entity: "attendance",
        before: old,
        after: { status: "late" },
      });
    });
    it("từ chối lưu điểm danh buổi chưa tới ngày học, cả đơn và batch", () => {
      vi.setSystemTime(new Date(2026, 9, 18, 12));
      const sessionId = "6a-session-8";
      const input = {
        sessionId,
        studentId: "6a-student-0",
        status: "present" as const,
        note: "",
        lateAt: null,
      };
      const before = getStore();
      expect(() => saveAttendance(input)).toThrow(
        "Chỉ có thể điểm danh từ ngày học trở đi.",
      );
      expect(() => saveAttendanceBatch([input])).toThrow(
        "Chỉ có thể điểm danh từ ngày học trở đi.",
      );
      expect(getStore()).toBe(before);
    });
  it("offline giữ hàng đợi, chặn đăng xuất và đồng bộ lại khi có mạng", () => {
    login("teacher@example.test", "any");
    vi.stubGlobal("navigator", { onLine: false });
    saveScore({ ...getStore().scores[0], value: 7 });
    vi.advanceTimersByTime(1600);
    expect(getStore().pending).toHaveLength(1);
    expect(() => logout()).toThrow("Còn thay đổi");
    vi.stubGlobal("navigator", { onLine: true });
    scheduleSync();
    vi.advanceTimersByTime(800);
    logout();
    expect(getStore().auth).toBeNull();
  });
  it("thất bại lưu trữ không thay dữ liệu hoặc xóa pending", () => {
    saveScore({ ...getStore().scores[0], value: 7 });
    const before = getStore();
    vi.stubGlobal("localStorage", {
      ...storage,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(() => saveScore({ ...getStore().scores[0], value: 8 })).toThrow(
      "Không thể lưu",
    );
    expect(getStore()).toBe(before);
    vi.advanceTimersByTime(800);
    expect(getStore().pending).toHaveLength(1);
    expect(getSaveStatus()).toBe("error");
  });
  it("nghỉ học giữ điểm và điểm danh", () => {
    const d = getStore(),
      id = d.students[0].id;
    markStudentLeft(id, "2026-10-17");
    expect(getStore().students[0]).toMatchObject({
      status: "left",
      leftAt: "2026-10-17",
    });
    expect(getStore().scores).toEqual(d.scores);
    expect(getStore().attendance).toEqual(d.attendance);
  });
  it("từ chối điểm ngoài thang 10 và ghi chéo lớp", () => {
    expect(() => saveScore({ ...getStore().scores[0], value: 11 })).toThrow();
    expect(() =>
      saveScore({ ...getStore().scores[0], studentId: "ielts-student-0" }),
    ).toThrow();
    expect(getStore().pending).toHaveLength(0);
  });
});
describe("Hàm dùng chung cho lịch, số buổi và chuyên cần", () => {
  it("listPlannedSessions chỉ lấy buổi planned của lớp đang mở, sắp theo ngày", () => {
      expect(listPlannedSessions().map((session) => session.id)).toEqual([
        "6a-session-8",
        "ielts-session-8",
        "6a-extra-session",
    ]);
      expect(listPlannedSessions("6a").map((session) => session.id)).toEqual([
        "6a-session-8",
        "6a-extra-session",
    ]);
    const state = createSeed();
    state.classes.find((item) => item.id === "6a")!.status = "archived";
    replaceStore(state);
    expect(listPlannedSessions().map((session) => session.id)).toEqual([
      "ielts-session-8",
    ]);
  });
  describe("Lịch lớp và buổi lẻ", () => {
    it("preview và cập nhật lịch chỉ xóa buổi recurring planned chưa điểm danh", () => {
      const state = createSeed();
      state.sessions.push(
        { id: "retime-target", classId: "6a", date: "2026-10-21", time: "18:00", origin: "recurring", status: "planned" },
        { id: "held-protected", classId: "6a", date: "2026-10-26", time: "18:00", origin: "recurring", status: "held" },
        { id: "cancel-protected", classId: "6a", date: "2026-10-26", time: "18:00", origin: "recurring", status: "cancelled" },
        { id: "attended-protected", classId: "6a", date: "2026-11-02", time: "18:00", origin: "recurring", status: "planned" },
      );
      state.attendance.push({ id: "test-attendance", sessionId: "attended-protected", studentId: "6a-student-0", status: "present", note: "", lateAt: null });
      replaceStore(state);
      const preview = previewScheduleChange("6a", { weekdays: [3, 5], time: "19:00" }, "2026-10-18");
      expect(preview.toRemove.map((session) => session.id)).toContain("6a-session-8");
      expect(preview.retimed.map((session) => session.id)).toContain("retime-target");
      expect(preview.toAdd).toContainEqual({ date: "2026-10-23", time: "19:00" });
      expect(preview.toAdd).not.toContainEqual({ date: "2026-10-25", time: "19:00" });
      const result = updateClassSchedule("6a", { weekdays: [3, 5], time: "19:00" }, "2026-10-18");
      expect(result.removed).toBeGreaterThan(0);
      expect(getStore().sessions.map((session) => session.id)).toEqual(expect.arrayContaining(["held-protected", "cancel-protected", "attended-protected", "6a-extra-session"]));
      expect(getStore().sessions.find((session) => session.id === "retime-target")?.time).toBe("19:00");
    });
    it("createExtraSession validates date, time, and duplicate slots; update only changes planned manual sessions", () => {
      expect(() => createExtraSession({ classId: "6a", date: "2026-10-17", time: "17:00" }, "2026-10-18")).toThrow("quá khứ");
      expect(() => createExtraSession({ classId: "6a", date: "2026-10-25", time: "17:00" }, "2026-10-18")).toThrow("Đã có buổi học");
      const session = createExtraSession({ classId: "6a", date: "2026-10-27", time: "17:00", note: "Bù" }, "2026-10-18");
      expect(session).toMatchObject({ origin: "manual", status: "planned", note: "Bù" });
      updateExtraSession(session.id, { date: "2026-10-28", time: "18:30", note: "Đổi" }, "2026-10-18");
      expect(getStore().sessions.find((item) => item.id === session.id)).toMatchObject({ date: "2026-10-28", time: "18:30", note: "Đổi" });
    });
    it("updateClass đồng bộ lịch khi đổi thứ hoặc giờ", () => {
      // Ghim ngày để buổi 19/10 còn là buổi chưa diễn ra (test không phụ thuộc đồng hồ máy).
      vi.setSystemTime(new Date(2026, 9, 18, 12));
      updateClass("6a", { time: "20:00" });
      expect(getStore().classes.find((item) => item.id === "6a")?.time).toBe("20:00");
      expect(getStore().sessions.find((item) => item.id === "6a-session-8")?.time).toBe("20:00");
    });
  });
  it("sessionNumber đếm buổi và bỏ qua buổi đã hủy", () => {
    expect(
      sessionNumber(getStore().sessions.find((s) => s.id === "6a-session-7")!),
    ).toBe(8);
    cancelSession("6a-session-3");
    expect(
      sessionNumber(getStore().sessions.find((s) => s.id === "6a-session-7")!),
    ).toBe(7);
    expect(
      sessionNumber(getStore().sessions.find((s) => s.id === "6a-session-3")!),
    ).toBeGreaterThan(0);
  });
  it("classAttendanceRate tính trên buổi đã diễn ra và trả null khi chưa có buổi", () => {
    expect(classAttendanceRate("6a")).toBeCloseTo((100 * 75) / 77, 5);
    expect(classAttendanceRate("khong-co-lop")).toBeNull();
    const state = createSeed();
    state.sessions.forEach((session) => {
      if (session.classId === "6a") session.status = "planned";
    });
    replaceStore(state);
    expect(classAttendanceRate("6a")).toBeNull();
  });
});
