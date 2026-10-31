import type { Identity } from "../types";

/** Phụ huynh không thấy danh sách tiêu chí và nhận câu hiệu lực; phiếu cũ thang 3 giữ nguyên. */
export function slipForViewer<T extends Record<string, any>>(identity: Identity, row: T): T {
  const view: Record<string, any> = { ...row };
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
