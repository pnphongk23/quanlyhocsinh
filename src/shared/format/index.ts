import { normalizeWeekdays } from "../weekdays";
export { dateISO, todayISO } from "../date";

function asDate(value: string | Date): Date {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + "T00:00:00")
    : new Date(value);
}
export const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(asDate(value));
export const formatTime = (value: string | Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(asDate(value));
export { formatScore } from "../../data/scoreFormat";
export const weekdayNames = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];
export const formatWeekdayDate = (iso: string): string =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso + "T12:00:00"));
export const formatDayMonth = (iso: string): string =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "numeric",
  }).format(new Date(iso + "T12:00:00"));
export const formatDayMonthLong = (iso: string): string =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
  }).format(new Date(iso + "T12:00:00"));
export function formatClassSchedule(klass: {
  weekdays: number[];
  time: string;
}): string {
  const days = normalizeWeekdays(klass.weekdays)
    .map((day) => day === 7 ? 0 : day)
    .map((day) => weekdayNames[day])
    .filter(Boolean);
  return days.length ? `${days.join(", ")} · ${klass.time}` : klass.time;
}
