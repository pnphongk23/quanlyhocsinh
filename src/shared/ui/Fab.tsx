import { useEffect, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import s from "./fab.module.css";

export interface FabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
}

/**
 * Nút nổi neo theo màn hình. Render qua portal ra `document.body` vì tổ tiên có
 * `transform` (ví dụ `.page` sau animation chuyển trang) biến `position: fixed`
 * thành neo theo tổ tiên đó. Đồng thời đặt `data-has-fab` trên `<html>` để
 * `--fab-pad` chừa đáy vùng nội dung, thẻ cuối và nút ⋯ không bị che.
 */
export function Fab({ label, className, type = "button", ...props }: FabProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-has-fab", "");
    return () => root.removeAttribute("data-has-fab");
  }, []);
  return createPortal(
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[s.fab, className].filter(Boolean).join(" ")}
      {...props}
    >
      <span aria-hidden="true" className={s.plus}>+</span>
    </button>,
    document.body,
  );
}
export default Fab;
