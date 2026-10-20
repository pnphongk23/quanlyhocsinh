import type { StoreState } from "./types";
import { MEMBER_IDS } from "./defaults";

/**
 * Dữ liệu mẫu cho nhân sự, lương, học phí và báo cáo điểm.
 * Tách riêng khỏi seed.ts để migrations.ts dùng lại mà không tạo vòng import.
 */
export function defaultStaffTuition(): Pick<
  StoreState,
  | "classStaff"
  | "sessionSubstitutes"
  | "payRates"
  | "payAdjustments"
  | "payrollMonths"
  | "classFees"
  | "studentFees"
  | "tuitionPayments"
  | "tuitionNotices"
> {
  return {
    // 6A: Cô Lan dạy chính. IELTS: Thầy Minh dạy chính, Cô Trang trợ giảng.
    classStaff: [
      { classId: "6a", memberId: MEMBER_IDS.lanTeacher, position: "main" },
      { classId: "ielts", memberId: MEMBER_IDS.minh, position: "main" },
      { classId: "ielts", memberId: MEMBER_IDS.trang, position: "assistant" },
    ],
    // Buổi 12/10 của 6A do Thầy Minh dạy thay; buổi học bù 25/10 Thầy Minh dạy.
    sessionSubstitutes: [
      {
        id: "6a-session-6-substitute",
        sessionId: "6a-session-6",
        position: "main",
        originalMemberId: MEMBER_IDS.lanTeacher,
        substituteMemberId: MEMBER_IDS.minh,
        reason: "Cô Lan ốm",
        createdAt: "2026-10-11T15:00:00.000Z",
      },
      {
        id: "6a-extra-session-substitute",
        sessionId: "6a-extra-session",
        position: "main",
        originalMemberId: null,
        substituteMemberId: MEMBER_IDS.minh,
        reason: "Dạy bù",
        createdAt: "2026-10-20T10:00:00.000Z",
      },
    ],
    // Đơn giá mỗi buổi (VND): 0 nghĩa là không dạy vị trí đó.
    payRates: [
      { memberId: MEMBER_IDS.lanTeacher, mainRate: 300000, assistantRate: 0 },
      { memberId: MEMBER_IDS.minh, mainRate: 350000, assistantRate: 200000 },
      { memberId: MEMBER_IDS.trang, mainRate: 0, assistantRate: 150000 },
    ],
    // Thưởng dạy bù cho Thầy Minh ở bảng lương tháng 10.
    payAdjustments: [
      {
        id: "pay-adjustment-minh-2026-10",
        memberId: MEMBER_IDS.minh,
        month: "2026-10",
        amount: 200000,
        note: "Thưởng dạy bù",
      },
    ],
    // Bảng lương tháng 9 đã chốt.
    payrollMonths: [{ month: "2026-09", status: "locked" }],
    // 6A tính phí buổi vắng không phép và buổi học bù; IELTS thì không.
    classFees: [
      { classId: "6a", feePerSession: 150000, chargeAbsent: true, chargeMakeup: true },
      { classId: "ielts", feePerSession: 250000, chargeAbsent: false, chargeMakeup: false },
    ],
    // Em 6a-student-1 được giảm 10% học phí.
    studentFees: [{ studentId: "6a-student-1", discountPercent: 10 }],
    // Học phí tháng 9 tính theo buổi đã diễn ra trong tháng:
    // 6A có 4 buổi (21, 23, 28, 30/09) × 150.000 = 600.000; em student-1 giảm 10% còn 540.000.
    // IELTS có 3 buổi (22, 24, 29/09) × 250.000 = 750.000.
    // Tháng 9: hầu hết thu đủ, 2 em 6A và 1 em IELTS thu một phần nên còn công nợ.
    // Tháng 10: vài em đã thu đủ (6A 600.000, IELTS 5 buổi × 250.000 = 1.250.000).
    tuitionPayments: [
      { id: "payment-6a-0-2026-09", studentId: "6a-student-0", month: "2026-09", amount: 600000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-6a-1-2026-09", studentId: "6a-student-1", month: "2026-09", amount: 540000, paidAt: "2026-10-01", method: "cash", note: "" },
      { id: "payment-6a-2-2026-09", studentId: "6a-student-2", month: "2026-09", amount: 600000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-6a-3-2026-09", studentId: "6a-student-3", month: "2026-09", amount: 300000, paidAt: "2026-10-02", method: "cash", note: "Thu một phần" },
      { id: "payment-6a-4-2026-09", studentId: "6a-student-4", month: "2026-09", amount: 600000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-6a-5-2026-09", studentId: "6a-student-5", month: "2026-09", amount: 200000, paidAt: "2026-10-03", method: "cash", note: "Thu một phần" },
      { id: "payment-6a-6-2026-09", studentId: "6a-student-6", month: "2026-09", amount: 600000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-6a-7-2026-09", studentId: "6a-student-7", month: "2026-09", amount: 600000, paidAt: "2026-09-30", method: "cash", note: "" },
      { id: "payment-6a-8-2026-09", studentId: "6a-student-8", month: "2026-09", amount: 600000, paidAt: "2026-10-01", method: "transfer", note: "" },
      { id: "payment-6a-9-2026-09", studentId: "6a-student-9", month: "2026-09", amount: 600000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-ielts-0-2026-09", studentId: "ielts-student-0", month: "2026-09", amount: 750000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-ielts-1-2026-09", studentId: "ielts-student-1", month: "2026-09", amount: 750000, paidAt: "2026-09-30", method: "cash", note: "" },
      { id: "payment-ielts-2-2026-09", studentId: "ielts-student-2", month: "2026-09", amount: 750000, paidAt: "2026-09-29", method: "transfer", note: "" },
      { id: "payment-ielts-3-2026-09", studentId: "ielts-student-3", month: "2026-09", amount: 750000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-ielts-4-2026-09", studentId: "ielts-student-4", month: "2026-09", amount: 750000, paidAt: "2026-09-30", method: "cash", note: "" },
      { id: "payment-ielts-5-2026-09", studentId: "ielts-student-5", month: "2026-09", amount: 750000, paidAt: "2026-10-01", method: "transfer", note: "" },
      { id: "payment-ielts-6-2026-09", studentId: "ielts-student-6", month: "2026-09", amount: 400000, paidAt: "2026-10-04", method: "cash", note: "Thu một phần" },
      { id: "payment-ielts-7-2026-09", studentId: "ielts-student-7", month: "2026-09", amount: 750000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-ielts-8-2026-09", studentId: "ielts-student-8", month: "2026-09", amount: 750000, paidAt: "2026-09-30", method: "transfer", note: "" },
      { id: "payment-ielts-9-2026-09", studentId: "ielts-student-9", month: "2026-09", amount: 750000, paidAt: "2026-09-30", method: "cash", note: "" },
      { id: "payment-6a-2-2026-10", studentId: "6a-student-2", month: "2026-10", amount: 600000, paidAt: "2026-10-16", method: "transfer", note: "" },
      { id: "payment-6a-3-2026-10", studentId: "6a-student-3", month: "2026-10", amount: 600000, paidAt: "2026-10-16", method: "cash", note: "" },
      { id: "payment-ielts-3-2026-10", studentId: "ielts-student-3", month: "2026-10", amount: 1250000, paidAt: "2026-10-17", method: "transfer", note: "" },
    ],
    // Đã gửi thông báo học phí tháng 9 cho một em 6A.
    tuitionNotices: [
      {
        studentId: "6a-student-0",
        month: "2026-09",
        amount: 600000,
        sentAt: "2026-09-30T20:00:00.000Z",
      },
    ],
  };
}
