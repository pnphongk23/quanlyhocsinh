import { describe, expect, it } from "vitest";
import { classFromApi } from "./mapping";

describe("class API mapping", () => {
  it("preserves a display-only teacher name", () => {
    expect(
      classFromApi({
        id: "6a",
        name: "Tiếng Anh giao tiếp 6A",
        status: "active",
        weekdays: [1, 3],
        start_time: "18:00",
        teacher_name: "Cô Lan",
        version: 4,
      }),
    ).toMatchObject({ teacherName: "Cô Lan", weekdays: [1, 3], time: "18:00" });
  });

  it("preserves null when no teacher is assigned", () => {
    expect(
      classFromApi({
        id: "6a",
        name: "Tiếng Anh giao tiếp 6A",
        status: "active",
        weekdays: [1, 3],
        start_time: "18:00",
        teacher_name: null,
        version: 4,
      }),
    ).toMatchObject({ teacherName: null });
  });
});
