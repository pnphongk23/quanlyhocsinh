/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "./foundation";
import type { Attendance, Comment, HomeworkKind, HomeworkLevel, HomeworkSection, Session, StarLevel, StoreState, Student } from "./types";

export const HOMEWORK_KIND_LABELS: Record<HomeworkKind, string> = {
  vocabulary: "Luyện từ vựng",
  reading: "Luyện đọc",
  speaking: "Luyện nói",
  exercise: "Bài tập",
};

export const HOMEWORK_KINDS: HomeworkKind[] = [
  "vocabulary",
  "reading",
  "speaking",
  "exercise",
];

export const HOMEWORK_LEVEL_LABELS: Record<HomeworkLevel, string> = {
  excellent: "Hoàn thành tốt",
  done: "Hoàn thành",
  not_done: "Chưa hoàn thành",
};

export const HOMEWORK_LEVELS: HomeworkLevel[] = [
  "excellent",
  "done",
  "not_done",
];

export function compareSessions(a: Session, b: Session): number { return foundationUnavailable(); }

export function classSessions(sessions: Session[], classId: string): Session[] { return foundationUnavailable(); }

export function gradingSessionFor(sessions: Session[], sessionId: string): Session | null { return foundationUnavailable(); }

export function gradingSessionPlan(sessions: Session[], sessionId: string): {
    session: Session | null;
    cancelled: Session[];
} { return foundationUnavailable(); }

export function previousHomeworkSession(sessions: Session[], sessionId: string): Session | null { return foundationUnavailable(); }

export function studentsOnSession(state: StoreState, session: Session): Student[] { return foundationUnavailable(); }

export function leftStudentsForSession(state: StoreState, sessionId: string): Student[] { return foundationUnavailable(); }

export function homeworkSectionsFor(state: StoreState, sessionId: string): HomeworkSection[] { return foundationUnavailable(); }

export function homeworkGradeLevel(state: StoreState, sectionId: string, studentId: string): HomeworkLevel | null { return foundationUnavailable(); }

export function missingHomeworkKinds(state: StoreState, sessionId: string): HomeworkKind[] { return foundationUnavailable(); }

export type TicketStatus = "none" | "draft" | "queued" | "sent";

export function ticketStatusOf(comment: Comment | null): TicketStatus { return foundationUnavailable(); }

export type HomeworkPreviousState = "first" | "none-given" | "has";

export interface HomeworkSummary {
    state: HomeworkPreviousState;
    /** Buổi đã giao bài (buổi trước chưa hủy); null ở buổi đầu. */
    session: Session | null;
    totalSections: number;
    gradedSections: number;
    ungradedSections: number;
}

export interface TicketRow {
    student: Student;
    comment: Comment | null;
    stars: StarLevel | null;
    status: TicketStatus;
    sentAt: string | null;
    previousHomework: HomeworkSummary;
}

export function homeworkSummaryFor(state: StoreState, givingSession: Session | null, studentId: string): HomeworkSummary { return foundationUnavailable(); }

export function buildTicketRows(state: StoreState, sessionId: string): TicketRow[] { return foundationUnavailable(); }

export interface UngradedHomeworkNotice {
    /** Các em còn ít nhất một phần chưa chấm. */
    students: Student[];
    /** Tổng số lượt (em × phần) chưa chấm. */
    ungradedParts: number;
}

export function ungradedHomeworkNotice(state: StoreState, sessionId: string, studentIds?: string[]): UngradedHomeworkNotice { return foundationUnavailable(); }

export interface HomeworkSectionProgress {
    section: HomeworkSection;
    total: number;
    graded: number;
    ungraded: number;
}

export interface HomeworkGradingRow {
    student: Student;
    /** true khi em vắng (hoặc có phép) ở buổi giao bài; vẫn chấm bình thường. */
    absentAtGiving: boolean;
    /** Trạng thái điểm danh ở buổi giao bài; null khi chưa điểm danh. */
    givingAttendance: Attendance["status"] | null;
    /** Mức chấm theo sectionId; null = Chưa chấm. */
    grades: Record<string, HomeworkLevel | null>;
    graded: number;
    ungraded: number;
}

export interface HomeworkGradingPlan {
    /** exists = có buổi chấm; moved = buổi chấm bị chuyển do hủy; none = chưa có. */
    state: "exists" | "moved" | "none";
    session: Session | null;
    /** Buổi bị hủy nằm giữa buổi giao bài và buổi chấm (state "moved"). */
    cancelled: Session[];
}

export interface HomeworkContext {
    session: Session;
    /** Buổi đang xem đã bị hủy: không giao, không chấm. */
    cancelled: boolean;
    previous: {
        state: HomeworkPreviousState;
        givingSession: Session | null;
        sections: HomeworkSectionProgress[];
        rows: HomeworkGradingRow[];
    };
    today: {
        sections: HomeworkSection[];
        missingKinds: HomeworkKind[];
        grading: HomeworkGradingPlan;
    };
}

export function homeworkContext(state: StoreState, sessionId: string): HomeworkContext | null { return foundationUnavailable(); }
