import { useState } from "react";
import { archiveClass } from "../../data/repositories/classes";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Hộp xác nhận "Lưu trữ lớp". Dùng ở mọi nơi gọi `archiveClass` (menu lớp mobile,
 * header lớp desktop): `<ArchiveClassDialog open classId className onClose />`.
 * Nút xác nhận bị khoá trong lúc đang lưu trữ nên bấm hai lần chỉ gọi repository một lần.
 */
export function ArchiveClassDialog({
  open,
  classId,
  className,
  onClose,
  onArchived,
}: {
  open: boolean;
  classId: string;
  className: string;
  onClose: () => void;
  /** Gọi sau khi lưu trữ xong, trước `onClose`. */
  onArchived?: () => void;
}) {
  const [error, setError] = useState("");
  const action = useSaveAction<string | null>({
    baseline: null,
    value: open ? classId : null,
    validate: (value) => value !== null,
    save: async () => {
      try {
        await archiveClass(classId);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không lưu trữ được lớp.");
        throw cause;
      }
    },
  });
  const confirm = async () => {
    setError("");
    if (await action.submit()) {
      onArchived?.();
      onClose();
    }
  };
  return (
    <ConfirmDialog
      open={open}
      title={`Lưu trữ lớp ${className}?`}
      message={
        <>
          Lớp sẽ ẩn khỏi danh sách. Dữ liệu điểm danh, điểm, nhận xét vẫn được giữ.
          {error && (
            <>
              <br />
              <strong role="alert">{error}</strong>
            </>
          )}
        </>
      }
      actions={[
        { label: "Lưu trữ", variant: "danger", busy: action.saving, onClick: () => void confirm() },
        { label: "Huỷ", variant: "neutral", busy: action.saving, onClick: onClose },
      ]}
      onDismiss={onClose}
    />
  );
}

export default ArchiveClassDialog;
