import { beforeEach, describe, expect, it } from "vitest";
import { homeworkContext } from "../../data/homework";
import {
  deleteHomeworkSection,
  saveHomeworkSection,
  setHomeworkGrade,
  setHomeworkGradeForAll,
} from "../../data/repositories/homework";
import { createExtraSession } from "../../data/repositories/sessions";
import { createSeed } from "../../data/seed";
import { getStore, replaceStore } from "../../data/store";
import { nextGrade } from "./homeworkModel";

const VOCABULARY = "6a-hw-6-vocabulary";
const EXERCISE_6 = "6a-hw-6-exercise";

function progress(sectionId: string) {
  const context = homeworkContext(getStore(), "6a-session-7");
  return context?.previous.sections.find(
    (item) => item.section.id === sectionId,
  );
}

beforeEach(() => {
  replaceStore(createSeed());
});

describe("Chấm BTVN buổi trước", () => {
  it("chấm một em rồi chạm lại mức đang chọn thì bỏ chấm", () => {
    expect(progress(VOCABULARY)).toMatchObject({ graded: 8, ungraded: 1 });

    setHomeworkGrade(VOCABULARY, "6a-student-0", "done");
    expect(progress(VOCABULARY)).toMatchObject({ graded: 9, ungraded: 0 });

    setHomeworkGrade(
      VOCABULARY,
      "6a-student-0",
      nextGrade("done", "done"),
    );
    expect(progress(VOCABULARY)).toMatchObject({ graded: 8, ungraded: 1 });
  });

  it("đánh dấu cả lớp Hoàn thành chấm mọi em đang học ở buổi chấm", () => {
    expect(setHomeworkGradeForAll(VOCABULARY, "done")).toBe(9);
    expect(progress(VOCABULARY)).toMatchObject({ graded: 9, ungraded: 0 });
    const context = homeworkContext(getStore(), "6a-session-7")!;
    expect(
      context.previous.rows.every((row) => row.grades[VOCABULARY] === "done"),
    ).toBe(true);
  });

  it("vẫn chấm được em vắng buổi giao bài", () => {
    const result = setHomeworkGrade(EXERCISE_6, "6a-student-0", "excellent");
    expect(result).toEqual({
      sectionId: EXERCISE_6,
      studentId: "6a-student-0",
      level: "excellent",
    });
    expect(progress(EXERCISE_6)).toMatchObject({ graded: 8, ungraded: 1 });
  });
});

describe("Giao BTVN hôm nay", () => {
  it("không xoá được phần đã chấm cho em nào", () => {
    expect(() => deleteHomeworkSection(VOCABULARY)).toThrow(
      "Đã chấm cho học sinh nên không xoá được. Vẫn sửa được tiêu đề và mô tả.",
    );
  });

  it("xoá được phần chưa chấm", () => {
    deleteHomeworkSection("6a-hw-7-vocabulary");
    const context = homeworkContext(getStore(), "6a-session-7")!;
    expect(
      context.today.sections.some(
        (section) => section.id === "6a-hw-7-vocabulary",
      ),
    ).toBe(false);
    expect(context.today.missingKinds).toContain("vocabulary");
  });

  it("sửa tiêu đề/mô tả phần đã chấm vẫn giữ kết quả chấm", () => {
    const saved = saveHomeworkSection({
      id: VOCABULARY,
      sessionId: "6a-session-6",
      kind: "vocabulary",
      title: "Unit 5 · 12 từ chủ đề Food (ôn lại)",
      description: "Học nghĩa và cách đọc.",
    });
    expect(saved.title).toBe("Unit 5 · 12 từ chủ đề Food (ôn lại)");
    expect(progress(VOCABULARY)).toMatchObject({ graded: 8, ungraded: 1 });
  });

  it("thêm buổi lẻ xong thì trạng thái chưa có buổi chấm tự cập nhật", () => {
    const before = homeworkContext(getStore(), "ielts-session-8")!;
    expect(before.today.grading).toMatchObject({ state: "none", session: null });

    const created = createExtraSession(
      { classId: "ielts", date: "2026-10-22", time: "19:30" },
      "2026-10-20",
    );

    const after = homeworkContext(getStore(), "ielts-session-8")!;
    expect(after.today.grading.state).toBe("exists");
    expect(after.today.grading.session?.id).toBe(created.id);
  });

  it("chặn tiêu đề trống và phần trùng loại trong một buổi", () => {
    expect(() =>
      saveHomeworkSection({
        sessionId: "6a-session-7",
        kind: "reading",
        title: "   ",
      }),
    ).toThrow("Nhập tiêu đề phần bài tập.");
    expect(() =>
      saveHomeworkSection({
        sessionId: "6a-session-7",
        kind: "vocabulary",
        title: "Trùng loại",
      }),
    ).toThrow("Mỗi loại chỉ có một phần trong một buổi.");
  });
});
