import { listAttendance } from "../../data/repositories/attendance";
import { listComments } from "../../data/repositories/comments";
import { listHomeworkGrades, listHomeworkSections } from "../../data/repositories/homework";
import { listReports } from "../../data/repositories/reports";
import { listScores } from "../../data/repositories/scores";
import { listSessions } from "../../data/repositories/sessions";
import { listStudents } from "../../data/repositories/students";
import { listTests } from "../../data/repositories/tests";
import {
  buildRangeStudentReport,
  type MonthlyStudentReportData,
  type PeriodStudentReport,
} from "../../data/reportModel";
import { resolveRange, type ResolvedRange } from "../../data/reportRange";
import type { Report, ReportBatch, Student } from "../../data/types";
import { reportSlot, type ReportSlot } from "./reviewStatus";

/** Dữ liệu của một lớp dùng để dựng mọi báo cáo của lớp đó. */
export interface ClassReportSource
  extends Omit<MonthlyStudentReportData, "generalComment"> {
  students: Student[];
  reports: Report[];
}

/** Đọc dữ liệu lớp qua repository (đã lọc theo phạm vi vai trò). */
export function readClassReportSource(classId: string): ClassReportSource {
  const sessions = listSessions(classId);
  const tests = listTests(classId);
  const homeworkSections = sessions.flatMap((session) =>
    listHomeworkSections(session.id),
  );
  return {
    students: listStudents(classId),
    sessions,
    attendance: sessions.flatMap((session) => listAttendance(session.id)),
    tests,
    scores: tests.flatMap((test) => listScores(test.id)),
    comments: listComments(classId),
    homeworkSections,
    homeworkGrades: homeworkSections.flatMap((section) =>
      listHomeworkGrades(section.id),
    ),
    reports: listReports(classId),
  };
}

export interface BatchRow {
  report: PeriodStudentReport;
  slot: ReportSlot;
  /** Bản ghi Report của em trong đợt (nếu đã lưu). */
  record?: Report;
}

export interface BatchRows {
  range: ResolvedRange;
  rows: BatchRow[];
}

/**
 * Một dòng cho mỗi em có học trong khoảng của đợt (gồm em vào lớp hoặc rời
 * lớp giữa khoảng). Null khi buổi đầu/cuối của đợt không còn hợp lệ.
 */
export function buildBatchRows(
  batch: ReportBatch,
  source: ClassReportSource,
): BatchRows | null {
  const range = resolveRange(source.sessions, batch);
  if (!range) return null;
  const rows = source.students.flatMap((student) => {
    const record = source.reports.find(
      (item) => item.studentId === student.id && item.batchId === batch.id,
    );
    const report = buildRangeStudentReport(student, range, {
      ...source,
      generalComment: record?.generalComment ?? "",
    });
    return report ? [{ report, record, slot: reportSlot(report, record) }] : [];
  });
  return { range, rows };
}

/** Số báo cáo của đợt theo trạng thái, hiện trên danh sách đợt. */
export interface BatchCounts {
  total: number;
  published: number;
  republish: number;
  draft: number;
}

export function batchCounts(rows: BatchRow[]): BatchCounts {
  const count = (status: ReportSlot["status"]) =>
    rows.filter((row) => row.slot.status === status).length;
  const published = count("published");
  const republish = count("republish");
  return {
    total: rows.length,
    published,
    republish,
    draft: rows.length - published - republish,
  };
}
