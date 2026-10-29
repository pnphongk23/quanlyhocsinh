import { getStore } from "../../data/store";
import { getSession } from "../../data/auth/session";
import { can, requirePermission } from "../../data/repositories/access";
import {
  STUDENT_ACCESS_ERROR,
  getChildHomework,
  listChildTickets,
  listMyChildren,
  type GuardianChild,
} from "../../data/repositories/guardian";
import { sessionNumber } from "../../data/repositories/sessions";
import { compareSessions } from "../../data/homework";
import { todayISO } from "../../shared/date";
import type { Session, StarLevel, Student, Test } from "../../data/types";
import type { AttendanceStatus } from "./guardianFormat";

/**
 * Hàm đọc RIÊNG của màn phụ huynh cho hai dữ liệu mà `src/data` chưa có API:
 * điểm danh theo buổi và điểm từng bài của con (ảnh 109/110 của bản thiết kế
 * cũ). Chỉ ĐỌC `getStore()`; không ghi, không sửa `src/data`.
 *
 * Mọi hàm đều đi qua `listMyChildren()` của repository phụ huynh: học sinh
 * không phải con được liên kết sẽ bị từ chối (không lộ em đó có tồn tại hay
 * không), giống quy tắc của `src/data/repositories/guardian.ts`.
 */

export function myChildren(): GuardianChild[] {
  return listMyChildren();
}

export function childOf(studentId: string): GuardianChild {
  const child = myChildren().find((item) => item.student.id === studentId);
  if (!child) throw new Error(STUDENT_ACCESS_ERROR);
  return child;
}

function inClassOf(child: GuardianChild) {
  return (session: Session) =>
    session.classId === child.student.classId &&
    session.status !== "cancelled" &&
    session.date >= child.student.enrolledAt &&
    (!child.student.leftAt || session.date <= child.student.leftAt);
}

/** Buổi của lớp con trong khoảng ngày vào lớp..ngày rời lớp, cũ nhất trước. */
export function childSessions(studentId: string): Session[] {
  const child = childOf(studentId);
  return getStore()
    .sessions.filter(inClassOf(child))
    .sort(compareSessions);
}

/** Buổi của lịch lớp con trong khoảng ngày vào lớp..rời lớp, mọi trạng thái. */
export function childScheduleSessions(studentId: string): Session[] {
  const child = childOf(studentId);
  return getStore()
    .sessions.filter((session) => inClassWindow(child, session))
    .sort(compareSessions);
}

/** Các tháng có buổi đã diễn ra của con, mới nhất trước ("2026-10"). */
export function childMonths(studentId: string): string[] {
  const months = childSessions(studentId)
    .filter((session) => session.status === "held")
    .map((session) => session.date.slice(0, 7));
  return [...new Set(months)].sort((a, b) => b.localeCompare(a));
}

/** Tháng đang xem: tháng có buổi gần nhất, chưa có buổi nào thì tháng hiện tại. */
export function defaultChildMonth(studentId: string): string {
  return childMonths(studentId)[0] ?? todayISO().slice(0, 7);
}

export interface ChildAttendanceRow {
  session: Session;
  /** Vị trí buổi dùng nội bộ khi cần sắp xếp. */
  number: number;
  /** null = giáo viên chưa điểm danh buổi đó. */
  status: AttendanceStatus | null;
}

export interface ChildAttendanceMonth {
  month: string;
  /** Buổi đã diễn ra trong tháng, mới nhất trước. */
  rows: ChildAttendanceRow[];
  present: number;
  late: number;
  absent: number;
}

/** Điểm danh của con trong một tháng (màn Điểm danh tối giản của phụ huynh). */
export function childAttendanceMonth(
  studentId: string,
  month: string,
): ChildAttendanceMonth {
  childOf(studentId);
  requirePermission("sessions_attendance", "read");
  const state = getStore();
  const rows = childSessions(studentId)
    .filter(
      (session) =>
        session.status === "held" && session.date.slice(0, 7) === month,
    )
    .sort((a, b) => compareSessions(b, a))
    .flatMap((session) => {
      const number = sessionNumber(session);
      if (number === null) return [];
      const record = state.attendance.find(
        (item) =>
          item.sessionId === session.id && item.studentId === studentId,
      );
      return [
        {
          session,
          number,
          status: record?.status ?? null,
        },
      ];
    });
  const count = (status: AttendanceStatus) =>
    rows.filter((row) => row.status === status).length;
  return {
    month,
    rows,
    present: count("present"),
    late: count("late"),
    absent: count("absent"),
  };
}

export interface ChildScoreRow {
  test: Test;
  /** null = "Chưa có điểm". */
  value: number | null;
}

export interface ChildScoresMonth {
  month: string;
  rows: ChildScoreRow[];
}

/** Điểm từng bài của con trong một tháng; không có trung bình nào (quy tắc 3.1). */
export function childScoresMonth(
  studentId: string,
  month: string,
): ChildScoresMonth {
  const child = childOf(studentId);
  requirePermission("scores", "read");
  const state = getStore();
  const rows = state.tests
    .filter(
      (test) =>
        test.classId === child.student.classId &&
        test.archived !== true &&
        test.date.slice(0, 7) === month,
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((test) => ({
      test,
      value:
        state.scores.find(
          (score) => score.testId === test.id && score.studentId === studentId,
        )?.value ?? null,
    }));
  return { month, rows };
}

/** Giáo viên chính của lớp con (để hiện "Nhận xét của cô Lan", ảnh 08). */
export function childTeacherName(studentId: string): string | null {
  const child = childOf(studentId);
  const teacherName = getStore().classes.find(
    (item) => item.id === child.student.classId,
  )?.teacherName;
  if (teacherName) return teacherName;
  const session = getSession();
  const membership = session?.me.memberships.find(
    (item) => item.id === session.activeMembershipId && item.status === "active",
  );
  return (
    membership?.students?.find((student) => student.id === studentId)?.teacher_name ??
    null
  );
}

/** Các tháng có báo cáo ĐÃ phát hành của con, mới nhất trước. */
export function publishedReportMonths(studentId: string): string[] {
  childOf(studentId);
  const months = getStore()
    .reports.filter(
      (report) =>
        report.studentId === studentId && report.status === "published",
    )
    .map((report) => report.month);
  return [...new Set(months)].sort((a, b) => b.localeCompare(a));
}

export type { GuardianChild, Student };

/* ------------------------------------------------ khung lớp học của con */

export interface ChildClassInfo {
  name: string;
  weekdays: number[];
  time: string;
  teacher: string | null;
}

/** Tên lớp, lịch học và giáo viên chính của lớp con (đầu tab Lớp học của con). */
export function childClassInfo(studentId: string): ChildClassInfo {
  const child = childOf(studentId);
  const klass = getStore().classes.find(
    (item) => item.id === child.student.classId,
  );
  return {
    name: child.className,
    weekdays: klass?.weekdays ?? [],
    time: klass?.time ?? "",
    teacher: childTeacherName(studentId),
  };
}

/** Buổi thuộc lớp con trong khoảng ngày vào lớp..rời lớp (mọi trạng thái). */
function inClassWindow(child: GuardianChild, session: Session): boolean {
  return (
    session.classId === child.student.classId &&
    session.date >= child.student.enrolledAt &&
    (!child.student.leftAt || session.date <= child.student.leftAt)
  );
}

/** Một buổi của con trong danh sách tab 1; `number` null = buổi đã huỷ. */
export interface ChildSessionItem {
  session: Session;
  number: number | null;
  cancelled: boolean;
  /** Buổi chưa diễn ra nhưng cô đã giao BTVN hoặc đã gửi phiếu nên phụ huynh xem được. */
  upcoming: boolean;
  /** null = chưa điểm danh, hoặc nhóm Buổi học và điểm danh bị tắt. */
  attendance: AttendanceStatus | null;
  /** null = chưa gửi phiếu, hoặc nhóm Nhận xét và báo cáo bị tắt. */
  stars: StarLevel | null;
}

/**
 * Buổi đã diễn ra, đã huỷ và buổi sắp tới đã có BTVN hoặc phiếu của con, mới
 * nhất trước, kèm nhãn điểm danh và sao.
 */
export function childSessionFeed(studentId: string): ChildSessionItem[] {
  const child = childOf(studentId);
  const state = getStore();
  const canAttendance = can("sessions_attendance", "read");
  const stars = new Map<string, StarLevel>();
  const withHomework = new Set<string>();
  if (can("comments_reports", "read")) {
    for (const ticket of listChildTickets(studentId))
      stars.set(ticket.session.id, ticket.stars);
    for (const item of getChildHomework(studentId))
      withHomework.add(item.session.id);
  }
  return state.sessions
    .filter(
      (session) =>
        inClassWindow(child, session) &&
        (session.status !== "planned" ||
          stars.has(session.id) ||
          withHomework.has(session.id)),
    )
    .sort((a, b) => compareSessions(b, a))
    .map((session) => {
      const cancelled = session.status === "cancelled";
      const record =
        canAttendance && !cancelled
          ? state.attendance.find(
              (item) =>
                item.sessionId === session.id && item.studentId === studentId,
            )
          : undefined;
      return {
        session,
        number: sessionNumber(session),
        cancelled,
        upcoming: session.status === "planned",
        attendance: record?.status ?? null,
        stars: stars.get(session.id) ?? null,
      };
    });
}

/** Một buổi của con theo id (kể cả đã huỷ hoặc sắp tới); buổi của lớp khác → null. */
export function childSessionById(
  studentId: string,
  sessionId: string,
): Session | null {
  const child = childOf(studentId);
  return (
    getStore().sessions.find(
      (session) => session.id === sessionId && inClassWindow(child, session),
    ) ?? null
  );
}

export interface ChildSessionAttendance {
  status: AttendanceStatus;
}

/** Điểm danh của con ở một buổi; null = chưa điểm danh hoặc nhóm quyền bị tắt. */
export function childAttendanceOf(
  studentId: string,
  sessionId: string,
): ChildSessionAttendance | null {
  childOf(studentId);
  if (!can("sessions_attendance", "read")) return null;
  const record = getStore().attendance.find(
    (item) => item.sessionId === sessionId && item.studentId === studentId,
  );
  return record
    ? { status: record.status }
    : null;
}

export interface ChildTeacherWord {
  month: string;
  /** Ngày phát hành "2026-10-12". */
  date: string;
  text: string;
}

/** "Lời cô" của các báo cáo tháng đã phát hành (có nhận xét chung), mới nhất trước. */
export function childTeacherWords(studentId: string): ChildTeacherWord[] {
  childOf(studentId);
  requirePermission("comments_reports", "read");
  return getStore()
    .reports.filter(
      (report) =>
        report.studentId === studentId &&
        report.status === "published" &&
        report.publishedAt !== null &&
        report.generalComment.trim() !== "",
    )
    .map((report) => ({
      month: report.month,
      date: (report.publishedAt ?? "").slice(0, 10),
      text: report.generalComment.trim(),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
