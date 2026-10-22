import type { TicketRow, TicketStatus } from "../../data/homework";
import type { HomeworkSummary } from "../../data/homework";
import { formatTime } from "../../shared/format";

/**
 * Mô hình hiển thị của tab Nhận xét (ảnh 40–47): bộ lọc, số đếm, nhãn trạng
 * thái phiếu và tóm tắt BTVN buổi trước. Tách khỏi React để test được.
 */
export type TicketFilter = "all" | "none" | "unsent";

export const TICKET_FILTERS: TicketFilter[] = ["all", "none", "unsent"];

export const TICKET_FILTER_LABELS: Record<TicketFilter, string> = {
  all: "Tất cả",
  none: "Chưa chọn sao",
  unsent: "Chưa gửi",
};

export interface TicketCounts {
  all: number;
  none: number;
  unsent: number;
}

export function ticketMatchesFilter(
  row: TicketRow,
  filter: TicketFilter,
): boolean {
  if (filter === "none") return row.status === "none";
  if (filter === "unsent") return row.status !== "sent";
  return true;
}

export function filterTicketRows(
  rows: TicketRow[],
  filter: TicketFilter,
): TicketRow[] {
  return rows.filter((row) => ticketMatchesFilter(row, filter));
}

/** Số đếm trên ba bộ lọc Tất cả / Chưa chọn sao / Chưa gửi. */
export function ticketCounts(rows: TicketRow[]): TicketCounts {
  return {
    all: rows.length,
    none: rows.filter((row) => row.status === "none").length,
    unsent: rows.filter((row) => row.status !== "sent").length,
  };
}

/** Nhãn bộ lọc kèm số đếm, đúng chữ trong ảnh: "Chưa chọn sao (4)". */
export function ticketFilterLabel(
  filter: TicketFilter,
  counts: TicketCounts,
): string {
  return `${TICKET_FILTER_LABELS[filter]} (${counts[filter]})`;
}

/**
 * Số phiếu nút "Gửi phiếu cả lớp (n)" sẽ gửi: phiếu đã chọn sao mà chưa gửi.
 * Em chưa chọn sao bị bỏ qua, phiếu đã gửi không gửi lại.
 */
export function sendableCount(rows: TicketRow[]): number {
  return rows.filter((row) => row.stars !== null && row.status !== "sent")
    .length;
}

/** Nhãn nút gửi cả lớp; mất mạng thì báo "sẽ gửi khi có mạng" (ảnh 44). */
export function sendButtonLabel(count: number, offline: boolean): string {
  if (count === 0) return "Gửi phiếu cả lớp (0)";
  return offline
    ? `Sẽ gửi khi có mạng (${count})`
    : `Gửi phiếu cả lớp (${count})`;
}

export type TicketBadgeTone = "neutral" | "success" | "warning";

export interface TicketBadge {
  label: string;
  tone: TicketBadgeTone;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  none: "Chưa gửi",
  draft: "Chưa gửi",
  queued: "Chờ mạng",
  sent: "Đã gửi",
};

/** Nhãn trạng thái phiếu trên danh sách: Đã gửi · hh:mm / Chờ mạng / Chưa gửi. */
export function ticketBadge(row: TicketRow): TicketBadge {
  if (row.status === "sent")
    return {
      label: row.sentAt
        ? `${STATUS_LABELS.sent} · ${formatTime(row.sentAt)}`
        : STATUS_LABELS.sent,
      tone: "success",
    };
  if (row.status === "queued")
    return { label: STATUS_LABELS.queued, tone: "warning" };
  return { label: STATUS_LABELS[row.status], tone: "neutral" };
}

/** Hai chữ đầu của hai từ cuối, cùng quy ước avatar toàn app. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

export type HomeworkLineTone = "muted" | "warning";

export interface HomeworkLine {
  text: string;
  tone: HomeworkLineTone;
}

/**
 * Dòng tóm tắt BTVN buổi trước dưới mỗi em:
 * "BTVN buổi 17: 2/2 phần đã chấm" / "BTVN buổi 17: 1 phần Chưa chấm" /
 * "Buổi đầu · chưa có BTVN buổi trước" / "Buổi trước không giao BTVN".
 */
export function homeworkLine(
  summary: HomeworkSummary,
  previousSessionNumber: number | null,
): HomeworkLine {
  if (summary.state === "first")
    return { text: "Buổi đầu · chưa có BTVN buổi trước", tone: "muted" };
  if (summary.state === "none-given")
    return { text: "Buổi trước không giao BTVN", tone: "muted" };
  const prefix =
    previousSessionNumber === null
      ? "BTVN buổi trước"
      : `BTVN buổi ${previousSessionNumber}`;
  if (summary.ungradedSections > 0)
    return {
      text: `${prefix}: ${summary.ungradedSections} phần Chưa chấm`,
      tone: "warning",
    };
  return {
    text: `${prefix}: ${summary.gradedSections}/${summary.totalSections} phần đã chấm`,
    tone: "muted",
  };
}
