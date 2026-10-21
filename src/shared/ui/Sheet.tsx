import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";
import s from "./ui.module.css";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Hàng nút chính, luôn nằm ngoài vùng cuộn nên vẫn thấy khi nội dung dài. */
  footer?: ReactNode;
  /**
   * Thay hàng đầu mặc định (tiêu đề + nút Đóng) bằng nội dung riêng, ví dụ
   * sheet nhận xét có avatar, tên em và nhãn trạng thái phiếu (ảnh 41/42).
   */
  header?: ReactNode;
}

/**
 * Bottom sheet trên mobile (dùng chung `<dialog>` với Modal): tràn chiều ngang,
 * bo hai góc trên, footer chừa safe-area.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  header,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={s.dialog + " " + s.sheet}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
    >
      {header ? (
        <div className={s.dialogHeader}>{header}</div>
      ) : (
        <div className={s.dialogHeader}>
          <h2>{title}</h2>
          <Button variant="secondary" onClick={onClose} aria-label="Đóng">
            Đóng
          </Button>
        </div>
      )}
      <div className={s.dialogBody}>{children}</div>
      {footer ? <div className={s.dialogFooter}>{footer}</div> : null}
    </dialog>
  );
}
export default Sheet;
