import type { HTMLAttributes } from "react";
import s from "./ui.module.css";

/**
 * Hàng nút chính ở đáy trang form. Mobile: dính trên thanh tab dưới (`bottom: var(--sticky-bottom)`),
 * các nút xếp dọc và `margin-top: auto` đẩy xuống đáy trang. Desktop: nằm trong luồng, căn phải.
 */
export function ActionFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[s.actionFooter, className].filter(Boolean).join(" ")} {...props} />;
}
export default ActionFooter;
