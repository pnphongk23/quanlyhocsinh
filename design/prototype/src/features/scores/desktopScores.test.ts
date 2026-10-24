import { describe, expect, it } from "vitest";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { listStudents } from "../../data/repositories/students";
import { listTests } from "../../data/repositories/tests";
import { listScores } from "../../data/repositories/scores";
import {
  deleteDialogCopy,
  scoredPill,
  testDateLabel,
} from "./TestsDesktop";
import {
  draftKey,
  parseScoreInput,
} from "./ScoreGridDesktop";
import { formatScore } from "../../data/scoreFormat";

describe("Tab Bài kiểm tra trên web (ảnh 08…12)", () => {
  it("ngày kiểm tra hiện dd/mm/yy", () => {
    expect(testDateLabel("2026-09-25")).toBe("25/09/26");
  });

  it("nhãn Đã có điểm theo số em đã nhập", () => {
    expect(scoredPill(0, 10)).toEqual({ label: "Chưa có điểm", tone: "warning" });
    expect(scoredPill(10, 10)).toEqual({ label: "10/10 em", tone: "success" });
    expect(scoredPill(9, 10)).toEqual({ label: "9/10 em", tone: "primary" });
    expect(scoredPill(6, 10)).toEqual({ label: "6/10 em", tone: "primary" });
  });

  it("xoá bài chưa có điểm thì nói rõ xoá hẳn", () => {
    const copy = deleteDialogCopy(0, 10);
    expect(copy.kind).toBe("delete");
    expect(copy.badge).toBe("Chưa có điểm: xoá hẳn");
    expect(copy.action).toBe("Xoá hẳn");
    expect(copy.message).toContain("xoá hẳn");
    expect(copy.message).toContain("không khôi phục được");
  });

  it("xoá bài đã có điểm thì nói rõ lưu trữ và giữ điểm", () => {
    const copy = deleteDialogCopy(9, 10);
    expect(copy.kind).toBe("archive");
    expect(copy.badge).toBe("Đã có điểm: lưu trữ");
    expect(copy.action).toBe("Lưu trữ bài");
    expect(copy.message).toContain("9/10 em đã có điểm");
    expect(copy.message).toContain("lưu trữ");
    expect(copy.message).toContain("vẫn được giữ");
  });
});

describe("Bảng điểm nhập trực tiếp trên web (ảnh 13)", () => {
  it("ô trống là Chưa có điểm; nhận 7,5 và 7.5", () => {
    expect(parseScoreInput("")).toEqual({ ok: true, value: null });
    expect(parseScoreInput("  ")).toEqual({ ok: true, value: null });
    expect(parseScoreInput("7,5")).toEqual({ ok: true, value: 7.5 });
    expect(parseScoreInput("7.5")).toEqual({ ok: true, value: 7.5 });
    expect(parseScoreInput("8")).toEqual({ ok: true, value: 8 });
      expect(parseScoreInput("abc")).toEqual({ ok: false });
      expect(parseScoreInput("7,3")).toEqual({ ok: false });
  });

  it("khoá nháp theo bài kiểm tra + học sinh", () => {
    expect(draftKey("t1", "s1")).toBe("t1:s1");
  });

  it("tiêu đề cột ghi /điểm tối đa riêng của từng bài", () => {
    replaceStore(createSeed());
    const tests = listTests("6a");
    expect(tests.map((test) => test.max)).toEqual([10, 10, 10, 10]);
    expect(tests.length).toBeGreaterThan(0);
  });

  it("ô đã có điểm hiện đúng giá trị, ô trống không bị tính là 0", () => {
    replaceStore(createSeed());
    const tests = listTests("6a");
    const students = listStudents("6a");
    const scores = tests.flatMap((test) => listScores(test.id));
    const empty = scores.filter((score) => score.value === null);
    expect(empty.length).toBeGreaterThan(0);
    expect(formatScore(0)).toBe("0");
    expect(formatScore(7.5)).toBe("7,5");
    expect(formatScore(8)).toBe("8");
    expect(formatScore(10)).toBe("10");
    expect(formatScore(0.5)).toBe("0,5");
    expect(formatScore(14.5)).toBe("14,5");
    expect(formatScore(null)).toBe("Chưa có điểm");
    expect(students.length).toBe(10);
  });
});
