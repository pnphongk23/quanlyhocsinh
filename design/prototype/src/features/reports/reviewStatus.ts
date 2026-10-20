import type { Report } from "../../data/types";
import type { MonthlyStudentReport } from "./reportModel";

/**
 * Trạng thái một dòng trong màn Duyệt & phát hành báo cáo (ảnh 13, 26).
 * Thứ tự ưu tiên theo ảnh: còn thiếu dữ liệu thì luôn hiện "Thiếu dữ liệu"
 * (kèm lý do), sau đó mới tới cờ phát hành lại / đã phát hành / nháp.
 */
export type ReportSlotStatus =
  | "missing"
  | "republish"
  | "published"
  | "draft"
  | "ready";

export type ReportSlotTone = "success" | "warning" | "primary" | "neutral";

export interface ReportSlot {
  status: ReportSlotStatus;
  /** Nhãn trên pill, đúng chữ ảnh 13/26. */
  label: string;
  tone: ReportSlotTone;
  /** Dòng lý do dưới tên em; "" khi không có gì để nói. */
  detail: string;
  /** Có cần bấm phát hành (chưa phát hành hoặc đã có cờ phát hành lại). */
  publishable: boolean;
  /** Nhãn nút phát hành của riêng em này. */
  publishLabel: string;
}

/**
 * Câu ghi chú dưới tên khi báo cáo đã phát hành mà điểm có cập nhật.
 * Ảnh 13 ghi tên bài cụ thể ("Điểm Unit 5 vừa cập nhật"), nhưng tầng dữ liệu
 * không trả về bài nào vừa sửa nên chỉ nêu đúng cờ của spec mục 4.
 */
export const REPUBLISH_NOTE = "Điểm có cập nhật, cần phát hành lại";

/** Ngày phát hành dạng "12/10" cho nhãn "Đã phát hành · 12/10" (ảnh 13). */
function publishedDayMonth(publishedAt: string): string {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "numeric",
  }).format(date);
}

/** Dòng tóm tắt đầu màn duyệt báo cáo: "7/10 sẵn sàng · 3 thiếu dữ liệu · 1 đã phát hành". */
export interface ReviewSummary {
  total: number;
  ready: number;
  missing: number;
  published: number;
  publishable: number;
}

export type ReportReviewRow = Pick<MonthlyStudentReport, "ready" | "missing">;

/** Trạng thái của một em theo dữ liệu báo cáo tháng và bản ghi `Report` hiện có. */
export function reportSlot(
  row: ReportReviewRow,
  report?: Report,
): ReportSlot {
  const published = report?.status === "published";
  const publishLabel = published ? "Phát hành lại" : "Phát hành";
  if (!row.ready)
    return {
      status: "missing",
      label: "Thiếu dữ liệu",
      tone: "warning",
      detail: row.missing.join(" · "),
      publishable: false,
      publishLabel,
    };
  if (report?.needsRepublish)
    return {
      status: "republish",
      label: "Cần phát hành lại",
      tone: "primary",
      detail: REPUBLISH_NOTE,
      publishable: true,
      publishLabel,
    };
  if (published)
    return {
      status: "published",
      label: report?.publishedAt
        ? `Đã phát hành · ${publishedDayMonth(report.publishedAt)}`
        : "Đã phát hành",
      tone: "success",
      detail: "",
      publishable: false,
      publishLabel,
    };
  if (report)
    return {
      status: "draft",
      label: "Nháp",
      tone: "neutral",
      detail: "",
      publishable: true,
      publishLabel,
    };
  return {
    status: "ready",
    label: "Sẵn sàng",
    tone: "success",
    detail: "",
    publishable: true,
    publishLabel,
  };
}

export function reviewSummary(slots: ReportSlot[]): ReviewSummary {
  const missing = slots.filter((slot) => slot.status === "missing").length;
  return {
    total: slots.length,
    ready: slots.length - missing,
    missing,
    published: slots.filter((slot) => slot.status === "published").length,
    publishable: slots.filter((slot) => slot.publishable).length,
  };
}

/** Nhãn nút phát hành hàng loạt (ảnh 13: "Phát hành 6 báo cáo"). */
export function publishAllLabel(count: number): string {
  return count > 0 ? `Phát hành ${count} báo cáo` : "Phát hành báo cáo";
}

/** Số thứ tự tháng trong kỳ, dùng cho "Báo cáo tháng 10" / "· Tháng 10". */
export function monthNumber(month: string): number {
  return Number(month.slice(5, 7));
}

/** Nhãn tháng đầy đủ cho tiêu đề bản xem trước: "Báo cáo tháng 10". */
export function reportMonthTitle(month: string): string {
  return `Báo cáo tháng ${monthNumber(month)}`;
}

/** Nhãn một tháng trong ô chọn kỳ: "Tháng 10, 2026". */
export function monthOptionLabel(month: string): string {
  return `Tháng ${monthNumber(month)}, ${month.slice(0, 4)}`;
}

/** Nhãn kỳ trên màn duyệt: "Tháng 10". */
export function monthPeriodLabel(month: string): string {
  return `Tháng ${monthNumber(month)}`;
}
