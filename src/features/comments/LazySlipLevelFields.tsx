import { lazy, type ComponentType } from "react";
import type { SlipLevelFieldsProps } from "./SlipLevelFields";

/**
 * Nạp phiếu 3 mức theo cờ build. Cờ tắt (staging/prod) thì Rollup bỏ hẳn nhánh
 * `import()` này, nên chunk LevelChicks/SlipLevelFields không vào bundle.
 */
export const LazySlipLevelFields = lazy(async (): Promise<{ default: ComponentType<SlipLevelFieldsProps> }> => {
  if (import.meta.env.VITE_CRITERIA_LEVELS === "1") {
    const module = await import("./SlipLevelFields");
    return { default: module.SlipLevelFields };
  }
  return { default: () => null };
});
