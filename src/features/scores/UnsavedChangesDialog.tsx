import {
  UnsavedChangesDialog as SharedUnsavedChangesDialog,
  type UnsavedChangesDialogProps as SharedProps,
} from "../../shared/ui";

export interface UnsavedChangesDialogProps
  extends Pick<SharedProps, "open" | "onSave" | "onDiscard" | "onStay"> {
  testName: string;
}

/** Giữ API cũ của màn nhập điểm; hộp thoại thật nằm ở `shared/ui`. */
export function UnsavedChangesDialog({ testName, ...rest }: UnsavedChangesDialogProps) {
  return (
    <SharedUnsavedChangesDialog
      title="Điểm chưa lưu"
      message={`Bạn đang sửa dở điểm ${testName}. Lưu trước khi rời màn này?`}
      {...rest}
    />
  );
}

export default UnsavedChangesDialog;
