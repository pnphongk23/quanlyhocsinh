import { useEffect, useRef } from "react";
import s from "./ui.module.css";
import { Button } from "./Button";

export interface UnsavedChangesDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  /** Đang lưu: khoá nút Lưu và hiện `aria-busy`. */
  saving?: boolean;
  /** Vừa lưu xong, đang chờ rời màn: nút Lưu hiện "Đã lưu". */
  done?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}

/**
 * Hỏi trước khi rời màn còn thay đổi chưa lưu (Lưu / Bỏ thay đổi / Ở lại).
 * Bố cục theo design/reference/80-trang-thai-chua-luu-hoi-khi-roi-man.html.
 */
export function UnsavedChangesDialog({
  open,
  title = "Chưa lưu thay đổi",
  message = "Bạn đang sửa dở. Lưu trước khi rời màn này?",
  saving = false,
  done = false,
  onSave,
  onDiscard,
  onStay,
}: UnsavedChangesDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Chỉ có trong DOM khi mở: nút "Lưu" không lọt vào test hay trình đọc màn hình lúc đóng.
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={s.confirmDialog}
      onCancel={(event) => {
        event.preventDefault();
        // Đang lưu hoặc vừa lưu xong và chờ rời màn: không cho Ở lại bằng Esc.
        if (!saving && !done) onStay();
      }}
    >
      <p className={s.confirmTitle}>{title}</p>
      <p className={s.confirmBody}>{message}</p>
      <div className={s.confirmActions}>
        <Button
          size="lg"
          block
          loading={saving}
          done={done}
          disabled={done}
          onClick={onSave}
        >
          Lưu
        </Button>
        <button
          type="button"
          className={s.confirmButton + " " + s.confirmDiscard}
          disabled={saving || done}
          onClick={onDiscard}
        >
          Bỏ thay đổi
        </button>
        <button
          type="button"
          className={s.confirmButton + " " + s.confirmStay}
          disabled={saving || done}
          aria-disabled={saving || done || undefined}
          onClick={onStay}
        >
          Ở lại
        </button>
      </div>
    </dialog>
  );
}

export default UnsavedChangesDialog;
