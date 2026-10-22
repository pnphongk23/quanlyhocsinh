import type { ReactNode } from "react";
import s from "./motion.module.css";

export interface CollapseProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/** Mở/đóng bằng grid-template-rows 0fr↔1fr; khi đóng nội dung không focus/đọc được. */
export function Collapse({ open, children, className }: CollapseProps) {
  return (
    <div
      className={s.collapse + (open ? " " + s.collapseOpen : "") + (className ? " " + className : "")}
      aria-hidden={!open}
      inert={!open}
    >
      <div className={s.collapseInner}>{children}</div>
    </div>
  );
}
export default Collapse;
