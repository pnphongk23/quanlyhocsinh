import type { HTMLAttributes } from "react";
import s from "./ui.module.css";
export type PillTone = "neutral" | "success" | "warning" | "error" | "primary";
export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
}
const toneClass: Record<PillTone, string> = {
  neutral: s.pillNeutral,
  success: s.pillSuccess,
  warning: s.pillWarning,
  error: s.pillError,
  primary: s.pillPrimary,
};
export function Pill({ tone = "neutral", className = "", ...props }: PillProps) {
  return (
    <span className={[s.pill, toneClass[tone], className].join(" ")} {...props} />
  );
}
export default Pill;
