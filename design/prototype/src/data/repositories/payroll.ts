import type { Member, PayAdjustment, PayRate } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { getActiveMember, isAdmin } from "./access";
import {
  buildPayrollSnapshot,
  payrollForMember,
  payrollForMonth,
  type PayrollSummary,
} from "../payroll";

function requireAdmin(): void {
  if (!isAdmin()) throw new Error("Bạn không có quyền thực hiện thao tác này.");
}

function requireMember(id: string): Member {
  const member = getStore().members.find((item) => item.id === id);
  if (!member) throw new Error("Không tìm thấy thành viên.");
  return member;
}

/** Tháng đã chốt thì khoá mọi thay đổi của bảng lương tháng đó. */
function requireOpenMonth(month: string): void {
  const row = getStore().payrollMonths.find((item) => item.month === month);
  if (row?.status === "locked") throw new Error("Bảng lương đã chốt.");
}

const validRate = (value: number): boolean =>
  Number.isInteger(value) && value >= 0;

/**
 * Ai xem được bảng lương của một người: Admin xem tất cả;
 * nhân sự đang hoạt động chỉ xem được bảng lương của chính mình.
 */
export function canViewPayroll(memberId: string): boolean {
  if (isAdmin()) return true;
  const member = getActiveMember();
  if (!member || member.id !== memberId) return false;
  const role = getStore().roles.find((item) => item.id === member.roleId);
  return role?.kind === "staff";
}

/** Bảng lương của một người trong tháng; giáo viên chỉ đọc được của mình. */
export function readMemberPayroll(
  memberId: string,
  month: string,
): PayrollSummary {
  if (!canViewPayroll(memberId))
    throw new Error("Bạn không có quyền xem bảng lương này.");
  return payrollForMember(getStore(), memberId, month);
}

/** Bảng lương cả tháng cho mọi nhân sự; chỉ Admin. */
export function readMonthPayroll(month: string): PayrollSummary[] {
  requireAdmin();
  return payrollForMonth(getStore(), month);
}

/** Đặt đơn giá dạy chính / trợ giảng (VND mỗi buổi) cho một nhân sự. */
export function setPayRate(
  memberId: string,
  mainRate: number,
  assistantRate: number,
): PayRate {
  requireAdmin();
  requireMember(memberId);
  if (!validRate(mainRate) || !validRate(assistantRate))
    throw new Error("Đơn giá không hợp lệ.");
  const item: PayRate = { memberId, mainRate, assistantRate };
  commit("payRates", memberId, (draft) => {
    const existing = draft.payRates.find((row) => row.memberId === memberId);
    if (existing) Object.assign(existing, item);
    else draft.payRates.push(item);
  });
  return item;
}

/** Thêm khoản cộng/trừ lương tháng; khoản 0 hoặc thiếu ghi chú bị từ chối. */
export function addPayAdjustment(input: {
  memberId: string;
  month: string;
  amount: number;
  note: string;
}): PayAdjustment {
  requireAdmin();
  requireMember(input.memberId);
  requireOpenMonth(input.month);
  if (!Number.isInteger(input.amount) || input.amount === 0)
    throw new Error("Số tiền điều chỉnh phải là số nguyên khác 0.");
  const note = input.note.trim();
  if (!note) throw new Error("Nhập ghi chú.");
  const item: PayAdjustment = {
    id: crypto.randomUUID(),
    memberId: input.memberId,
    month: input.month,
    amount: input.amount,
    note,
  };
  commit("payAdjustments", item.id, (draft) => {
    draft.payAdjustments.push(item);
  });
  return item;
}

export function removePayAdjustment(id: string): void {
  requireAdmin();
  const item = getStore().payAdjustments.find((row) => row.id === id);
  if (!item) throw new Error("Không tìm thấy khoản điều chỉnh.");
  requireOpenMonth(item.month);
  commit("payAdjustments", id, (draft) => {
    draft.payAdjustments = draft.payAdjustments.filter((row) => row.id !== id);
  });
}

/**
 * Chốt bảng lương tháng: ghi trạng thái khoá và snapshot bất biến trong cùng
 * một commit. Đổi đơn giá, phân công, dạy thay hay buổi học sau đó không làm
 * đổi bảng lương đã chốt.
 */
export function lockPayroll(month: string): void {
  requireAdmin();
  requireOpenMonth(month);
  commit("payrollMonths", month, (draft) => {
    const existing = draft.payrollMonths.find((row) => row.month === month);
    if (existing) existing.status = "locked";
    else draft.payrollMonths.push({ month, status: "locked" });
    draft.payrollSnapshots = draft.payrollSnapshots.filter(
      (row) => row.month !== month,
    );
    draft.payrollSnapshots.push(buildPayrollSnapshot(draft, month));
  });
}

export function getPayrollStatus(month: string): "draft" | "locked" {
  return (
    getStore().payrollMonths.find((row) => row.month === month)?.status ??
    "draft"
  );
}
