/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "./foundation";
import type { Attendance, Comment, HomeworkGrade, HomeworkKind, HomeworkSection, Score, Session, StarLevel, Student, Test } from "./types";

export interface MonthlyStudentReportData {
    sessions: Session[];
    attendance: Attendance[];
    tests: Test[];
    scores: Score[];
    /** Phiếu buổi học của lớp; chỉ phiếu `status: "sent"` mới được tính. */
    comments: Comment[];
    /** Các phần BTVN của lớp. */
    homeworkSections: HomeworkSection[];
    /** Kết quả chấm BTVN của lớp. */
    homeworkGrades: HomeworkGrade[];
    /** Nhận xét chung của tháng (lưu ở `Report.generalComment`). */
    generalComment: string;
}

export interface MonthlyStarTally {
    /** Số buổi có phiếu đã gửi (mọi mức sao). */
    ticketCount: number;
    byStars: Record<StarLevel, number>;
}

export interface MonthlyHomeworkTally {
    kind: HomeworkKind;
    /** Nhãn tiếng Việt của loại phần (Luyện từ vựng / Luyện đọc / Luyện nói / Bài tập). */
    label: string;
    excellent: number;
    done: number;
    not_done: number;
    /** Số lượt có kết quả được tính = excellent + done + not_done. */
    total: number;
}

export interface MonthlyStudentReport {
    student: Student;
    month: string;
    /** Buổi đã diễn ra trong tháng, trong khoảng ngày vào lớp..ngày rời lớp. */
    sessions: Session[];
    attendance: Attendance[];
    tests: Array<{
        test: Test;
        score: Score | undefined;
    }>;
    /** Số bài kiểm tra đã có điểm (tử số của "n bài kiểm tra"). */
    gradedTestCount: number;
    /** Số buổi có mặt hoặc muộn. */
    attendanceCount: number;
    lateCount: number;
    excusedCount: number;
    absentCount: number;
    stars: MonthlyStarTally;
    /** Kết quả BTVN theo từng loại phần, theo thứ tự Luyện từ vựng → Bài tập. */
    homework: MonthlyHomeworkTally[];
    generalComment: string;
    /** Câu gợi ý nhận xét chung theo số buổi 3/2/1 sao; null khi chưa có phiếu nào. */
    suggestion: string | null;
    ready: boolean;
    missing: string[];
}

export function buildStarSuggestion(byStars: Record<StarLevel, number>): string | null { return foundationUnavailable(); }

export function buildMonthlyStudentReport(student: Student, month: string, data: MonthlyStudentReportData): MonthlyStudentReport | null { return foundationUnavailable(); }
