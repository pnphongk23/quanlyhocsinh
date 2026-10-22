import type {
  Comment,
  HomeworkKind,
  HomeworkLevel,
  HomeworkSection,
  PermissionGroup,
  Report,
  Session,
  StarLevel,
  StoreState,
  Student,
  Test,
} from "../types";
import { getStore } from "../store";
import { getSession } from "../auth/session";
import {
  can,
  canAccessStudent,
  isGuardian,
  linkedStudentIds,
  requirePermission,
} from "./access";
import { sessionNumber } from "./sessions";
import {
  HOMEWORK_KIND_LABELS,
  compareSessions,
  gradingSessionPlan,
  homeworkGradeLevel,
  homeworkSectionsFor,
  previousHomeworkSession,
} from "../homework";
import { starTemplate } from "../logic";
import {
  buildMonthlyStudentReport,
  buildStarSuggestion,
  type MonthlyStudentReport,
  type MonthlyStudentReportData,
} from "../reportModel";

/**
 * Repository ĐỌC cho role phụ huynh (màn phụ huynh, spec mục 5.2).
 *
 * Quy tắc:
 * - Chỉ role phụ huynh dùng; vai trò khác gọi sẽ bị từ chối.
 * - Chỉ trả dữ liệu của con được liên kết (`Member.studentIds`, qua
 *   `canAccessStudent`); học sinh khác bị từ chối, không trả rỗng lặng lẽ.
 * - Chỉ trả nội dung ĐÃ GỬI hoặc ĐÃ PHÁT HÀNH: phiếu buổi học `status: "sent"`,
 *   kết quả chấm BTVN khi phiếu buổi chấm đã gửi, báo cáo tháng `status: "published"`.
 *   Đề BTVN thì thấy ngay khi giáo viên lưu (spec mục 4).
 * - Nhóm quyền phụ huynh bị Admin tắt (Điểm danh, Điểm, Nhận xét và báo cáo) thì
 *   phần dữ liệu đó không trả về (null / rỗng), không lộ trung bình lớp (quy tắc 3.1).
 * - Không có hàm ghi nào trong file này: phụ huynh không có quyền ghi.
 */

export const GUARDIAN_PERMISSION_ERROR = "Bạn không có quyền thực hiện thao tác này.";
export const STUDENT_ACCESS_ERROR = "Bạn không có quyền truy cập học sinh này.";

function requireGuardian(group?: PermissionGroup): void {
  if (!isGuardian()) throw new Error(GUARDIAN_PERMISSION_ERROR);
  if (group) requirePermission(group, "read");
}

/** Con được liên kết; em khác (hoặc em không tồn tại) bị từ chối. */
function requireChild(studentId: string): Student {
  const student = childRecord(studentId);
  if (!student || !canAccessStudent(studentId))
    throw new Error(STUDENT_ACCESS_ERROR);
  return student;
}

function childRecord(studentId: string): Student | undefined {
  const state = getStore();
  const cached = state.students.find((item) => item.id === studentId);
  if (cached) return cached;
  const session = getSession();
  const membership = session?.me.memberships.find((item) => item.id === session.activeMembershipId && item.status === "active");
  const child = membership?.students?.find((item) => item.id === studentId);
  if (!child) return undefined;
  return { id: child.id, name: child.name, classId: child.class_id, parentPhone: "", enrolledAt: "0000-01-01", leftAt: null, status: "active" };
}

function classNameOf(state: StoreState, student: Student): string {
  const cached = state.classes.find((item) => item.id === student.classId)?.name;
  if (cached) return cached;
  const session = getSession();
  const membership = session?.me.memberships.find((item) => item.id === session.activeMembershipId && item.status === "active");
  return membership?.students?.find((item) => item.id === student.id)?.class_name ?? "";
}

/** Một con trong danh sách chuyển giữa các con (ảnh 15). */
export interface GuardianChild {
  student: Student;
  /** Tên lớp của con, để màn phụ huynh hiện "Lớp …". */
  className: string;
}

/** Các con được liên kết với membership phụ huynh đang dùng, sắp theo tên. */
export function listMyChildren(): GuardianChild[] {
  requireGuardian();
  const state = getStore();
  const linked = linkedStudentIds();
  const membership = getSession()?.me.memberships.find((item) => item.id === getSession()?.activeMembershipId && item.status === "active");
  const students = membership?.students !== undefined
    ? membership.students.map((summary) => childRecord(summary.id)).filter((student): student is Student => Boolean(student))
    : state.students.filter((student) => linked.has(student.id));
  return students
    .filter((student) => linked.has(student.id))
    .map((student) => ({ student, className: classNameOf(state, student) }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name, "vi"));
}

/** Kết quả chấm một phần BTVN buổi trước đi kèm phiếu buổi học. */
export interface ChildHomeworkResult {
  section: HomeworkSection;
  kind: HomeworkKind;
  kindLabel: string;
  /** null = "Chưa chấm" (giáo viên chưa chấm xong). */
  level: HomeworkLevel | null;
}

/** Phiếu buổi học phụ huynh nhận được (chỉ phiếu đã gửi). */
export interface ChildTicket {
  comment: Comment;
  session: Session;
  /** Số buổi trong lớp (bỏ buổi đã hủy), vd. "Buổi 18". */
  sessionNumber: number;
  date: string;
  stars: StarLevel;
  /** Câu mẫu cố định của mức sao (spec mục 4). */
  template: string;
  note: string;
  sentAt: string | null;
  /** Kết quả chấm BTVN buổi trước đi kèm phiếu. */
  homework: {
    session: Session | null;
    sessionNumber: number | null;
    sections: ChildHomeworkResult[];
  };
}

function buildTicket(state: StoreState, comment: Comment): ChildTicket | null {
  if (comment.status !== "sent" || comment.stars === null) return null;
  const session = state.sessions.find((item) => item.id === comment.sessionId);
  if (!session) return null;
  const number = sessionNumber(session);
  if (number === null) return null;
  const giving = previousHomeworkSession(state.sessions, session.id);
  const sections = giving
    ? homeworkSectionsFor(state, giving.id).map((section) => ({
        section,
        kind: section.kind,
        kindLabel: HOMEWORK_KIND_LABELS[section.kind],
        level: homeworkGradeLevel(state, section.id, comment.studentId),
      }))
    : [];
  return {
    comment,
    session,
    sessionNumber: number,
    date: session.date,
    stars: comment.stars,
    template: starTemplate(comment.stars) ?? "",
    note: comment.note,
    sentAt: comment.sentAt,
    homework: {
      session: giving,
      sessionNumber: giving ? sessionNumber(giving) : null,
      sections,
    },
  };
}

/** Phiếu đã gửi của con, mới nhất trước (màn Nhận xét của phụ huynh, ảnh 14). */
export function listChildTickets(studentId: string): ChildTicket[] {
  requireGuardian("comments_reports");
  const student = requireChild(studentId);
  const state = getStore();
  return state.comments
    .filter(
      (comment) =>
        comment.studentId === student.id && comment.status === "sent",
    )
    .map((comment) => buildTicket(state, comment))
    .filter((ticket): ticket is ChildTicket => ticket !== null)
    .sort((a, b) => compareSessions(b.session, a.session));
}

/**
 * Phiếu của con ở ĐÚNG một buổi (ảnh 08). Chưa gửi hoặc không có phiếu → null:
 * phụ huynh không thấy bản nháp. Sửa phiếu sau khi gửi thì phụ huynh thấy ngay.
 */
export function getChildTicket(
  studentId: string,
  sessionId: string,
): ChildTicket | null {
  requireGuardian("comments_reports");
  const student = requireChild(studentId);
  const state = getStore();
  const comment = state.comments.find(
    (item) =>
      item.studentId === student.id &&
      item.sessionId === sessionId &&
      item.status === "sent",
  );
  return comment ? buildTicket(state, comment) : null;
}

/** Buổi chấm BTVN: bình thường / bị chuyển do hủy / chưa có buổi chấm. */
export interface ChildHomeworkGrading {
  /** exists = có buổi chấm; moved = buổi chấm bị chuyển vì buổi trước bị hủy; none = chưa có. */
  state: "exists" | "moved" | "none";
  session: Session | null;
  sessionNumber: number | null;
  /** Buổi bị hủy nằm giữa buổi giao bài và buổi chấm; không có số buổi, hiện theo ngày (vd. "Buổi bù · 16/10 · Đã huỷ"). */
  cancelled: Array<{ session: Session }>;
}

/** Một phần BTVN trong bài tập của con. */
export interface ChildHomeworkSection {
  section: HomeworkSection;
  kind: HomeworkKind;
  kindLabel: string;
  /** Phiếu của buổi chấm đã gửi: kết quả chấm được hiện cho phụ huynh. */
  graded: boolean;
  /** null = "Chưa chấm" (chưa chấm xong, hoặc phiếu buổi chấm chưa gửi). */
  level: HomeworkLevel | null;
}

/** BTVN của con ở một buổi giao bài (ảnh 09, 34, 35). */
export interface ChildHomework {
  session: Session;
  sessionNumber: number;
  date: string;
  sections: ChildHomeworkSection[];
  grading: ChildHomeworkGrading;
}

/**
 * BTVN con nhận được. Đề bài hiện NGAY khi giáo viên lưu, chưa cần gửi phiếu;
 * kết quả chấm chỉ hiện khi phiếu của buổi chấm đã gửi (`graded`).
 *
 * - Không truyền `sessionId`: mọi buổi có giao BTVN cho con, mới nhất trước.
 * - Truyền `sessionId`: chỉ buổi đó; không có BTVN / không thuộc con → [].
 */
export function getChildHomework(
  studentId: string,
  sessionId?: string,
): ChildHomework[] {
  requireGuardian("comments_reports");
  const student = requireChild(studentId);
  const state = getStore();
  return state.sessions
    .filter((session) => session.classId === student.classId)
    .filter((session) => session.date >= student.enrolledAt)
    .filter((session) => !student.leftAt || session.date <= student.leftAt)
    .filter((session) => !sessionId || session.id === sessionId)
    .filter((session) => homeworkSectionsFor(state, session.id).length > 0)
    .sort((a, b) => compareSessions(b, a))
    .flatMap((session) => {
      const number = sessionNumber(session);
      if (number === null) return [];
      const plan = gradingSessionPlan(state.sessions, session.id);
      const ticketSent = plan.session
        ? state.comments.some(
            (comment) =>
              comment.sessionId === plan.session!.id &&
              comment.studentId === student.id &&
              comment.status === "sent",
          )
        : false;
      const sections = homeworkSectionsFor(state, session.id).map(
        (section) => ({
          section,
          kind: section.kind,
          kindLabel: HOMEWORK_KIND_LABELS[section.kind],
          graded: ticketSent,
          level: ticketSent
            ? homeworkGradeLevel(state, section.id, student.id)
            : null,
        }),
      );
      return [{
        session,
        sessionNumber: number,
        date: session.date,
        sections,
        grading: {
          state: !plan.session
            ? "none"
            : plan.cancelled.length
              ? "moved"
              : "exists",
          session: plan.session,
          sessionNumber: plan.session ? sessionNumber(plan.session) : null,
          cancelled: plan.cancelled.map((item) => ({ session: item })),
        },
      } satisfies ChildHomework];
    });
}

export interface ChildOverviewAttendance {
  /** Số buổi có mặt hoặc muộn ("16/18 buổi"). */
  attended: number;
  /** Số buổi đã diễn ra trong tháng của em. */
  total: number;
  late: number;
  excused: number;
  absent: number;
}

export interface ChildOverviewScore {
  test: Test;
  /** Điểm đã có (null không bao giờ nằm trong danh sách này). */
  value: number;
  date: string;
}

/** Tổng quan của con trong một tháng (ảnh 15). */
export interface ChildOverview {
  student: Student;
  className: string;
  month: string;
  /** null khi role phụ huynh bị tắt nhóm Buổi học và điểm danh. */
  attendance: ChildOverviewAttendance | null;
  /** Phiếu đã gửi gần nhất (mức sao + câu mẫu + ghi chú); null khi chưa có. */
  latestComment: ChildTicket | null;
  /** Điểm gần đây, mới nhất trước (chỉ bài đã có điểm). */
  recentScores: ChildOverviewScore[];
  /**
   * "Điều cô muốn chia sẻ" ở ảnh 15: lấy từ `Report.generalComment` (nhận xét
   * chung) của báo cáo ĐÃ PHÁT HÀNH mới nhất của con (tháng mới nhất, rồi
   * `publishedAt` mới nhất). Chưa có báo cáo phát hành hoặc nhận xét chung để
   * trống → null (UI ẩn khối). Cũng null khi role phụ huynh bị tắt nhóm
   * Nhận xét và báo cáo.
   */
  teacherNote: string | null;
}

/** Nhận xét chung của báo cáo đã phát hành MỚI NHẤT của con (null nếu chưa có). */
function latestPublishedComment(
  state: StoreState,
  student: Student,
): string | null {
  const latest = state.reports
    .filter(
      (report) =>
        report.studentId === student.id && report.status === "published",
    )
    .sort(
      (a, b) =>
        b.month.localeCompare(a.month) ||
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    )[0];
  const note = latest?.generalComment.trim() ?? "";
  return note ? note : null;
}

/** Dữ liệu thô của lớp con, đã lọc theo học sinh (không lẫn em khác). */
function studentReportData(
  state: StoreState,
  student: Student,
  generalComment = "",
): MonthlyStudentReportData {
  const sessions = state.sessions.filter(
    (session) => session.classId === student.classId,
  );
  const sessionIds = new Set(sessions.map((session) => session.id));
  const tests = state.tests.filter(
    (test) => test.classId === student.classId && test.archived !== true,
  );
  return {
    sessions,
    attendance: state.attendance.filter(
      (row) => row.studentId === student.id && sessionIds.has(row.sessionId),
    ),
    tests,
    scores: state.scores.filter((score) => score.studentId === student.id),
    comments: state.comments.filter(
      (comment) => comment.studentId === student.id,
    ),
    homeworkSections: state.homeworkSections.filter((section) =>
      sessionIds.has(section.sessionId),
    ),
    homeworkGrades: state.homeworkGrades.filter(
      (grade) => grade.studentId === student.id,
    ),
    generalComment,
  };
}

/**
 * Tổng quan của con trong tháng: chuyên cần, nhận xét mới nhất theo sao, điểm gần
 * đây. Trả null khi em chưa vào lớp hoặc đã rời lớp trước tháng đó.
 */
export function getChildOverview(
  studentId: string,
  month: string,
): ChildOverview | null {
  requireGuardian();
  const student = requireChild(studentId);
  const state = getStore();
  const canAttendance = can("sessions_attendance", "read");
  const canScores = can("scores", "read");
  const canComments = can("comments_reports", "read");
  const data = studentReportData(state, student);
  const current = buildMonthlyStudentReport(student, month, data);
  if (!current) return null;
  const recentScores: ChildOverviewScore[] = canScores
    ? state.tests
        .filter((test) => test.classId === student.classId && !test.archived)
        .flatMap((test) => {
          const score = state.scores.find(
            (item) =>
              item.testId === test.id && item.studentId === student.id,
          );
          return score && score.value !== null
            ? [{ test, value: score.value, date: test.date }]
            : [];
        })
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const latestComment = canComments
    ? (listChildTickets(student.id)[0] ?? null)
    : null;
  const teacherNote = canComments
    ? latestPublishedComment(state, student)
    : null;
  return {
    student,
    className: classNameOf(state, student),
    month,
    attendance: canAttendance
      ? {
          attended: current.attendanceCount,
          total: current.sessions.length,
          late: current.lateCount,
          excused: current.excusedCount,
          absent: current.absentCount,
        }
      : null,
    latestComment,
    recentScores,
    teacherNote,
  };
}

/** Báo cáo tháng đã phát hành của con. */
export interface ChildMonthlyReport {
  report: Report;
  body: MonthlyStudentReport;
  /** Điểm có cập nhật sau khi phát hành, cần phát hành lại (spec mục 4). */
  needsRepublish: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function decodeReportSnapshot(value: unknown, student: Student, month: string): MonthlyStudentReport | null {
  if (!isRecord(value) || !isRecord(value.attendance) || !isRecord(value.stars) || !Array.isArray(value.tests) || !Array.isArray(value.homework)) return null;
  const count = (object: Record<string, unknown>, key: string) => typeof object[key] === "number" && Number.isInteger(object[key]) && (object[key] as number) >= 0;
  if (!["present", "late", "excused", "absent", "held_sessions"].every((key) => count(value.attendance as Record<string, unknown>, key))) return null;
  if (!["three", "two", "one"].every((key) => count(value.stars as Record<string, unknown>, key))) return null;
  if (typeof value.general_comment !== "string" || typeof value.ready !== "boolean") return null;
  const tests = value.tests.map((item) => isRecord(item) && typeof item.test_id === "string" && typeof item.name === "string" && typeof item.date === "string" && typeof item.max === "number" && Number.isFinite(item.max) && (item.value === null || (typeof item.value === "number" && Number.isFinite(item.value))));
  if (tests.some((valid) => !valid)) return null;
  const validKinds = new Set<HomeworkKind>(["vocabulary", "reading", "speaking", "exercise"]);
  const homework = value.homework.map((item) => isRecord(item) && validKinds.has(item.kind as HomeworkKind) && ["excellent", "done", "not_done"].every((key) => count(item, key)));
  if (homework.some((valid) => !valid)) return null;

  const attendance = value.attendance as Record<string, number>;
  const stars = value.stars as Record<string, number>;
  const sessions: Session[] = Array.from({ length: attendance.held_sessions }, (_, index) => ({ id: `published:${student.id}:${month}:${index}`, classId: student.classId, date: `${month}-01`, origin: "recurring", status: "held" }));
  const attendanceRows: StoreState["attendance"] = [];
  for (const [status, amount] of [["present", attendance.present], ["late", attendance.late], ["excused", attendance.excused], ["absent", attendance.absent]] as const) {
    for (let index = 0; index < amount; index++) attendanceRows.push({ id: `published:${student.id}:${month}:${status}:${index}`, sessionId: sessions[index % Math.max(1, sessions.length)]?.id ?? "", studentId: student.id, status, note: "", lateAt: null });
  }
  const testsWithScores = value.tests.map((item) => {
    const test = item as { test_id: string; name: string; date: string; max: number; value: number | null };
    const model: Test = { id: test.test_id, classId: student.classId, name: test.name, date: test.date, max: test.max, archived: false };
    return { test: model, score: test.value === null ? undefined : { id: `${test.test_id}:${student.id}`, testId: test.test_id, studentId: student.id, value: test.value } };
  });
  const homeworkRows = (value.homework as Array<{ kind: HomeworkKind; excellent: number; done: number; not_done: number }>).map((item) => ({ ...item, label: HOMEWORK_KIND_LABELS[item.kind], total: item.excellent + item.done + item.not_done }));
  const byStars = { 1: stars.one, 2: stars.two, 3: stars.three } as Record<StarLevel, number>;
  const ready = value.ready;
  return {
    student, month, sessions, attendance: attendanceRows, tests: testsWithScores,
    gradedTestCount: testsWithScores.filter(({ score }) => score?.value != null).length,
    attendanceCount: attendance.present + attendance.late, lateCount: attendance.late, excusedCount: attendance.excused, absentCount: attendance.absent,
    stars: { ticketCount: stars.one + stars.two + stars.three, byStars }, homework: homeworkRows,
    generalComment: value.general_comment, suggestion: buildStarSuggestion(byStars), ready, missing: ready ? [] : ["Báo cáo chưa đủ dữ liệu"],
  };
}

/**
 * Báo cáo tháng mà phụ huynh xem được: CHỈ khi giáo viên đã phát hành.
 * Chưa phát hành (hoặc không có báo cáo) → null. Nội dung dựng bằng
 * `buildMonthlyStudentReport` + nhận xét chung đã lưu ở `Report.generalComment`.
 */
export function getChildMonthlyReport(
  studentId: string,
  month: string,
): ChildMonthlyReport | null {
  requireGuardian("comments_reports");
  const student = requireChild(studentId);
  const state = getStore();
  const publications = state.reportPublications
    .filter((item) => item.student_id === student.id && item.month === month)
    .sort((a, b) => b.publication_no - a.publication_no);
  if (publications.length) {
    const publication = publications[0];
    let body: MonthlyStudentReport | null;
    try { body = decodeReportSnapshot(publication.snapshot, student, month); }
    catch { body = null; }
    if (!body) { console.warn("Unable to decode a published guardian report snapshot."); return null; }
    const report: Report = { id: publication.report_id, classId: publication.class_id, studentId: publication.student_id, month: publication.month, status: "published", generalComment: body.generalComment, needsRepublish: false, publishedAt: publication.published_at };
    return { report, body, needsRepublish: false };
  }
  // Compatibility for old local caches created before report_publication was cached.
  const report = state.reports.find((item) => item.studentId === student.id && item.month === month && item.status === "published");
  if (!report) return null;
  const body = buildMonthlyStudentReport(
    student,
    month,
    studentReportData(state, student, report.generalComment),
  );
  if (!body) return null;
  return { report, body, needsRepublish: report.needsRepublish };
}
