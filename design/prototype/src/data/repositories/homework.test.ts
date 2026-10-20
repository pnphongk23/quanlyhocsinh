import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { MEMBER_IDS } from "../defaults";
import { switchRole } from "./access";
import {
  deleteHomeworkSection,
  listHomeworkGrades,
  listHomeworkSections,
  saveHomeworkSection,
  setHomeworkGrade,
  setHomeworkGradeForAll,
} from "./homework";

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

describe("Giao phần BTVN", () => {
  it("mỗi buổi tối đa một phần mỗi loại, sửa tiêu đề/mô tả luôn được", () => {
    const section = saveHomeworkSection({
      sessionId: "6a-session-8",
      kind: "reading",
      title: "Truyện “The Lost Key”, trang 12–15",
      description: "Đọc to 2 lần, gạch chân từ mới.",
    });
    expect(section).toMatchObject({
      sessionId: "6a-session-8",
      kind: "reading",
      description: "Đọc to 2 lần, gạch chân từ mới.",
    });
    expect(() =>
      saveHomeworkSection({
        sessionId: "6a-session-8",
        kind: "reading",
        title: "Phần thứ hai",
      }),
    ).toThrow("Mỗi loại chỉ có một phần trong một buổi.");

    const edited = saveHomeworkSection({
      id: section.id,
      sessionId: "6a-session-8",
      kind: "reading",
      title: "Truyện “The Lost Key”, trang 12–16",
    });
    expect(edited).toMatchObject({ id: section.id, description: "" });
    expect(listHomeworkSections("6a-session-8").map((item) => item.id)).toEqual([
      section.id,
    ]);
    expect(getStore().homeworkGrades).toEqual(createSeed().homeworkGrades);
  });

  it("buổi đã hủy không giao được", () => {
    expect(() =>
      saveHomeworkSection({
        sessionId: "6a-extra-cancelled",
        kind: "vocabulary",
        title: "Không giao",
      }),
    ).toThrow("Buổi học đã hủy nên không giao hoặc chấm bài tập.");
  });

  it("tiêu đề không được trống", () => {
    expect(() =>
      saveHomeworkSection({
        sessionId: "6a-session-8",
        kind: "speaking",
        title: "   ",
      }),
    ).toThrow("Nhập tiêu đề phần bài tập.");
  });

  it("lưu được khi mất mạng qua hàng đợi", () => {
    vi.stubGlobal("navigator", { onLine: false });
    saveHomeworkSection({
      sessionId: "6a-session-8",
      kind: "reading",
      title: "Truyện ngắn",
    });
    expect(getStore().pending.length).toBeGreaterThan(0);
    expect(getStore().homeworkSections.some((item) => item.title === "Truyện ngắn")).toBe(true);
  });
});

describe("Xoá phần BTVN", () => {
  it("chỉ xoá được phần chưa chấm cho em nào", () => {
    expect(() => deleteHomeworkSection("6a-hw-6-vocabulary")).toThrow(
      "Đã chấm cho học sinh nên không xoá được. Vẫn sửa được tiêu đề và mô tả.",
    );
    const section = saveHomeworkSection({
      sessionId: "6a-session-8",
      kind: "reading",
      title: "Truyện ngắn",
    });
    deleteHomeworkSection(section.id);
    expect(
      getStore().homeworkSections.some((item) => item.id === section.id),
    ).toBe(false);
  });
});

describe("Chấm BTVN", () => {
  it("chấm một em, bỏ kết quả về Chưa chấm", () => {
    expect(listHomeworkGrades("6a-hw-6-exercise")).toHaveLength(7);
    const grade = setHomeworkGrade("6a-hw-6-exercise", "6a-student-0", "done");
    expect(grade).toEqual({
      sectionId: "6a-hw-6-exercise",
      studentId: "6a-student-0",
      level: "done",
    });
    expect(listHomeworkGrades("6a-hw-6-exercise")).toHaveLength(8);
    expect(setHomeworkGrade("6a-hw-6-exercise", "6a-student-0", null)).toBeNull();
    expect(
      getStore().homeworkGrades.some(
        (item) =>
          item.sectionId === "6a-hw-6-exercise" &&
          item.studentId === "6a-student-0",
      ),
    ).toBe(false);
  });

  it("chỉ chấm được em còn đang học ở buổi chấm", () => {
    expect(() =>
      setHomeworkGrade("6a-hw-6-exercise", "6a-student-9", "done"),
    ).toThrow("Học sinh không còn học ở buổi chấm này.");
  });

  it("đánh dấu cả lớp chỉ áp dụng cho em còn đang học ở buổi chấm", () => {
    expect(setHomeworkGradeForAll("6a-hw-6-exercise", "done")).toBe(9);
    const graded = getStore().homeworkGrades.filter(
      (item) => item.sectionId === "6a-hw-6-exercise",
    );
    expect(graded).toHaveLength(9);
    expect(graded.every((item) => item.level === "done")).toBe(true);
    expect(graded.some((item) => item.studentId === "6a-student-9")).toBe(false);
  });

  it("phần chưa có buổi chấm thì chưa chấm được", () => {
    expect(() =>
      setHomeworkGrade("ielts-hw-8-vocabulary", "ielts-student-0", "done"),
    ).toThrow("Chưa có buổi chấm cho phần bài tập này.");
  });

  it("học sinh đã rời lớp giữ kết quả chấm cũ", () => {
    const state = createSeed();
    state.homeworkGrades.push({
      sectionId: "6a-hw-6-diagram",
      studentId: "6a-student-9",
      level: "done",
    });
    state.homeworkSections.push({
      id: "6a-hw-6-diagram",
      sessionId: "6a-session-6",
      kind: "reading",
      title: "Đọc hiểu",
      description: "",
    });
    replaceStore(state);
    expect(
      getStore().homeworkGrades.some(
        (item) =>
          item.sectionId === "6a-hw-6-diagram" &&
          item.studentId === "6a-student-9",
      ),
    ).toBe(true);
  });

  it("phụ huynh không chấm hay giao bài", () => {
    switchRole(MEMBER_IDS.lanGuardian);
    expect(listHomeworkSections("6a-session-7")).toEqual([]);
    expect(() =>
      setHomeworkGrade("6a-hw-6-exercise", "6a-student-1", "done"),
    ).toThrow("Bạn không có quyền thực hiện thao tác này.");
    expect(() =>
      saveHomeworkSection({
        sessionId: "6a-session-8",
        kind: "reading",
        title: "Không giao",
      }),
    ).toThrow("Bạn không có quyền thực hiện thao tác này.");
  });
});
