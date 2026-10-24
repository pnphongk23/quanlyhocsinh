import { useId, type HTMLAttributes, type ReactNode } from "react";
import s from "./ui.module.css";

export interface ActionFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Lý do nút đang disabled (vd "Chưa có thay đổi để lưu"); gắn `aria-describedby` cho nhóm nút. */
  hint?: ReactNode;
  /** `error` cho lý do dữ liệu chưa hợp lệ (vd "Sửa 2 ô lỗi để lưu điểm"). */
  hintTone?: "muted" | "error";
}

/**
 * Hàng nút chính ở đáy trang form. Mobile: dính trên thanh tab dưới (`bottom: var(--sticky-bottom)`),
 * các nút xếp dọc và `margin-top: auto` đẩy xuống đáy trang. Desktop: nằm trong luồng, căn phải.
 */
export function ActionFooter({ className, hint, hintTone = "muted", children, ...props }: ActionFooterProps) {
  const hintId = useId();
  return (
    <div
      role={hint ? "group" : undefined}
      aria-describedby={hint ? hintId : undefined}
      className={[s.actionFooter, className].filter(Boolean).join(" ")}
      {...props}
    >
      {hint ? (
        <p id={hintId} className={[s.actionHint, hintTone === "error" ? s.actionHintError : ""].filter(Boolean).join(" ")}>
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}
export default ActionFooter;
