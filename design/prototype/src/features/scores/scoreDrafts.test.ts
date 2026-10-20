import { describe, expect, it } from "vitest";
import {
  clearClassTestDrafts,
  draftsForClass,
  entriesForClassTests,
  type ClassScoreDrafts,
} from "./scoreDrafts";

describe("bản nháp điểm theo lớp", () => {
  it("chỉ trả draft của lớp hiện tại và khi lưu giữ nguyên draft lớp khác", () => {
    const drafts: ClassScoreDrafts = {
      "6a": { "6a-test-1:6a-student-0": { value: "9.7" } },
      ielts: { "ielts-test-1:ielts-student-0": { value: "8" } },
    };

    expect(entriesForClassTests(drafts, "ielts", new Set(["ielts-test-1"]))).toEqual([
      ["ielts-test-1:ielts-student-0", { value: "8" }],
    ]);
    const afterSavingIELTS = clearClassTestDrafts(drafts, "ielts", new Set(["ielts-test-1"]));

    expect(draftsForClass(afterSavingIELTS, "6a")).toEqual(drafts["6a"]);
    expect(draftsForClass(afterSavingIELTS, "ielts")).toEqual({});
    expect(entriesForClassTests(drafts, "6a", new Set(["ielts-test-1"]))).toEqual([]);
  });
});
