import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";
import s from "./ui.module.css";
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Hàng nút chính, luôn nằm ngoài vùng cuộn nên vẫn thấy khi nội dung dài. */
  footer?: ReactNode;
  sheet?: boolean;
}
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  sheet = false,
}: ModalProps) {
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
      className={s.dialog + " " + (sheet ? s.sheet : "")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
    >
      <div className={s.dialogHeader}>
        <h2>{title}</h2>
        <Button variant="secondary" onClick={onClose} aria-label="Đóng">
          Đóng
        </Button>
      </div>
      <div className={s.dialogBody}>{children}</div>
      {footer ? <div className={s.dialogFooter}>{footer}</div> : null}
    </dialog>
  );
}
export default Modal;
