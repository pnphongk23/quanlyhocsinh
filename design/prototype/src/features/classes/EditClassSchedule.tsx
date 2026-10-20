import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getClass } from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import {
  previewScheduleChange,
  updateClassSchedule,
} from "../../data/repositories/sessions";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import { Button, Input } from "../../shared/ui";
import { WeekdayPicker } from "./WeekdayPicker";
import s from "./editClassSchedule.module.css";

function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSessionDate(dateText: string): string {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

function sameSchedule(
  firstDays: number[],
  firstTime: string,
  secondDays: number[],
  secondTime: string,
): boolean {
  return (
    firstTime === secondTime &&
    firstDays.length === secondDays.length &&
    firstDays.every((day) => secondDays.includes(day))
  );
}

export function EditClassSchedule({
  classId,
  onClose,
}: {
  classId: string;
  onClose: () => void;
}) {
  const klass = getClass(classId);
  const save = useSaveStatus();
  const access = useAccess();
  const [days, setDays] = useState<number[]>(klass?.weekdays ?? []);
  const [time, setTime] = useState(klass?.time ?? "18:00");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  useEffect(() => {
    const updateNetworkState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
    };
  }, []);

  const preview = useMemo(() => {
    if (!klass || !days.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return null;
    }
    try {
      return previewScheduleChange(classId, { weekdays: days, time }, localToday());
    } catch {
      return null;
    }
  }, [classId, days, klass, time]);

  if (!access.can("classes", "write")) return null;
  if (!klass) return null;

  const archived = klass.status === "archived";
  const unchanged = sameSchedule(days, time, klass.weekdays, klass.time);
  const hasPreviewChanges = Boolean(
    preview &&
      (preview.toRemove.length || preview.toAdd.length || preview.retimed.length),
  );
  const cannotSave = archived || !preview || (unchanged && !hasPreviewChanges);

  function close() {
    if (!unchanged && !window.confirm("Bạn có thay đổi chưa lưu. Vẫn quay lại?")) return;
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!days.length) {
      setError("Chọn ít nhất một ngày học trong tuần.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError("Nhập giờ bắt đầu hợp lệ, từ 00:00 đến 23:59.");
      return;
    }
    try {
      const updated = updateClassSchedule(classId, { weekdays: days, time }, localToday());
      setResult(
        `Đã cập nhật lịch: bỏ ${updated.removed}, thêm ${updated.added}${
          updated.retimed ? `, đổi giờ ${updated.retimed}` : ""
        } buổi.`,
      );
      save.clearStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được lịch học.");
      save.setStatus("error");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id="edit-class-schedule"
      className={s.dialog}
      aria-labelledby="edit-class-schedule-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={onClose}
    >
      <div className={s.frame}>
        <header className={s.header}>
          <Button variant="ghost" size="md" onClick={close}>
            Quay lại
          </Button>
          <h2 id="edit-class-schedule-title">Sửa lịch học</h2>
        </header>
        <form className={s.form} onSubmit={submit}>
          {archived && (
            <p className={s.archived} role="status">
              Lớp đã lưu trữ nên không thể sửa lịch học.
            </p>
          )}
          {!isOnline && (
            <p className={s.offline} role="status">
              Đang ngoại tuyến. Lịch sẽ lưu trên máy và chờ đồng bộ khi có mạng.
            </p>
          )}
          <WeekdayPicker
            value={days}
            onChange={(next) => {
              setDays(next);
              setResult("");
              setError("");
              if (sameSchedule(next, time, klass.weekdays, klass.time)) {
                save.clearStatus();
              } else {
                save.markUnsaved();
              }
            }}
            label="Ngày học lặp lại"
          />
          {!days.length && (
            <p className={s.error} role="alert">
              Chọn ít nhất một ngày học trong tuần.
            </p>
          )}
          <Input
            label="Giờ bắt đầu"
            type="time"
            value={time}
            onChange={(event) => {
              const nextTime = event.target.value;
              setTime(nextTime);
              setResult("");
              setError("");
              if (sameSchedule(days, nextTime, klass.weekdays, klass.time)) {
                save.clearStatus();
              } else {
                save.markUnsaved();
              }
            }}
            required
            aria-invalid={!!error && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)}
          />
          {!time && (
            <p className={s.error} role="alert">
              Nhập giờ bắt đầu để xem trước và lưu lịch.
            </p>
          )}
          <section className={s.preview} aria-labelledby="schedule-preview-title">
            <h3 id="schedule-preview-title">Thay đổi dự kiến</h3>
            {!days.length ? (
              <p>Chọn ít nhất một ngày để xem trước lịch.</p>
            ) : !preview ? (
              <p>Nhập giờ bắt đầu hợp lệ để xem trước lịch.</p>
            ) : (
              <>
                <p>
                  Sẽ bỏ <strong>{preview.toRemove.length}</strong> buổi
                  {preview.toRemove.length > 0 && ":"}
                </p>
                {preview.toRemove.length > 0 && (
                  <ul className={s.removedDates}>
                    {preview.toRemove.slice(0, 5).map((session) => (
                      <li key={session.id}>{formatSessionDate(session.date)}</li>
                    ))}
                    {preview.toRemove.length > 5 && (
                      <li>và {preview.toRemove.length - 5} buổi nữa</li>
                    )}
                  </ul>
                )}
                <p>
                  Thêm <strong>{preview.toAdd.length}</strong> buổi · Đổi giờ{" "}
                  <strong>{preview.retimed.length}</strong> buổi
                </p>
                <p className={s.kept}>
                  Giữ nguyên các buổi đã diễn ra, đã hủy, buổi lẻ và buổi đã điểm danh.
                </p>
                {preview.toRemove.length > 0 && (
                  <p className={s.warning}>
                    Các buổi chưa diễn ra thuộc ngày bỏ sẽ bị xoá khỏi lịch lớp.
                  </p>
                )}
              </>
            )}
          </section>
          {unchanged && !hasPreviewChanges && !archived && (
            <p className={s.reason}>Chưa có thay đổi để lưu.</p>
          )}
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          {result && (
            <p className={s.result} role="status" aria-live="polite">
              {result}
            </p>
          )}
          <footer className={s.stickyBar}>
            <SaveStatus status={save.status} />
            <Button type="submit" size="lg" disabled={cannotSave || archived}>
              Lưu lịch
            </Button>
          </footer>
        </form>
      </div>
    </dialog>
  );
}

export default EditClassSchedule;
