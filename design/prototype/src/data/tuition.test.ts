import { describe, expect, it } from "vitest";
import { createSeed } from "./seed";
import {
  classTotals,
  invoiceFor,
  invoicesForClass,
  tuitionMakeupSessions,
  tuitionSessions,
} from "./tuition";

describe("Buổi tính phí", () => {
  it("6A tháng 2026-09 có 4 buổi đã diễn ra", () => {
    const state = createSeed();
    const rows = tuitionSessions(state, "6a-student-0", "2026-09");
    expect(rows.map((row) => row.session.date)).toEqual([
      "2026-09-21",
      "2026-09-23",
      "2026-09-28",
      "2026-09-30",
    ]);
    expect(rows.every((row) => row.status === "present")).toBe(true);
  });

  it("6A tính buổi vắng không phép, IELTS thì không", () => {
    const state = createSeed();
    const october = tuitionSessions(state, "6a-student-0", "2026-10");
    expect(october).toHaveLength(4);
    expect(
      october.filter((row) => row.status === "absent").map((row) => row.session.date),
    ).toEqual(["2026-10-12", "2026-10-14"]);

    const ielts = createSeed();
    ielts.attendance.find(
      (row) => row.id === "ielts-student-0-attendance-0",
    )!.status = "absent";
    expect(tuitionSessions(ielts, "ielts-student-0", "2026-09")).toHaveLength(2);
    expect(invoiceFor(ielts, "ielts-student-0", "2026-09").due).toBe(500000);
  });

  it("bỏ buổi có phép, buổi hủy, buổi chưa diễn ra và buổi thiếu điểm danh", () => {
    const state = createSeed();
    expect(
      tuitionSessions(state, "6a-student-1", "2026-10").map(
        (row) => row.session.date,
      ),
    ).toEqual(["2026-10-05", "2026-10-07", "2026-10-12"]);

    state.sessions.push(
      { id: "6a-cancelled", classId: "6a", date: "2026-09-24", status: "cancelled" },
      { id: "6a-ghost", classId: "6a", date: "2026-09-25", status: "held" },
    );
    expect(tuitionSessions(state, "6a-student-1", "2026-09")).toHaveLength(4);
  });

  it("không tính buổi sau ngày rời lớp", () => {
    const state = createSeed();
    expect(
      tuitionSessions(state, "6a-student-9", "2026-10").map(
        (row) => row.session.date,
      ),
    ).toEqual(["2026-10-05", "2026-10-07"]);
    expect(
      tuitionSessions(state, "6a-student-9", "2026-10").some(
        (row) => row.session.id === "6a-session-6",
      ),
    ).toBe(false);
  });

  it("trả rỗng khi không có học sinh hoặc lớp chưa đặt học phí", () => {
    const state = createSeed();
    expect(tuitionSessions(state, "khong-co", "2026-09")).toEqual([]);
    state.classFees = state.classFees.filter((fee) => fee.classId !== "6a");
    expect(tuitionSessions(state, "6a-student-0", "2026-09")).toEqual([]);
  });
});

/** Buổi học bù 25/10 của 6A được đánh dấu held và điểm danh cho 6a-student-0. */
function withHeldMakeup(status: "present" | "late" | "excused" | "absent") {
  const state = createSeed();
  state.sessions.find((session) => session.id === "6a-extra-session")!.status =
    "held";
  state.attendance.push({
    id: "6a-student-0-attendance-makeup",
    sessionId: "6a-extra-session",
    studentId: "6a-student-0",
    status,
    note: "",
    lateAt: status === "late" ? "17:10" : null,
  });
  return state;
}

describe("Buổi học bù", () => {
  it("chỉ tính phí khi lớp bật Tính phí buổi học bù", () => {
    const state = withHeldMakeup("present");
    const fee = state.classFees.find((item) => item.classId === "6a")!;

    fee.chargeMakeup = true;
    const charged = tuitionSessions(state, "6a-student-0", "2026-10");
    expect(charged).toHaveLength(5);
    expect(
      charged.find((row) => row.session.id === "6a-extra-session")?.makeup,
    ).toBe(true);
    expect(invoiceFor(state, "6a-student-0", "2026-10").chargedCount).toBe(5);

    fee.chargeMakeup = false;
    const skipped = tuitionSessions(state, "6a-student-0", "2026-10");
    expect(skipped).toHaveLength(4);
    expect(
      skipped.some((row) => row.session.id === "6a-extra-session"),
    ).toBe(false);
    expect(invoiceFor(state, "6a-student-0", "2026-10").chargedCount).toBe(4);
  });

  it("vắng có phép và vắng không phép theo tuỳ chọn của lớp", () => {
    const excused = withHeldMakeup("excused");
    expect(tuitionSessions(excused, "6a-student-0", "2026-10")).toHaveLength(4);
    expect(tuitionMakeupSessions(excused, "6a-student-0", "2026-10")).toEqual([
      {
        session: expect.objectContaining({ id: "6a-extra-session" }),
        charged: false,
        reason: "Vắng có phép, không tính",
      },
    ]);

    const absent = withHeldMakeup("absent");
    expect(tuitionSessions(absent, "6a-student-0", "2026-10")).toHaveLength(5);
    expect(tuitionMakeupSessions(absent, "6a-student-0", "2026-10")[0]).toMatchObject(
      { charged: true, reason: "Vắng không phép, tính phí" },
    );

    absent.classFees.find((item) => item.classId === "6a")!.chargeMakeup = false;
    expect(tuitionSessions(absent, "6a-student-0", "2026-10")).toHaveLength(4);
    expect(tuitionMakeupSessions(absent, "6a-student-0", "2026-10")[0]).toMatchObject(
      { charged: false, reason: "Lớp không tính phí học bù" },
    );
  });

  it("IELTS tắt tính phí học bù nên buổi học bù không bao giờ được tính", () => {
    const state = withHeldMakeup("present");
    state.sessions.find((session) => session.id === "6a-extra-session")!.classId =
      "ielts";
    state.attendance.find(
      (row) => row.id === "6a-student-0-attendance-makeup",
    )!.studentId = "ielts-student-0";
    const rows = tuitionMakeupSessions(state, "ielts-student-0", "2026-10");
    expect(rows).toEqual([
      {
        session: expect.objectContaining({ id: "6a-extra-session" }),
        charged: false,
        reason: "Lớp không tính phí học bù",
      },
    ]);
  });

  it("bỏ buổi học bù chưa diễn ra, ngoài tháng hoặc chưa điểm danh", () => {
    const state = createSeed();
    expect(tuitionMakeupSessions(state, "6a-student-0", "2026-10")).toEqual([]);

    state.sessions.find((session) => session.id === "6a-extra-session")!.status =
      "held";
    expect(tuitionMakeupSessions(state, "6a-student-0", "2026-10")).toEqual([
      {
        session: expect.objectContaining({ id: "6a-extra-session" }),
        charged: false,
        reason: "Chưa điểm danh, không tính",
      },
    ]);
    expect(tuitionSessions(state, "6a-student-0", "2026-10")).toHaveLength(4);
    expect(tuitionMakeupSessions(state, "6a-student-0", "2026-09")).toEqual([]);
    expect(tuitionMakeupSessions(state, "khong-co", "2026-10")).toEqual([]);
  });
});

describe("Phiếu học phí", () => {
  it("6A tháng 2026-09: 4 × 150.000, giảm 10% còn 540.000", () => {
    const state = createSeed();
    const base = invoiceFor(state, "6a-student-0", "2026-09");
    expect(base.chargedCount).toBe(4);
    expect(base.feePerSession).toBe(150000);
    expect(base.gross).toBe(600000);
    expect(base.due).toBe(600000);
    expect(base.paid).toBe(600000);
    expect(base.remaining).toBe(0);
    expect(base.status).toBe("paid");

    const discount = invoiceFor(state, "6a-student-1", "2026-09");
    expect(discount.discountPercent).toBe(10);
    expect(discount.gross).toBe(600000);
    expect(discount.due).toBe(540000);
  });

  it("IELTS tháng 2026-09: 3 × 250.000 = 750.000", () => {
    const state = createSeed();
    const invoice = invoiceFor(state, "ielts-student-0", "2026-09");
    expect(invoice.chargedCount).toBe(3);
    expect(invoice.feePerSession).toBe(250000);
    expect(invoice.due).toBe(750000);
  });

  it("làm tròn phải thu đến 1.000 đ sau khi giảm giá", () => {
    const state = createSeed();
    state.studentFees.push({ studentId: "ielts-student-0", discountPercent: 33 });
    state.tuitionPayments = state.tuitionPayments.filter(
      (payment) => payment.studentId !== "ielts-student-0",
    );
    const invoice = invoiceFor(state, "ielts-student-0", "2026-09");
    expect(invoice.gross).toBe(750000);
    expect(invoice.due).toBe(503000);
    expect(invoice.remaining).toBe(503000);
  });

  it("trạng thái thu một phần, chưa thu và đã thu đủ", () => {
    const state = createSeed();
    const partial = invoiceFor(state, "6a-student-3", "2026-09");
    expect(partial.paid).toBe(300000);
    expect(partial.remaining).toBe(300000);
    expect(partial.status).toBe("partial");

    const unpaid = invoiceFor(state, "6a-student-0", "2026-10");
    expect(unpaid.chargedCount).toBe(4);
    expect(unpaid.paid).toBe(0);
    expect(unpaid.status).toBe("unpaid");
  });

  it("nofee khi lớp không có học phí mỗi buổi", () => {
    const state = createSeed();
    state.classFees = state.classFees.filter((fee) => fee.classId !== "6a");
    const invoice = invoiceFor(state, "6a-student-0", "2026-09");
    expect(invoice.status).toBe("nofee");
    expect(invoice.feePerSession).toBe(0);
    expect(invoice.chargedCount).toBe(0);
    expect(invoice.gross).toBe(0);
    expect(invoice.due).toBe(0);
    expect(invoice.remaining).toBe(0);
  });

  it("công nợ trước tháng đang xem", () => {
    const state = createSeed();
    expect(invoiceFor(state, "6a-student-5", "2026-10").debtBefore).toBe(400000);
    expect(invoiceFor(state, "6a-student-3", "2026-10").debtBefore).toBe(300000);
    expect(invoiceFor(state, "6a-student-0", "2026-10").debtBefore).toBe(0);
    expect(invoiceFor(state, "6a-student-0", "2026-09").debtBefore).toBe(0);
  });

  it("tạm tính khi tháng còn buổi chưa diễn ra", () => {
    const state = createSeed();
    expect(invoiceFor(state, "6a-student-0", "2026-10").provisional).toBe(true);
    expect(invoiceFor(state, "6a-student-0", "2026-09").provisional).toBe(false);
  });

  it("báo số tiền đã thay đổi sau khi gửi thông báo", () => {
    const state = createSeed();
    const before = invoiceFor(state, "6a-student-0", "2026-09");
    expect(before.notice?.amount).toBe(600000);
    expect(before.changedSinceNotice).toBe(false);

    state.attendance.find(
      (row) => row.id === "6a-student-0-attendance-0",
    )!.status = "excused";
    const after = invoiceFor(state, "6a-student-0", "2026-09");
    expect(after.due).toBe(450000);
    expect(after.notice).not.toBeNull();
    expect(after.changedSinceNotice).toBe(true);
  });

  it("không có phiếu thông báo thì không coi là đã thay đổi", () => {
    const state = createSeed();
    const invoice = invoiceFor(state, "6a-student-1", "2026-09");
    expect(invoice.notice).toBeNull();
    expect(invoice.changedSinceNotice).toBe(false);
  });
});

describe("Danh sách phiếu theo lớp", () => {
  it("6A tháng 2026-09: 10 em, sắp theo tên, tổng đúng", () => {
    const state = createSeed();
    const invoices = invoicesForClass(state, "6a", "2026-09");
    expect(invoices).toHaveLength(10);
    const names = invoices.map(
      (invoice) => state.students.find((s) => s.id === invoice.studentId)!.name,
    );
    expect(names).toEqual(
      [...names].sort((a, b) => a.localeCompare(b, "vi")),
    );
    expect(classTotals(invoices)).toEqual({
      due: 5940000,
      paid: 5240000,
      remaining: 700000,
    });
  });

  it("vẫn có phiếu khi lớp chưa đặt học phí nhưng đã thu tiền", () => {
    const state = createSeed();
    state.classFees = state.classFees.filter((fee) => fee.classId !== "6a");
    expect(invoicesForClass(state, "6a", "2026-09")).toHaveLength(10);
  });

  it("bỏ học sinh đã nghỉ khi tháng không có buổi và không có thanh toán", () => {
    const state = createSeed();
    const invoices = invoicesForClass(state, "6a", "2026-11");
    expect(invoices).toHaveLength(9);
    expect(invoices.some((invoice) => invoice.studentId === "6a-student-9")).toBe(
      false,
    );
    expect(classTotals(invoices)).toEqual({ due: 0, paid: 0, remaining: 0 });
  });

  it("tổng của danh sách rỗng bằng 0", () => {
    expect(classTotals([])).toEqual({ due: 0, paid: 0, remaining: 0 });
  });
});
