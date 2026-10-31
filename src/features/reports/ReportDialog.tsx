import { useRef, type ReactNode } from "react";
import { Button } from "../../shared/ui";
import { useAnimatedDialog } from "../../shared/ui/useAnimatedDialog";
import s from "./reportDialog.module.css";

export interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Dòng phụ dưới tiêu đề (khoảng buổi, tên em…). */
  subtitle?: string;
  children: ReactNode;
  /** Hàng nút ở chân popup, luôn thấy khi nội dung dài. */
  footer?: ReactNode;
}

/**
 * Popup của màn Báo cáo: hộp thoại giữa màn hình trên desktop, sheet toàn màn
 * trên mobile (< 1024px). Đóng chạy hết animation rồi mới `dialog.close()`.
 */
export default function ReportDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: ReportDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const requestClose = useAnimatedDialog(ref, open);
  const close = () => requestClose(onClose);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={s.dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className={s.header}>
        <div className={s.headerText}>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <Button variant="secondary" onClick={close} aria-label="Đóng">
          Đóng
        </Button>
      </div>
      <div className={s.body}>{children}</div>
      {footer && <div className={s.footer}>{footer}</div>}
    </dialog>
  );
}
