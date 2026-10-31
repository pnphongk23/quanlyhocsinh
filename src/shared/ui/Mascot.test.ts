import { describe, expect, it } from "vitest";
import { starPose } from "./Mascot";

describe("starPose", () => {
  it("maps every five-star score directly, including zero", () => {
    expect([0, 1, 2, 3, 4, 5].map((stars) => starPose(stars))).toEqual([
      "sao-0", "sao-1", "sao-2", "sao-3", "sao-4", "sao-5",
    ]);
    expect(starPose(null)).toBe("cho");
  });

  it("keeps the legacy three-star poses", () => {
    expect([1, 2, 3].map((stars) => starPose(stars, 3))).toEqual([
      "sao-1", "sao-2", "sao-3",
    ]);
  });
});
