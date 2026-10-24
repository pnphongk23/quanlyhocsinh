import { useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { deferDialogClose } from "./deferDialogClose";
import { useAnimatedDialog } from "./useAnimatedDialog";
import { useGuardedClose, type BeforeClose } from "./useGuardedClose";
import s from "./ui.module.css";
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /**
   * Gọi trước khi chạy animation đóng (Esc, bấm nền, nút Đóng, nút gọi `onClose`).
   * Trả `false` (hoặc Promise `false`) thì không đóng. Đóng bằng `open={false}` từ form không qua đây.
   */
  beforeClose?: BeforeClose;
  /** Hàng nút chính, luôn nằm ngoài vùng cuộn nên vẫn thấy khi nội dung dài. */
  footer?: ReactNode;
  sheet?: boolean;
}
export function Modal({
  open,
  onClose,
  title,
  children,
  beforeClose,
  footer,
  sheet = false,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const animatedClose = useAnimatedDialog(ref, open);
  const requestClose = useGuardedClose(animatedClose, beforeClose);
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
