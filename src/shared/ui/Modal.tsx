import { useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { deferDialogClose } from "./deferDialogClose";
import { useAnimatedDialog } from "./useAnimatedDialog";
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
  const requestClose = useAnimatedDialog(ref, open);
  const close = () => requestClose(onClose);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={s.dialog + " " + (sheet ? s.sheet : "")}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className={s.dialogHeader}>
        <h2>{title}</h2>
        <Button variant="secondary" onClick={close} aria-label="Đóng">
          Đóng
        </Button>
      </div>
      <div className={s.dialogBody}>
        {deferDialogClose(children, onClose, requestClose)}
      </div>
      {footer ? (
        <div className={s.dialogFooter}>
          {deferDialogClose(footer, onClose, requestClose)}
        </div>
      ) : null}
    </dialog>
  );
}
export default Modal;
