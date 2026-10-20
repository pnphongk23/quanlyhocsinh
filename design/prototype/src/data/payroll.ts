import type {
  PayAdjustment,
  PayrollSnapshot,
  PayrollSnapshotMember,
  Session,
  StaffPosition,
  StoreState,
} from "./types";
import { teachingEntries, type TeachingEntry } from "./teaching";

/** Khoảng ngày của một tháng "YYYY-MM", tính theo số ngày thực của tháng. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Một dòng lương theo buổi: đơn giá theo vị trí và số tiền của buổi đó. */
export interface PayrollLine {
  entry: TeachingEntry;
  rate: number;
  amount: number;
  /** true khi buổi chưa diễn ra (lương dự kiến, không vào tổng). */
  planned: boolean;
}

export interface PayrollSummary {
  memberId: string;
  /** Tên lưu cùng bảng lương, kể cả khi nhân sự đã bị vô hiệu hoá sau đó. */
  memberName: string;
  month: string;
  lines: PayrollLine[];
  /** Số buổi đã diễn ra theo vị trí (buổi dự kiến không tính). */
  mainCount: number;
  assistantCount: number;
  plannedCount: number;
  /** Tổng tiền các buổi đã diễn ra. */
  sessionAmount: number;
  /** Tổng tiền các buổi dự kiến (không cộng vào total). */
  plannedAmount: number;
  adjustments: PayAdjustment[];
  adjustmentTotal: number;
  total: number;
  /** Có ít nhất một dòng chưa có đơn giá (rate 0). */
  missingRate: boolean;
  status: "draft" | "locked";
}

function rateFor(
  state: StoreState,
  memberId: string,
  position: StaffPosition,
): number {
  const rate = state.payRates.find((item) => item.memberId === memberId);
  if (!rate) return 0;
  return position === "main" ? rate.mainRate : rate.assistantRate;
}

function memberNameOf(state: StoreState, memberId: string): string {
  return state.members.find((item) => item.id === memberId)?.name ?? "Nhân sự";
}

/** Dựng lương một thành viên từ dữ liệu sống của tháng (chưa chốt). */
function computeMemberPayroll(
  state: StoreState,
  memberId: string,
  month: string,
): PayrollSummary {
  const range = monthRange(month);
  const lines: PayrollLine[] = [];
  for (const entry of teachingEntries(state, memberId, range.from, range.to)) {
    if (entry.kind === "replaced") continue;
    const planned = entry.session.status === "planned";
    if (entry.session.status !== "held" && !planned) continue;
    const rate = rateFor(state, memberId, entry.position);
    lines.push({ entry, rate, amount: rate, planned });
  }
  const heldLines = lines.filter((line) => !line.planned);
  const plannedLines = lines.filter((line) => line.planned);
  const sessionAmount = heldLines.reduce((sum, line) => sum + line.amount, 0);
  const plannedAmount = plannedLines.reduce((sum, line) => sum + line.amount, 0);
  const adjustments = state.payAdjustments.filter(
    (item) => item.memberId === memberId && item.month === month,
  );
  const adjustmentTotal = adjustments.reduce((sum, item) => sum + item.amount, 0);
  const payrollMonth = state.payrollMonths.find((item) => item.month === month);
  return {
    memberId,
    memberName: memberNameOf(state, memberId),
    month,
    lines,
    mainCount: heldLines.filter((line) => line.entry.position === "main").length,
    assistantCount: heldLines.filter(
      (line) => line.entry.position === "assistant",
    ).length,
    plannedCount: plannedLines.length,
    sessionAmount,
    plannedAmount,
    adjustments,
    adjustmentTotal,
    total: sessionAmount + adjustmentTotal,
    missingRate: lines.some((line) => line.rate === 0),
    status: payrollMonth ? payrollMonth.status : "draft",
  };
}

/** Các thành viên nhân sự đang hoạt động (bỏ Admin, phụ huynh, người đã tắt). */
function staffMembers(state: StoreState) {
  const staffRoleIds = new Set(
    state.roles.filter((role) => role.kind === "staff").map((role) => role.id),
  );
  return state.members.filter(
    (member) =>
      member.status !== "disabled" && staffRoleIds.has(member.roleId),
  );
}

/** Có phát sinh trong tháng: có đơn giá, điều chỉnh, hoặc buổi dạy/dự kiến. */
function hasMonthActivity(
  state: StoreState,
  memberId: string,
  month: string,
): boolean {
  const range = monthRange(month);
  const hasPayRate = state.payRates.some((item) => item.memberId === memberId);
  const hasAdjustment = state.payAdjustments.some(
    (item) => item.memberId === memberId && item.month === month,
  );
  const hasEntry = teachingEntries(
    state,
    memberId,
    range.from,
    range.to,
  ).some(
    (entry) =>
      entry.kind !== "replaced" &&
      (entry.session.status === "held" || entry.session.status === "planned"),
  );
  return hasPayRate || hasAdjustment || hasEntry;
}

/** Bảng lương dựng từ dữ liệu sống của tất cả nhân sự có phát sinh trong tháng. */
function computeMonthSummaries(
  state: StoreState,
  month: string,
): PayrollSummary[] {
  return staffMembers(state)
    .filter((member) => hasMonthActivity(state, member.id, month))
    .map((member) => computeMemberPayroll(state, member.id, month))
    .sort(
      (a, b) =>
        a.memberName.localeCompare(b.memberName, "vi") ||
        a.memberId.localeCompare(b.memberId),
    );
}

function toSnapshotMember(summary: PayrollSummary): PayrollSnapshotMember {
  return {
    memberId: summary.memberId,
    memberName: summary.memberName,
    lines: summary.lines.map((line) => ({
      sessionId: line.entry.session.id,
      date: line.entry.session.date,
      time: line.entry.session.time,
      classId: line.entry.classId,
      position: line.entry.position,
      kind: line.entry.kind === "substitute" ? "substitute" : "own",
      otherMemberId: line.entry.otherMemberId,
      makeup: line.entry.session.makeup === true,
      rate: line.rate,
      amount: line.amount,
      planned: line.planned,
    })),
    mainCount: summary.mainCount,
    assistantCount: summary.assistantCount,
    plannedCount: summary.plannedCount,
    sessionAmount: summary.sessionAmount,
    plannedAmount: summary.plannedAmount,
    adjustments: summary.adjustments.map((item) => ({ ...item })),
    adjustmentTotal: summary.adjustmentTotal,
    total: summary.total,
    missingRate: summary.missingRate,
  };
}

/** Chụp bảng lương tháng từ dữ liệu hiện tại; gọi đúng lúc chốt tháng. */
export function buildPayrollSnapshot(
  state: StoreState,
  month: string,
  lockedAt: string = new Date().toISOString(),
): PayrollSnapshot {
  return {
    month,
    lockedAt,
    members: computeMonthSummaries(state, month).map(toSnapshotMember),
  };
}

function sessionFromSnapshot(
  month: string,
  line: PayrollSnapshotMember["lines"][number],
): Session {
  return {
    id: line.sessionId,
    classId: line.classId,
    date: line.date,
    time: line.time,
    origin: "manual",
    makeup: line.makeup,
    status: line.planned ? "planned" : "held",
  };
}

/** Dựng lại PayrollSummary của một người từ snapshot tháng đã chốt. */
function summaryFromSnapshot(
  month: string,
  member: PayrollSnapshotMember,
): PayrollSummary {
  return {
    memberId: member.memberId,
    memberName: member.memberName,
    month,
    lines: member.lines.map((line) => ({
      entry: {
        session: sessionFromSnapshot(month, line),
        classId: line.classId,
        position: line.position,
        kind: line.kind,
        otherMemberId: line.otherMemberId,
        counted: !line.planned,
      },
      rate: line.rate,
      amount: line.amount,
      planned: line.planned,
    })),
    mainCount: member.mainCount,
    assistantCount: member.assistantCount,
    plannedCount: member.plannedCount,
    sessionAmount: member.sessionAmount,
    plannedAmount: member.plannedAmount,
    adjustments: member.adjustments.map((item) => ({ ...item })),
    adjustmentTotal: member.adjustmentTotal,
    total: member.total,
    missingRate: member.missingRate,
    status: "locked",
  };
}

function snapshotOf(state: StoreState, month: string) {
  return state.payrollSnapshots.find((item) => item.month === month) ?? null;
}

function isLocked(state: StoreState, month: string): boolean {
  return (
    state.payrollMonths.find((item) => item.month === month)?.status === "locked"
  );
}

/**
 * Lương một thành viên trong tháng. Tháng đã chốt thì đọc snapshot bất biến;
 * nếu dữ liệu cũ chưa có snapshot (chưa qua migration) mới tính từ dữ liệu sống.
 */
export function payrollForMember(
  state: StoreState,
  memberId: string,
  month: string,
): PayrollSummary {
  if (isLocked(state, month)) {
    const snapshot = snapshotOf(state, month);
    const member = snapshot?.members.find((item) => item.memberId === memberId);
    if (snapshot && member) return summaryFromSnapshot(month, member);
  }
  return computeMemberPayroll(state, memberId, month);
}

/** Bảng lương cả tháng: tháng đã chốt đọc snapshot, tháng nháp tính từ dữ liệu sống. */
export function payrollForMonth(
  state: StoreState,
  month: string,
): PayrollSummary[] {
  if (isLocked(state, month)) {
    const snapshot = snapshotOf(state, month);
    if (snapshot)
      return snapshot.members
        .map((member) => summaryFromSnapshot(month, member))
        .sort(
          (a, b) =>
            a.memberName.localeCompare(b.memberName, "vi") ||
            a.memberId.localeCompare(b.memberId),
        );
  }
  return computeMonthSummaries(state, month);
}

/**
 * Bổ sung dữ liệu lịch sử cho store cũ (idempotent): chụp phân công gốc của
 * các buổi đã diễn ra và tạo snapshot cho các tháng đã chốt nhưng chưa có.
 *
 * Giới hạn: dữ liệu đã bị ghi đè trước migration không thể dựng lại; snapshot
 * đóng băng đúng những gì còn đọc được tại thời điểm migration.
 */
export function hydratePayrollState(state: StoreState): StoreState {
  if (!Array.isArray(state.sessionStaffBase)) state.sessionStaffBase = [];
  if (!Array.isArray(state.payrollSnapshots)) state.payrollSnapshots = [];
  for (const session of state.sessions) {
    if (session.status !== "held") continue;
    if (state.sessionStaffBase.some((item) => item.sessionId === session.id))
      continue;
    for (const row of state.classStaff.filter(
      (item) => item.classId === session.classId,
    ))
      state.sessionStaffBase.push({
        sessionId: session.id,
        position: row.position,
        memberId: row.memberId,
      });
  }
  for (const row of state.payrollMonths) {
    if (row.status !== "locked") continue;
    if (state.payrollSnapshots.some((item) => item.month === row.month))
      continue;
    state.payrollSnapshots.push(buildPayrollSnapshot(state, row.month));
  }
  return state;
}
