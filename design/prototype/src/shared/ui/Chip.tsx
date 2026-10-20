import type { HTMLAttributes } from "react";
import s from "./ui.module.css";
export function Chip({
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span className={s.chip + " " + className} {...props} />;
}
export default Chip;
