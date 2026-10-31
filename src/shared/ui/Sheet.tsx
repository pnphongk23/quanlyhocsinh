import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "./Button";
import { deferDialogClose } from "./deferDialogClose";
import { useAnimatedDialog } from "./useAnimatedDialog";
import { useGuardedClose, type BeforeClose } from "./useGuardedClose";
import s from "./ui.module.css";

export interface SheetProps {
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
  /**
   * Thay hàng đầu mặc định (tiêu đề + nút Đóng) bằng nội dung riêng, ví dụ
   * sheet nhận xét có avatar, tên em và nhãn trạng thái phiếu (ảnh 41/42).
   */
  header?: ReactNode;
  /** Focus target after the native dialog opens, before keyboard navigation begins. */
  initialFocusRef?: RefObject<HTMLElement | null>;
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
  beforeClose,
  footer,
  header,
  initialFocusRef,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const animatedClose = useAnimatedDialog(ref, open);
  const requestClose = useGuardedClose(animatedClose, beforeClose);
  useEffect(() => {
    if (open) initialFocusRef?.current?.focus();
  }, [open, initialFocusRef]);
  const close = () => requestClose(onClose);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={s.dialog + " " + s.sheet}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {header ? (
        <div className={s.dialogHeader}>
          {deferDialogClose(header, onClose, requestClose)}
        </div>
      ) : (
        <div className={s.dialogHeader}>
          <h2>{title}</h2>
          <Button variant="secondary" onClick={close} aria-label="Đóng">
            Đóng
          </Button>
        </div>
      )}
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
export default Sheet;
