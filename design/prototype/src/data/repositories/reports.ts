import type { Report, ReportBatch } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requirePermission, requireStudent, requireOnline } from "./helpers";
import { canAccessClass, requireClassAccess } from "./access";
import { rangeError, resolveRange, studentInRange } from "../reportRange";

export const listReports = (classId: string): Report[] =>
  canAccessClass(classId)
    ? getStore().reports.filter((r) => r.classId === classId)
    : [];

/** Các đợt báo cáo của lớp, mới tạo nhất trước. */
export const listReportBatches = (classId: string): ReportBatch[] =>
  canAccessClass(classId)
    ? getStore()
        .reportBatches.filter((b) => b.classId === classId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

export function getReportBatch(id: string): ReportBatch | null {
  const batch = getStore().reportBatches.find((b) => b.id === id) ?? null;
  return batch && canAccessClass(batch.classId) ? batch : null;
}

/**
 * Thêm một đợt báo cáo cho cả lớp: mỗi học sinh có học trong khoảng buổi nhận
 * một bản nháp riêng. Cho phép trùng khoảng với đợt khác.
 */
export function createReportBatch(input: {
  classId: string;
  fromSessionId: string;
  toSessionId: string;
}): ReportBatch {
  requirePermission("comments_reports", "write");
  requireClassAccess(input.classId);
  const state = getStore();
  const error = rangeError(
    state.sessions,
    input.classId,
    input.fromSessionId,
    input.toSessionId,
  );
  if (error) throw new Error(error);
  const range = resolveRange(state.sessions, {
    classId: input.classId,
    fromSessionId: input.fromSessionId,
    toSessionId: input.toSessionId,
  });
  if (!range) throw new Error("Khoảng buổi không hợp lệ.");
  const batch: ReportBatch = {
    id: crypto.randomUUID(),
    classId: input.classId,
    fromSessionId: input.fromSessionId,
    toSessionId: input.toSessionId,
    createdAt: new Date().toISOString(),
  };
  const month = range.to.date.slice(0, 7);
  const drafts: Report[] = state.students
    .filter(
      (student) =>
        student.classId === input.classId && studentInRange(student, range),
    )
    .map((student) => ({
      id: crypto.randomUUID(),
      classId: input.classId,
      studentId: student.id,
      batchId: batch.id,
      month,
      status: "draft",
      needsRepublish: false,
      generalComment: "",
      publishedAt: null,
    }));
  commit("reports", batch.id, (d) => {
    d.reportBatches.push(batch);
    d.reports.push(...drafts);
  });
  return batch;
}

/** Bản báo cáo của một em trong đợt; chưa có thì tạo bản nháp (em vào lớp sau khi tạo đợt). */
export function saveReport(
  input: Pick<Report, "classId" | "studentId" | "batchId">,
): Report {
  requirePermission("comments_reports", "write");
  requireClassAccess(input.classId);
  const state = getStore();
  const batch = state.reportBatches.find((b) => b.id === input.batchId);
  if (
    !batch ||
    batch.classId !== input.classId ||
    requireStudent(input.studentId).classId !== input.classId
  )
    throw new Error("Kiểm tra lớp và đợt báo cáo.");
  const old = state.reports.find(
    (r) => r.studentId === input.studentId && r.batchId === input.batchId,
  );
  if (old) return old;
  const range = resolveRange(state.sessions, batch);
  const item: Report = {
    ...input,
    id: crypto.randomUUID(),
    month: (range?.to.date ?? batch.createdAt).slice(0, 7),
    status: "draft",
    needsRepublish: false,
    generalComment: "",
    publishedAt: null,
  };
  commit("reports", item.id, (d) => {
    d.reports.push(item);
  });
  return item;
}
export function publishReport(id: string): void {
  requirePermission("comments_reports", "write");
  requireOnline();
  const current = getStore().reports.find((r) => r.id === id);
  if (!current) throw new Error("Không tìm thấy báo cáo.");
  requireClassAccess(current.classId);
  commit("reports", id, (d) => {
    Object.assign(
      d.reports.find((r) => r.id === id)!,
      { status: "published", needsRepublish: false, publishedAt: new Date().toISOString() },
    );
  });
}

/**
 * Lưu nhận xét chung của đợt cho một báo cáo. Sửa báo cáo đã phát hành thì
 * phụ huynh thấy bản mới ngay (không cần phát hành lại).
 */
export function saveReportComment(id: string, generalComment: string): Report {
  requirePermission("comments_reports", "write");
  const current = getStore().reports.find((r) => r.id === id);
  if (!current) throw new Error("Không tìm thấy báo cáo.");
  requireClassAccess(current.classId);
  const value = generalComment.trim();
  commit("reports", id, (d) => {
    const target = d.reports.find((r) => r.id === id);
    if (target) target.generalComment = value;
  });
  return { ...current, generalComment: value };
}
