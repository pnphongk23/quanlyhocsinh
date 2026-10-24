import { describe, expect, it } from "vitest";
import { classFromApi, reportBatchFromApi, reportFromApi } from "./mapping";

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

describe("report API mapping", () => {
  it("maps report_batch with its time marks and optional session ids", () => {
    expect(
      reportBatchFromApi({ id: "b1", class_id: "6a", from_session_id: "s1", to_session_id: "s8", from_key: "2026-10-01 18:00", to_key: "2026-10-24 18:00", version: 1 }),
    ).toEqual({ id: "b1", classId: "6a", fromSessionId: "s1", toSessionId: "s8", fromKey: "2026-10-01 18:00", toKey: "2026-10-24 18:00" });
    expect(
      reportBatchFromApi({ id: "old", class_id: "6a", from_session_id: null, to_session_id: null, from_key: "2026-09-01 00:00", to_key: "2026-09-31 23:59", version: 1 }),
    ).toMatchObject({ fromSessionId: null, toSessionId: null });
  });

  it("carries batch_id and the month of the last session on a report", () => {
    expect(
      reportFromApi({ id: "r1", class_id: "6a", student_id: "st1", batch_id: "b1", month: "2026-10", status: "published", general_comment: "Tốt", needs_republish: true, publication_count: 2, published_at: "2026-10-25T01:00:00Z", version: 3 }),
    ).toEqual({ id: "r1", classId: "6a", studentId: "st1", batchId: "b1", month: "2026-10", status: "published", generalComment: "Tốt", needsRepublish: true, publishedAt: "2026-10-25T01:00:00Z" });
  });
});
