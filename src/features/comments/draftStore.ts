import { useEffect, useRef } from "react";
import type { StarLevel } from "../../data/types";

/**
 * Nháp của sheet nhận xét được giữ khi đóng sheet (ảnh 41: "Nháp, chưa lưu").
 * Khoá theo buổi + em, chỉ nằm trong sessionStorage của tab đang mở; nội dung
 * nhận xét không bao giờ ghi ra console/log.
 */
export interface TicketDraft {
  criteria: number;
  comment: string | null;
  note: string;
  hwManual?: boolean;
}

const PREFIX = "comment-draft:";

export function draftKey(sessionId: string, studentId: string): string {
  return `${PREFIX}${sessionId}:${studentId}`;
}

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function readDraft(
  sessionId: string,
  studentId: string,
): TicketDraft | null {
  const box = storage();
  if (!box) return null;
  try {
    const raw = box.getItem(draftKey(sessionId, studentId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
      const legacyStars: StarLevel | null = record.stars === 1 || record.stars === 2 || record.stars === 3 ? record.stars : null;
      const criteria = Number.isInteger(record.criteria) && Number(record.criteria) >= 0 && Number(record.criteria) <= 31
        ? Number(record.criteria)
        : legacyStars === null ? 31 : (1 << legacyStars) - 1;
      return { criteria, comment: typeof record.comment === "string" ? record.comment : null, note: typeof record.note === "string" ? record.note : "", ...(typeof record.hwManual === "boolean" ? { hwManual: record.hwManual } : {}) };
  } catch {
    return null;
  }
}

export function writeDraft(
  sessionId: string,
  studentId: string,
  draft: TicketDraft,
): void {
  const box = storage();
  if (!box) return;
  try {
    box.setItem(draftKey(sessionId, studentId), JSON.stringify(draft));
  } catch {
    // Hết dung lượng hoặc trình duyệt chặn: giữ nháp trong bộ nhớ của sheet.
  }
}

export function clearDraft(sessionId: string, studentId: string): void {
  const box = storage();
  if (!box) return;
  try {
    box.removeItem(draftKey(sessionId, studentId));
  } catch {
    // Không xoá được thì lần mở sau vẫn còn nháp; không chặn thao tác lưu.
  }
}

const RESET_EVENT = "comment-drafts-reset";

/** Bỏ mọi nháp của buổi và báo các phiếu đang mở nạp lại từ dữ liệu đã lưu (sau khi gán mặc định cả lớp). */
export function resetSessionDrafts(sessionId: string): void {
  const box = storage();
  if (box) {
    try {
      const prefix = `${PREFIX}${sessionId}:`;
      for (const key of Object.keys(box).filter((name) => name.startsWith(prefix))) box.removeItem(key);
    } catch {
      // Không xoá được thì bỏ qua; phiếu đang mở vẫn nạp lại từ dữ liệu đã lưu.
    }
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(RESET_EVENT, { detail: sessionId }));
}

/** Gọi `onReset` mỗi khi nháp của buổi này bị bỏ do thao tác hàng loạt. */
export function useSessionDraftReset(sessionId: string, onReset: () => void): void {
  const latest = useRef(onReset);
  latest.current = onReset;
  useEffect(() => {
    const handler = (event: Event) => {
      if ((event as CustomEvent<string>).detail === sessionId) latest.current();
    };
    window.addEventListener(RESET_EVENT, handler);
    return () => window.removeEventListener(RESET_EVENT, handler);
  }, [sessionId]);
}
