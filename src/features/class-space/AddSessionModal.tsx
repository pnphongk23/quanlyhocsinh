import { useId, useState, type FormEvent } from "react";
import {
  createExtraSession,
  getExtraSessionUpdateError,
  updateExtraSession,
} from "../../data/repositories/sessions";
import { useAccess } from "../../data/repositories/access";
import type { Session } from "../../data/types";
import { todayISO } from "../../shared/format";
import { useSaveAction, deepEqual } from "../../shared/hooks/useSaveAction";
import { Button, Sheet, UnsavedChangesDialog } from "../../shared/ui";
import SaveStatus from "../../shared/SaveStatus";
import { useUnsavedCloseGuard } from "../../shared/hooks/useUnsavedCloseGuard";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";
import s from "./sessions.module.css";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface AddSessionModalProps {
  classId: string;
  classTime: string;
  session?: Session;
  onClose: () => void;
}

export default function AddSessionModal({
  classId,
  classTime,
  session,
  onClose,
}: AddSessionModalProps) {
  const today = todayISO();
  const access = useAccess();
  const formId = useId();
  const initial = {
    date: session?.date ?? today,
    time: session?.time ?? classTime,
    note: session?.note ?? "",
  };
  const [form, setForm] = useState(initial);
  const action = useSaveAction({
    // Tạo mới: giá trị mặc định đã hợp lệ nên chỉ cần hợp lệ là lưu được (baseline rỗng).
    baseline: session ? initial : { date: "", time: "", note: "" },
    value: form,
    validate: (value) =>
      TIME_PATTERN.test(value.time) &&
      value.date !== "" &&
      (value.date >= today || value.date === session?.date),
    save: async (value) => {
      const note = value.note.trim();
      if (session) {
        await updateExtraSession(session.id, { date: value.date, time: value.time, note });
        const serverError = getExtraSessionUpdateError();
        if (serverError) throw new Error(serverError);
      } else {
        await createExtraSession({
          classId,
          date: value.date,
          time: value.time,
          note: note || undefined,
        });
      }
    },
  });
  const saved = useSavedPeek();
  const closeNow = () => {
    saved.cancel();
    onClose();
  };
  const guard = useUnsavedCloseGuard({ dirty: !deepEqual(form, initial), saving: action.saving, submit: action.submit }, { onClose: closeNow });
  const confirmDialog = <UnsavedChangesDialog {...guard.dialogProps} />;

  if (!access.can("sessions_attendance", "write")) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((await action.submit()) && (await saved.peek())) onClose();
  }
  const error = action.error
    ? action.error instanceof Error && action.error.message !== "save_failed"
      ? action.error.message
      : "Không lưu được buổi học. Hãy kiểm tra thông tin và thử lại."
    : "";
  const close = closeNow;
  const { date, time, note } = form;
  const setDate = (next: string) => setForm((current) => ({ ...current, date: next }));
  const setTime = (next: string) => setForm((current) => ({ ...current, time: next }));
  const setNote = (next: string) => setForm((current) => ({ ...current, note: next }));

  return (
    <>
    <Sheet
      open
      onClose={closeNow}
      beforeClose={guard.beforeClose}
      title={session ? "Sửa buổi lẻ" : "Thêm buổi lẻ"}
      footer={
        <>
          <Button
            variant="secondary"
            type="button"
            className={s.footerCancel}
            onClick={closeNow}
            disabled={action.saving}
          >
            Đóng
          </Button>
          <Button type="submit" form={formId} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
            {session ? "Lưu thay đổi" : "Lưu buổi học"}
          </Button>
        </>
      }
    >
      <form id={formId} className={s.form} onSubmit={submit}>
        <p className={s.formIntro}>
          {session
            ? "Cập nhật ngày, giờ hoặc ghi chú cho buổi đang chờ học."
            : "Tạo một buổi học ngoài lịch lặp của lớp."}
        </p>
        <label className={s.field} htmlFor="extra-session-date">
          <span>Ngày học</span>
          <input
            id="extra-session-date"
            name="date"
            type="date"
            value={date}
            min={today}
            onChange={(event) => setDate(event.target.value)}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "extra-session-error" : undefined}
          />
        </label>
        <label className={s.field} htmlFor="extra-session-time">
          <span>Giờ học</span>
          <input
            id="extra-session-time"
            name="time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "extra-session-error" : undefined}
          />
        </label>
        <label className={s.field} htmlFor="extra-session-note">
          <span>Ghi chú <span className={s.optional}>(không bắt buộc)</span></span>
          <textarea
            id="extra-session-note"
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={240}
            placeholder="Ví dụ: Học bù buổi nghỉ"
          />
        </label>
        <div className={s.formStatus}>
          <SaveStatus />
          {error && <p id="extra-session-error" className={s.error} role="alert">{error}</p>}
        </div>
      </form>
    </Sheet>
    {confirmDialog}
    </>
  );
}
