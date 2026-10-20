import type { Report } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requirePermission, requireStudent, requireOnline } from "./helpers";
import { canAccessClass, requireClassAccess } from "./access";
export const listReports = (classId: string): Report[] =>
  canAccessClass(classId)
    ? getStore().reports.filter((r) => r.classId === classId)
    : [];
export function saveReport(
  input: Pick<Report, "classId" | "studentId" | "month">,
): Report {
  requirePermission("comments_reports", "write");
  requireClassAccess(input.classId);
  if (
    requireStudent(input.studentId).classId !== input.classId ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)
  )
    throw new Error("Kiểm tra lớp và tháng báo cáo.");
  const old = getStore().reports.find(
    (r) => r.studentId === input.studentId && r.month === input.month,
  );
  if (old) return old;
  const item: Report = {
    ...input,
    id: crypto.randomUUID(),
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
 * Lưu nhận xét chung của tháng cho một báo cáo. Sửa báo cáo đã phát hành thì
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
