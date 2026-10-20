import type { ButtonHTMLAttributes } from "react";
import s from "./fab.module.css";

export interface FabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
}

export function Fab({ label, className, type = "button", ...props }: FabProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[s.fab, className].filter(Boolean).join(" ")}
      {...props}
    >
      <span aria-hidden="true" className={s.plus}>+</span>
    </button>
  );
}
export default Fab;
