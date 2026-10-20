import type { Attendance, Score, Session, StarLevel, Student } from "./types";

/**
 * Câu mẫu cố định theo mức sao (spec mục 4 "Nhận xét và báo cáo").
 * Giáo viên không sửa câu mẫu; máy khách chỉ hiện câu theo `stars`.
 */
export const STAR_TEMPLATES: Record<StarLevel, string> = {
  3: "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
  2: "Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.",
  1: "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.",
};

/** Ba mức sao theo thứ tự hiển thị (1 → 3). */
export const STAR_LEVELS: StarLevel[] = [1, 2, 3];

/** Câu mẫu của một mức sao; null khi chưa chọn sao. */
export function starTemplate(stars: StarLevel | null): string | null {
  return stars === null ? null : STAR_TEMPLATES[stars];
}

export function orderScoreGridStudents<T extends Pick<Student, "status">>(
  students: T[],
): T[] {
  return [...students].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "active" ? -1 : 1,
  );
}

export function isFutureSession(date: string, today = new Date()): boolean {
  const todayISO = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return date > todayISO;
}

export function averageScore(scores: Pick<Score, "value">[]): number | null {
  const values = scores
    .filter((s) => s.value !== null)
    .map((s) => s.value as number);
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}
export function attendanceRate(
  records: Pick<Attendance, "status">[],
): number | null {
  const counted = records.filter((r) => r.status !== "excused");
  return counted.length
    ? (100 *
        counted.filter((r) => r.status === "present" || r.status === "late")
          .length) /
        counted.length
    : null;
}
export function consecutiveAbsences(
  student: Student,
  sessions: Session[],
  records: Attendance[],
): number {
  const held = sessions
    .filter(
      (s) =>
        s.classId === student.classId &&
        s.status === "held" &&
        s.date >= student.enrolledAt &&
        (!student.leftAt || s.date <= student.leftAt),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const session of held) {
    if (
      records.find(
        (r) => r.sessionId === session.id && r.studentId === student.id,
      )?.status !== "absent"
    )
      break;
    count++;
  }
  return count;
}
export function hasAbsenceWarning(
  student: Student,
  sessions: Session[],
  records: Attendance[],
): boolean {
  return (
    student.status === "active" &&
    consecutiveAbsences(student, sessions, records) >= 2
  );
}
