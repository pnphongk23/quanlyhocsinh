import { useState, type FormEvent } from "react";
import { ApiError } from "../../data/api/client";
import { getClass, updateClass } from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import { useSaveStatus } from "../../shared/SaveStatus";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, Input, Modal, UnsavedChangesDialog } from "../../shared/ui";
import { useUnsavedCloseGuard } from "../../shared/hooks/useUnsavedCloseGuard";
import s from "./classesForm.module.css";

export function EditClassModal({
  classId,
  onClose,
  onEditSchedule,
}: {
  classId: string;
  onClose: () => void;
  onEditSchedule: () => void;
}) {
  const klass = getClass(classId);
  const save = useSaveStatus();
  const access = useAccess();
  const [name, setName] = useState(klass?.name ?? "");
  const action = useSaveAction({
    baseline: klass?.name ?? "",
    value: name,
    validate: (value) => value.trim() !== "",
    save: (value) => updateClass(classId, { name: value }),
  });
  const closeNow = onClose;
  const guard = useUnsavedCloseGuard(action, { onClose: closeNow });
  const confirmDialog = <UnsavedChangesDialog {...guard.dialogProps} />;
  if (!access.can("classes", "write")) return null;
  if (!klass) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.submit()) {
      save.clearStatus();
      onClose();
    } else {
      save.setStatus("error");
    }
  }
  const failure = action.error;
  const error = failure
    ? failure instanceof ApiError
      ? failure.error.message
      : failure instanceof Error && failure.message !== "save_failed"
        ? failure.message
        : "Không lưu được lớp."
    : "";
  return (
    <>
      <Modal title="Sửa lớp" open onClose={closeNow}
        beforeClose={guard.beforeClose}>
        <form className={s.form} onSubmit={submit}>
          <Input
            label="Tên lớp"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Button
            type="button"
            disabled={action.saving}
            variant="secondary"
            onClick={() => {
              if (guard.beforeClose()) {
                onClose();
                onEditSchedule();
              }
            }}
          >
            Sửa lịch học
          </Button>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <div className={s.modalActions}>
            <Button
              type="button"
              variant="secondary"
              disabled={action.saving}
              onClick={closeNow}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={!action.canSave} loading={action.saving}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>
      {confirmDialog}
    </>
  );
}
export default EditClassModal;
