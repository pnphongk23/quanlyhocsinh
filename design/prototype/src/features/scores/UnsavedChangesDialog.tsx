import { useEffect, useRef } from "react";
import s from "./scores.module.css";

export interface UnsavedChangesDialogProps {
  open: boolean;
  testName: string;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}

/**
 * Hỏi trước khi rời màn nhập điểm còn thay đổi chưa lưu.
 * Bố cục theo design/reference/80-trang-thai-chua-luu-hoi-khi-roi-man.html
 * (Lưu / Bỏ thay đổi / Ở lại).
 */
export function UnsavedChangesDialog({
  open,
  testName,
  onSave,
  onDiscard,
  onStay,
}: UnsavedChangesDialogProps) {
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
      aria-label="Điểm chưa lưu"
      className={s.confirmDialog}
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <p className={s.confirmTitle}>Điểm chưa lưu</p>
      <p className={s.confirmBody}>
        Bạn đang sửa dở điểm {testName}. Lưu trước khi rời màn này?
      </p>
      <div className={s.confirmActions}>
        <button
          type="button"
          className={s.confirmButton + " " + s.confirmPrimary}
          onClick={onSave}
        >
          Lưu
        </button>
        <button
          type="button"
          className={s.confirmButton + " " + s.confirmDiscard}
          onClick={onDiscard}
        >
          Bỏ thay đổi
        </button>
        <button
          type="button"
          className={s.confirmButton + " " + s.confirmStay}
          onClick={onStay}
        >
          Ở lại
        </button>
      </div>
    </dialog>
  );
}

export default UnsavedChangesDialog;
