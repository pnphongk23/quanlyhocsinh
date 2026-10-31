import {
  UnsavedChangesDialog as SharedUnsavedChangesDialog,
  type UnsavedChangesDialogProps as SharedProps,
} from "../../shared/ui";

export interface UnsavedChangesDialogProps extends SharedProps {
  /** Tên bài kiểm tra; có thì dùng câu hỏi riêng của màn nhập điểm. */
  testName?: string;
}

/** Giữ API cũ của màn nhập điểm; hộp thoại thật nằm ở `shared/ui`. */
export function UnsavedChangesDialog({ testName, ...rest }: UnsavedChangesDialogProps) {
  return testName ? (
    <SharedUnsavedChangesDialog
      title="Điểm chưa lưu"
      message={`Bạn đang sửa dở điểm ${testName}. Lưu trước khi rời màn này?`}
      {...rest}
    />
  ) : (
    <SharedUnsavedChangesDialog {...rest} />
  );
}

export default UnsavedChangesDialog;
