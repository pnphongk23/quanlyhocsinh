import {
  HOMEWORK_KINDS,
  HOMEWORK_KIND_LABELS,
  gradingSessionFor,
} from "../../data/homework";
import { averageScore } from "../../data/logic";
import type {
  Attendance,
  Comment,
  HomeworkGrade,
  HomeworkKind,
  HomeworkLevel,
  HomeworkSection,
  Score,
  Session,
  StarLevel,
  Student,
  Test,
} from "../../data/types";

/** Dữ liệu thô của MỘT lớp dùng để dựng báo cáo tháng của một em. */
export interface MonthlyStudentReportData {
  sessions: Session[];
  attendance: Attendance[];
  tests: Test[];
  scores: Score[];
  /** Phiếu buổi học của lớp; chỉ phiếu `status: "sent"` mới được tính. */
  comments: Comment[];
  /** Các phần BTVN của lớp. */
  homeworkSections: HomeworkSection[];
  /** Kết quả chấm BTVN của lớp. */
  homeworkGrades: HomeworkGrade[];
  /** Nhận xét chung của tháng (lưu ở `Report.generalComment`). */
  generalComment: string;
}

/** Số buổi theo từng mức sao, tính trên phiếu ĐÃ GỬI trong tháng. */
export interface MonthlyStarTally {
  /** Số buổi có phiếu đã gửi (mọi mức sao). */
  ticketCount: number;
  byStars: Record<StarLevel, number>;
}

/** Kết quả BTVN của một loại phần trong tháng (chỉ lượt đã gửi + đã chấm). */
export interface MonthlyHomeworkTally {
  kind: HomeworkKind;
  /** Nhãn tiếng Việt của loại phần (Luyện từ vựng / Luyện đọc / Luyện nói / Bài tập). */
  label: string;
  excellent: number;
  done: number;
  not_done: number;
  /** Số lượt có kết quả được tính = excellent + done + not_done. */
  total: number;
}

export interface MonthlyStudentReport {
  student: Student;
  month: string;
  /** Buổi đã diễn ra trong tháng, trong khoảng ngày vào lớp..ngày rời lớp. */
  sessions: Session[];
  attendance: Attendance[];
  tests: Array<{ test: Test; score: Score | undefined }>;
  /** Trung bình cộng các bài có điểm; null khi chưa có điểm nào. */
  average: number | null;
  /** Số bài kiểm tra đã có điểm (tử số của "n bài kiểm tra"). */
  gradedTestCount: number;
  /** Số buổi có mặt hoặc muộn. */
  attendanceCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  stars: MonthlyStarTally;
  /** Kết quả BTVN theo từng loại phần, theo thứ tự Luyện từ vựng → Bài tập. */
  homework: MonthlyHomeworkTally[];
  generalComment: string;
  /** Câu gợi ý nhận xét chung theo số buổi 3/2/1 sao; null khi chưa có phiếu nào. */
  suggestion: string | null;
  ready: boolean;
  missing: string[];
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Câu gợi ý nhận xét chung của tháng, đúng nguyên văn ảnh 13/26:
 * "Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có 5 buổi 3 sao,
 * 2 buổi 2 sao, 1 buổi 1 sao."
 * Chưa có phiếu đã gửi nào trong tháng thì không gợi ý (null).
 */
export function buildStarSuggestion(
  byStars: Record<StarLevel, number>,
): string | null {
  const total = byStars[1] + byStars[2] + byStars[3];
  if (!total) return null;
  return `Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có ${byStars[3]} buổi 3 sao, ${byStars[2]} buổi 2 sao, ${byStars[1]} buổi 1 sao.`;
}

function monthBounds(month: string): { start: string; end: string } {
  const start = `${month}-01`;
  const end = `${month}-31`;
  return { start, end };
}

/**
 * Dựng nội dung báo cáo tháng của một em (spec mục 4 "Nhận xét và báo cáo"):
 * chuyên cần, điểm từng bài + trung bình, số buổi đạt 3/2/1 sao, kết quả BTVN
 * theo từng loại phần và nhận xét chung.
 *
 * - `Chưa có điểm` (value null) không tính vào trung bình nhưng vẫn là dữ liệu
 *   còn thiếu để phát hành báo cáo.
 * - Chỉ phiếu buổi học đã gửi mới vào phần sao.
 * - BTVN chỉ tính phần giao trong tháng đã được chấm VÀ phiếu của buổi chấm đã
 *   gửi cho em đó; BTVN không quy ra điểm và không vào trung bình.
 * - Trả null khi em chưa vào lớp hoặc đã rời lớp trước tháng báo cáo.
 */
export function buildMonthlyStudentReport(
  student: Student,
  month: string,
  data: MonthlyStudentReportData,
): MonthlyStudentReport | null {
  if (!MONTH_PATTERN.test(month)) return null;
  const { start, end } = monthBounds(month);
  if (student.enrolledAt > end || (student.leftAt && student.leftAt < start))
    return null;
  const inStudentRange = (date: string) =>
    date >= student.enrolledAt && (!student.leftAt || date <= student.leftAt);

  const sessions = data.sessions
    .filter(
      (session) =>
        session.classId === student.classId &&
        session.status === "held" &&
        session.date >= start &&
        session.date <= end &&
        inStudentRange(session.date),
    )
    .sort((a, b) =>
      `${a.date} ${a.time ?? "00:00"}`.localeCompare(
        `${b.date} ${b.time ?? "00:00"}`,
      ),
    );
  const sessionIds = new Set(sessions.map((session) => session.id));
  const attendance = data.attendance.filter(
    (row) => row.studentId === student.id && sessionIds.has(row.sessionId),
  );

  const tests = data.tests
    .filter(
      (test) =>
        test.classId === student.classId &&
        test.date >= start &&
        test.date <= end &&
        inStudentRange(test.date),
    )
    .map((test) => ({
      test,
      score: data.scores.find(
        (score) => score.studentId === student.id && score.testId === test.id,
      ),
    }));

  const sessionById = new Map(data.sessions.map((item) => [item.id, item]));
  const sentComments = data.comments.filter(
    (comment) => comment.studentId === student.id && comment.status === "sent",
  );
  // Buổi đã gửi phiếu cho em — dùng để biết kết quả BTVN buổi chấm đã lộ ra chưa.
  const sentSessionIds = new Set(
    sentComments.map((comment) => comment.sessionId),
  );

  const byStars: Record<StarLevel, number> = { 1: 0, 2: 0, 3: 0 };
  let ticketCount = 0;
  for (const comment of sentComments) {
    const session = sessionById.get(comment.sessionId);
    if (!session) continue;
    if (session.date < start || session.date > end) continue;
    if (comment.stars === null) continue;
    byStars[comment.stars] += 1;
    ticketCount += 1;
  }

  const gradeOf = (sectionId: string): HomeworkLevel | null =>
    data.homeworkGrades.find(
      (grade) =>
        grade.sectionId === sectionId && grade.studentId === student.id,
    )?.level ?? null;
  const tallies = new Map<HomeworkKind, MonthlyHomeworkTally>();
  for (const section of data.homeworkSections) {
    const giving = sessionById.get(section.sessionId);
    if (!giving || giving.classId !== student.classId) continue;
    if (giving.date < start || giving.date > end) continue;
    if (!inStudentRange(giving.date)) continue;
    // Chỉ hiện kết quả chấm khi phiếu của buổi chấm đã gửi cho em.
    const grading = gradingSessionFor(data.sessions, section.sessionId);
    if (!grading || !sentSessionIds.has(grading.id)) continue;
    const level = gradeOf(section.id);
    if (level === null) continue;
    const tally =
      tallies.get(section.kind) ??
      ({
        kind: section.kind,
        label: HOMEWORK_KIND_LABELS[section.kind],
        excellent: 0,
        done: 0,
        not_done: 0,
        total: 0,
      } satisfies MonthlyHomeworkTally);
    tally[level] += 1;
    tally.total += 1;
    tallies.set(section.kind, tally);
  }
  const homework = HOMEWORK_KINDS.flatMap((kind) => {
    const tally = tallies.get(kind);
    return tally ? [tally] : [];
  });

  const missing: string[] = [];
  if (sessions.length && attendance.length < sessions.length)
    missing.push("Thiếu điểm danh");
  const missingScores = tests.filter(
    ({ score }) => !score || score.value === null,
  );
  for (const { test } of missingScores) missing.push(`Thiếu điểm ${test.name}`);
  const generalComment = data.generalComment.trim();
  if (!generalComment) missing.push("Thiếu nhận xét chung");

  const average = averageScore(tests.flatMap(({ score }) => (score ? [score] : [])));
  const countStatus = (status: Attendance["status"]) =>
    attendance.filter((row) => row.status === status).length;

  return {
    student,
    month,
    sessions,
    attendance,
    tests,
    average,
    gradedTestCount: tests.filter(({ score }) => score?.value != null).length,
    attendanceCount: countStatus("present") + countStatus("late"),
    lateCount: countStatus("late"),
    excusedCount: countStatus("excused"),
    absentCount: countStatus("absent"),
    stars: { ticketCount, byStars },
    homework,
    generalComment,
    suggestion: buildStarSuggestion(byStars),
    ready: missing.length === 0,
    missing,
  };
}
