import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { migrateStore } from "../migrations";
import { getStore, replaceStore } from "../store";
import { MEMBER_IDS, ROLE_IDS } from "../defaults";
import type { Member, StoreState } from "../types";
import {
  canAccessClass,
  canAccessSession,
  CLASS_ACCESS_ERROR,
  SESSION_ACCESS_ERROR,
} from "./access";
import { archiveClass, getClass, hasClass, setCurrentClass, updateClass } from "./classes";
import {
  cancelSession,
  createExtraSession,
  getSession,
  getSessionClass,
  hasSession,
  listPlannedSessions,
  listSessions,
} from "./sessions";
import { getStudent, listStudents, listStudentsForSession } from "./students";
import { listTests } from "./tests";
import { listScores, saveScore } from "./scores";
import { listAttendance, saveAttendanceBatch } from "./attendance";
import {
  listComments,
  listSessionComments,
  saveSessionComment,
  sendSessionTickets,
} from "./comments";
import { listReports, saveReport } from "./reports";
import { listSessionLectures } from "./lectures";

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

/** Đặt vai trò đang dùng thành một membership cụ thể (mặc định dữ liệu mẫu). */
function actAs(memberId: string, mutate?: (state: StoreState) => void): void {
  const state = createSeed();
  state.auth = { email: "scope@example.test", memberIds: [memberId] };
  state.activeMemberId = memberId;
  mutate?.(state);
  replaceStore(state);
}

/** Lan (Giáo viên, chỉ lớp 6A) được phân dạy thay ĐÚNG một buổi IELTS. */
function withLanSubstituteForOneIeltsSession(state: StoreState): void {
  state.sessionSubstitutes.push({
    id: "sub-lan-ielts-0",
    sessionId: "ielts-session-0",
    position: "main",
    originalMemberId: MEMBER_IDS.minh,
    substituteMemberId: MEMBER_IDS.lanTeacher,
    reason: "Thầy Minh bận",
    createdAt: "2026-09-20T08:00:00.000Z",
  });
}

beforeEach(() => {
  memory.clear();
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

describe("Phạm vi lớp: Admin", () => {
  it("thấy và ghi được mọi lớp", () => {
    expect(getClass("ielts")?.name).toBe("IELTS 7.0");
    expect(getClass("6a")?.name).toBe("Tiếng Anh giao tiếp 6A");
    expect(listSessions("ielts").length).toBeGreaterThan(0);
    expect(listStudents("ielts")).toHaveLength(10);
    expect(listTests("ielts")).toHaveLength(4);
    expect(listScores("ielts-test-0")).toHaveLength(10);
    expect(listAttendance("ielts-session-0").length).toBeGreaterThan(0);
    expect(listReports("ielts").length).toBeGreaterThan(0);
  });
});

describe("Phạm vi lớp: cô Lan chỉ có 6A", () => {
  it("đọc thẳng lớp/buổi/học sinh/điểm IELTS đều bị chặn", () => {
    actAs(MEMBER_IDS.lanTeacher);
    expect(getClass("ielts")).toBeUndefined();
    expect(hasClass("ielts")).toBe(true);
    expect(listSessions("ielts")).toEqual([]);
    expect(getSession("ielts-session-0")).toBeUndefined();
    expect(getSessionClass("ielts-session-0")).toBeUndefined();
    expect(listStudents("ielts", true)).toEqual([]);
    expect(getStudent("ielts-student-0")).toBeUndefined();
    expect(listTests("ielts")).toEqual([]);
    expect(listScores("ielts-test-0")).toEqual([]);
    expect(listAttendance("ielts-session-0")).toEqual([]);
    expect(listComments("ielts")).toEqual([]);
    expect(listReports("ielts")).toEqual([]);
    expect(listSessionLectures("ielts-session-0")).toEqual([]);
      expect(listPlannedSessions("ielts")).toEqual([]);
    expect(canAccessClass("ielts")).toBe(false);
    expect(canAccessSession("ielts-session-0")).toBe(false);
  });

  it("ghi thẳng vào lớp/buổi/học sinh/điểm IELTS đều bị chặn", () => {
    actAs(MEMBER_IDS.lanTeacher);
    expect(() =>
      saveAttendanceBatch([
        {
          sessionId: "ielts-session-0",
          studentId: "ielts-student-0",
          status: "present",
          note: "",
          lateAt: null,
        },
      ]),
    ).toThrow(SESSION_ACCESS_ERROR);
    expect(() =>
      saveSessionComment({
        sessionId: "ielts-session-0",
        studentId: "ielts-student-0",
        stars: 3,
        note: "Nhận xét lạ",
      }),
    ).toThrow(CLASS_ACCESS_ERROR);
    expect(() => cancelSession("ielts-session-0")).toThrow(CLASS_ACCESS_ERROR);
    expect(() =>
      createExtraSession({ classId: "ielts", date: "2026-11-01", time: "19:30" }),
    ).toThrow(CLASS_ACCESS_ERROR);
    expect(() => updateClass("ielts", { name: "Đổi tên" })).toThrow(
      CLASS_ACCESS_ERROR,
    );
    expect(() => archiveClass("ielts")).toThrow(CLASS_ACCESS_ERROR);
    expect(() =>
      saveReport({ classId: "ielts", studentId: "ielts-student-0", month: "2026-10" }),
    ).toThrow(CLASS_ACCESS_ERROR);
    expect(() =>
      saveScore({
        testId: "ielts-test-0",
        studentId: "ielts-student-0",
        value: 8,
      }),
    ).toThrow(CLASS_ACCESS_ERROR);
    expect(() => setCurrentClass("ielts")).toThrow(CLASS_ACCESS_ERROR);
    // Không có gì bị ghi: hàng đợi và currentClass giữ nguyên.
    expect(getStore().pending).toEqual([]);
    expect(getStore().currentClassId).toBe("6a");
  });

  it("vẫn đọc và ghi bình thường trong lớp 6A", () => {
    actAs(MEMBER_IDS.lanTeacher);
    expect(getClass("6a")?.name).toBe("Tiếng Anh giao tiếp 6A");
    expect(listSessions("6a").length).toBeGreaterThan(0);
    expect(getSession("6a-session-5")?.id).toBe("6a-session-5");
    expect(listStudents("6a")).toHaveLength(10);
    expect(getStudent("6a-student-0")?.id).toBe("6a-student-0");

    saveAttendanceBatch([
      {
        sessionId: "6a-session-5",
        studentId: "6a-student-0",
        status: "late",
        note: "",
        lateAt: "18:10",
      },
    ]);
    expect(getStore().pending).toHaveLength(1);
    const comment = saveSessionComment({
      sessionId: "6a-session-5",
      studentId: "6a-student-0",
      stars: 3,
      note: "Em tiến bộ.",
    });
    expect(getStore().comments.some((item) => item.id === comment.id)).toBe(true);
  });

  it("guard chạy trước khi ghi: localStorage lỗi vẫn ném lỗi quyền", () => {
    actAs(MEMBER_IDS.lanTeacher);
    vi.stubGlobal("localStorage", {
      ...storage,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(() =>
      saveAttendanceBatch([
        {
          sessionId: "ielts-session-0",
          studentId: "ielts-student-0",
          status: "present",
          note: "",
          lateAt: null,
        },
      ]),
    ).toThrow(SESSION_ACCESS_ERROR);
  });
});

describe("Ngoại lệ dạy thay đúng một buổi", () => {
  it("chỉ mở đúng buổi đó, không mở cả lớp", () => {
    actAs(MEMBER_IDS.lanTeacher, withLanSubstituteForOneIeltsSession);
    expect(canAccessSession("ielts-session-0")).toBe(true);
    expect(getSession("ielts-session-0")?.classId).toBe("ielts");
    expect(getSessionClass("ielts-session-0")?.name).toBe("IELTS 7.0");
    expect(listStudentsForSession("ielts-session-0", true)).toHaveLength(10);
    expect(listAttendance("ielts-session-0").length).toBeGreaterThan(0);
    expect(listSessionComments("ielts-session-0")).toEqual([]);

    // Buổi khác của cùng lớp và mọi lối đọc cả lớp vẫn bị chặn.
    expect(getSession("ielts-session-1")).toBeUndefined();
    expect(listStudentsForSession("ielts-session-1", true)).toEqual([]);
    expect(listSessions("ielts")).toEqual([]);
    expect(getClass("ielts")).toBeUndefined();
    expect(hasClass("ielts")).toBe(true);
    expect(listStudents("ielts")).toEqual([]);
    expect(getStudent("ielts-student-0")).toBeUndefined();
    expect(listTests("ielts")).toEqual([]);
    expect(listScores("ielts-test-0")).toEqual([]);
    expect(listComments("ielts")).toEqual([]);
    expect(listReports("ielts")).toEqual([]);
    expect(listSessionLectures("ielts-session-0")).toEqual([]);
      expect(() => cancelSession("ielts-session-0")).toThrow(CLASS_ACCESS_ERROR);
    expect(() => updateClass("ielts", { name: "X" })).toThrow(CLASS_ACCESS_ERROR);
  });

  it("điểm danh và nhận xét của đúng buổi dạy thay được phép", () => {
    actAs(MEMBER_IDS.lanTeacher, withLanSubstituteForOneIeltsSession);
    saveAttendanceBatch([
      {
        sessionId: "ielts-session-0",
        studentId: "ielts-student-0",
        status: "late",
        note: "",
        lateAt: "19:40",
      },
    ]);
    const comment = saveSessionComment({
      sessionId: "ielts-session-0",
      studentId: "ielts-student-0",
      stars: 3,
      note: "Học sinh tiếp thu tốt.",
    });
    expect(listSessionComments("ielts-session-0").map((item) => item.id)).toEqual([
      comment.id,
    ]);
    expect(sendSessionTickets("ielts-session-0").sent).toEqual([
      "ielts-student-0",
    ]);
    expect(
      getStore().comments.find((item) => item.id === comment.id)?.status,
    ).toBe("sent");
  });

  it("payload lệch lớp vẫn bị từ chối", () => {
    actAs(MEMBER_IDS.lanTeacher, withLanSubstituteForOneIeltsSession);
    expect(() =>
      saveSessionComment({
        sessionId: "ielts-session-0",
        studentId: "6a-student-0",
        stars: 3,
        note: "Sai lớp",
      }),
    ).toThrow("Nhận xét phải thuộc cùng lớp.");
    expect(() =>
      saveAttendanceBatch([
        {
          sessionId: "ielts-session-0",
          studentId: "6a-student-0",
          status: "present",
          note: "",
          lateAt: null,
        },
      ]),
    ).toThrow("Học sinh không thuộc buổi học này.");
    expect(() =>
      // Buổi 6A nhưng học sinh IELTS: lệch lớp.
      saveSessionComment({
        sessionId: "6a-session-5",
        studentId: "ielts-student-0",
        stars: 3,
        note: "Lệch lớp",
      }),
    ).toThrow("Nhận xét phải thuộc cùng lớp.");
  });
});

describe("Phạm vi với các membership khác", () => {
  it("trợ giảng chỉ thấy lớp được gán", () => {
    actAs(MEMBER_IDS.trang);
    expect(getClass("ielts")?.id).toBe("ielts");
    expect(getClass("6a")).toBeUndefined();
    expect(listSessions("6a")).toEqual([]);
    expect(listStudents("6a")).toEqual([]);
    // Trợ giảng không có nhóm quyền Lớp nên bị chặn ở tầng quyền trước.
    expect(() => updateClass("6a", { name: "X" })).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
  });

  it("membership bị vô hiệu hoá không đọc được gì", () => {
    actAs(MEMBER_IDS.lanTeacher, (state) => {
      state.members = state.members.map((member) =>
        member.id === MEMBER_IDS.lanTeacher
          ? ({ ...member, status: "disabled" } as Member)
          : member,
      );
    });
    expect(getClass("6a")).toBeUndefined();
    expect(listSessions("6a")).toEqual([]);
    expect(listStudents("6a")).toEqual([]);
    expect(canAccessClass("6a")).toBe(false);
  });

  it("role Giáo viên không có quyền vẫn bị chặn theo nhóm quyền", () => {
    actAs(MEMBER_IDS.lanTeacher, (state) => {
      state.roles = state.roles.map((role) =>
        role.id === ROLE_IDS.teacher
          ? { ...role, permissions: { ...role.permissions, scores: "none" } }
          : role,
      );
    });
    expect(() =>
      saveScore({
        testId: "6a-test-0",
        studentId: "6a-student-0",
        value: 8,
      }),
    ).toThrow("Bạn không có quyền thực hiện thao tác này.");
  });
});

describe("Migration vẫn giữ phạm vi lớp", () => {
  it("dữ liệu cũ thiếu mảng nhân sự vẫn bị chặn theo lớp sau khi migrate", () => {
    const state = createSeed();
    const legacy = {
      ...state,
      classStaff: undefined,
      sessionSubstitutes: undefined,
      payRates: undefined,
      payAdjustments: undefined,
      payrollMonths: undefined,
      classFees: undefined,
      studentFees: undefined,
      tuitionPayments: undefined,
      tuitionNotices: undefined,
    };
    const migrated = migrateStore(legacy);
    expect(migrated.sessionSubstitutes).toHaveLength(2);
    expect(Array.isArray(migrated.classStaff)).toBe(true);
    migrated.auth = { email: "scope@example.test", memberIds: [MEMBER_IDS.lanTeacher] };
    migrated.activeMemberId = MEMBER_IDS.lanTeacher;
    replaceStore(migrated);
    expect(getClass("ielts")).toBeUndefined();
    expect(listSessions("ielts")).toEqual([]);
    expect(listStudents("ielts")).toEqual([]);
  });
});

describe("hasSession phân biệt 404 với 403", () => {
  it("buổi có thật nhưng ngoài phạm vi vẫn báo tồn tại", () => {
    actAs(MEMBER_IDS.lanTeacher);
    expect(hasSession("ielts-session-0")).toBe(true);
    expect(getSession("ielts-session-0")).toBeUndefined();
    expect(hasSession("khong-co-buoi-nay")).toBe(false);
  });
});
