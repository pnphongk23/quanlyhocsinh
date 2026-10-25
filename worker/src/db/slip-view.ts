import type { Identity } from "../types";
import { generateSlipComment } from "../lib/slip-comment";

/** Phụ huynh không thấy danh sách tiêu chí và nhận câu hiệu lực; phiếu cũ thang 3 giữ nguyên. */
export function slipForViewer<T extends Record<string, any>>(identity: Identity, row: T): T {
  const view: Record<string, any> = { ...row };
  if (view.scale === 5 && view.comment == null && Number.isInteger(view.criteria))
    view.comment = generateSlipComment(view.criteria);
  if (identity.scopeKind === "linked_students") {
    if (view.scale === 5) {
      view.comment = `${view.comment ?? ""}${view.note ? `\n${view.note}` : ""}`;
      delete view.note;
    }
    delete view.criteria;
    delete view.hw_manual;
  }
  return view as T;
}
