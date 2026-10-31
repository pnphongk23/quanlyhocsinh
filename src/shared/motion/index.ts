import s from "./motion.module.css";

export { PageTransition } from "./PageTransition";
export { Collapse } from "./Collapse";
export { useSlideIndicator } from "./useSlideIndicator";

/** Lớp CSS dùng lại: `pressable` (nhấn scale 0.98), `chevron` (xoay khi aria-expanded), `fadeIn`, `indicator`. */
export const motionClass = {
  pressable: s.pressable,
  chevron: s.chevron,
  fadeIn: s.fadeIn,
  indicator: s.indicator,
  indicatorReady: s.indicatorReady,
};
