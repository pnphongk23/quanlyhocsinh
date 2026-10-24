/** Một thao tác ghi cục bộ: kiểm tra đã xong, còn lại áp vào bộ nhớ, ghi bền, và hoàn lại bộ nhớ khi ghi bền lỗi. */
export interface WritePlan<T> { result: T; apply: () => void; undo: () => void; persist: () => Promise<unknown> }

/** Hàm đồng bộ cũ: áp vào bộ nhớ, ghi bền ở nền, lỗi ghi bị bỏ qua (trạng thái lưu báo lỗi). */
export function runInBackground<T>(plan: WritePlan<T>): T {
  plan.apply();
  void plan.persist().catch(() => {});
  return plan.result;
}

/** Biến thể `…Durable`: chờ ghi bền; lỗi ⇒ hoàn bộ nhớ về như trước rồi ném lỗi gốc. */
export async function runDurably<T>(plan: WritePlan<T>): Promise<T> {
  plan.apply();
  try { await plan.persist(); } catch (error) { plan.undo(); throw error; }
  return plan.result;
}

/** Gộp nhiều thao tác thành một lô: áp tất cả, ghi bền lần lượt; một lệnh lỗi ⇒ hoàn bộ nhớ của cả lô. */
export function composePlans<T, R>(plans: WritePlan<T>[], result: R): WritePlan<R> {
  return {
    result,
    apply: () => plans.forEach((plan) => plan.apply()),
    undo: () => [...plans].reverse().forEach((plan) => plan.undo()),
    persist: async () => { for (const plan of plans) await plan.persist(); },
  };
}
