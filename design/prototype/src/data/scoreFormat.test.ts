import { describe, expect, it } from "vitest";
import { formatScore } from "./scoreFormat";

describe("formatScore", () => {
  it.each([
    [10, "10"],
    [7.5, "7,5"],
    [0, "0"],
    [0.5, "0,5"],
    [14.5, "14,5"],
    [9, "9"],
  ])("%s → %s", (value, expected) => {
    expect(formatScore(value)).toBe(expected);
  });

  it("null là Chưa có điểm", () => {
    expect(formatScore(null)).toBe("Chưa có điểm");
  });
});
