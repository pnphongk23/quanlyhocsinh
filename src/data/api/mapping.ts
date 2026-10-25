import type { ApiClass, ApiReport, ApiReportBatch } from "./types";
import type { Class, Report, ReportBatch } from "../types";
import { normalizeWeekdays } from "../../shared/weekdays";

export function classFromApi(item: ApiClass): Class {
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    weekdays: normalizeWeekdays(item.weekdays),
    time: item.start_time,
    teacherName: item.teacher_name ?? null,
  };
}

export function reportBatchFromApi(item: ApiReportBatch): ReportBatch {
  return {
    id: item.id,
    classId: item.class_id,
    fromSessionId: item.from_session_id ?? null,
    toSessionId: item.to_session_id ?? null,
    fromKey: item.from_key,
    toKey: item.to_key,
    month: item.month ?? null,
    fromNumber: item.from_number ?? null,
    toNumber: item.to_number ?? null,
  };
}

export function reportFromApi(item: ApiReport): Report {
  return {
    id: item.id,
    classId: item.class_id,
    studentId: item.student_id,
    batchId: item.batch_id,
    month: item.month,
    status: item.status,
    generalComment: item.general_comment,
    needsRepublish: item.needs_republish,
    publishedAt: item.published_at,
  };
}
