import { describe, it, expect } from "vitest";
import { createSeed } from "./seed";
import { MEMBER_IDS } from "./defaults";
import { monthRange, payrollForMember, payrollForMonth } from "./payroll";

const lan = MEMBER_IDS.lanTeacher;
const minh = MEMBER_IDS.minh;
const trang = MEMBER_IDS.trang;

describe("Khoảng ngày của tháng", () => {
  it("lấy ngày cuối theo số ngày thực của tháng", () => {
    expect(monthRange("2026-10")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(monthRange("2026-09")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(monthRange("2026-02")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(monthRange("2024-02").to).toBe("2024-02-29");
  });
});

describe("Lương tháng 10 của Cô Lan", () => {
  it("3 buổi dạy chính, 1 buổi dự kiến, không có điều chỉnh", () => {
    const summary = payrollForMember(createSeed(), lan, "2026-10");
    expect(summary.mainCount).toBe(3);
    expect(summary.assistantCount).toBe(0);
    expect(summary.plannedCount).toBe(1);
    expect(summary.sessionAmount).toBe(900000);
    expect(summary.plannedAmount).toBe(300000);
    expect(summary.adjustmentTotal).toBe(0);
    expect(summary.total).toBe(900000);
    expect(summary.missingRate).toBe(false);
    expect(summary.status).toBe("draft");
    expect(summary.lines).toHaveLength(4);
  });
  it("không có dòng cho buổi học bù do người khác dạy", () => {
    const d = createSeed();
    expect(
      payrollForMember(d, lan, "2026-10").lines.some(
        (line) => line.entry.session.id === "6a-extra-session",
      ),
    ).toBe(false);
  });
  it("không có dòng cho buổi bị thay và buổi đã huỷ", () => {
    const d = createSeed();
    expect(
      payrollForMember(d, lan, "2026-10").lines.some(
        (line) => line.entry.session.id === "6a-session-6",
      ),
    ).toBe(false);
    d.sessions.find((s) => s.id === "6a-session-4")!.status = "cancelled";
    const summary = payrollForMember(d, lan, "2026-10");
    expect(summary.mainCount).toBe(2);
    expect(
      summary.lines.some((line) => line.entry.session.id === "6a-session-4"),
    ).toBe(false);
  });
});

describe("Lương tháng 10 của Thầy Minh", () => {
  it("6 buổi dạy chính (5 IELTS + 1 dạy thay) và điều chỉnh 200.000", () => {
    const summary = payrollForMember(createSeed(), minh, "2026-10");
    expect(summary.mainCount).toBe(6);
    expect(summary.assistantCount).toBe(0);
    expect(summary.plannedCount).toBe(2);
    expect(summary.sessionAmount).toBe(2100000);
    expect(summary.plannedAmount).toBe(700000);
    expect(summary.adjustments).toHaveLength(1);
    expect(summary.adjustmentTotal).toBe(200000);
    expect(summary.total).toBe(2300000);
    expect(summary.missingRate).toBe(false);
  });
  it("tiền buổi dự kiến không vào tổng", () => {
    const summary = payrollForMember(createSeed(), minh, "2026-10");
    expect(summary.total).not.toBe(summary.sessionAmount + summary.plannedAmount);
  });
  it("buổi đã huỷ có dạy thay thì không tính lương", () => {
    const d = createSeed();
    d.sessions.find((s) => s.id === "6a-session-6")!.status = "cancelled";
    const summary = payrollForMember(d, minh, "2026-10");
    expect(
      summary.lines.some((line) => line.entry.session.id === "6a-session-6"),
    ).toBe(false);
    // Mất 1 buổi dạy thay 12/10, còn 5 buổi IELTS đã diễn ra.
    expect(summary.sessionAmount).toBe(1750000);
    expect(summary.mainCount).toBe(5);
  });
});

describe("Lương tháng 10 của Cô Trang", () => {
  it("5 buổi trợ giảng và 1 buổi dự kiến", () => {
    const summary = payrollForMember(createSeed(), trang, "2026-10");
    expect(summary.mainCount).toBe(0);
    expect(summary.assistantCount).toBe(5);
    expect(summary.plannedCount).toBe(1);
    expect(summary.sessionAmount).toBe(750000);
    expect(summary.plannedAmount).toBe(150000);
    expect(summary.total).toBe(750000);
    expect(summary.missingRate).toBe(false);
  });
});

describe("Đơn giá và điều chỉnh", () => {
  it("thiếu đơn giá thì rate 0 và cảnh báo missingRate", () => {
    const d = createSeed();
    d.payRates = d.payRates.filter((rate) => rate.memberId !== trang);
    const summary = payrollForMember(d, trang, "2026-10");
    expect(summary.lines.every((line) => line.rate === 0)).toBe(true);
    expect(summary.missingRate).toBe(true);
    expect(summary.sessionAmount).toBe(0);
    expect(summary.assistantCount).toBe(5);
  });
  it("đơn giá bằng 0 cũng coi như thiếu đơn giá", () => {
    const d = createSeed();
    d.payRates.find((rate) => rate.memberId === trang)!.assistantRate = 0;
    expect(payrollForMember(d, trang, "2026-10").missingRate).toBe(true);
  });
  it("khoản điều chỉnh âm được trừ vào tổng", () => {
    const d = createSeed();
    d.payAdjustments.push({
      id: "adjustment-tru",
      memberId: lan,
      month: "2026-10",
      amount: -100000,
      note: "Trừ đi muộn",
    });
    const summary = payrollForMember(d, lan, "2026-10");
    expect(summary.adjustmentTotal).toBe(-100000);
    expect(summary.total).toBe(800000);
  });
});

describe("Trạng thái bảng lương", () => {
  it("tháng 9 đã chốt, tháng 10 còn nháp", () => {
    const d = createSeed();
    expect(payrollForMember(d, lan, "2026-09").status).toBe("locked");
    expect(payrollForMember(d, lan, "2026-10").status).toBe("draft");
  });
});

describe("Lương cả tháng", () => {
  it("chỉ gồm nhân sự có phát sinh, sắp theo tên", () => {
    const summaries = payrollForMonth(createSeed(), "2026-10");
    expect(summaries.map((summary) => summary.memberId)).toEqual([
      lan,
      trang,
      minh,
    ]);
    expect(summaries.every((summary) => summary.month === "2026-10")).toBe(true);
  });
  it("bỏ qua thành viên đã tắt và người không có buổi, đơn giá, điều chỉnh", () => {
    const d = createSeed();
    d.members.find((member) => member.id === minh)!.status = "disabled";
    const ids = payrollForMonth(d, "2026-10").map((summary) => summary.memberId);
    expect(ids).not.toContain(minh);
    expect(ids).not.toContain(MEMBER_IDS.lanAdmin);
  });
  it("thành viên chỉ có điều chỉnh vẫn có bảng lương", () => {
    const d = createSeed();
    // Admin không có đơn giá và không dạy buổi nào: chỉ có điều chỉnh.
    d.payRates = d.payRates.filter(
      (rate) => rate.memberId !== MEMBER_IDS.lanAdmin,
    );
    d.payAdjustments.push({
      id: "adjustment-admin",
      memberId: MEMBER_IDS.lanAdmin,
      month: "2026-10",
      amount: 50000,
      note: "Thưởng",
    });
    const summary = payrollForMonth(d, "2026-10").find(
      (item) => item.memberId === MEMBER_IDS.lanAdmin,
    )!;
    expect(summary.lines).toEqual([]);
    expect(summary.adjustmentTotal).toBe(50000);
    expect(summary.total).toBe(50000);
  });
});
