import {
  HOMEWORK_KINDS,
  HOMEWORK_KIND_LABELS,
  gradingSessionFor,
} from "./homework";
import { rangeLabels, type RangeLabels } from "./reportRange";
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
} from "./types";

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
  unit: "month" | "range" = "month",
): string | null {
  const total = byStars[1] + byStars[2] + byStars[3];
  if (!total) return null;
  const counts = `${byStars[3]} buổi 3 sao, ${byStars[2]} buổi 2 sao, ${byStars[1]} buổi 1 sao`;
  return unit === "range"
    ? `Gợi ý theo số buổi 3/2/1 sao của đợt: Trong đợt này con có ${counts}.`
    : `Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có ${counts}.`;
}

function monthBounds(month: string): { start: string; end: string } {
  const start = `${month}-01`;
  const end = `${month}-31`;
  return { start, end };
}

/**
 * Dựng nội dung báo cáo tháng của một em (spec mục 4 "Nhận xét và báo cáo"):
 * chuyên cần, điểm từng bài, số buổi đạt 3/2/1 sao, kết quả BTVN theo từng loại
 * phần và nhận xét chung.
 *
 * - `Chưa có điểm` (value null) là dữ liệu còn thiếu để phát hành báo cáo.
 * - Chỉ phiếu buổi học đã gửi mới vào phần sao.
 * - BTVN chỉ tính phần giao trong tháng đã được chấm VÀ phiếu của buổi chấm đã
 *   gửi cho em đó; BTVN không quy ra điểm.
 * - Trả null khi em chưa vào lớp hoặc đã rời lớp trước tháng báo cáo.
 */
export function buildMonthlyStudentReport(
  student: Student,
  month: string,
  data: MonthlyStudentReportData,
): MonthlyStudentReport | null {
  if (!MONTH_PATTERN.test(month)) return null;
  const { start, end } = monthBounds(month);
  const core = buildPeriodReport(
    student,
    {
      start,
      end,
      includeSession: (session) =>
        session.status === "held" && session.date >= start && session.date <= end,
      suggestionUnit: "month",
    },
    data,
  );
  return core && { ...core, month };
}

/** Phạm vi một báo cáo: khoảng ngày, buổi được tính và cách gọi trong câu gợi ý. */
interface ReportPeriod {
  start: string;
  end: string;
  includeSession: (session: Session) => boolean;
  suggestionUnit: "month" | "range";
}

/** Nội dung báo cáo của một em trong một phạm vi (tháng hoặc khoảng buổi). */
export type PeriodStudentReport = Omit<MonthlyStudentReport, "month">;

/**
 * Báo cáo theo khoảng buổi: tính trong các buổi chưa hủy từ mốc đầu đến mốc cuối
 * (so theo ngày + giờ), điểm theo ngày của khoảng. Trả null khi em chưa vào lớp
 * sau buổi cuối hoặc đã rời lớp trước buổi đầu.
 */
export function buildRangeStudentReport(
  student: Student,
  range: { fromKey: string; toKey: string },
  data: MonthlyStudentReportData,
): PeriodStudentReport | null {
  return buildPeriodReport(
    student,
    {
      start: range.fromKey.slice(0, 10),
      end: range.toKey.slice(0, 10),
      includeSession: (session) => {
        const key = `${session.date} ${session.time ?? "00:00"}`;
        return session.status !== "cancelled" && key >= range.fromKey && key <= range.toKey;
      },
      suggestionUnit: "range",
    },
    data,
  );
}

function buildPeriodReport(
  student: Student,
  period: ReportPeriod,
  data: MonthlyStudentReportData,
): PeriodStudentReport | null {
  const { start, end } = period;
  if (student.enrolledAt > end || (student.leftAt && student.leftAt < start))
    return null;
  const inStudentRange = (date: string) =>
    date >= student.enrolledAt && (!student.leftAt || date <= student.leftAt);

  const sessions = data.sessions
    .filter(
      (session) =>
        session.classId === student.classId &&
        period.includeSession(session) &&
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
        test.archived !== true &&
        test.date >= start &&
        test.date <= end &&
        (!student.leftAt || test.date <= student.leftAt) &&
        (test.date >= student.enrolledAt ||
          data.scores.some(
            (score) =>
              score.studentId === student.id &&
              score.testId === test.id &&
              score.value !== null,
          )),
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
    if (!sessionIds.has(session.id)) continue;
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
    if (!sessionIds.has(giving.id)) continue;
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

  const countStatus = (status: Attendance["status"]) =>
    attendance.filter((row) => row.status === status).length;

  return {
    student,
    sessions,
    attendance,
    tests,
    gradedTestCount: tests.filter(({ score }) => score?.value != null).length,
    attendanceCount: countStatus("present") + countStatus("late"),
    lateCount: countStatus("late"),
    excusedCount: countStatus("excused"),
    absentCount: countStatus("absent"),
    stars: { ticketCount, byStars },
    homework,
    generalComment,
    suggestion: buildStarSuggestion(byStars, period.suggestionUnit),
    ready: missing.length === 0,
    missing,
  };
}

/** Báo cáo dựng từ bản xem trước hoặc bản chụp đã phát hành của máy chủ, kèm nhãn khoảng. */
export interface ServerReport {
  report: PeriodStudentReport;
  range: RangeLabels;
  month: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isCount = (object: Record<string, unknown>, key: string) =>
  typeof object[key] === "number" && Number.isInteger(object[key]) && (object[key] as number) >= 0;

function rangeFromServer(value: unknown, month: string): RangeLabels {
  if (
    isRecord(value) &&
    typeof value.from_key === "string" &&
    typeof value.to_key === "string"
  ) {
    const number = (key: string) => (typeof value[key] === "number" ? (value[key] as number) : null);
    return rangeLabels({ fromKey: value.from_key, toKey: value.to_key, fromNumber: number("from_number"), toNumber: number("to_number") });
  }
  // Bản chụp phát hành trước khi có đợt chỉ có tháng.
  const label = `Tháng ${Number(month.slice(5, 7))}`;
  return { label, sessionsLabel: "", datesLabel: label };
}

/**
 * Giải mã bản xem trước / bản chụp của máy chủ thành nội dung báo cáo của một em.
 * Trả null khi dữ liệu sai hình dạng (không đoán số liệu thiếu).
 */
export function decodeServerReport(value: unknown, student: Student, key: string): ServerReport | null {
  if (!isRecord(value) || !isRecord(value.attendance) || !isRecord(value.stars) || !Array.isArray(value.tests) || !Array.isArray(value.homework)) return null;
  const attendance = value.attendance, stars = value.stars;
  if (!["present", "late", "excused", "absent", "held_sessions"].every((name) => isCount(attendance, name))) return null;
  if (!["three", "two", "one"].every((name) => isCount(stars, name))) return null;
  if (typeof value.general_comment !== "string" || typeof value.ready !== "boolean") return null;
  const validTest = value.tests.every((item) => isRecord(item) && typeof item.test_id === "string" && typeof item.name === "string" && typeof item.date === "string" && typeof item.max === "number" && Number.isFinite(item.max) && (item.value === null || (typeof item.value === "number" && Number.isFinite(item.value))));
  if (!validTest) return null;
  const kinds = new Set<HomeworkKind>(HOMEWORK_KINDS);
  const validHomework = value.homework.every((item) => isRecord(item) && kinds.has(item.kind as HomeworkKind) && ["excellent", "done", "not_done"].every((name) => isCount(item, name)));
  if (!validHomework) return null;

  const month = typeof value.month === "string" ? value.month : "";
  const counts = attendance as Record<string, number>;
  const starCounts = stars as Record<string, number>;
  const sessions: Session[] = Array.from({ length: counts.held_sessions }, (_, index) => ({ id: `${key}:session:${index}`, classId: student.classId, date: month ? `${month}-01` : "", origin: "recurring", status: "held" }));
  const attendanceRows: Attendance[] = [];
  for (const [status, amount] of [["present", counts.present], ["late", counts.late], ["excused", counts.excused], ["absent", counts.absent]] as const) {
    for (let index = 0; index < amount; index++) attendanceRows.push({ id: `${key}:${status}:${index}`, sessionId: sessions[index % Math.max(1, sessions.length)]?.id ?? "", studentId: student.id, status, note: "", lateAt: null });
  }
  const tests = (value.tests as Array<{ test_id: string; name: string; date: string; max: number; value: number | null }>).map((item) => ({
    test: { id: item.test_id, classId: student.classId, name: item.name, date: item.date, max: item.max, archived: false } as Test,
    score: item.value === null ? undefined : { id: `${item.test_id}:${student.id}`, testId: item.test_id, studentId: student.id, value: item.value } as Score,
  }));
  const homework = (value.homework as Array<{ kind: HomeworkKind; excellent: number; done: number; not_done: number }>)
    .map((item) => ({ ...item, label: HOMEWORK_KIND_LABELS[item.kind], total: item.excellent + item.done + item.not_done }))
    .sort((a, b) => HOMEWORK_KINDS.indexOf(a.kind) - HOMEWORK_KINDS.indexOf(b.kind));
  const byStars = { 1: starCounts.one, 2: starCounts.two, 3: starCounts.three } as Record<StarLevel, number>;
  const ready = value.ready;
  return {
    month,
    range: rangeFromServer(value.range, month),
    report: {
      student, sessions, attendance: attendanceRows, tests,
      gradedTestCount: tests.filter(({ score }) => score?.value != null).length,
      attendanceCount: counts.present + counts.late, lateCount: counts.late, excusedCount: counts.excused, absentCount: counts.absent,
      stars: { ticketCount: starCounts.one + starCounts.two + starCounts.three, byStars }, homework,
      generalComment: value.general_comment.trim(), suggestion: buildStarSuggestion(byStars, "range"), ready, missing: ready ? [] : ["Báo cáo chưa đủ dữ liệu"],
    },
  };
}
