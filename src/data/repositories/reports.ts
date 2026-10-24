import type { Report, ReportBatch } from "../types";
import type { ApiBatchListItem, ApiBatchReportItem } from "../api/types";
import { ApiError } from "../api/client";
import { getStore } from "../store";
import { commitState } from "../outbox";
import { canAccessClass, requireClassAccess, requirePermission } from "./access";
import { api } from "../sync";
import { identityKey } from "../db";
import { commitRemote, createOnce } from "./rest-cache";
import { reportBatchFromApi, reportFromApi } from "../api/mapping";
import { decodeServerReport, type ServerReport } from "../reportModel";
import { compareBatches, rangeError } from "../reportRange";

type Wire = Record<string, unknown> & { id: string };

/** Gọi endpoint báo cáo theo đợt; kiểu endpoint nằm ngoài bảng `ApiEndpoints` dùng chung. */
const call = <T>(endpoint: string, options?: { body?: unknown }): Promise<T> =>
  api.request(endpoint as never, options as never) as Promise<T>;

export const listReports = (classId: string): Report[] =>
  canAccessClass(classId) ? getStore().reports.filter((r) => r.classId === classId) : [];

/** Các đợt báo cáo của lớp, buổi cuối mới nhất trước. */
export const listReportBatches = (classId: string): ReportBatch[] =>
  canAccessClass(classId)
    ? getStore().reportBatches.filter((b) => b.classId === classId).sort(compareBatches)
    : [];

export function getReportBatch(id: string): ReportBatch | null {
  const batch = getStore().reportBatches.find((b) => b.id === id) ?? null;
  return batch && canAccessClass(batch.classId) ? batch : null;
}

/** Bản báo cáo của các em trong một đợt (đồng bộ từ máy chủ khi tạo đợt). */
export const listBatchReports = (batchId: string): Report[] => {
  const batch = getReportBatch(batchId);
  return batch ? getStore().reports.filter((r) => r.batchId === batch.id) : [];
};

/** Câu tiếng Việt cho lỗi gọi máy chủ; không để lộ mã hay chi tiết kỹ thuật. */
export function reportErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError) {
    const { code } = cause.error;
    const details = cause.error.details;
    if (cause.status === 409 && details?.reason === "report_not_ready") {
      const labels: Record<string, string> = { attendance: "điểm danh", scores: "điểm", comment: "nhận xét chung" };
      const missing = Array.isArray(details.missing)
        ? details.missing.filter((value): value is string => typeof value === "string").map((value) => labels[value]).filter(Boolean)
        : [];
      return missing.length
        ? `Báo cáo còn thiếu dữ liệu: thiếu ${missing.join(", ")}.`
        : "Báo cáo còn thiếu dữ liệu.";
    }
    if (cause.status === 422 && code === "invalid_range") return "Buổi bắt đầu phải trước hoặc cùng buổi kết thúc.";
    if (cause.status === 422 && code === "session_cancelled") return "Không chọn buổi đã hủy.";
    if (cause.status === 422) return "Khoảng buổi không hợp lệ. Kiểm tra lại buổi bắt đầu và kết thúc.";
    if (cause.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (cause.status === 404) return "Không tìm thấy dữ liệu. Tải lại trang rồi thử lại.";
    if (cause.status === 409 && code === "conflict") return "Báo cáo vừa được phát hành ở nơi khác. Tải lại rồi thử lại.";
    if (cause.status === 429) return "Thao tác quá nhanh. Đợi một chút rồi thử lại.";
    return fallback;
  }
  if (cause instanceof TypeError || (typeof DOMException !== "undefined" && cause instanceof DOMException))
    return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function requireOnline(action: string): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error(`${action} cần kết nối mạng.`);
}

/** Chạy một lời gọi máy chủ và đổi mọi lỗi thành câu tiếng Việt. */
async function remote<T>(fallback: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    throw new Error(reportErrorMessage(cause, fallback));
  }
}

function reportOf(id: string): Report {
  const current = getStore().reports.find((r) => r.id === id);
  if (!current) throw new Error("Không tìm thấy báo cáo.");
  requireClassAccess(current.classId);
  return current;
}

/** Bản ghi `report` dạng đồng bộ từ một dòng của danh sách báo cáo trong đợt. */
const reportWire = (classId: string, item: ApiBatchReportItem): Wire & { version: number } => ({
  id: item.report_id,
  class_id: classId,
  student_id: item.student_id,
  batch_id: item.batch_id,
  month: item.month,
  status: item.status,
  general_comment: item.general_comment ?? "",
  needs_republish: item.needs_republish,
  publication_count: item.publication_count,
  published_at: item.published_at,
  version: item.version,
});

/**
 * Thêm một đợt báo cáo cho cả lớp: máy chủ tạo một bản nháp cho mỗi học sinh có
 * học trong khoảng. `id` do máy khách sinh một lần và giữ qua các lần thử lại.
 */
export async function createReportBatch(input: {
  classId: string;
  fromSessionId: string;
  toSessionId: string;
}): Promise<ReportBatch> {
  requirePermission("comments_reports", "write");
  requireClassAccess(input.classId);
  const problem = rangeError(getStore().sessions, input.classId, input.fromSessionId, input.toSessionId);
  if (problem) throw new Error(problem);
  requireOnline("Thêm báo cáo");
  const identity = identityKey();
  const body = { from_session_id: input.fromSessionId, to_session_id: input.toSessionId };
  const result = await remote("Không thể tạo báo cáo.", () =>
    createOnce(`report-batch:${input.classId}`, body, (id) =>
      call<{ batch: ApiBatchListItem; reports: ApiBatchReportItem[] }>(
        `POST /classes/${input.classId}/report-batches`,
        { body: { id, ...body } },
      ),
    ),
  );
  const batchWire = {
    id: result.batch.id,
    class_id: input.classId,
    from_session_id: result.batch.from_session_id,
    to_session_id: result.batch.to_session_id,
    from_key: result.batch.from_key,
    to_key: result.batch.to_key,
    version: 1,
  };
  const batch = reportBatchFromApi(batchWire);
  const wires = result.reports.map((item) => reportWire(input.classId, item));
  const reports = wires.map((wire) => reportFromApi(wire as never));
  for (const wire of wires) await commitRemote(identity, "report", wire, undefined, () => {});
  await commitRemote(identity, "report_batch", batchWire, undefined, () =>
    commitState("report-batch", batch.id, (d) => {
      d.reportBatches = [...d.reportBatches.filter((b) => b.id !== batch.id), batch];
      d.reports = [...d.reports.filter((r) => r.batchId !== batch.id), ...reports];
    }),
  );
  return batch;
}

/** Nội dung báo cáo sẽ phát hành, do máy chủ tính (`GET /reports/:id/preview`). */
export async function previewReport(id: string): Promise<ServerReport> {
  const current = reportOf(id);
  requirePermission("comments_reports", "read");
  requireOnline("Xem trước báo cáo");
  const student = getStore().students.find((s) => s.id === current.studentId);
  if (!student) throw new Error("Không tìm thấy học sinh.");
  const result = await remote("Không tải được bản xem trước.", () => call<unknown>(`GET /reports/${id}/preview`));
  const decoded = decodeServerReport(result, student, id);
  if (!decoded) throw new Error("Bản xem trước không đọc được. Thử lại sau.");
  return decoded;
}

export async function saveReportComment(id: string, generalComment: string): Promise<Report> {
  requirePermission("comments_reports", "write");
  const current = reportOf(id);
  requireOnline("Lưu nhận xét");
  const value = generalComment.trim();
  const identity = identityKey();
  const result = await remote("Không thể lưu nhận xét chung.", () =>
    call<{ general_comment?: string; needs_republish?: boolean; version?: number }>(`PUT /reports/${id}`, { body: { general_comment: value } }),
  );
  const next: Report = {
    ...current,
    generalComment: result?.general_comment ?? value,
    needsRepublish: result?.needs_republish ?? current.needsRepublish,
  };
  await commitRemote(
    identity,
    "report",
    { id, general_comment: next.generalComment, needs_republish: next.needsRepublish, ...(typeof result?.version === "number" ? { version: result.version } : {}) },
    { class_id: current.classId, student_id: current.studentId, batch_id: current.batchId, month: current.month, status: current.status, published_at: current.publishedAt, publication_count: 0, version: 0 },
    () => commitState("report-comment", id, (d) => { d.reports = d.reports.map((r) => (r.id === id ? next : r)); }),
  );
  return next;
}

export async function publishReport(id: string): Promise<void> {
  requirePermission("comments_reports", "write");
  const current = reportOf(id);
  requireOnline("Phát hành báo cáo");
  const identity = identityKey();
  const result = await remote("Không thể phát hành báo cáo.", () =>
    call<{ publication_no?: number; published_at?: string }>(`POST /reports/${id}/publish`),
  );
  const publishedAt = result?.published_at ?? new Date().toISOString();
  await commitRemote(
    identity,
    "report",
    { id, status: "published", needs_republish: false, published_at: publishedAt, ...(typeof result?.publication_no === "number" ? { publication_count: result.publication_no } : {}) },
    { class_id: current.classId, student_id: current.studentId, batch_id: current.batchId, month: current.month, general_comment: current.generalComment, version: 0 },
    () => commitState("report-publish", id, (d) => {
      d.reports = d.reports.map((r) => (r.id === id ? { ...r, status: "published", needsRepublish: false, publishedAt } : r));
    }),
  );
}

/** Phát hành cả lớp, kèm các báo cáo máy chủ bỏ qua vì còn thiếu dữ liệu. */
export async function publishBatch(batchId: string): Promise<{
  published: number;
  skipped: { reportId: string; missing: string[] }[];
}> {
  requirePermission("comments_reports", "write");
  const batch = getReportBatch(batchId);
  if (!batch) throw new Error("Không tìm thấy đợt báo cáo.");
  requireClassAccess(batch.classId);
  requireOnline("Phát hành báo cáo");
  const identity = identityKey();
  const result = await remote("Không thể phát hành báo cáo.", () =>
    call<{
      published: { report_id: string; publication_no: number }[];
      skipped: { report_id: string; missing: string[] }[];
      published_at: string;
    }>(`POST /report-batches/${batchId}/publish`),
  );
  const published = new Map(result.published.map((item) => [item.report_id, item.publication_no]));
  const applyAll = () =>
    commitState("report-publish", batchId, (d) => {
      d.reports = d.reports.map((r) => (published.has(r.id) ? { ...r, status: "published", needsRepublish: false, publishedAt: result.published_at } : r));
    });
  const entries = [...published];
  for (const [index, [reportId, publicationNo]] of entries.entries()) {
    const current = getStore().reports.find((r) => r.id === reportId);
    await commitRemote(
      identity,
      "report",
      { id: reportId, status: "published", needs_republish: false, published_at: result.published_at, publication_count: publicationNo },
      current && { class_id: current.classId, student_id: current.studentId, batch_id: current.batchId, month: current.month, general_comment: current.generalComment, version: 0 },
      index === entries.length - 1 ? applyAll : () => {},
    );
  }
  if (!entries.length) applyAll();
  return {
    published: entries.length,
    skipped: (result.skipped ?? []).map((item) => ({ reportId: item.report_id, missing: item.missing })),
  };
}
