import type { ApiSession } from "../../data/api/types";
import type { Session } from "../../data/types";

export interface DateRange {
  from: string;
  to: string;
}

function localDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function toISO(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function addDays(iso: string, amount: number): string {
  const date = localDate(iso);
  date.setDate(date.getDate() + amount);
  return toISO(date);
}

export function addMonths(iso: string, amount: number): string {
  const source = localDate(iso);
  const day = source.getDate();
  const target = new Date(source.getFullYear(), source.getMonth() + amount, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISO(target);
}

export function monthRange(month: string): DateRange {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1, 12);
  const last = new Date(year, monthNumber, 0, 12);
  return { from: toISO(first), to: toISO(last) };
}

export function snapshotRange(today: string): DateRange {
  return { from: addDays(today, -90), to: addDays(today, 56) };
}

export function isWithinRange(range: DateRange, bounds: DateRange): boolean {
  return range.from >= bounds.from && range.to <= bounds.to;
}

export function monthTitle(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `Tháng ${Number(monthNumber)}, ${year}`;
}

export function weekdayDateLabel(iso: string): string {
  const date = localDate(iso);
  const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return `${weekdays[date.getDay()]}, ${date.getDate()} tháng ${date.getMonth() + 1}`;
}

export function scheduleStatus(session: Session): string {
  if (session.status === "cancelled") return "Đã huỷ";
  if (session.makeup) return "Học bù";
  return session.status === "planned" ? "Sắp học" : "Đã học";
}

export function sessionFromApi(item: ApiSession): Session {
  return {
    id: item.id,
    classId: item.class_id,
    date: item.date,
    time: item.start_time,
    origin: item.origin,
    makeup: item.is_makeup,
    status: item.status,
    version: item.version,
  };
}
