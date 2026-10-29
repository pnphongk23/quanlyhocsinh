import { SLIP_CRITERIA, generatedSlipSentence } from "../../data/slip";
import { buildTicketRows, type TicketRow } from "../../data/homework";
import type { StoreState } from "../../data/types";

export { SLIP_CRITERIA };

export function criteriaRowsForSession(state: StoreState, sessionId: string): TicketRow[] {
  return buildTicketRows(state, sessionId);
}

export function criteriaForRow(row: TicketRow): number {
  if (!row.comment) return 31;
  if (row.comment.scale === 3) return Math.max(0, (1 << (row.stars ?? 3)) - 1);
  return row.comment.criteria ?? 31;
}

export function criteriaUnmetCount(rows: TicketRow[], index: number, initialCriteria: (row: TicketRow) => number = () => 31, previewCriteria?: Record<string, number>): number {
  return rows.filter((row) => ((previewCriteria?.[row.student.id] ?? (row.comment ? criteriaForRow(row) : initialCriteria(row))) & (1 << index)) === 0).length;
}

export function canToggleCriterion(row: TicketRow): boolean {
  return !row.comment || row.comment.scale === 5;
}

export function rowHasCustomComment(row: TicketRow): boolean {
  if (!row.comment || row.comment.scale === 3) return false;
  return (row.comment.comment ?? generatedSlipSentence(criteriaForRow(row))) !== generatedSlipSentence(criteriaForRow(row));
}
