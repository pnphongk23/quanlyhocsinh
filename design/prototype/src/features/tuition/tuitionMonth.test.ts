import { describe, expect, it } from "vitest";
import { createSeed } from "../../data/seed";
import { invoiceFor, tuitionSessions } from "../../data/tuition";
import type { StoreState } from "../../data/types";

type AttendanceStatus = StoreState["attendance"][number]["status"];
import { tuitionMonthRows } from "./tuitionMonth";

/**
 * Fixture dùng seed thật của 6A (150.000 đ/buổi, tháng 10/2026 có buổi ngày
 * 5, 7, 12, 14 và buổi dự kiến 19; buổi học bù 25 dự kiến). Mỗi test thêm
 * buổi/điểm danh cụ thể để kiểm tra chính sách tính phí.
 */
function fixture(): StoreState {
  return createSeed();
}

function addSession(
  state: StoreState,
  id: string,
  date: string,
  options: { classId?: string; makeup?: boolean; status?: "held" | "cancelled" | "planned" } = {},
): void {
  state.sessions.push({
    id,
    classId: options.classId ?? "6a",
    date,
    time: "18:00",
    origin: "manual",
    status: options.status ?? "held",
    makeup: options.makeup,
    note: options.makeup ? "Buổi học bù" : undefined,
  });
}

function addAttendance(
  state: StoreState,
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
): void {
  state.attendance.push({
    id: `${sessionId}-${studentId}`,
    sessionId,
    studentId,
    status,
    note: "",
    lateAt: status === "late" ? "18:10" : null,
  });
}

function chargedIds(state: StoreState, studentId: string, month: string): string[] {
  return tuitionSessions(state, studentId, month).map((row) => row.session.id);
}

describe("tuitionMonthRows khớp số tiền với tuitionSessions/invoice", () => {
  it("6A tháng 10: các buổi tính phí trùng id và số đếm với hoá đơn", () => {
    const state = fixture();
    const rows = tuitionMonthRows(state, "6a-student-0", "2026-10");
    const charged = rows.filter((row) => row.charged);
    const invoice = invoiceFor(state, "6a-student-0", "2026-10");

    expect(charged.map((row) => row.session.id)).toEqual(
      chargedIds(state, "6a-student-0", "2026-10"),
    );
    expect(charged).toHaveLength(invoice.chargedCount);
    expect(invoice.chargedCount).toBe(4);
    // Học sinh 0 vắng không phép 12/10 và 14/10, lớp 6A vẫn tính phí.
    expect(
      charged
        .filter((row) => row.session.date >= "2026-10-12")
        .map((row) => row.note),
    ).toEqual(["Tính phí · Vắng không phép", "Tính phí · Vắng không phép"]);
  });

  it("bỏ buổi dự kiến và buổi học bù chưa diễn ra khỏi danh sách tháng", () => {
    const state = fixture();
    const rows = tuitionMonthRows(state, "6a-student-0", "2026-10");
    const dates = rows.map((row) => row.session.date);

    expect(dates).not.toContain("2026-10-19"); // buổi lặp dự kiến
    expect(dates).not.toContain("2026-10-25"); // buổi học bù dự kiến
    expect(rows.every((row) => row.session.status !== "planned")).toBe(true);
  });

  it("chỉ lấy buổi của đúng lớp, đúng tháng và trong thời gian học", () => {
    const state = fixture();
    addSession(state, "6a-other-month", "2026-09-15");
    addAttendance(state, "6a-other-month", "6a-student-0", "present");
    addSession(state, "ielts-oct", "2026-10-20", { classId: "ielts" });
    addAttendance(state, "ielts-oct", "6a-student-0", "present");
    addSession(state, "6a-after-leave", "2026-10-16");
    addAttendance(state, "6a-after-leave", "6a-student-9", "present");

    const rows = tuitionMonthRows(state, "6a-student-0", "2026-10");
    expect(rows.every((row) => row.session.classId === "6a")).toBe(true);
    expect(rows.every((row) => row.session.date.startsWith("2026-10"))).toBe(true);
    expect(rows.map((row) => row.session.id)).not.toContain("ielts-oct");

    // Học sinh 9 rời lớp 9/10 nên buổi 16/10 không vào phiếu và không tính phí.
    const leftRows = tuitionMonthRows(state, "6a-student-9", "2026-10");
    expect(leftRows.map((row) => row.session.id)).not.toContain("6a-after-leave");
    expect(chargedIds(state, "6a-student-9", "2026-10")).not.toContain(
      "6a-after-leave",
    );
  });

  it("buổi huỷ có mặt trong danh sách nhưng không tính phí và không vào hoá đơn", () => {
    const state = fixture();
    addSession(state, "6a-cancelled", "2026-10-16", { status: "cancelled" });
    addAttendance(state, "6a-cancelled", "6a-student-0", "present");

    const before = invoiceFor(state, "6a-student-0", "2026-10").chargedCount;
    const rows = tuitionMonthRows(state, "6a-student-0", "2026-10");
    const cancelled = rows.find((row) => row.session.id === "6a-cancelled");

    expect(cancelled?.charged).toBe(false);
    expect(cancelled?.note).toContain("Buổi huỷ");
    expect(chargedIds(state, "6a-student-0", "2026-10")).not.toContain(
      "6a-cancelled",
    );
    expect(before).toBe(4);
    expect(invoiceFor(state, "6a-student-0", "2026-10").chargedCount).toBe(4);
  });

  it("vắng có phép không tính phí dù có mặt trong danh sách tháng", () => {
    const state = fixture();
    const rows = tuitionMonthRows(state, "6a-student-1", "2026-10");
    const excused = rows.find((row) => row.session.date === "2026-10-14");

    expect(excused?.label).toBe("Vắng có phép");
    expect(excused?.charged).toBe(false);
    expect(excused?.note).toContain("Có phép");
    expect(chargedIds(state, "6a-student-1", "2026-10")).toHaveLength(3);
  });

  it("học bù đã diễn ra: tính phí khi lớp bật, không tính khi lớp tắt", () => {
    const on = fixture();
    on.sessions.find((row) => row.id === "6a-extra-session")!.status = "held";
    addAttendance(on, "6a-extra-session", "6a-student-0", "present");

    const onRows = tuitionMonthRows(on, "6a-student-0", "2026-10");
    const paidMakeup = onRows.find(
      (row) => row.session.id === "6a-extra-session",
    );
    expect(paidMakeup?.makeup).toBe(true);
    expect(paidMakeup?.charged).toBe(true);
    expect(paidMakeup?.note).toBe("Tính phí");
    expect(chargedIds(on, "6a-student-0", "2026-10")).toContain(
      "6a-extra-session",
    );
    expect(invoiceFor(on, "6a-student-0", "2026-10").chargedCount).toBe(5);

    const off = fixture();
    off.sessions.find((row) => row.id === "6a-extra-session")!.status = "held";
    addAttendance(off, "6a-extra-session", "6a-student-0", "present");
    off.classFees.find((row) => row.classId === "6a")!.chargeMakeup = false;

    const offRows = tuitionMonthRows(off, "6a-student-0", "2026-10");
    const freeMakeup = offRows.find(
      (row) => row.session.id === "6a-extra-session",
    );
    expect(freeMakeup?.charged).toBe(false);
    expect(freeMakeup?.note).toContain("không tính phí học bù");
    expect(chargedIds(off, "6a-student-0", "2026-10")).not.toContain(
      "6a-extra-session",
    );
    expect(invoiceFor(off, "6a-student-0", "2026-10").chargedCount).toBe(4);
  });

  it("tắt tính phí vắng không phép thì buổi vắng rớt khỏi hoá đơn", () => {
    const state = fixture();
    state.classFees.find((row) => row.classId === "6a")!.chargeAbsent = false;

    const rows = tuitionMonthRows(state, "6a-student-0", "2026-10");
    const absentRows = rows.filter((row) => row.label === "Vắng");
    expect(absentRows).toHaveLength(2);
    expect(absentRows.every((row) => !row.charged)).toBe(true);
    expect(absentRows[0].note).toContain("Vắng không phép");

    const charged = rows.filter((row) => row.charged);
    const invoice = invoiceFor(state, "6a-student-0", "2026-10");
    expect(charged).toHaveLength(2);
    expect(charged).toHaveLength(invoice.chargedCount);
    expect(invoice.due).toBe(300000);
  });

  it("buổi đã diễn ra nhưng chưa điểm danh vẫn hiện, không tính phí", () => {
    const state = fixture();
    addSession(state, "6a-no-attendance", "2026-10-16");

    const rows = tuitionMonthRows(state, "6a-student-0", "2026-10");
    const row = rows.find((item) => item.session.id === "6a-no-attendance");

    expect(row?.label).toBe("Chưa điểm danh");
    expect(row?.charged).toBe(false);
    expect(chargedIds(state, "6a-student-0", "2026-10")).not.toContain(
      "6a-no-attendance",
    );
  });
});
