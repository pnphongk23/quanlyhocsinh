import { useState, type FormEvent } from "react";
import { ApiError } from "../../data/api/client";
import { getClass, updateClass } from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import { Button, Input, Modal } from "../../shared/ui";
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (!access.can("classes", "write")) return null;
  if (!klass) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateClass(classId, { name });
      save.clearStatus();
      setError("");
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.error.message : cause instanceof Error ? cause.message : "Không lưu được lớp.");
      save.setStatus("error");
      setSaving(false);
    }
  }
  return (
    <Modal title="Sửa lớp" open onClose={saving ? () => {} : onClose}>
      <form className={s.form} onSubmit={submit}>
        <Input
          label="Tên lớp"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            save.markUnsaved();
          }}
          required
        />
          <Button
            type="button"
            disabled={saving}
            variant="secondary"
            onClick={() => {
              onClose();
              onEditSchedule();
            }}
          >
            Sửa lịch học
          </Button>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <SaveStatus status={save.status} />
          <div className={s.modalActions}>
            <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={saving}>Lưu thay đổi</Button>
          </div>
      </form>
    </Modal>
  );
}
export default EditClassModal;
