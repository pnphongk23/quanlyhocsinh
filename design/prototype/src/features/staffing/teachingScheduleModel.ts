import type { TeachingEntry } from "../../data/teaching";
import type { ClassStaff, Member, SessionSubstitute } from "../../data/types";
import { formatDayMonth } from "../../shared/format";

/** Tuần bắt đầu Thứ Hai (quy ước lịch của người Việt). */
export function startOfWeek(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  // getDay(): 0 = Chủ nhật; lùi về Thứ Hai gần nhất.
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + days, 12);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Bảy ngày của tuần, từ Thứ Hai đến Chủ nhật. */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** Nhãn khoảng tuần, vd. "12/10 – 18/10/2026". */
export function weekRangeLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const startYear = weekStart.slice(0, 4);
  const endYear = end.slice(0, 4);
  if (startYear !== endYear)
    return `${formatDayMonth(weekStart)}/${startYear} – ${formatDayMonth(end)}/${endYear}`;
  return `${formatDayMonth(weekStart)} – ${formatDayMonth(end)}/${endYear}`;
}

export interface TeachingDayGroup {
  date: string;
  entries: TeachingEntry[];
}

/** Gom buổi dạy theo ngày, giữ thứ tự ngày rồi giờ mà teachingEntries đã sắp. */
export function groupEntriesByDate(
  entries: TeachingEntry[],
): TeachingDayGroup[] {
  const buckets = new Map<string, TeachingEntry[]>();
  for (const entry of entries) {
    const bucket = buckets.get(entry.session.date) ?? [];
    bucket.push(entry);
    buckets.set(entry.session.date, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEntries]) => ({ date, entries: dayEntries }));
}

/** Số buổi được tính công trong tuần (buổi đã dạy, không phải buổi bị thay). */
export function countedTotal(entries: TeachingEntry[]): number {
  return entries.filter((entry) => entry.counted).length;
}

/** Nhãn ngày ngắn cho lưới tuần desktop, vd. "T2 · 12/10". */
export function weekdayShort(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return `${["CN", "T2", "T3", "T4", "T5", "T6", "T7"][date.getDay()]} · ${formatDayMonth(iso)}`;
}

export interface TeachingCounts {
  /** Buổi người này dạy (được gán lớp hoặc dạy thay), bỏ buổi bị thay và buổi huỷ. */
  taught: number;
  /** Trong số đó có bao nhiêu buổi là dạy thay. */
  substitutes: number;
  /** Buổi người này bị người khác dạy thay. */
  replaced: number;
  cancelled: number;
}

/** Số liệu cho dòng tóm tắt (mobile) và ba thẻ tóm tắt (desktop). */
export function weekCounts(entries: TeachingEntry[]): TeachingCounts {
  return {
    taught: entries.filter(
      (entry) =>
        entry.kind !== "replaced" && entry.session.status !== "cancelled",
    ).length,
    substitutes: entries.filter((entry) => entry.kind === "substitute").length,
    replaced: entries.filter((entry) => entry.kind === "replaced").length,
    cancelled: entries.filter((entry) => entry.session.status === "cancelled")
      .length,
  };
}

/**
 * Người này đã từng được phân công lớp hoặc đứng tên dạy thay chưa.
 * Chưa có gì thì màn trống dùng lời "Bạn chưa có buổi dạy".
 */
export function memberHasTeaching(
  state: {
    classStaff: ClassStaff[];
    sessionSubstitutes: SessionSubstitute[];
  },
  memberId: string,
): boolean {
  return (
    state.classStaff.some((item) => item.memberId === memberId) ||
    state.sessionSubstitutes.some(
      (item) => item.substituteMemberId === memberId,
    )
  );
}

/** Nhân sự (role.kind "staff") đang hoạt động; dùng cho bộ chọn của Admin. */
export function activeStaffMembers(
  members: Member[],
  isStaffRole: (roleId: string) => boolean,
): Member[] {
  return members
    .filter(
      (member) => member.status === "active" && isStaffRole(member.roleId),
    )
    .sort(
      (a, b) => a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id),
    );
}

/**
 * Người mặc định mở đầu tiên cho Admin: nhân sự đầu tiên thực sự có việc dạy
 * (được phân công lớp hoặc đứng tên dạy thay), để tuần mở ra không trống.
 */
export function defaultMemberIdFor(
  members: Member[],
  classStaff: ClassStaff[],
  substitutes: SessionSubstitute[],
): string | null {
  const assigned = new Set(classStaff.map((item) => item.memberId));
  for (const substitute of substitutes) assigned.add(substitute.substituteMemberId);
  return members.find((member) => assigned.has(member.id))?.id ?? null;
}
