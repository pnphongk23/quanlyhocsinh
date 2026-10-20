import type { HomeworkKind, HomeworkLevel, StarLevel } from "../../data/types";
import {
  HOMEWORK_KIND_LABELS,
  HOMEWORK_LEVEL_LABELS,
} from "../../data/homework";

/**
 * Định dạng ngày, tháng và nhãn dùng riêng cho màn phụ huynh.
 *
 * Chữ lấy đúng ảnh chuẩn (plans/design-review/.../final): "Buổi 18 · Thứ Sáu
 * 16/10" (ảnh 08), "Buổi 18 · 16 tháng 10" (ảnh 14), "Chưa chấm", "Hoàn thành
 * tốt", "Chưa có buổi chấm". Điểm hiển thị dấu chấm (7.2) như ảnh 10/15.
 */

const WEEKDAYS = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

function dateOf(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

/** "16/10" */
export function dayMonth(iso: string): string {
  const date = dateOf(iso);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** "Thứ Sáu 16/10" */
export function weekdayDayMonth(iso: string): string {
  return `${WEEKDAYS[dateOf(iso).getDay()]} ${dayMonth(iso)}`;
}

/** "16 tháng 10" */
export function longDayMonth(iso: string): string {
  const date = dateOf(iso);
  return `${date.getDate()} tháng ${date.getMonth() + 1}`;
}

/** "Tháng 10" */
export function monthLabel(month: string): string {
  return `Tháng ${Number(month.slice(5, 7))}`;
}

/** "tháng 9" (dùng trong câu so sánh) */
export function monthName(month: string): string {
  return `tháng ${Number(month.slice(5, 7))}`;
}

/** Tháng trước của "2026-10" → "2026-09". */
export function previousMonthOf(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 2, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Điểm theo dấu chấm như ảnh: "7.2"; null = "Chưa có điểm". */
export function scoreText(value: number | null): string {
  return value === null ? "Chưa có điểm" : value.toFixed(1);
}

/** "7.2/10" */
export function scoreOverTen(value: number | null): string {
  return value === null ? "Chưa có điểm" : `${value.toFixed(1)}/10`;
}

export const starText: Record<StarLevel, string> = {
  1: "1 sao",
  2: "2 sao",
  3: "3 sao",
};

export function homeworkKindLabel(kind: HomeworkKind): string {
  return HOMEWORK_KIND_LABELS[kind];
}

/** "Hoàn thành tốt" | "Hoàn thành" | "Chưa hoàn thành"; null = "Chưa chấm". */
export function homeworkLevelLabel(level: HomeworkLevel | null): string {
  return level === null ? "Chưa chấm" : HOMEWORK_LEVEL_LABELS[level];
}

export type GuardianTone = "neutral" | "success" | "warning" | "error" | "primary";

export function homeworkLevelTone(level: HomeworkLevel | null): GuardianTone {
  if (level === "excellent") return "success";
  if (level === "done") return "primary";
  if (level === "not_done") return "error";
  return "neutral";
}

export type AttendanceStatus = "present" | "late" | "excused" | "absent";

export const attendanceText: Record<AttendanceStatus, string> = {
  present: "Có mặt",
  late: "Muộn",
  excused: "Có phép",
  absent: "Vắng",
};

export function attendanceTone(status: AttendanceStatus): GuardianTone {
  if (status === "present") return "success";
  if (status === "late") return "warning";
  if (status === "excused") return "primary";
  return "error";
}

/** "GB" từ "Trần Gia Bảo": chữ đầu của hai từ cuối. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("vi-VN");
}

/** "Gia Bảo" từ "Trần Gia Bảo": hai từ cuối, như chip chọn con ở ảnh 15. */
export function shortNameOf(name: string): string {
  return name.trim().split(/\s+/).slice(-2).join(" ");
}
