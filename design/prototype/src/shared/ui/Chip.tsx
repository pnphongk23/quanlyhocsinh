import type { HTMLAttributes } from "react";
import s from "./ui.module.css";
export function Chip({
  className = "",
  selected = false,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { selected?: boolean }) {
  return <span className={s.chip + (selected ? " " + s.chipOn : "") + " " + className} {...props} />;
}
export default Chip;
