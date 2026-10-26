import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { MEMBER_IDS } from "../defaults";
import { getMember } from "./staff";
import {
  assignClassStaff,
  clearSubstitute,
  listClassStaff,
  listSubstitutes,
  removeClassStaff,
  substituteSession,
} from "./staffing";
import {
  addPayAdjustment,
  canViewPayroll,
  getPayrollStatus,
  lockPayroll,
  readMemberPayroll,
  readMonthPayroll,
  removePayAdjustment,
  setPayRate,
} from "./payroll";
import { isAdmin, switchRole } from "./access";
import {
  recordTuitionPayment,
  removeTuitionPayment,
  sendTuitionNotice,
  setClassFee,
  setStudentDiscount,
} from "./tuition";

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

const PERMISSION_ERROR = "Bạn không có quyền thực hiện thao tác này.";

/** Đặt vai trò đang dùng thành một membership không phải Admin. */
function actAs(memberId: string): void {
  const state = createSeed();
  state.auth = { phone: "900000001", memberIds: [memberId] };
  state.activeMemberId = memberId;
  replaceStore(state);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  replaceStore(createSeed());
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Phân công giảng dạy", () => {
  it("gán giáo viên chính thay giáo viên chính cũ và thêm lớp vào classIds", () => {
    assignClassStaff("6a", MEMBER_IDS.trang, "main");
    const rows = listClassStaff("6a");
    expect(rows.filter((row) => row.position === "main")).toEqual([
      { classId: "6a", memberId: MEMBER_IDS.trang, position: "main" },
    ]);
    expect(rows.some((row) => row.memberId === MEMBER_IDS.lanTeacher)).toBe(
      false,
    );
    expect(getMember(MEMBER_IDS.trang)?.classIds).toEqual(["ielts", "6a"]);
  });

  it("đổi vị trí khi đã có cùng cặp lớp và nhân sự", () => {
    assignClassStaff("ielts", MEMBER_IDS.trang, "main");
    const rows = listClassStaff("ielts").filter(
      (row) => row.memberId === MEMBER_IDS.trang,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].position).toBe("main");
    expect(
      listClassStaff("ielts").some((row) => row.memberId === MEMBER_IDS.minh),
    ).toBe(false);
    // Người bị thay vẫn giữ lớp trong classIds (chỉ gỡ phân công mới gỡ).
    expect(getMember(MEMBER_IDS.minh)?.classIds).toContain("ielts");
  });

  it("gỡ phân công nhưng không gỡ lớp khỏi classIds", () => {
    removeClassStaff("ielts", MEMBER_IDS.trang);
    expect(
      listClassStaff("ielts").some((row) => row.memberId === MEMBER_IDS.trang),
    ).toBe(false);
    expect(getMember(MEMBER_IDS.trang)?.classIds).toEqual(["ielts"]);
  });

  it("chỉ chọn được nhân sự đang hoạt động", () => {
    expect(() =>
      assignClassStaff("6a", MEMBER_IDS.minhAnhGuardian, "assistant"),
    ).toThrow("Chỉ chọn được nhân sự đang hoạt động.");
    expect(() => assignClassStaff("6a", "khong-co", "main")).toThrow(
      "Không tìm thấy thành viên.",
    );
  });
});

describe("Dạy thay một buổi", () => {
  it("lỗi khi buổi đã hủy", () => {
    const state = createSeed();
    state.sessions.find((item) => item.id === "6a-session-8")!.status =
      "cancelled";
    replaceStore(state);
    expect(() =>
      substituteSession({
        sessionId: "6a-session-8",
        position: "main",
        originalMemberId: MEMBER_IDS.lanTeacher,
        substituteMemberId: MEMBER_IDS.minh,
        reason: "Cô Lan ốm",
      }),
    ).toThrow("Không đổi người dạy buổi đã hủy.");
    expect(listSubstitutes("6a-session-8")).toHaveLength(0);
  });

  it("lỗi khi thiếu lý do", () => {
    expect(() =>
      substituteSession({
        sessionId: "6a-session-8",
        position: "main",
        originalMemberId: MEMBER_IDS.lanTeacher,
        substituteMemberId: MEMBER_IDS.minh,
        reason: "   ",
      }),
    ).toThrow("Nhập lý do.");
  });

  it("thêm mới, cập nhật cùng vị trí và xoá dạy thay", () => {
    const created = substituteSession({
      sessionId: "6a-session-8",
      position: "main",
      originalMemberId: MEMBER_IDS.lanTeacher,
      substituteMemberId: MEMBER_IDS.minh,
      reason: "  Cô Lan ốm  ",
    });
    expect(created.reason).toBe("Cô Lan ốm");
    expect(created.createdAt).toBeTruthy();
    expect(listSubstitutes("6a-session-8")).toHaveLength(1);

    substituteSession({
      sessionId: "6a-session-8",
      position: "main",
      originalMemberId: MEMBER_IDS.lanTeacher,
      substituteMemberId: MEMBER_IDS.trang,
      reason: "Đổi người thay",
    });
    const rows = listSubstitutes("6a-session-8");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(created.id);
    expect(rows[0].substituteMemberId).toBe(MEMBER_IDS.trang);

    clearSubstitute(created.id);
    expect(listSubstitutes("6a-session-8")).toHaveLength(0);
  });

  it("cập nhật bản ghi dạy thay có sẵn của buổi 12/10", () => {
    substituteSession({
      sessionId: "6a-session-6",
      position: "main",
      originalMemberId: MEMBER_IDS.lanTeacher,
      substituteMemberId: MEMBER_IDS.trang,
      reason: "Đổi người thay",
    });
    const rows = listSubstitutes("6a-session-6");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("6a-session-6-substitute");
    expect(rows[0].substituteMemberId).toBe(MEMBER_IDS.trang);
  });
});

describe("Lương", () => {
  it("đặt đơn giá và thêm điều chỉnh hợp lệ", () => {
    setPayRate(MEMBER_IDS.trang, 100000, 200000);
    expect(
      getStore().payRates.find((row) => row.memberId === MEMBER_IDS.trang),
    ).toEqual({
      memberId: MEMBER_IDS.trang,
      mainRate: 100000,
      assistantRate: 200000,
    });
    expect(() => setPayRate(MEMBER_IDS.trang, -1, 0)).toThrow(
      "Đơn giá không hợp lệ.",
    );

    const adjustment = addPayAdjustment({
      memberId: MEMBER_IDS.minh,
      month: "2026-10",
      amount: 100000,
      note: "  Thưởng thêm  ",
    });
    expect(adjustment.note).toBe("Thưởng thêm");
    expect(
      getStore().payAdjustments.some((row) => row.id === adjustment.id),
    ).toBe(true);
    expect(() =>
      addPayAdjustment({
        memberId: MEMBER_IDS.minh,
        month: "2026-10",
        amount: 0,
        note: "Thưởng",
      }),
    ).toThrow("Số tiền điều chỉnh phải là số nguyên khác 0.");
    expect(() =>
      addPayAdjustment({
        memberId: MEMBER_IDS.minh,
        month: "2026-10",
        amount: 1000,
        note: "  ",
      }),
    ).toThrow("Nhập ghi chú.");
  });

  it("chốt bảng lương thì chặn thêm và xoá điều chỉnh", () => {
    expect(getPayrollStatus("2026-09")).toBe("locked");
    expect(getPayrollStatus("2026-10")).toBe("draft");
    lockPayroll("2026-10");
    expect(getPayrollStatus("2026-10")).toBe("locked");
    expect(() =>
      addPayAdjustment({
        memberId: MEMBER_IDS.minh,
        month: "2026-10",
        amount: 50000,
        note: "Thưởng",
      }),
    ).toThrow("Bảng lương đã chốt.");
    expect(() => removePayAdjustment("pay-adjustment-minh-2026-10")).toThrow(
      "Bảng lương đã chốt.",
    );
    expect(
      getStore().payAdjustments.some(
        (row) => row.id === "pay-adjustment-minh-2026-10",
      ),
    ).toBe(true);
  });

  it("giáo viên đọc được bảng lương của chính mình, không đọc của người khác", () => {
    switchRole(MEMBER_IDS.lanTeacher);
    expect(canViewPayroll(MEMBER_IDS.lanTeacher)).toBe(true);
    const mine = readMemberPayroll(MEMBER_IDS.lanTeacher, "2026-10");
    expect(mine.memberId).toBe(MEMBER_IDS.lanTeacher);
    expect(mine.month).toBe("2026-10");

    expect(canViewPayroll(MEMBER_IDS.minh)).toBe(false);
    expect(() => readMemberPayroll(MEMBER_IDS.minh, "2026-10")).toThrow(
      "Bạn không có quyền xem bảng lương này.",
    );
  });

  it("giáo viên không ghi được lương và không xem được cả tháng", () => {
    actAs(MEMBER_IDS.lanTeacher);
    expect(canViewPayroll(MEMBER_IDS.lanTeacher)).toBe(true);
    expect(() => setPayRate(MEMBER_IDS.lanTeacher, 1, 1)).toThrow(
      PERMISSION_ERROR,
    );
    expect(() => lockPayroll("2026-10")).toThrow(PERMISSION_ERROR);
    expect(() => readMonthPayroll("2026-10")).toThrow(PERMISSION_ERROR);
    expect(() =>
      addPayAdjustment({
        memberId: MEMBER_IDS.lanTeacher,
        month: "2026-10",
        amount: 50000,
        note: "Thưởng",
      }),
    ).toThrow(PERMISSION_ERROR);
    expect(() => removePayAdjustment("pay-adjustment-minh-2026-10")).toThrow(
      PERMISSION_ERROR,
    );
  });

  it("Admin đọc được bảng lương của mọi người và cả tháng", () => {
    expect(isAdmin()).toBe(true);
    expect(canViewPayroll(MEMBER_IDS.minh)).toBe(true);
    expect(readMemberPayroll(MEMBER_IDS.minh, "2026-10").memberId).toBe(
      MEMBER_IDS.minh,
    );
    const all = readMonthPayroll("2026-10");
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((summary) => summary.month === "2026-10")).toBe(true);
  });
});

describe("Học phí", () => {
  it("ghi và xoá một lần thu học phí", () => {
    const before = getStore().tuitionPayments.length;
    const id = recordTuitionPayment({
      studentId: "6a-student-0",
      month: "2026-10",
      amount: 600000,
      paidAt: "2026-10-18",
      method: "cash",
      note: "  Thu đủ  ",
    });
    expect(getStore().tuitionPayments).toHaveLength(before + 1);
    expect(getStore().tuitionPayments.find((row) => row.id === id)).toMatchObject(
      {
        studentId: "6a-student-0",
        month: "2026-10",
        amount: 600000,
        paidAt: "2026-10-18",
        method: "cash",
        note: "Thu đủ",
      },
    );
    removeTuitionPayment(id);
    expect(getStore().tuitionPayments.some((row) => row.id === id)).toBe(false);
    expect(() => removeTuitionPayment(id)).toThrow("Không tìm thấy lần thu.");
    expect(() =>
      recordTuitionPayment({
        studentId: "6a-student-0",
        month: "2026-10",
        amount: 0,
        paidAt: "2026-10-18",
        method: "cash",
        note: "",
      }),
    ).toThrow("Số tiền thu không hợp lệ.");
    expect(() =>
      recordTuitionPayment({
        studentId: "6a-student-0",
        month: "2026-10",
        amount: 1000,
        paidAt: "18/10/2026",
        method: "cash",
        note: "",
      }),
    ).toThrow("Ngày thu không hợp lệ.");
  });

  it("đặt học phí lớp và giảm học phí học sinh", () => {
    setClassFee("6a", 200000, false);
    expect(getStore().classFees.find((row) => row.classId === "6a")).toEqual({
      classId: "6a",
      feePerSession: 200000,
      chargeAbsent: false,
      chargeMakeup: true,
    });
    setClassFee("6a", 200000, false, false);
    expect(getStore().classFees.find((row) => row.classId === "6a")).toEqual({
      classId: "6a",
      feePerSession: 200000,
      chargeAbsent: false,
      chargeMakeup: false,
    });
    expect(() => setClassFee("6a", -1, true)).toThrow(
      "Học phí mỗi buổi không hợp lệ.",
    );

    setStudentDiscount("6a-student-0", 15);
    expect(
      getStore().studentFees.find((row) => row.studentId === "6a-student-0")
        ?.discountPercent,
    ).toBe(15);
    setStudentDiscount("6a-student-0", 0);
    expect(
      getStore().studentFees.some((row) => row.studentId === "6a-student-0"),
    ).toBe(false);
    expect(() => setStudentDiscount("6a-student-0", 101)).toThrow(
      "Phần trăm giảm không hợp lệ.",
    );
  });

  it("gửi thông báo học phí cần mạng và cập nhật theo học sinh + tháng", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(() =>
      sendTuitionNotice("6a-student-0", "2026-10", 600000),
    ).toThrow("Thao tác này cần có mạng.");
    vi.stubGlobal("navigator", { onLine: true });

    sendTuitionNotice("6a-student-0", "2026-10", 600000);
    sendTuitionNotice("6a-student-0", "2026-10", 500000);
    const notices = getStore().tuitionNotices.filter(
      (row) => row.studentId === "6a-student-0" && row.month === "2026-10",
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ amount: 500000 });
    expect(notices[0].sentAt).toBeTruthy();
  });
});

describe("Mọi hàm ghi cần Admin", () => {
  it("từ chối khi vai trò đang dùng không phải Admin", () => {
    actAs(MEMBER_IDS.trang);
    expect(() =>
      assignClassStaff("6a", MEMBER_IDS.minh, "assistant"),
    ).toThrow(PERMISSION_ERROR);
    expect(() =>
      substituteSession({
        sessionId: "6a-session-8",
        position: "main",
        originalMemberId: MEMBER_IDS.lanTeacher,
        substituteMemberId: MEMBER_IDS.minh,
        reason: "Cô Lan ốm",
      }),
    ).toThrow(PERMISSION_ERROR);
    expect(() => setPayRate(MEMBER_IDS.minh, 1, 1)).toThrow(PERMISSION_ERROR);
    expect(() => lockPayroll("2026-10")).toThrow(PERMISSION_ERROR);
    expect(() => setClassFee("6a", 1, true)).toThrow(PERMISSION_ERROR);
    expect(() =>
      recordTuitionPayment({
        studentId: "6a-student-0",
        month: "2026-10",
        amount: 1000,
        paidAt: "2026-10-18",
        method: "cash",
        note: "",
      }),
    ).toThrow(PERMISSION_ERROR);
    expect(() =>
      sendTuitionNotice("6a-student-0", "2026-10", 1000),
    ).toThrow(PERMISSION_ERROR);
  });
});
