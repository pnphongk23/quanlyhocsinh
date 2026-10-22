import { describe, expect, it } from "vitest";
import { formatScore, parseHalfScore } from "./scoreFormat";

describe("formatScore", () => {
  it.each([
    [10, "10"],
    [0, "0"],
    [0.5, "0,5"],
    [7.5, "7,5"],
    [14.5, "14,5"],
  ])("%s → %s", (value, expected) => {
    expect(formatScore(value)).toBe(expected);
  });

  it("null là Chưa có điểm", () => {
    expect(formatScore(null)).toBe("Chưa có điểm");
  });
});

describe("parseHalfScore", () => {
  it.each([["7,5", 7.5], ["7.5", 7.5]])("nhận %s", (raw, expected) => {
    expect(parseHalfScore(raw)).toBe(expected);
  });
});
