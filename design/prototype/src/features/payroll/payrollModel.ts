import type { PayrollSummary } from "../../data/payroll";
import type { StaffPosition } from "../../data/types";

/** Tháng mặc định của hai màn Lương khi URL không kèm ?thang=. */
export const DEFAULT_PAYROLL_MONTH = "2026-10";

/** Chuỗi "YYYY-MM" hợp lệ thì giữ nguyên, ngược lại dùng tháng mặc định. */
export function normalizeMonth(value: string | null): string {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : DEFAULT_PAYROLL_MONTH;
}

/** Cộng/trừ số tháng trên chuỗi "YYYY-MM" (delta âm để lùi tháng). */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = year * 12 + (monthNumber - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12 + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

/** Nhãn tháng kiểu "Tháng 10/2026". */
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `Tháng ${Number(monthNumber)}/${year}`;
}

/** Nhãn tháng dạng câu, ví dụ "tháng 10, 2026" (dùng sau chữ "Lương"). */
export function monthPhrase(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `tháng ${Number(monthNumber)}, ${year}`;
}

/** Tiêu đề chọn tháng trên màn Bảng lương, ví dụ "Tháng 10, 2026". */
export function monthTitle(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `Tháng ${Number(monthNumber)}, ${year}`;
}

/** Tiền VND kiểu "1.200.000 đ"; số âm giữ dấu trừ. */
export function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

/** Tiền điều chỉnh có dấu, ví dụ "+100.000 đ" hoặc "-50.000 đ". */
export function signedVnd(value: number): string {
  return `${value > 0 ? "+" : ""}${formatVnd(value)}`;
}

/** Nhãn vị trí dạy trong buổi. */
export function positionLabel(position: StaffPosition): string {
  return position === "main" ? "Giáo viên chính" : "Trợ giảng";
}

/** Nhãn ngắn của vị trí, dùng cho pill trong danh sách buổi. */
export function positionShortLabel(position: StaffPosition): string {
  return position === "main" ? "Dạy chính" : "Trợ giảng";
}

/** Chữ viết tắt từ hai từ cuối của tên, ví dụ "Thầy Quang Minh" → "QM". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const last = words[words.length - 1];
  const previous = words[words.length - 2];
  return `${previous[0]}${last[0]}`.toUpperCase();
}

/** Số buổi dạy thay đã diễn ra và được tính công trong tháng. */
export function substituteCount(summary: PayrollSummary): number {
  return summary.lines.filter(
    (line) => !line.planned && line.entry.kind === "substitute",
  ).length;
}

/**
 * Các vị trí có buổi nhưng đơn giá bằng 0, tức là buổi đó chưa được tính tiền.
 * Trả về thứ tự cố định: chính rồi trợ giảng.
 */
export function unpricedPositions(summary: PayrollSummary): StaffPosition[] {
  const positions: StaffPosition[] = [];
  for (const line of summary.lines) {
    if (line.rate !== 0 || positions.includes(line.entry.position)) continue;
    positions.push(line.entry.position);
  }
  return positions.sort((a, b) => (a === "main" ? -1 : b === "main" ? 1 : 0));
}

/** Dòng buổi dạy thay chưa có đơn giá, dùng cho cảnh báo "chưa được tính". */
export function unpricedSubstituteLines(summary: PayrollSummary) {
  return summary.lines.filter(
    (line) => !line.planned && line.rate === 0 && line.entry.kind === "substitute",
  );
}

/** Ngày dạy gần nhất đã diễn ra trong tháng, dùng cho câu "Tạm tính đến ...". */
export function lastHeldDate(summaries: PayrollSummary[]): string | null {
  let latest: string | null = null;
  for (const summary of summaries) {
    for (const line of summary.lines) {
      if (line.planned) continue;
      if (!latest || line.entry.session.date > latest) {
        latest = line.entry.session.date;
      }
    }
  }
  return latest;
}
