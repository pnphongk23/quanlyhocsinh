import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createClass } from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import { useSaveStatus } from "../../shared/SaveStatus";
import { useLeaveGuard } from "../../shared/hooks/useLeaveGuard";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import {
  ActionFooter,
  Button,
  Input,
  LinkButton,
  NoAccess,
  PageHeader,
  UnsavedChangesDialog,
} from "../../shared/ui";
import { WeekdayPicker } from "./WeekdayPicker";
import { useSavedPeek, useSaveAndLeave } from "../../shared/hooks/useSavedPeek";
import s from "./classesForm.module.css";

const EMPTY = { name: "", days: [] as number[], time: "18:30" };
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function NewClassPage() {
  const navigate = useNavigate();
  const save = useSaveStatus();
  const access = useAccess();
  const [form, setForm] = useState(EMPTY);
  const [done, setDone] = useState(false);
  const action = useSaveAction({
    baseline: EMPTY,
    value: form,
    validate: (value) =>
      value.name.trim() !== "" &&
      value.days.length > 0 &&
      TIME_PATTERN.test(value.time),
    save: (value) =>
      createClass({ name: value.name, weekdays: value.days, time: value.time }),
  });
  const guard = useLeaveGuard(action.dirty && !done);
  const saved = useSavedPeek();
  const leave = useSaveAndLeave();
  // Điều hướng sau khi state "đã lưu" được render để không bị chặn bởi chính màn này.
  useEffect(() => {
    if (done) navigate("/lop", { replace: true });
  }, [done, navigate]);
  if (!access.can("classes", "write")) return <NoAccess what="mục tạo lớp" />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await action.submit()) {
      save.clearStatus();
      if (await saved.peek()) setDone(true);
    } else {
      save.setStatus("error");
    }
  }
  const error = action.error
    ? action.error instanceof Error && action.error.message !== "save_failed"
      ? action.error.message
      : "Không tạo được lớp."
    : "";
  const name = form.name;
  const days = form.days;
  const time = form.time;
  const setName = (next: string) => setForm((current) => ({ ...current, name: next }));
  const setDays = (next: number[]) => setForm((current) => ({ ...current, days: next }));
  const setTime = (next: string) => setForm((current) => ({ ...current, time: next }));
  return (
    <section className={s.page}>
      <PageHeader compact backTo="/lop" title="Tạo lớp mới" />
      <form className={s.form} onSubmit={submit}>
        <Input
          label="Tên lớp"
          value={name}
          placeholder="Ví dụ: IELTS Foundation"
          onChange={(event) => setName(event.target.value)}
          required
        />
        <WeekdayPicker
          value={days}
          onChange={setDays}
        />
        <Input
          label="Giờ bắt đầu"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          required
        />
        <div className={s.studentNote}>
          <p className={s.studentNoteTitle}>Thêm học sinh vào lớp</p>
          <p className={s.studentNoteText}>
            Sau khi tạo lớp, mở lớp rồi vào mục Học sinh để thêm từng em. Học
            sinh học nhiều lớp vẫn có điểm danh và điểm riêng cho từng lớp.
          </p>
        </div>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
          <ActionFooter
            hint={
              !action.valid
                ? "Nhập tên lớp và chọn ngày học để tạo lớp"
                : undefined
            }
          >
            <LinkButton
              to="/lop"
              variant="surface"
              size="lg"
              className={s.cancel}
            >
              Huỷ
            </LinkButton>
            <Button type="submit" size="lg" disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
              Tạo lớp
            </Button>
          </ActionFooter>
      </form>
      <UnsavedChangesDialog
        open={guard.blocked}
        saving={action.saving}
        done={leave.done}
        onSave={() =>
          leave.run(async () => {
            const ok = await action.submit();
            if (ok) save.clearStatus();
            return ok;
          }, guard.proceed)
        }
        onDiscard={() => {
          leave.cancel();
          guard.proceed();
        }}
        onStay={() => {
          leave.cancel();
          guard.stay();
        }}
      />
    </section>
  );
}
