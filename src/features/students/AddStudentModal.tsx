import { useId, useState } from "react";
import { createStudent } from "../../data/repositories/students";
import { todayISO } from "../../shared/format";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, Input, Modal, UnsavedChangesDialog } from "../../shared/ui";
import { useUnsavedCloseGuard } from "../../shared/hooks/useUnsavedCloseGuard";
import s from "./students.module.css";

const EMPTY = { name: "", phone: "" };

export default function AddStudentModal({
  classId,
  onClose,
}: {
  classId: string;
  onClose: () => void;
}) {
  const formId = useId();
  const [form, setForm] = useState(EMPTY);
  const action = useSaveAction({
    baseline: EMPTY,
    value: form,
    validate: (value) => value.name.trim() !== "",
    save: (value) =>
      createStudent({
        classId,
        name: value.name.trim(),
        parentPhone: value.phone.trim(),
        enrolledAt: todayISO(),
      }),
  });
  const closeNow = onClose;
  const guard = useUnsavedCloseGuard(action, { onClose: closeNow });
  const confirmDialog = <UnsavedChangesDialog {...guard.dialogProps} />;
  const failed = action.error
    ? action.error instanceof Error && action.error.message !== "save_failed"
      ? action.error.message
      : "Không thể lưu học sinh. Vui lòng thử lại."
    : "";
  return (
    <>
      <Modal
        title="Thêm học sinh"
        open
        onClose={closeNow}
        beforeClose={guard.beforeClose}
        footer={
          <Button size="lg" type="submit" form={formId} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
            Lưu học sinh
          </Button>
        }
      >
        <form
          id={formId}
          className={s.form}
          onSubmit={async (event) => {
            event.preventDefault();
            if (await action.submit()) onClose();
          }}
        >
          <Input
            label="Họ và tên học sinh"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <Input
            label="Số điện thoại phụ huynh (tuỳ chọn)"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <p className={s.note}>Phụ huynh dùng số này để đăng ký và đăng nhập.</p>
          {failed && <p role="alert" className={s.error}>{failed}</p>}
        </form>
      </Modal>
      {confirmDialog}
    </>
  );
}
