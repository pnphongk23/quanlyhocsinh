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
  average: number | null;
  /** Các điểm đã có, theo thứ tự ngày; dùng cho biểu đồ xu hướng. */
  trend: number[];
  /**
   * Chênh lệch của bài gần nhất (theo ngày) so với bài có điểm liền trước.
   * Null khi bài gần nhất chưa có điểm (dùng cho cột "Bài gần nhất" và quy tắc
   * "cần chú ý").
   */
  latestDelta: number | null;
}

export interface ScoreDistributionBand {
  label: string;
  count: number;
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
  distribution: ScoreDistributionBand[];
  progress: ScoreProgress[];
  attention: ScoreAttention[];
}

const DISTRIBUTION_LABELS = [
  "< 5",
  "5 – 6.4",
  "6.5 – 7.9",
  "8 – 10",
];

/**
 * Điểm trong báo cáo điểm hiển thị dấu chấm (7.2, 6.5 – 7.9) theo ảnh thiết kế.
 * Cố ý cục bộ ở đây, không đổi format chung của app.
 */
export function formatScoreDot(value: number): string {
  return value.toFixed(1);
}

/** Chênh lệch có dấu: "+0.2", "−2.5", "0.0". */
export function formatSignedScore(delta: number): string {
  if (delta > 0) return `+${delta.toFixed(1)}`;
  if (delta < 0) return `−${Math.abs(delta).toFixed(1)}`;
  return delta.toFixed(1);
}

function distributionLabel(average: number): string {
  if (average < 5) return DISTRIBUTION_LABELS[0];
  if (average < 6.5) return DISTRIBUTION_LABELS[1];
  if (average < 8) return DISTRIBUTION_LABELS[2];
  return DISTRIBUTION_LABELS[3];
}

/** Điểm của một học sinh theo từng bài của lớp, sắp theo ngày; TB theo quy tắc 3.2. */
export function studentScoreReport(
  state: StoreState,
  studentId: string,
): StudentScoreReport {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) throw new Error("Không tìm thấy học sinh.");

  const tests = state.tests
    .filter((test) => test.classId === student.classId)
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
  // Quy tắc 3.2: trung bình cộng các bài đã có điểm, bài chưa có điểm không tính.
  const trend = rows
    .map((row) => row.value)
    .filter((value): value is number => value !== null);
  const average = trend.length
    ? trend.reduce((total, value) => total + value, 0) / trend.length
    : null;
  const lastRow = rows[rows.length - 1];
  const latestDelta =
    lastRow && lastRow.value !== null && trend.length >= 2
      ? trend[trend.length - 1] - trend[trend.length - 2]
      : null;
  return { student, rows, average, trend, latestDelta };
}

/**
 * Báo cáo tổng hợp lớp (quy tắc 3.1): chỉ có dữ liệu từng học sinh, phân bố trung
 * bình theo dải, tiến độ nhập điểm và danh sách cần chú ý.
 * Không tính trung bình lớp hay trung bình từng bài.
 */
export function classScoreReport(
  state: StoreState,
  classId: string,
): ClassScoreReport {
  const students = state.students
    .filter((student) => student.classId === classId && student.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
    .map((student) => studentScoreReport(state, student.id));

  const distribution = DISTRIBUTION_LABELS.map((label) => ({
    label,
    count: students.filter(
      (report) =>
        report.average !== null &&
        distributionLabel(report.average) === label,
    ).length,
  }));

  // Tiến độ nhập điểm tính trên toàn bộ danh sách lớp, kể cả học sinh đã nghỉ,
  // để khớp bảng điểm của lớp.
  const roster = state.students
    .filter((student) => student.classId === classId)
    .map((student) => studentScoreReport(state, student.id));
  const tests = state.tests
    .filter((test) => test.classId === classId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const progress: ScoreProgress[] = tests.map((test) => {
    const values = roster.map(
      (report) => report.rows.find((row) => row.test.id === test.id)?.value ?? null,
    );
    const scored = values.filter((value) => value !== null).length;
    return { test, scored, missing: values.length - scored };
  });

  /**
   * "Cần chú ý" theo quy tắc 3.1: trung bình dưới 5; hoặc bài gần nhất giảm từ
   * 2 điểm trở lên so với bài có điểm trước đó; hoặc từ 2 bài chưa có điểm.
   */
  const attention: ScoreAttention[] = [];
  for (const report of students) {
    const reasons: string[] = [];
    if (report.average !== null && report.average < 5)
      reasons.push(`Trung bình ${formatScoreDot(report.average)}, dưới 5`);
    if (report.latestDelta !== null && report.latestDelta <= -2)
      reasons.push(
        `Bài gần nhất giảm ${formatScoreDot(Math.abs(report.latestDelta))} điểm`,
      );
    const missing = report.rows.filter((row) => row.value === null).length;
    if (missing >= 2) reasons.push(`${missing} bài chưa có điểm`);
    if (reasons.length) attention.push({ student: report.student, reasons });
  }

  return { students, distribution, progress, attention };
}
