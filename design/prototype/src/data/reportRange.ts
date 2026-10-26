import type { Report, ReportBatch, Session, Student } from "./types";

/** Khoá so sánh thứ tự buổi: ngày rồi giờ (giống thứ tự số buổi của lớp). */
export const sessionKey = (session: Session): string =>
  `${session.date} ${session.time ?? "00:00"}`;

/** Buổi chưa hủy của lớp theo thứ tự thời gian; số buổi = vị trí + 1 (spec mục 4). */
export function countedSessions(sessions: Session[], classId: string): Session[] {
  return sessions
    .filter((session) => session.classId === classId && session.status !== "cancelled")
    .sort((a, b) => sessionKey(a).localeCompare(sessionKey(b)));
}

/** "2026-10-24" → "24/10". */
export function dayMonthLabel(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** Một lựa chọn buổi trong hộp thoại thêm báo cáo. */
export interface SessionChoice {
  session: Session;
  number: number;
  /** "Buổi 3 · 21/10". */
  label: string;
}

/** Các buổi chọn được làm đầu/cuối đợt: mọi buổi chưa hủy, kèm số buổi và ngày. */
export function sessionChoices(sessions: Session[], classId: string): SessionChoice[] {
  return countedSessions(sessions, classId).map((session, index) => ({
    session,
    number: index + 1,
    label: `Buổi ${index + 1} · ${dayMonthLabel(session.date)}`,
  }));
}

/**
 * Khoảng mặc định: từ buổi đầu tiên đến buổi đã diễn ra gần nhất. Lớp chưa có
 * buổi nào đã diễn ra thì trả null (chưa có gì để báo cáo).
 */
export function defaultRange(
  sessions: Session[],
  classId: string,
): { fromSessionId: string; toSessionId: string } | null {
  const counted = countedSessions(sessions, classId);
  const held = counted.filter((session) => session.status === "held");
  const first = counted[0];
  const last = held.at(-1);
  return first && last
    ? { fromSessionId: first.id, toSessionId: last.id }
    : null;
}

/** Khoảng buổi đã giải mã của một đợt. */
export interface ResolvedRange {
  from: Session;
  to: Session;
  fromNumber: number;
  toNumber: number;
  /** "Buổi 1–8 · 01/10–24/10" (một buổi: "Buổi 8 · 14/10"). */
  label: string;
  /** "Buổi 1–8", dùng làm tiêu đề ngắn. */
  sessionsLabel: string;
  /** "01/10–24/10" (một buổi: "14/10"). */
  datesLabel: string;
}

/** Giải mã khoảng của đợt; null khi buổi đầu/cuối không còn hợp lệ (đã hủy, đảo thứ tự). */
export function resolveRange(
  sessions: Session[],
  batch: Pick<ReportBatch, "classId" | "fromSessionId" | "toSessionId">,
): ResolvedRange | null {
  const counted = countedSessions(sessions, batch.classId);
  const fromIndex = counted.findIndex((item) => item.id === batch.fromSessionId);
  const toIndex = counted.findIndex((item) => item.id === batch.toSessionId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex > toIndex) return null;
  const from = counted[fromIndex];
  const to = counted[toIndex];
  const same = fromIndex === toIndex;
  const sessionsLabel = same
    ? `Buổi ${fromIndex + 1}`
    : `Buổi ${fromIndex + 1}–${toIndex + 1}`;
  const dates = same
    ? dayMonthLabel(from.date)
    : `${dayMonthLabel(from.date)}–${dayMonthLabel(to.date)}`;
  return {
    from,
    to,
    fromNumber: fromIndex + 1,
    toNumber: toIndex + 1,
    label: `${sessionsLabel} · ${dates}`,
    sessionsLabel,
    datesLabel: dates,
  };
}

/**
 * Em có học trong khoảng: vào lớp không muộn hơn ngày buổi cuối và chưa rời
 * lớp trước ngày buổi đầu (em vào/rời giữa khoảng vẫn có báo cáo).
 */
export function studentInRange(
  student: Pick<Student, "enrolledAt" | "leftAt">,
  range: Pick<ResolvedRange, "from" | "to">,
): boolean {
  return (
    student.enrolledAt <= range.to.date &&
    (!student.leftAt || student.leftAt >= range.from.date)
  );
}

/** Báo cáo có phủ ngày này không (để gắn cờ phát hành lại khi sửa điểm). */
export function reportCoversDate(
  report: Pick<Report, "batchId">,
  batches: ReportBatch[],
  sessions: Session[],
  date: string,
): boolean {
  const batch = batches.find((item) => item.id === report.batchId);
  if (!batch) return false;
  const range = resolveRange(sessions, batch);
  return range !== null && date >= range.from.date && date <= range.to.date;
}

/** Kiểm tra hai buổi cho một đợt mới; trả thông báo lỗi hoặc null khi hợp lệ. */
export function rangeError(
  sessions: Session[],
  classId: string,
  fromSessionId: string,
  toSessionId: string,
): string | null {
  const from = sessions.find((item) => item.id === fromSessionId);
  const to = sessions.find((item) => item.id === toSessionId);
  if (!from || !to || from.classId !== classId || to.classId !== classId)
    return "Chọn buổi thuộc lớp này.";
  if (from.status === "cancelled" || to.status === "cancelled")
    return "Không chọn buổi đã hủy.";
  if (sessionKey(from).localeCompare(sessionKey(to)) > 0)
    return "Buổi bắt đầu phải trước hoặc cùng buổi kết thúc.";
  return null;
}
