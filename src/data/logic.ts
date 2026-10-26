import type { Attendance, Session, StarLevel, Student } from "./types";

import { todayISO } from "../shared/date";

/**
 * Câu mẫu cố định theo mức sao (spec mục 4 "Nhận xét và báo cáo").
 * Giáo viên không sửa câu mẫu; máy khách chỉ hiện câu theo `stars`.
 */
export const STAR_TEMPLATES: Partial<Record<StarLevel, string>> = {
  3: "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
  2: "Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.",
  1: "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.",
};

/** Ba mức sao theo thứ tự hiển thị (1 → 3). */
export const STAR_LEVELS: StarLevel[] = [1, 2, 3];

/** Câu mẫu của một mức sao; null khi chưa chọn sao. */
export function starTemplate(stars: StarLevel | null): string | null {
  return stars === null ? null : STAR_TEMPLATES[stars] ?? null;
}

export function orderScoreGridStudents<T extends Pick<Student, "status">>(
  students: T[],
): T[] {
  return [...students].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "active" ? -1 : 1,
  );
}

export function isFutureSession(date: string, today = todayISO()): boolean {
  return date > today;
}

export function attendanceRate(
  records: Pick<Attendance, "status">[],
): number | null {
  return records.length
    ? (100 *
        records.filter((r) => r.status === "present" || r.status === "late")
          .length) /
        records.length
    : null;
}
