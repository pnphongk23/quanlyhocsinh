import type { ApiClass, ApiReport, ApiReportBatch } from "./types";
import type { Class, Report, ReportBatch } from "../types";

export function classFromApi(item: ApiClass): Class {
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    weekdays: item.weekdays,
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
