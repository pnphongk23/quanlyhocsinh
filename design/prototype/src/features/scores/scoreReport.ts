import type { Score, StoreState, Student, Test } from "../../data/types";

/**
 * Điểm của một học sinh ở một bài: chỉ có điểm hoặc chưa có điểm (em vắng
 * buổi kiểm tra cũng là chưa có điểm).
 */
export interface StudentScoreRow {
  test: Test;
  value: number | null;
}

export interface StudentScoreReport {
  student: Student;
  rows: StudentScoreRow[];
  /**
   * Chênh lệch của bài gần nhất (theo ngày) so với bài có điểm liền trước, tính
   * theo phần trăm thang điểm của hai bài, làm tròn số nguyên: bài trước 80%
   * thang, bài gần nhất 60% thang → −20. Null khi bài gần nhất chưa có điểm hoặc
   * chưa đủ hai bài có điểm (dùng cho cột "Bài gần nhất" và quy tắc "cần chú ý").
   */
  latestDelta: number | null;
}

export interface ScoreProgress {
  test: Test;
  scored: number;
  missing: number;
}

export interface ScoreAttention {
  student: Student;
  reasons: string[];
}

export interface ClassScoreReport {
  students: StudentScoreReport[];
  progress: ScoreProgress[];
  attention: ScoreAttention[];
}

/** Ngưỡng "cần chú ý": bài gần nhất giảm từ 20% thang trở lên. */
const ATTENTION_DROP_PERCENT = 20;

/**
 * Điểm trong báo cáo điểm hiển thị dấu chấm (7.2, 6.5 – 7.9) theo ảnh thiết kế.
 * Cố ý cục bộ ở đây, không đổi format chung của app.
 */
export function formatScoreDot(value: number): string {
  return value.toFixed(1);
}

/** Điểm theo phần trăm thang của bài: value / max × 100. */
export function scorePercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return (value / max) * 100;
}

/** Chênh lệch phần trăm thang có dấu: "+13%", "−7%", "0%". */
export function formatSignedPercent(delta: number): string {
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `−${Math.abs(delta)}%`;
  return "0%";
}

/** Bài đã lưu trữ không hiện ở bất kỳ đâu; thiếu trường nghĩa là chưa lưu trữ. */
const isArchived = (test: Test): boolean => test.archived === true;

/** Điểm của một học sinh theo từng bài của lớp, sắp theo ngày. */
export function studentScoreReport(
  state: StoreState,
  studentId: string,
): StudentScoreReport {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) throw new Error("Không tìm thấy học sinh.");

  const tests = state.tests
    .filter((test) => test.classId === student.classId && !isArchived(test))
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    );
  const scores = new Map<string, Score>();
  for (const score of state.scores)
    if (score.studentId === student.id) scores.set(score.testId, score);

  const rows: StudentScoreRow[] = tests.map((test) => ({
    test,
    value: scores.get(test.id)?.value ?? null,
  }));

  const lastIndex = rows.length - 1;
  const last = rows[lastIndex];
  let latestDelta: number | null = null;
  if (last && last.value !== null) {
    const previous = [...rows.slice(0, lastIndex)]
      .reverse()
      .find((row) => row.value !== null);
    if (previous && previous.value !== null)
      latestDelta = Math.round(
        scorePercent(last.value, last.test.max) -
          scorePercent(previous.value, previous.test.max),
      );
  }
  return { student, rows, latestDelta };
}

/**
 * Báo cáo tổng hợp lớp: dữ liệu từng học sinh, tiến độ nhập điểm và danh sách
 * cần chú ý. Không có trung bình lớp hay trung bình từng bài (quy tắc 3.1).
 */
export function classScoreReport(
  state: StoreState,
  classId: string,
): ClassScoreReport {
  const students = state.students
    .filter((student) => student.classId === classId && student.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
    .map((student) => studentScoreReport(state, student.id));

  // Tiến độ nhập điểm tính trên toàn bộ danh sách lớp, kể cả học sinh đã nghỉ,
  // để khớp bảng điểm của lớp.
  const roster = state.students
    .filter((student) => student.classId === classId)
    .map((student) => studentScoreReport(state, student.id));
  const tests = state.tests
    .filter((test) => test.classId === classId && !isArchived(test))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const progress: ScoreProgress[] = tests.map((test) => {
    const values = roster.map(
      (report) => report.rows.find((row) => row.test.id === test.id)?.value ?? null,
    );
    const scored = values.filter((value) => value !== null).length;
    return { test, scored, missing: values.length - scored };
  });

  /**
   * "Cần chú ý" chỉ còn hai lý do: bài gần nhất giảm từ 20% thang trở lên so với
   * bài có điểm trước đó; hoặc từ 2 bài chưa có điểm.
   */
  const attention: ScoreAttention[] = [];
  for (const report of students) {
    const reasons: string[] = [];
    if (
      report.latestDelta !== null &&
      report.latestDelta <= -ATTENTION_DROP_PERCENT
    )
      reasons.push(
        `Bài gần nhất giảm ${Math.abs(report.latestDelta)}% so với bài trước`,
      );
    const missing = report.rows.filter((row) => row.value === null).length;
    if (missing >= 2) reasons.push(`${missing} bài chưa có điểm`);
    if (reasons.length) attention.push({ student: report.student, reasons });
  }

  return { students, progress, attention };
}
