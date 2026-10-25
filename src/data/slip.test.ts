import { describe, expect, it } from "vitest";
import { DEFAULT_SLIP_COMMENTS, SLIP_CRITERIA, defaultSlipComment, generatedSlipSentence, starsFromCriteria } from "./slip";

describe("five-criterion slips", () => {
  it("counts criterion bits from zero through five stars", () => {
    expect(SLIP_CRITERIA).toHaveLength(5);
    expect([0, 1, 3, 7, 15, 31].map(starsFromCriteria)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("rejects criteria outside the 5-bit mask", () => {
    for (const criteria of [-1, 32, 1.5]) expect(() => starsFromCriteria(criteria)).toThrow("invalid_criteria");
  });

  it("uses the agreed default comment for each star count", () => {
    expect(defaultSlipComment(5)).toBe("Con học rất tốt, chăm chỉ, tích cực tham gia phát biểu");
    expect(defaultSlipComment(4)).toBe("Con học tốt, làm bài đầy đủ nhưng hơi trầm");
    expect(defaultSlipComment(3)).toBe("Con học tốt, nhưng còn hơi mất tập trung, nói tự do");
    expect(defaultSlipComment(0)).toBe("Con chưa tích cực tham gia hoạt động, cần tập trung hơn");
    expect(DEFAULT_SLIP_COMMENTS[1]).toBe(DEFAULT_SLIP_COMMENTS[2]);
  });

  it.each([
    [31, "Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà."],
    [23, "Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và hoàn thành tốt bài tập về nhà, nhưng còn mất trật tự."],
    [1, "Con chú ý nghe giảng, nhưng chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà."],
    [5, "Con chú ý nghe giảng và tích cực tham gia các hoạt động trong lớp, nhưng chưa ghi bài đầy đủ, còn mất trật tự và chưa hoàn thành bài tập về nhà."],
    [27, "Con chú ý nghe giảng, ghi bài đầy đủ, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà, nhưng chưa tích cực tham gia hoạt động."],
    [15, "Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và ngồi học ngoan ngoãn, không mất trật tự, nhưng chưa hoàn thành bài tập về nhà."],
    [0, "Con chưa chú ý nghe giảng, chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà."],
  ] as const)("generates sentence for criteria bitmask %i", (criteria, sentence) => {
    expect(generatedSlipSentence(criteria)).toBe(sentence);
  });
});
