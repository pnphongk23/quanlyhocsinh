import type {
  ClassFee,
  TuitionNotice,
  TuitionPayment,
} from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requireClass, requireOnline, requireStudent } from "./helpers";
import { isAdmin } from "./access";

function requireAdmin(): void {
  if (!isAdmin()) throw new Error("Bạn không có quyền thực hiện thao tác này.");
}

const validDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Học phí mỗi buổi của lớp, tuỳ chọn tính phí buổi vắng không phép và
 * buổi học bù. chargeMakeup để trống thì giữ giá trị cũ (mặc định bật).
 */
export function setClassFee(
  classId: string,
  feePerSession: number,
  chargeAbsent: boolean,
  chargeMakeup?: boolean,
): ClassFee {
  requireAdmin();
  requireClass(classId);
  if (!Number.isInteger(feePerSession) || feePerSession < 0)
    throw new Error("Học phí mỗi buổi không hợp lệ.");
  const current = getStore().classFees.find((row) => row.classId === classId);
  const item: ClassFee = {
    classId,
    feePerSession,
    chargeAbsent,
    chargeMakeup: chargeMakeup ?? current?.chargeMakeup ?? true,
  };
  commit("classFees", classId, (draft) => {
    const existing = draft.classFees.find((row) => row.classId === classId);
    if (existing) Object.assign(existing, item);
    else draft.classFees.push(item);
  });
  return item;
}

/** Giảm học phí theo % cho một học sinh; 0% thì xoá dòng giảm. */
export function setStudentDiscount(studentId: string, percent: number): void {
  requireAdmin();
  requireStudent(studentId);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100)
    throw new Error("Phần trăm giảm không hợp lệ.");
  commit("studentFees", studentId, (draft) => {
    draft.studentFees = draft.studentFees.filter(
      (row) => row.studentId !== studentId,
    );
    if (percent > 0)
      draft.studentFees.push({ studentId, discountPercent: percent });
  });
}

/** Ghi nhận một lần thu học phí; trả về id bản ghi. */
export function recordTuitionPayment(input: {
  studentId: string;
  month: string;
  amount: number;
  paidAt: string;
  method: "cash" | "transfer";
  note: string;
}): string {
  requireAdmin();
  requireStudent(input.studentId);
  if (!Number.isInteger(input.amount) || input.amount <= 0)
    throw new Error("Số tiền thu không hợp lệ.");
  if (!validDate(input.paidAt)) throw new Error("Ngày thu không hợp lệ.");
  if (input.method !== "cash" && input.method !== "transfer")
    throw new Error("Hình thức thu không hợp lệ.");
  const item: TuitionPayment = {
    id: crypto.randomUUID(),
    studentId: input.studentId,
    month: input.month,
    amount: input.amount,
    paidAt: input.paidAt,
    method: input.method,
    note: input.note.trim(),
  };
  commit("tuitionPayments", item.id, (draft) => {
    draft.tuitionPayments.push(item);
  });
  return item.id;
}

export function removeTuitionPayment(id: string): void {
  requireAdmin();
  if (!getStore().tuitionPayments.some((row) => row.id === id))
    throw new Error("Không tìm thấy lần thu.");
  commit("tuitionPayments", id, (draft) => {
    draft.tuitionPayments = draft.tuitionPayments.filter(
      (row) => row.id !== id,
    );
  });
}

/**
 * Gửi thông báo học phí cho nhiều học sinh trong một commit (cần mạng).
 * Kiểm tra toàn bộ người nhận trước khi ghi: một lỗi thì không ai bị đổi.
 * amount do caller truyền, không tự tính lại ở đây.
 */
export function sendTuitionNoticeBatch(
  items: Array<{ studentId: string; month: string; amount: number }>,
): TuitionNotice[] {
  requireAdmin();
  requireOnline();
  if (items.length === 0) return [];
  for (const item of items) {
    requireStudent(item.studentId);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month))
      throw new Error("Tháng gửi thông báo không hợp lệ.");
    if (!Number.isInteger(item.amount) || item.amount < 0)
      throw new Error("Số tiền thông báo không hợp lệ.");
  }
  const sentAt = new Date().toISOString();
  const notices: TuitionNotice[] = items.map((item) => ({
    studentId: item.studentId,
    month: item.month,
    amount: item.amount,
    sentAt,
  }));
  commit("tuitionNotices", `batch:${items[0].month}`, (draft) => {
    for (const notice of notices) {
      draft.tuitionNotices = draft.tuitionNotices.filter(
        (row) =>
          !(row.studentId === notice.studentId && row.month === notice.month),
      );
      draft.tuitionNotices.push(notice);
    }
  });
  return notices;
}

/**
 * Gửi thông báo học phí cho phụ huynh (cần mạng).
 * amount do caller truyền, không tự tính lại ở đây.
 */
export function sendTuitionNotice(
  studentId: string,
  month: string,
  amount: number,
): TuitionNotice {
  requireAdmin();
  requireOnline();
  requireStudent(studentId);
  const item: TuitionNotice = {
    studentId,
    month,
    amount,
    sentAt: new Date().toISOString(),
  };
  commit("tuitionNotices", `${studentId}:${month}`, (draft) => {
    const existing = draft.tuitionNotices.find(
      (row) => row.studentId === studentId && row.month === month,
    );
    if (existing) Object.assign(existing, item);
    else draft.tuitionNotices.push(item);
  });
  return item;
}
