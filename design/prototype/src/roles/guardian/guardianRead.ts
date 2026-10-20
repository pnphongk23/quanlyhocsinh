import { getStore } from "../../data/store";
import { requirePermission } from "../../data/repositories/access";
import {
  STUDENT_ACCESS_ERROR,
  listMyChildren,
  type GuardianChild,
} from "../../data/repositories/guardian";
import { sessionNumber } from "../../data/repositories/sessions";
import { compareSessions } from "../../data/homework";
import type { Session, Student, Test } from "../../data/types";
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

/** Các tháng có buổi đã diễn ra của con, mới nhất trước ("2026-10"). */
export function childMonths(studentId: string): string[] {
  const months = childSessions(studentId)
    .filter((session) => session.status === "held")
    .map((session) => session.date.slice(0, 7));
  return [...new Set(months)].sort((a, b) => b.localeCompare(a));
}

/** Tháng đang xem: tháng có buổi gần nhất, chưa có buổi nào thì tháng hiện tại. */
export function defaultChildMonth(studentId: string): string {
  return childMonths(studentId)[0] ?? new Date().toISOString().slice(0, 7);
}

export interface ChildAttendanceRow {
  session: Session;
  /** Số buổi trong lớp (bỏ buổi đã hủy) — "Buổi 18". */
  number: number;
  /** null = giáo viên chưa điểm danh buổi đó. */
  status: AttendanceStatus | null;
  note: string;
  lateAt: string | null;
}

export interface ChildAttendanceMonth {
  month: string;
  /** Buổi đã diễn ra trong tháng, mới nhất trước. */
  rows: ChildAttendanceRow[];
  present: number;
  late: number;
  excused: number;
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
          note: record?.note ?? "",
          lateAt: record?.lateAt ?? null,
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
    excused: count("excused"),
    absent: count("absent"),
  };
}

export interface ChildScoreRow {
  test: Test;
  /** null = "Chưa có điểm" (không tính vào trung bình). */
  value: number | null;
}

export interface ChildScoresMonth {
  month: string;
  /** Trung bình cộng bài đã có điểm của CON (không phải trung bình lớp). */
  average: number | null;
  rows: ChildScoreRow[];
}

/** Điểm từng bài của con trong một tháng; không có trung bình lớp (quy tắc 3.1). */
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
  const graded = rows.filter(
    (row): row is { test: Test; value: number } => row.value !== null,
  );
  const average = graded.length
    ? graded.reduce((sum, row) => sum + row.value, 0) / graded.length
    : null;
  return { month, average, rows };
}

/** Giáo viên chính của lớp con (để hiện "Nhận xét của cô Lan", ảnh 08). */
export function childTeacherName(studentId: string): string | null {
  const child = childOf(studentId);
  const state = getStore();
  const assignment = state.classStaff.find(
    (item) =>
      item.classId === child.student.classId && item.position === "main",
  );
  if (!assignment) return null;
  return (
    state.members.find((member) => member.id === assignment.memberId)?.name ??
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
