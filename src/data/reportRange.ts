import type { ReportBatch, Session } from "./types";
import { sessionDateLabel } from "./sessionLabel";

/** Khoá so sánh thứ tự buổi: "YYYY-MM-DD HH:MM", khớp mốc `from_key`/`to_key` của máy chủ. */
export const sessionKey = (session: Pick<Session, "date" | "time">): string =>
  `${session.date} ${session.time ?? "00:00"}`;

/** Buổi chưa hủy của lớp theo thứ tự thời gian. */
export function countedSessions(sessions: Session[], classId: string): Session[] {
  return sessions
    .filter((session) => session.classId === classId && session.status !== "cancelled")
    .sort((a, b) => sessionKey(a).localeCompare(sessionKey(b)));
}

/** "2026-10-24" hoặc "2026-10-24 18:00" → "24/10". */
export function dayMonthLabel(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** Một lựa chọn buổi trong hộp thoại thêm báo cáo. */
export interface SessionChoice {
  session: Session;
  number: number;
  /** "T3 · 21/10". */
  label: string;
}

/** Các buổi chọn được làm đầu/cuối đợt, hiện theo thứ và ngày. */
export function sessionChoices(sessions: Session[], classId: string): SessionChoice[] {
  return countedSessions(sessions, classId).map((session, index) => ({
    session,
    number: index + 1,
    label: sessionDateLabel(session.date),
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
  const first = counted[0];
  const last = counted.filter((session) => session.status === "held").at(-1);
  return first && last ? { fromSessionId: first.id, toSessionId: last.id } : null;
}

/** Nhãn khoảng ngày của một đợt. */
export interface RangeLabels {
  /** "01/10–24/10" (một ngày: "14/10"). */
  label: string;
  /** Luôn rỗng; giữ thuộc tính để tương thích với hộp xem trước hiện có. */
  sessionsLabel: string;
  /** "01/10–24/10" (một ngày: "14/10"). */
  datesLabel: string;
}

export function rangeLabels(range: {
  fromKey: string;
  toKey: string;
  fromNumber: number | null;
  toNumber: number | null;
  month?: string | null;
}): RangeLabels {
  if (range.month && range.fromNumber === null && range.toNumber === null) {
    const [year, month] = range.month.split("-");
    const label = `Tháng ${Number(month)}/${year}`;
    return { label, sessionsLabel: "", datesLabel: label };
  }
  const from = dayMonthLabel(range.fromKey);
  const to = dayMonthLabel(range.toKey);
  const datesLabel = range.fromKey.slice(0, 10) === range.toKey.slice(0, 10) ? from : `${from}–${to}`;
  const hasRangeNumbers = range.fromNumber !== null && range.toNumber !== null;
  const label = hasRangeNumbers ? `Buổi ${range.fromNumber}–${range.toNumber} · ${datesLabel}` : datesLabel;
  return { label, sessionsLabel: "", datesLabel };
}

/** Khoảng của một đợt: mốc ngày và số thứ tự nội bộ để tương thích dữ liệu. */
export interface ResolvedRange extends RangeLabels {
  fromKey: string;
  toKey: string;
  fromNumber: number | null;
  toNumber: number | null;
}

/**
 * Giải mã khoảng của đợt từ mốc `fromKey`/`toKey`. Số buổi lấy theo buổi đầu/cuối
 * hiện tại của lớp; buổi đã hủy hoặc đợt chuyển từ báo cáo tháng cũ thì không có số.
 */
export function resolveRange(sessions: Session[], batch: ReportBatch): ResolvedRange {
  const counted = countedSessions(sessions, batch.classId);
  const numberOf = (id: string | null) => {
    const index = id ? counted.findIndex((item) => item.id === id) : -1;
    return index < 0 ? null : index + 1;
  };
  const range = {
    fromKey: batch.fromKey,
    toKey: batch.toKey,
    fromNumber: batch.fromNumber ?? numberOf(batch.fromSessionId),
    toNumber: batch.toNumber ?? numberOf(batch.toSessionId),
    month: batch.month,
  };
  const complete = range.fromNumber !== null && range.toNumber !== null;
  return { ...range, ...rangeLabels(complete ? range : { ...range, fromNumber: null, toNumber: null }) };
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
  if (from.status === "cancelled" || to.status === "cancelled") return "Không chọn buổi đã hủy.";
  if (sessionKey(from).localeCompare(sessionKey(to)) > 0)
    return "Buổi bắt đầu phải trước hoặc cùng buổi kết thúc.";
  return null;
}

/** Thứ tự đợt như máy chủ: buổi cuối mới nhất trước, rồi buổi đầu, rồi mã. */
export function compareBatches(a: ReportBatch, b: ReportBatch): number {
  return b.toKey.localeCompare(a.toKey) || b.fromKey.localeCompare(a.fromKey) || a.id.localeCompare(b.id);
}
