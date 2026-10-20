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
export const formatScore = (value: number | null) =>
  value === null
    ? "Chưa có điểm"
    : new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
export function todayISO(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
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
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days = [...klass.weekdays]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((day) => weekdayNames[day])
    .filter(Boolean);
  return days.length ? `${days.join(", ")} · ${klass.time}` : klass.time;
}
