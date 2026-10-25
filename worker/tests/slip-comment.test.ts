import { describe, expect, it } from "vitest";
import { generateSlipComment } from "../src/lib/slip-comment";

describe("generateSlipComment", () => {
  it("matches the four examples in the spec", () => {
    expect(generateSlipComment(31)).toBe("Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà.");
    expect(generateSlipComment(23)).toBe("Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và hoàn thành tốt bài tập về nhà, nhưng còn mất trật tự.");
    expect(generateSlipComment(0)).toBe("Con chưa chú ý nghe giảng, chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà.");
    expect(generateSlipComment(0b00011)).toBe("Con chú ý nghe giảng và ghi bài đầy đủ, nhưng chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà.");
  });

  it("joins one or two clauses naturally", () => {
    expect(generateSlipComment(1)).toBe("Con chú ý nghe giảng, nhưng chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà.");
    expect(generateSlipComment(30)).toBe("Con ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà, nhưng chưa chú ý nghe giảng.");
  });
});
