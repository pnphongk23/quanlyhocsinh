/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Comment, StarLevel } from "../types";

import { type UngradedHomeworkNotice } from "../homework";

export const listComments: (classId: string) => Comment[] = () => [];

export function listSessionComments(sessionId: string): Comment[] { return []; }

export function getSessionComment(sessionId: string, studentId: string): Comment | null { return null; }

export function saveSessionComment(input: {
    sessionId: string;
    studentId: string;
    stars: StarLevel | null;
    note?: string;
}): Comment { return foundationUnavailable(); }

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

export function sendSessionTickets(sessionId: string, studentIds?: string[]): SendTicketsResult { return foundationUnavailable(); }

export function flushQueuedTickets(): number { return foundationUnavailable(); }
