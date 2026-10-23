import { useCallback, useState } from "react";
import type { BeforeClose } from "../ui/useGuardedClose";
import type { UnsavedChangesDialogProps } from "../ui/UnsavedChangesDialog";
import type { SaveAction } from "./useSaveAction";

export interface UnsavedCloseGuardOptions {
  /** Đóng modal/sheet (thường `() => setOpen(false)`). Gọi sau khi Lưu thành công hoặc Bỏ thay đổi. */
  onClose: () => void;
  /** Đặt lại giá trị đang nhập về baseline khi chọn Bỏ thay đổi. */
  onDiscard?: () => void;
  title?: string;
  message?: string;
}

/**
 * Chặn đóng Modal/Sheet khi còn nhập dở: truyền `beforeClose` vào Modal/Sheet và
 * `dialogProps` vào `<UnsavedChangesDialog>`. Dirty thì mở hộp thoại Lưu / Bỏ thay đổi / Ở lại;
 * đang lưu thì không cho đóng.
 */
export function useUnsavedCloseGuard(
  action: Pick<SaveAction, "dirty" | "saving" | "submit">,
  { onClose, onDiscard, title, message }: UnsavedCloseGuardOptions,
): { beforeClose: BeforeClose; dialogProps: UnsavedChangesDialogProps } {
  const [asking, setAsking] = useState(false);
  const beforeClose = useCallback(() => {
    if (action.saving) return false;
    if (!action.dirty) return true;
    setAsking(true);
    return false;
  }, [action.dirty, action.saving]);
  return {
    beforeClose,
    dialogProps: {
      open: asking,
      title,
      message,
      saving: action.saving,
      onSave: async () => {
        if (await action.submit()) {
          setAsking(false);
          onClose();
        }
      },
      onDiscard: () => {
        onDiscard?.();
        setAsking(false);
        onClose();
      },
      onStay: () => setAsking(false),
    },
  };
}
