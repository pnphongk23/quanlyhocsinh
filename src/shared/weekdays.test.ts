import { describe, expect, it } from "vitest";
import { formatClassSchedule } from "./format";
import { normalizeWeekdays } from "./weekdays";
import { scheduleText } from "../roles/guardian/guardianFormat";

describe("ISO weekdays", () => {
  it("normalizes legacy Sunday values, removes duplicates, and sorts", () => {
    expect(normalizeWeekdays([7, 0, 1, 0])).toEqual([1, 7]);
  });

  it("formats Sunday and Monday in UI order for staff and guardians", () => {
    expect(formatClassSchedule({ weekdays: [7, 1], time: "09:00" })).toBe("Thứ Hai, Chủ nhật · 09:00");
    expect(formatClassSchedule({ weekdays: [7], time: "09:00" })).toBe("Chủ nhật · 09:00");
    expect(scheduleText([1, 7], "09:00")).toBe("Thứ Hai, Chủ nhật · 09:00");
    expect(scheduleText([7], "09:00")).toBe("Chủ nhật · 09:00");
  });
});
