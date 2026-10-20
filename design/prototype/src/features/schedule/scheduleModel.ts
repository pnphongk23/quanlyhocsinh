import type { PillTone } from "../../shared/ui";
import type { Session } from "../../data/types";

export interface ScheduleEntry {
  session: Session;
  className: string;
  time: string;
  sessionNumber: number;
  studentCount: number;
}

export type ScheduleGroup =
  | { kind: "overdue"; date: string; entries: ScheduleEntry[] }
  | { kind: "day"; date: string; entries: ScheduleEntry[] };

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function byTimeThenName(a: ScheduleEntry, b: ScheduleEntry): number {
  return a.time.localeCompare(b.time) || a.className.localeCompare(b.className, "vi");
}

/** Dùng cho màn Lịch: kiểu mục chỉ cần buổi và tên lớp, giờ nằm trong buổi. */
export interface CalendarEntryLike {
  session: Session;
  className: string;
}

function bySessionTimeThenName(
  a: CalendarEntryLike,
  b: CalendarEntryLike,
): number {
  return (
    (a.session.time ?? "").localeCompare(b.session.time ?? "") ||
    a.className.localeCompare(b.className, "vi")
  );
}

export function groupScheduleEntries(
  entries: ScheduleEntry[],
  today: string,
  days = 14,
): ScheduleGroup[] {
  const end = addDays(today, days - 1);
  const buckets = new Map<string, ScheduleEntry[]>();

  for (const entry of entries) {
    if (entry.session.status !== "planned") continue;
    const date = entry.session.date;
    if (date >= today && date <= end) {
      const bucket = buckets.get(date) ?? [];
      bucket.push(entry);
      buckets.set(date, bucket);
    }
  }

  const groups: ScheduleGroup[] = [];
  const overdue = entries
    .filter((entry) => entry.session.status === "planned" && entry.session.date < today)
    .sort((a, b) => a.session.date.localeCompare(b.session.date) || byTimeThenName(a, b));
  if (overdue.length) {
    groups.push({ kind: "overdue", date: "overdue", entries: overdue });
  }

  for (const [date, dayEntries] of [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    groups.push({ kind: "day", date, entries: dayEntries.sort(byTimeThenName) });
  }
  return groups;
}

/** Buổi đã tới ngày học (kể cả hôm nay) thì điểm danh được; xem design 14, 17, 76. */
export type ScheduleAction = "checkin" | "status";

export interface ScheduleState {
  /** Nhãn hiện ở cuối thẻ buổi, hoặc chữ trên nút hành động. */
  label: string;
  tone: PillTone;
  action: ScheduleAction;
}

export function scheduleState(session: Session, today: string): ScheduleState {
  if (session.status === "cancelled")
    return { label: "Đã huỷ", tone: "warning", action: "status" };
  if (session.status === "held")
    return { label: "Đã điểm danh", tone: "success", action: "status" };
  if (session.date < today)
    return { label: "Chưa điểm danh", tone: "warning", action: "status" };
  if (session.date === today)
    return { label: "Điểm danh", tone: "primary", action: "checkin" };
  return { label: "Chưa tới", tone: "neutral", action: "status" };
}

/** Các buổi còn tới sau một ngày, xếp theo ngày rồi giờ (nhóm "Sắp tới" của design 14). */
export function upcomingEntries<T extends CalendarEntryLike>(
  entries: T[],
  from: string,
  days = 14,
): T[] {
  const end = addDays(from, days - 1);
  return entries
    .filter(
      (entry) =>
        entry.session.status === "planned" &&
        entry.session.date > from &&
        entry.session.date <= end,
    )
    .sort(
      (a, b) =>
        a.session.date.localeCompare(b.session.date) ||
        bySessionTimeThenName(a, b),
    );
}

/** Bỏ các tuần không có ngày nào thuộc tháng đang xem (design 15 vẽ 5 hàng cho tháng 10/2026). */
export function trimMonthWeeks<T extends { inMonth: boolean }>(weeks: T[][]): T[][] {
  const first = weeks.findIndex((week) => week.some((cell) => cell.inMonth));
  if (first === -1) return [];
  const last =
    weeks.length -
    1 -
    [...weeks].reverse().findIndex((week) => week.some((cell) => cell.inMonth));
  return weeks.slice(first, last + 1);
}
