import type { Comment, StarLevel } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requirePermission, requireSession, requireStudent } from "./helpers";
import {
  canAccessClass,
  canAccessSession,
  canAccessSessionContext,
  CLASS_ACCESS_ERROR,
} from "./access";
import {
  buildTicketRows,
  studentsOnSession,
  type UngradedHomeworkNotice,
  ungradedHomeworkNotice,
} from "../homework";

/** Nhận xét của lớp trong phạm vi vai trò đang dùng. */
export const listComments = (classId: string): Comment[] =>
  canAccessClass(classId)
    ? getStore().comments.filter((c) => c.classId === classId)
    : [];

/** Nhận xét của ĐÚNG một buổi người dùng được xem (kể cả buổi dạy thay). */
export function listSessionComments(sessionId: string): Comment[] {
  if (!canAccessSession(sessionId)) return [];
  return getStore().comments.filter((c) => c.sessionId === sessionId);
}

/** Phiếu của một em trong một buổi (nếu đã có). */
export function getSessionComment(
  sessionId: string,
  studentId: string,
): Comment | null {
  if (!canAccessSession(sessionId)) return null;
  return (
    getStore().comments.find(
      (c) => c.sessionId === sessionId && c.studentId === studentId,
    ) ?? null
  );
}

function validStars(stars: StarLevel | null): StarLevel | null {
  if (stars === null) return null;
  if (stars !== 1 && stars !== 2 && stars !== 3)
    throw new Error("Mức sao phải là 1, 2 hoặc 3.");
  return stars;
}

/**
 * Lưu phiếu buổi học của một em (upsert theo buổi + học sinh).
 * - Chưa gửi: giữ trạng thái nháp.
 * - Đã gửi: giữ trạng thái "sent" và giữ `sentAt` lần gửi đầu; phụ huynh thấy
 *   bản sửa ngay, không có bản nháp song song.
 * Ghi qua commit() nên lưu được khi mất mạng.
 */
export function saveSessionComment(input: {
  sessionId: string;
  studentId: string;
  stars: StarLevel | null;
  note?: string;
}): Comment {
  requirePermission("comments_reports", "write");
  const session = requireSession(input.sessionId);
  if (!canAccessSessionContext(session.classId, input.sessionId))
    throw new Error(CLASS_ACCESS_ERROR);
  if (session.status === "cancelled")
    throw new Error("Buổi học đã hủy nên không có phiếu buổi học.");
  const student = requireStudent(input.studentId);
  if (student.classId !== session.classId)
    throw new Error("Nhận xét phải thuộc cùng lớp.");
  // Phiếu của một buổi chỉ gồm em đang học vào ngày đó.
  if (!studentsOnSession(getStore(), session).some((item) => item.id === student.id))
    throw new Error("Học sinh không học ở buổi này.");
  const stars = validStars(input.stars);
  const now = new Date().toISOString();
  const old = getStore().comments.find(
    (c) => c.sessionId === input.sessionId && c.studentId === input.studentId,
  );
  // Phiếu đã gửi phải giữ mức sao: phụ huynh đang thấy câu mẫu theo mức đó.
  if (old?.status === "sent" && stars === null)
    throw new Error("Phiếu đã gửi phải giữ mức sao.");
  const item: Comment = {
    id: old?.id ?? crypto.randomUUID(),
    classId: session.classId,
    studentId: input.studentId,
    sessionId: input.sessionId,
    stars,
    note: input.note?.trim() ?? "",
    status: old?.status ?? "draft",
    // Đổi sao/ghi chú trên phiếu đang chờ mạng vẫn giữ hàng đợi gửi.
    sendQueued: old?.sendQueued ?? false,
    sentAt: old?.sentAt ?? null,
    createdAt: old?.createdAt ?? now,
    updatedAt: now,
  };
  commit("comments", item.id, (d) => {
    d.comments = d.comments.filter((c) => c.id !== item.id);
    d.comments.push(item);
  });
  return item;
}

/** Kết quả gửi phiếu của một buổi. */
export interface SendTicketsResult {
  /** studentId đã gửi (hoặc đã xếp hàng chờ mạng). */
  sent: string[];
  /** studentId bị bỏ qua vì chưa chọn sao. */
  skipped: string[];
  /** true khi mất mạng: phiếu sẽ gửi khi có mạng. */
  queued: boolean;
  /** Phần BTVN buổi trước còn "Chưa chấm" của các em sẽ gửi. */
  ungraded: UngradedHomeworkNotice;
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * Gửi phiếu của một buổi cho phụ huynh.
 * - Chỉ gửi phiếu đã chọn sao; em chưa chọn sao bị bỏ qua (trả trong `skipped`).
 * - Gửi được cả khi còn phần BTVN chưa chấm; `ungraded` cho UI hỏi xác nhận.
 * - Mất mạng: đánh dấu `sendQueued` và trả `queued: true`; phiếu tự gửi khi có
 *   mạng qua `flushQueuedTickets()`.
 */
export function sendSessionTickets(
  sessionId: string,
  studentIds?: string[],
): SendTicketsResult {
  requirePermission("comments_reports", "write");
  const session = requireSession(sessionId);
  if (!canAccessSessionContext(session.classId, sessionId))
    throw new Error(CLASS_ACCESS_ERROR);
  if (session.status === "cancelled")
    throw new Error("Buổi học đã hủy nên không có phiếu để gửi.");
  const wanted = studentIds ? new Set(studentIds) : null;
  const comments = getStore().comments.filter(
    (c) =>
      c.sessionId === sessionId &&
      c.stars !== null &&
      (!wanted || wanted.has(c.studentId)),
  );
  const skipped = studentIds
    ? studentIds.filter(
        (studentId) => !comments.some((c) => c.studentId === studentId),
      )
    : buildTicketRows(getStore(), sessionId)
        .filter((row) => row.stars === null)
        .map((row) => row.student.id);
  const ungraded = ungradedHomeworkNotice(
    getStore(),
    sessionId,
    comments.map((c) => c.studentId),
  );
  const queued = isOffline();
  const now = new Date().toISOString();
  const sent = comments.map((c) => c.studentId);
  if (!sent.length) return { sent, skipped, queued, ungraded };
  commit("comments", sessionId, (draft) => {
    for (const comment of draft.comments) {
      if (comment.sessionId !== sessionId) continue;
      if (!sent.includes(comment.studentId)) continue;
      if (queued) {
        comment.sendQueued = true;
        comment.updatedAt = now;
      } else {
        comment.status = "sent";
        comment.sendQueued = false;
        comment.sentAt = now;
        comment.updatedAt = now;
      }
    }
  });
  return { sent, skipped, queued, ungraded };
}

/**
 * Gửi các phiếu đang chờ mạng (gọi khi có mạng trở lại). Trả về số phiếu đã
 * gửi. Không làm gì khi vẫn còn offline.
 */
export function flushQueuedTickets(): number {
  if (isOffline()) return 0;
  const queued = getStore().comments.filter((c) => c.sendQueued);
  if (!queued.length) return 0;
  const now = new Date().toISOString();
  commit("comments", "queued-tickets", (draft) => {
    for (const comment of draft.comments) {
      if (!comment.sendQueued) continue;
      comment.status = "sent";
      comment.sendQueued = false;
      comment.sentAt = now;
      comment.updatedAt = now;
    }
  });
  return queued.length;
}

if (typeof window !== "undefined")
  window.addEventListener("online", () => flushQueuedTickets());
