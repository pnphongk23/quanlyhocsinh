import type { ReactNode } from "react";
import s from "./ui.module.css";

export interface InfoNoticeProps {
  /** Tiêu đề ngắn của khối (in đậm). */
  title: ReactNode;
  /** Dòng phụ giải thích; bỏ trống thì khối chỉ có tiêu đề. */
  description?: ReactNode;
  /** Hành động phụ (thường là `Button variant="secondary" size="sm"`). */
  action?: ReactNode;
  className?: string;
}

/**
 * Khối thông báo tông thông tin (không phải lỗi) dùng chung cho web (ux-design.md mục 3).
 * Mobile: tiêu đề + dòng phụ một khối, hành động xuống dưới và nhãn thẳng lề chữ tiêu đề.
 * Desktop (≥1024): hành động nằm cùng hàng bên phải.
 */
export function InfoNotice({ title, description, action, className }: InfoNoticeProps) {
  return (
    <div role="status" className={[s.infoNotice, className].filter(Boolean).join(" ")}>
      <div className={s.infoNoticeText}>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export default InfoNotice;
