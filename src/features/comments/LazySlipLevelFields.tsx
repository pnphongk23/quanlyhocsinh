import { lazy, type ComponentType } from "react";
import type { SlipLevelFieldsProps } from "./SlipLevelFields";
import s from "./slipLevelSkeleton.module.css";

/**
 * Nạp phiếu 3 mức theo cờ build. Cố ý đọc thẳng `import.meta.env.VITE_CRITERIA_LEVELS`
 * thay vì gọi `criteriaLevelsEnabled()`: chỉ literal env trong cùng module mới được Vite
 * thay bằng `false` để Rollup bỏ hẳn nhánh `import()`, nên chunk LevelChicks/SlipLevelFields
 * không vào bundle staging/prod. Gọi hàm helper sẽ giữ dynamic import lại.
 */
/** Khung giữ chỗ ~5 hàng để sheet không nháy khi chunk phiếu 3 mức đang nạp. */
export function SlipLevelSkeleton() {
  return (
    <div className={s.skeleton} data-testid="slip-level-skeleton" aria-hidden="true">
      <div className={s.star} />
      <div className={s.rows}>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={s.row} data-testid="slip-level-skeleton-row">
            <span className={s.label} />
            <span className={s.chicks} />
          </div>
        ))}
      </div>
    </div>
  );
}

export const LazySlipLevelFields = lazy(async (): Promise<{ default: ComponentType<SlipLevelFieldsProps> }> => {
  if (import.meta.env.VITE_CRITERIA_LEVELS === "1") {
    const module = await import("./SlipLevelFields");
    return { default: module.SlipLevelFields };
  }
  return { default: () => null };
});
