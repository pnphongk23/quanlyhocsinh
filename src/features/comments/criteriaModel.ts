import { SLIP_CRITERIA, generatedSlipSentence } from "../../data/slip";
import { buildTicketRows, type TicketRow } from "../../data/homework";
import type { StoreState } from "../../data/types";

export { SLIP_CRITERIA };

export function criteriaRowsForSession(state: StoreState, sessionId: string): TicketRow[] {
  return buildTicketRows(state, sessionId);
}

export function criteriaForRow(row: TicketRow): number {
  if (!row.comment) return 31;
  // Legacy slips only carry a star score, not per-criterion results.
  // Missing criteria must count as unmet instead of being inferred as achieved.
  if (row.comment.scale === 3 || row.comment.criteria == null) return 0;
  return row.comment.criteria;
}

export function criteriaUnmetCount(rows: TicketRow[], index: number, initialCriteria: (row: TicketRow) => number = () => 31, previewCriteria?: Record<string, number>): number {
  return rows.filter((row) => ((previewCriteria?.[row.student.id] ?? (row.comment ? criteriaForRow(row) : initialCriteria(row))) & (1 << index)) === 0).length;
}

export function criteriaBadge(rows: TicketRow[], index: number, initialCriteria: (row: TicketRow) => number = () => 31, previewCriteria?: Record<string, number>): { kind: "all-met" | "no-ticket" | "unmet"; count: number; label: string } {
  const noTicket = rows.filter((row) => row.comment === null && previewCriteria?.[row.student.id] === undefined).length;
  const unmet = criteriaUnmetCount(rows, index, initialCriteria, previewCriteria);

  if (noTicket === 0 && unmet === 0) return { kind: "all-met", count: 0, label: "Cả lớp đạt" };
  if (noTicket > 0) return { kind: "no-ticket", count: noTicket, label: `${noTicket} em chưa có phiếu` };
  return { kind: "unmet", count: unmet, label: `${unmet} em chưa đạt` };
}

export function canToggleCriterion(row: TicketRow): boolean {
  return !row.comment || (row.comment.scale !== 3 && row.comment.criteria != null);
}

export function rowHasCustomComment(row: TicketRow): boolean {
  if (!row.comment || row.comment.scale === 3) return false;
  return (row.comment.comment ?? generatedSlipSentence(criteriaForRow(row))) !== generatedSlipSentence(criteriaForRow(row));
}
