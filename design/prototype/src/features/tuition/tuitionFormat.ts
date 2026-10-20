import type { TuitionInvoice } from "../../data/tuition";
import type { PillTone } from "../../shared/ui";

/** Định dạng tiền VND, ví dụ 1200000 → "1.200.000 đ". */
export function formatMoney(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} đ`;
}

/** Nhãn tháng từ "2026-10" → "Tháng 10/2026". */
export function monthLabel(month: string): string {
  const [year, value] = month.split("-");
  return `Tháng ${Number(value)}/${year}`;
}

/** Nhãn tháng dạng câu, ví dụ "tháng 10, 2026" (dùng trong phụ đề). */
export function monthPhrase(month: string): string {
  const [year, value] = month.split("-");
  return `tháng ${Number(value)}, ${year}`;
}

/** Nhãn tháng ngắn cho câu "Nợ tháng 9", ví dụ "2026-09" → "Tháng 9". */
export function shortMonthLabel(month: string): string {
  const [, value] = month.split("-");
  return `Tháng ${Number(value)}`;
}

/** Dịch tháng theo offset, ví dụ ("2026-10", -1) → "2026-09". */
export function shiftMonth(month: string, offset: number): string {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(year, value - 1 + offset, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Tháng mặc định của màn học phí (prototype: tháng 10/2026). */
export const DEFAULT_TUITION_MONTH = "2026-10";

/** Đọc tháng từ query ?thang=YYYY-MM; sai định dạng thì dùng tháng mặc định. */
export function readMonth(value: string | null): string {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? value
    : DEFAULT_TUITION_MONTH;
}

/** Chữ viết tắt từ hai từ cuối của tên, ví dụ "Nguyễn Minh Anh" → "MA". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const last = words[words.length - 1];
  const previous = words[words.length - 2];
  return `${previous[0]}${last[0]}`.toUpperCase();
}

/** Bộ lọc trạng thái phiếu học phí trên màn Học phí tháng. */
export type TuitionFilter = "all" | "unpaid" | "partial" | "paid";

export const TUITION_FILTERS: Array<{
  value: TuitionFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả" },
  { value: "unpaid", label: "Chưa thu" },
  { value: "partial", label: "Một phần" },
  { value: "paid", label: "Đã thu đủ" },
];

/** Đọc bộ lọc từ query ?loc=, sai hoặc thiếu thì dùng "all". */
export function readFilter(value: string | null): TuitionFilter {
  return TUITION_FILTERS.some((item) => item.value === value)
    ? (value as TuitionFilter)
    : "all";
}

/** Lọc phiếu theo trạng thái; "all" giữ nguyên thứ tự theo tên của lớp. */
export function filterInvoices(
  invoices: TuitionInvoice[],
  filter: TuitionFilter,
): TuitionInvoice[] {
  if (filter === "all") return invoices;
  return invoices.filter((invoice) => invoice.status === filter);
}

/** Nhãn trạng thái phiếu học phí, dùng chung cho danh sách và phiếu. */
export const TUITION_STATUS_LABEL: Record<TuitionInvoice["status"], string> = {
  nofee: "Không phí",
  unpaid: "Chưa thu",
  partial: "Thu một phần",
  paid: "Đã thu đủ",
};

export const TUITION_STATUS_TONE: Record<
  TuitionInvoice["status"],
  PillTone
> = {
  nofee: "neutral",
  unpaid: "error",
  partial: "warning",
  paid: "success",
};
