import { useState, type FormEvent } from "react";
import {
  createExtraSession,
  getExtraSessionUpdateError,
  updateExtraSession,
} from "../../data/repositories/sessions";
import { useAccess } from "../../data/repositories/access";
import type { Session } from "../../data/types";
import { todayISO } from "../../shared/format";
import { Button, Sheet } from "../../shared/ui";
import SaveStatus from "../../shared/SaveStatus";
import s from "./sessions.module.css";

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
  const [date, setDate] = useState(session?.date ?? today);
  const [time, setTime] = useState(session?.time ?? classTime);
  const [note, setNote] = useState(session?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!access.can("sessions_attendance", "write")) return null;

  function close() {
    if (!saving) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      if (session) {
        await updateExtraSession(session.id, { date, time, note: note.trim() });
        const serverError = getExtraSessionUpdateError();
        if (serverError) {
          setError(serverError);
          setSaving(false);
          return;
        }
      } else {
        createExtraSession({ classId, date, time, note: note.trim() || undefined });
      }
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không lưu được buổi học. Hãy kiểm tra thông tin và thử lại.",
      );
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      onClose={close}
      title={session ? "Sửa buổi lẻ" : "Thêm buổi lẻ"}
    >
      <form className={s.form} onSubmit={submit}>
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
        <div className={s.formActions}>
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu…" : session ? "Lưu thay đổi" : "Lưu buổi học"}
          </Button>
          <Button variant="secondary" type="button" onClick={close} disabled={saving}>
            Đóng
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
