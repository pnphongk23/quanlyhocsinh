import { describe, expect, it } from "vitest";
import type { Lecture } from "../../data/types";
import {
  formatFileSize,
  matchesQuery,
  normalizeText,
  sectionCountLabel,
  usageLabel,
} from "./lectureFormat";

const lecture: Lecture = {
  id: "l1",
  title: "Unit 3: Present Perfect",
  createdBy: "m1",
  createdAt: "2026-10-10T09:00:00.000Z",
  archived: false,
  sections: [
    { id: "s1", title: "Warm-up", description: "", files: [] },
    { id: "s2", title: "Từ vựng chủ đề Travel", description: "", files: [] },
  ],
};

describe("lectureFormat", () => {
  it("định dạng dung lượng tệp", () => {
    expect(formatFileSize(0)).toBe("0 KB");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3 MB");
  });

  it("bỏ dấu tiếng Việt khi tìm", () => {
    expect(normalizeText("Từ vựng Đường phố")).toBe("tu vung duong pho");
  });

  it("tìm theo tên bài và tên phần", () => {
    expect(matchesQuery(lecture, "present")).toBe(true);
    expect(matchesQuery(lecture, "travel")).toBe(true);
    expect(matchesQuery(lecture, "  ")).toBe(true);
    expect(matchesQuery(lecture, "ngữ pháp")).toBe(false);
  });

  it("nhãn số phần và số buổi đang dùng", () => {
    expect(sectionCountLabel(0)).toBe("Chưa có phần");
    expect(sectionCountLabel(4)).toBe("4 phần");
    expect(usageLabel(0)).toBe("Chưa dùng ở buổi nào");
    expect(usageLabel(2)).toBe("2 buổi đang dùng");
  });
});
