import { useState, type FormEvent } from "react";
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
  if (!access.can("classes", "write")) return null;
  if (!klass) return null;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
        updateClass(classId, { name });
      save.clearStatus();
      setError("");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được lớp.");
      save.setStatus("error");
    }
  }
  return (
    <Modal title="Sửa lớp" open onClose={onClose}>
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
        <Button type="submit">Lưu thay đổi</Button>
      </form>
    </Modal>
  );
}
export default EditClassModal;
