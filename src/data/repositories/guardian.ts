import type {
  Comment,
  HomeworkKind,
  HomeworkLevel,
  HomeworkSection,
  PermissionGroup,
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
import { defaultSlipComment } from "../slip";
import {
  buildMonthlyStudentReport,
  decodeServerReport,
  type MonthlyStudentReportData,
  type PeriodStudentReport,
} from "../reportModel";
import { rangeLabels, type RangeLabels } from "../reportRange";
import { ApiError } from "../api/client";
import { api } from "../sync";
import type { ApiStudentReportItem } from "../api/types";

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
    /** Vị trí buổi dùng nội bộ khi cần sắp xếp. */
  sessionNumber: number;
  date: string;
  stars: StarLevel;
  scale: 3 | 5;
  /** Nội dung hiệu lực: câu tùy chỉnh hoặc câu mặc định theo sao. */
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
      scale: comment.scale ?? 3,
      template: comment.scale === 5
        ? comment.comment ?? defaultSlipComment(comment.stars)
        : starTemplate(comment.stars) ?? "",
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
    /** Buổi bị hủy nằm giữa buổi giao bài và buổi chấm; dùng ngày để nhận diện. */
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

/** Một báo cáo đã phát hành trong danh sách của con. */
export interface ChildReportItem {
  id: string;
  batchId: string;
  month: string;
  /** Số lần phát hành gần nhất; bản mới nhất mà phụ huynh mở. */
  publicationNo: number;
  publishedAt: string | null;
  /** Điểm có cập nhật sau lần phát hành gần nhất. */
  needsRepublish: boolean;
  range: RangeLabels;
}

export interface ChildReportPage {
  items: ChildReportItem[];
  /** Con trỏ do máy chủ trả; null khi hết danh sách. */
  nextCursor: string | null;
}

/** Báo cáo đã phát hành mà phụ huynh đang mở. */
export interface ChildReport {
  id: string;
  publicationNo: number;
  publishedAt: string | null;
  range: RangeLabels;
  body: PeriodStudentReport;
  /** Điểm có cập nhật sau khi phát hành (spec mục 4), theo bản đồng bộ trên máy. */
  needsRepublish: boolean;
}

function guardianErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError && (cause.status === 403 || cause.status === 404)) return GUARDIAN_PERMISSION_ERROR;
  if (cause instanceof ApiError) return fallback;
  if (cause instanceof TypeError || (typeof DOMException !== "undefined" && cause instanceof DOMException))
    return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

async function remote<T>(fallback: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    throw new Error(guardianErrorMessage(cause, fallback));
  }
}

/**
 * Danh sách báo cáo ĐÃ phát hành của con theo khoảng buổi, đợt kết thúc muộn
 * nhất trước (`GET /students/:id/reports`). Phân trang bằng `next_cursor` của máy
 * chủ; bản nháp không bao giờ hiện cho phụ huynh.
 */
export async function listChildReports(studentId: string, cursor?: string): Promise<ChildReportPage> {
  requireGuardian("comments_reports");
  const student = requireChild(studentId);
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Xem báo cáo cần kết nối mạng.");
  const page = await remote("Không đọc được báo cáo của con.", () =>
    api.request(`GET /students/${student.id}/reports` as never, { query: cursor ? { cursor } : undefined } as never) as Promise<{ items: ApiStudentReportItem[]; next_cursor: string | null }>,
  );
  const items = page.items
    .filter((item) => item.status === "published" && item.publication_count >= 1)
    .map((item) => ({
      id: item.report_id,
      batchId: item.batch_id,
      month: item.month,
      publicationNo: item.publication_count,
      publishedAt: item.published_at,
      needsRepublish: item.needs_republish,
        range: rangeLabels({ fromKey: item.from_key, toKey: item.to_key, fromNumber: item.from_number, toNumber: item.to_number, month: item.month ?? null }),
    }));
  return { items, nextCursor: page.next_cursor ?? null };
}

/**
 * Bản phát hành của một báo cáo (`GET /reports/:id/publications/:no`). Chưa phát
 * hành, không phải của con hoặc không đọc được → ném lỗi, không hiện bản nháp.
 */
export async function getChildReport(studentId: string, reportId: string, publicationNo: number): Promise<ChildReport | null> {
  requireGuardian("comments_reports");
  const student = requireChild(studentId);
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Xem báo cáo cần kết nối mạng.");
  let row: { student_id: string; published_at: string | null; snapshot: unknown } | null;
  try {
    row = await api.request(`GET /reports/${reportId}/publications/${publicationNo}` as never) as { student_id: string; published_at: string | null; snapshot: unknown };
  } catch (cause) {
    if (cause instanceof ApiError && [403, 404, 410].includes(cause.status)) return null;
    throw new Error(guardianErrorMessage(cause, "Không đọc được báo cáo của con."));
  }
  if (!row || row.student_id !== student.id) return null;
  const decoded = decodeServerReport(row.snapshot, student, reportId);
  if (!decoded) throw new Error("Báo cáo không đọc được. Thử lại sau.");
  return {
    id: reportId,
    publicationNo,
    publishedAt: row.published_at,
    range: decoded.range,
    body: decoded.report,
    needsRepublish: getStore().reports.find((item) => item.id === reportId)?.needsRepublish ?? false,
  };
}
