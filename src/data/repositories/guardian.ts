/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Comment, HomeworkKind, HomeworkLevel, HomeworkSection, Report, Session, StarLevel, Student, Test } from "../types";

import { type MonthlyStudentReport } from "../reportModel";

export const GUARDIAN_PERMISSION_ERROR = "Bạn không có quyền thực hiện thao tác này.";

export const STUDENT_ACCESS_ERROR = "Bạn không có quyền truy cập học sinh này.";

export interface GuardianChild {
    student: Student;
    /** Tên lớp của con, để màn phụ huynh hiện "Lớp …". */
    className: string;
}

export function listMyChildren(): GuardianChild[] { return []; }

export interface ChildHomeworkResult {
    section: HomeworkSection;
    kind: HomeworkKind;
    kindLabel: string;
    /** null = "Chưa chấm" (giáo viên chưa chấm xong). */
    level: HomeworkLevel | null;
}

export interface ChildTicket {
    comment: Comment;
    session: Session;
    /** Số buổi trong lớp (bỏ buổi đã hủy), vd. "Buổi 18". */
    sessionNumber: number;
    date: string;
    stars: StarLevel;
    /** Câu mẫu cố định của mức sao (spec mục 4). */
    template: string;
    note: string;
    sentAt: string | null;
    /** Kết quả chấm BTVN buổi trước đi kèm phiếu. */
    homework: {
        session: Session | null;
        sessionNumber: number | null;
        sections: ChildHomeworkResult[];
    };
}

export function listChildTickets(studentId: string): ChildTicket[] { return []; }

export function getChildTicket(studentId: string, sessionId: string): ChildTicket | null { return null; }

export interface ChildHomeworkGrading {
    /** exists = có buổi chấm; moved = buổi chấm bị chuyển vì buổi trước bị hủy; none = chưa có. */
    state: "exists" | "moved" | "none";
    session: Session | null;
    sessionNumber: number | null;
    /** Buổi bị hủy nằm giữa buổi giao bài và buổi chấm; không có số buổi, hiện theo ngày (vd. "Buổi bù · 16/10 · Đã huỷ"). */
    cancelled: Array<{
        session: Session;
    }>;
}

export interface ChildHomeworkSection {
    section: HomeworkSection;
    kind: HomeworkKind;
    kindLabel: string;
    /** Phiếu của buổi chấm đã gửi: kết quả chấm được hiện cho phụ huynh. */
    graded: boolean;
    /** null = "Chưa chấm" (chưa chấm xong, hoặc phiếu buổi chấm chưa gửi). */
    level: HomeworkLevel | null;
}

export interface ChildHomework {
    session: Session;
    sessionNumber: number;
    date: string;
    sections: ChildHomeworkSection[];
    grading: ChildHomeworkGrading;
}

export function getChildHomework(studentId: string, sessionId?: string): ChildHomework[] { return []; }

export interface ChildOverviewAttendance {
    /** Số buổi có mặt hoặc muộn ("16/18 buổi"). */
    attended: number;
    /** Số buổi đã diễn ra trong tháng của em. */
    total: number;
    late: number;
    excused: number;
    absent: number;
}

export interface ChildOverviewScore {
    test: Test;
    /** Điểm đã có (null không bao giờ nằm trong danh sách này). */
    value: number;
    date: string;
}

export interface ChildOverview {
    student: Student;
    className: string;
    month: string;
    /** null khi role phụ huynh bị tắt nhóm Buổi học và điểm danh. */
    attendance: ChildOverviewAttendance | null;
    /** Phiếu đã gửi gần nhất (mức sao + câu mẫu + ghi chú); null khi chưa có. */
    latestComment: ChildTicket | null;
    /** Điểm gần đây, mới nhất trước (chỉ bài đã có điểm). */
    recentScores: ChildOverviewScore[];
    /**
     * "Điều cô muốn chia sẻ" ở ảnh 15: lấy từ `Report.generalComment` (nhận xét
     * chung) của báo cáo ĐÃ PHÁT HÀNH mới nhất của con (tháng mới nhất, rồi
     * `publishedAt` mới nhất). Chưa có báo cáo phát hành hoặc nhận xét chung để
     * trống → null (UI ẩn khối). Cũng null khi role phụ huynh bị tắt nhóm
     * Nhận xét và báo cáo.
     */
    teacherNote: string | null;
}

export function getChildOverview(studentId: string, month: string): ChildOverview | null { return null; }

export interface ChildMonthlyReport {
    report: Report;
    body: MonthlyStudentReport;
    /** Điểm có cập nhật sau khi phát hành, cần phát hành lại (spec mục 4). */
    needsRepublish: boolean;
}

export function getChildMonthlyReport(studentId: string, month: string): ChildMonthlyReport | null { return null; }
