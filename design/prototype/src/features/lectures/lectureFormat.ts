import type { Lecture } from "../../data/types";

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })} MB`;
}

/** Chuẩn hoá để tìm không phân biệt hoa thường và dấu tiếng Việt. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

export function matchesQuery(lecture: Lecture, query: string): boolean {
  const needle = normalizeText(query);
  if (!needle) return true;
  return (
    normalizeText(lecture.title).includes(needle) ||
    lecture.sections.some((section) =>
      normalizeText(section.title).includes(needle),
    )
  );
}

export function sectionCountLabel(count: number): string {
  return count === 0 ? "Chưa có phần" : `${count} phần`;
}

export function usageLabel(count: number): string {
  return count === 0 ? "Chưa dùng ở buổi nào" : `${count} buổi đang dùng`;
}
