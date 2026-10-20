import type { Session, StoreState, Student, TuitionNotice } from "./types";

/** Buổi được tính phí và trạng thái điểm danh tương ứng của học sinh. */
export interface TuitionSession {
  session: Session;
  status: "present" | "late" | "absent";
  /** Buổi này là buổi học bù. */
  makeup: boolean;
}

/** Buổi học bù trong tháng kèm lý do tính hay không tính phí. */
export interface TuitionMakeupSession {
  session: Session;
  charged: boolean;
  reason: string;
}

export interface TuitionInvoice {
  studentId: string;
  classId: string;
  month: string;
  chargedCount: number;
  feePerSession: number;
  discountPercent: number;
  gross: number;
  due: number;
  paid: number;
  remaining: number;
  status: "nofee" | "unpaid" | "partial" | "paid";
  provisional: boolean;
  notice: TuitionNotice | null;
  changedSinceNotice: boolean;
  debtBefore: number;
}

/** Cùng quy tắc với eligible() trong repositories/helpers.ts (hàm đó kéo theo store). */
function inEnrollment(student: Student, date: string): boolean {
  return (
    date >= student.enrolledAt && (!student.leftAt || date <= student.leftAt)
  );
}

function inMonth(date: string, month: string): boolean {
  return date.slice(0, 7) === month;
}

/** Làm tròn số phải thu đến 1.000 đ sau khi trừ phần giảm giá. */
function roundDue(gross: number, discountPercent: number): number {
  return Math.round((gross * (100 - discountPercent)) / 100 / 1000) * 1000;
}

/**
 * Danh sách tháng từ `from` (tính cả) đến `toExclusive` (không tính).
 * Dùng cho công nợ: từ tháng vào lớp đến tháng trước tháng đang xem.
 */
function monthsUntil(from: string, toExclusive: string): string[] {
  const months: string[] = [];
  let [year, month] = from.split("-").map(Number);
  const [endYear, endMonth] = toExclusive.split("-").map(Number);
  while (year < endYear || (year === endYear && month < endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/**
 * Buổi tính phí của một học sinh trong tháng: buổi đã diễn ra, thuộc lớp của em,
 * nằm trong khoảng ngày vào lớp..ngày rời lớp, và em có mặt/muộn (hoặc vắng khi
 * lớp bật "Tính phí buổi vắng không phép"). Có phép, buổi hủy, buổi chưa diễn ra,
 * và buổi không có bản ghi điểm danh đều không tính.
 * Buổi học bù chỉ tính phí khi lớp bật "Tính phí buổi học bù".
 */
export function tuitionSessions(
  state: StoreState,
  studentId: string,
  month: string,
): TuitionSession[] {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) return [];
  const fee = state.classFees.find((item) => item.classId === student.classId);
  if (!fee) return [];

  const rows: TuitionSession[] = [];
  for (const session of state.sessions) {
    if (
      session.classId !== student.classId ||
      session.status !== "held" ||
      !inMonth(session.date, month) ||
      !inEnrollment(student, session.date)
    )
      continue;
    const makeup = session.makeup === true;
    if (makeup && !fee.chargeMakeup) continue;
    const record = state.attendance.find(
      (item) => item.sessionId === session.id && item.studentId === studentId,
    );
    if (!record) continue;
    if (record.status === "present" || record.status === "late")
      rows.push({ session, status: record.status, makeup });
    else if (record.status === "absent" && fee.chargeAbsent)
      rows.push({ session, status: "absent", makeup });
  }
  return rows.sort(
    (a, b) =>
      a.session.date.localeCompare(b.session.date) ||
      a.session.id.localeCompare(b.session.id),
  );
}

/**
 * Buổi học bù trong tháng của một học sinh (đã diễn ra, trong thời gian học),
 * kèm lý do tiếng Việt vì sao có/không tính phí để hiển thị trên phiếu.
 */
export function tuitionMakeupSessions(
  state: StoreState,
  studentId: string,
  month: string,
): TuitionMakeupSession[] {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) return [];
  const fee = state.classFees.find((item) => item.classId === student.classId);

  const rows: TuitionMakeupSession[] = [];
  for (const session of state.sessions) {
    if (
      session.classId !== student.classId ||
      session.makeup !== true ||
      session.status !== "held" ||
      !inMonth(session.date, month) ||
      !inEnrollment(student, session.date)
    )
      continue;
    if (!fee || !fee.chargeMakeup) {
      rows.push({
        session,
        charged: false,
        reason: "Lớp không tính phí học bù",
      });
      continue;
    }
    const record = state.attendance.find(
      (item) => item.sessionId === session.id && item.studentId === studentId,
    );
    if (!record) {
      rows.push({ session, charged: false, reason: "Chưa điểm danh, không tính" });
    } else if (record.status === "present" || record.status === "late") {
      rows.push({ session, charged: true, reason: "Tính phí học bù" });
    } else if (record.status === "excused") {
      rows.push({ session, charged: false, reason: "Vắng có phép, không tính" });
    } else {
      rows.push({
        session,
        charged: fee.chargeAbsent,
        reason: fee.chargeAbsent
          ? "Vắng không phép, tính phí"
          : "Vắng không phép, không tính",
      });
    }
  }
  return rows.sort(
    (a, b) =>
      a.session.date.localeCompare(b.session.date) ||
      a.session.id.localeCompare(b.session.id),
  );
}

type InvoiceCore = Omit<TuitionInvoice, "debtBefore">;

/** Phiếu học phí của một tháng, không kèm công nợ để tránh tính đệ quy lồng nhau. */
function invoiceCore(
  state: StoreState,
  student: Student,
  month: string,
): InvoiceCore {
  const fee = state.classFees.find((item) => item.classId === student.classId);
  const charged = tuitionSessions(state, student.id, month);
  const feePerSession = fee ? fee.feePerSession : 0;
  const discountPercent =
    state.studentFees.find((item) => item.studentId === student.id)
      ?.discountPercent ?? 0;
  const gross = charged.length * feePerSession;
  const due = feePerSession ? roundDue(gross, discountPercent) : 0;
  const paid = state.tuitionPayments
    .filter((item) => item.studentId === student.id && item.month === month)
    .reduce((total, item) => total + item.amount, 0);
  const remaining = Math.max(0, due - paid);
  const status: TuitionInvoice["status"] =
    !fee || feePerSession === 0 || due === 0
      ? "nofee"
      : paid >= due
        ? "paid"
        : paid > 0
          ? "partial"
          : "unpaid";
  const provisional = state.sessions.some(
    (session) =>
      session.classId === student.classId &&
      session.status === "planned" &&
      inMonth(session.date, month),
  );
  const notice =
    state.tuitionNotices.find(
      (item) => item.studentId === student.id && item.month === month,
    ) ?? null;
  return {
    studentId: student.id,
    classId: student.classId,
    month,
    chargedCount: charged.length,
    feePerSession,
    discountPercent,
    gross,
    due,
    paid,
    remaining,
    status,
    provisional,
    notice,
    changedSinceNotice: notice !== null && notice.amount !== due,
  };
}

/** Phiếu học phí một tháng, kèm công nợ các tháng trước (từ tháng vào lớp). */
export function invoiceFor(
  state: StoreState,
  studentId: string,
  month: string,
): TuitionInvoice {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) throw new Error("Không tìm thấy học sinh.");
  const debtBefore = monthsUntil(student.enrolledAt.slice(0, 7), month).reduce(
    (total, item) => total + invoiceCore(state, student, item).remaining,
    0,
  );
  return { ...invoiceCore(state, student, month), debtBefore };
}

/**
 * Phiếu học phí của mọi học sinh thuộc lớp trong tháng: em có buổi tính phí,
 * hoặc có thanh toán trong tháng, hoặc đang học. Sắp theo tên học sinh.
 */
export function invoicesForClass(
  state: StoreState,
  classId: string,
  month: string,
): TuitionInvoice[] {
  return state.students
    .filter((student) => student.classId === classId)
    .map((student) => ({ student, invoice: invoiceFor(state, student.id, month) }))
    .filter(
      ({ student, invoice }) =>
        invoice.chargedCount > 0 ||
        invoice.paid > 0 ||
        student.status === "active",
    )
    .sort((a, b) => a.student.name.localeCompare(b.student.name, "vi"))
    .map(({ invoice }) => invoice);
}

export function classTotals(invoices: TuitionInvoice[]): {
  due: number;
  paid: number;
  remaining: number;
} {
  return invoices.reduce(
    (totals, invoice) => ({
      due: totals.due + invoice.due,
      paid: totals.paid + invoice.paid,
      remaining: totals.remaining + invoice.remaining,
    }),
    { due: 0, paid: 0, remaining: 0 },
  );
}
