import type { Identity } from "../types";

// Câu nhận xét mặc định của phiếu thang 5 theo số sao (spec mục 4).
const DEFAULT_COMMENTS: Record<number, string> = {
  5: "Con học rất tốt, chăm chỉ, tích cực tham gia phát biểu",
  4: "Con học tốt, làm bài đầy đủ nhưng hơi trầm",
  3: "Con học tốt, nhưng còn hơi mất tập trung, nói tự do",
};
const LOW_COMMENT = "Con chưa tích cực tham gia hoạt động, cần tập trung hơn";

export function defaultSlipComment(stars: number): string {
  return DEFAULT_COMMENTS[stars] ?? LOW_COMMENT;
}

/** Phụ huynh không thấy danh sách tiêu chí và nhận câu hiệu lực; phiếu cũ thang 3 giữ nguyên. */
export function slipForViewer<T extends Record<string, any>>(identity: Identity, row: T): T {
  if (identity.scopeKind !== "linked_students") return row;
  const view: Record<string, any> = { ...row };
  delete view.criteria;
  if (view.scale === 5 && view.comment == null && typeof view.stars === "number")
    view.comment = defaultSlipComment(view.stars);
  return view as T;
}
