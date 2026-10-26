import type { TicketRow, TicketStatus } from "../../data/homework";
import type { HomeworkSummary } from "../../data/homework";
import { criteriaWithHomework } from "../../data/slip";
import type { HomeworkGrade, SlipScale } from "../../data/types";
import { formatTime } from "../../shared/format";

/**
 * Mô hình hiển thị của tab Nhận xét (ảnh 40–47): bộ lọc, số đếm, nhãn trạng
 * thái phiếu và tóm tắt BTVN buổi trước. Tách khỏi React để test được.
 */
export type TicketFilter = "all" | "unsent";

export const TICKET_FILTERS: TicketFilter[] = ["all", "unsent"];

/** Applies the previous homework result only to an unsent, non-legacy automatic slip. */
export function criteriaWithHomeworkResult(
  criteria: number,
  previousGrades: readonly HomeworkGrade[] | null,
  hwManual: boolean,
  sent: boolean,
  scale: SlipScale,
): number {
  if (sent || scale === 3) return criteria;
  return criteriaWithHomework(criteria, previousGrades, hwManual);
}

/** A slip that is sent or already queued to send must not be rewritten by a later homework regrade. */
export function slipFrozenForAutoUpdate(status: TicketRow["status"]): boolean {
  return status === "sent" || status === "queued";
}

/** Only toggling the homework chip opts the teacher into a manual BTVN value. */
export function hwManualAfterCriterionToggle(current: boolean, index: number): boolean {
  return index === 4 ? true : current;
}

/** Preserve legacy custom text and the note exactly when moving both into note storage. */
export function preserveLegacyComment(comment: string | null, note: string): string {
  if (!comment) return note;
  return note ? `${comment}\n${note}` : comment;
}

export const TICKET_FILTER_LABELS: Record<TicketFilter, string> = {
  all: "Tất cả",
  unsent: "Chưa gửi",
};

export interface TicketCounts {
  all: number;
  unsent: number;
}

export function ticketMatchesFilter(
  row: TicketRow,
  filter: TicketFilter,
): boolean {
  if (filter === "unsent") return row.status !== "sent";
  return true;
}

export function filterTicketRows(
  rows: TicketRow[],
  filter: TicketFilter,
): TicketRow[] {
  return rows.filter((row) => ticketMatchesFilter(row, filter));
}

/** Số đếm trên hai bộ lọc Tất cả / Chưa gửi. */
export function ticketCounts(rows: TicketRow[]): TicketCounts {
  return {
    all: rows.length,
    unsent: rows.filter((row) => row.status !== "sent").length,
  };
}

/** Nhãn bộ lọc kèm số đếm. */
export function ticketFilterLabel(
  filter: TicketFilter,
  counts: TicketCounts,
): string {
  return `${TICKET_FILTER_LABELS[filter]} (${counts[filter]})`;
}

/** Phiếu "Gửi phiếu cả lớp" sẽ gửi: chỉ phiếu đã có, chưa gửi và chưa chờ gửi. Em chưa có phiếu không được gửi. */
export function sendableRows(rows: TicketRow[]): TicketRow[] {
  return rows.filter((row) => row.comment !== null && row.status !== "sent" && row.status !== "queued");
}

/** Em chưa có phiếu: bị bỏ qua khi gửi cả lớp (muốn gửi thì mở phiếu em đó hoặc bấm "Gán tất cả mặc định"). */
export function unopenedRows(rows: TicketRow[]): TicketRow[] {
  return rows.filter((row) => row.comment === null);
}

/** Số phiếu nút "Gửi phiếu cả lớp (n)" sẽ gửi. */
export function sendableCount(rows: TicketRow[]): number {
  return sendableRows(rows).length;
}

/** Nhãn nút gửi cả lớp; trạng thái mạng giải thích riêng cạnh nút. */
export function sendButtonLabel(count: number, offline: boolean): string {
  void offline;
  return `Gửi phiếu cả lớp (${count})`;
}

export function sendButtonDisabled(count: number, offline: boolean): boolean {
  return count === 0 || offline;
}

export type TicketBadgeTone = "neutral" | "success" | "warning";

export interface TicketBadge {
  label: string;
  tone: TicketBadgeTone;
}

/** Em chưa có phiếu: không hiện sao. */
export const UNOPENED_LABEL = "Chưa nhận xét";

const STATUS_LABELS: Record<TicketStatus, string> = {
  none: "Chưa gửi",
  draft: "Chưa gửi",
  queued: "Chờ mạng",
  sent: "Đã gửi",
};

/** Nhãn trạng thái phiếu trên danh sách: Đã gửi · hh:mm / Chờ mạng / Chưa gửi. */
export function ticketBadge(row: TicketRow): TicketBadge {
  if (row.comment === null) return { label: UNOPENED_LABEL, tone: "neutral" };
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
 * "BTVN buổi trước: 2/2 phần đã chấm" / "BTVN buổi trước: 1 phần Chưa chấm" /
 * "Bài tập buổi trước chưa có" / "Buổi trước không giao BTVN".
 */
export function homeworkLine(summary: HomeworkSummary): HomeworkLine {
  if (summary.state === "first")
    return { text: "Bài tập buổi trước chưa có", tone: "muted" };
  if (summary.state === "none-given")
    return { text: "Buổi trước không giao BTVN", tone: "muted" };
  const prefix = "BTVN buổi trước";
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
