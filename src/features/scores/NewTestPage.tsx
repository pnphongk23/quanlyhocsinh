import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../data/store";
import { createTestDurable } from "../../data/repositories/tests";
import { getClass } from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import { useSaveStatus } from "../../shared/SaveStatus";
import { todayISO } from "../../shared/format";
import { useLeaveGuard } from "../../shared/hooks/useLeaveGuard";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useSavedPeek, useSaveAndLeave } from "../../shared/hooks/useSavedPeek";
import {
  ActionFooter,
  Button,
  Input,
  NoAccess,
  PageHeader,
  UnsavedChangesDialog,
} from "../../shared/ui";
import { AlertTriangleIcon } from "./ScoreIcons";
import s from "./scores.module.css";

export default function NewTestPage() {
  const { classId = "" } = useParams();
  const navigate = useNavigate();
  useStore();
  const { clearStatus, setStatus } = useSaveStatus();
  const access = useAccess();
  const classItem = getClass(classId);
  const initial = {
    name: "",
    date: todayISO(),
  };
  const [form, setForm] = useState(initial);
  const [done, setDone] = useState<string | null>(null);
  const created = useRef<string | null>(null);
  const action = useSaveAction({
    baseline: initial,
    value: form,
    validate: (value) => {
        return value.name.trim() !== "" && value.date !== "";
    },
    save: async (value) => {
      if (!classItem) throw new Error("Không tìm thấy lớp học.");
      const test = await createTestDurable({
        classId,
        name: value.name,
        date: value.date,
      });
      created.current = test.id;
    },
  });
  const guard = useLeaveGuard(action.dirty && done === null);
  const saved = useSavedPeek();
  const leave = useSaveAndLeave();
  const listPath = `/lop/${classId}/bai-kiem-tra`;
  // Điều hướng sau khi state "đã lưu" được render để không bị chặn bởi chính màn này.
  useEffect(() => {
    if (done) navigate(`/lop/${classId}/bai-kiem-tra/${done}`);
  }, [done, classId, navigate]);

  if (!access.can("scores", "write"))
    return <NoAccess what="mục tạo bài kiểm tra" />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await action.submit()) {
      clearStatus();
      if (await saved.peek()) setDone(created.current);
    } else setStatus("error");
  }
  const error = action.error
    ? action.error instanceof Error && action.error.message !== "save_failed"
      ? action.error.message
      : "Không tạo được bài kiểm tra."
    : "";
    const { name, date } = form;
  const setName = (next: string) => setForm((current) => ({ ...current, name: next }));
  const setDate = (next: string) => setForm((current) => ({ ...current, date: next }));

  return (
    <section className={s.formPage}>
      <PageHeader backTo={listPath} title="Tạo bài kiểm tra" />
      <form className={s.form} onSubmit={submit} noValidate>
        <Input
          label="Tên bài kiểm tra"
          value={name}
          placeholder="Ví dụ: Unit 6 Test"
          onChange={(event) => {
            setName(event.target.value);
          }}
          required
        />
        <Input
          label="Ngày kiểm tra"
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
          }}
          required
        />
        {error && (
          <p role="alert" className={s.errorBanner}>
            <AlertTriangleIcon size={18} />
            <span className={s.errorBannerText}>{error}</span>
          </p>
        )}
        <ActionFooter className={s.actions}>
          <Button
            type="submit"
            size="lg"
            loading={action.saving}
            done={action.justSaved}
            disabled={!action.canSave}
          >
            Tạo bài và nhập điểm
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            className={s.cancelButton}
            onClick={() => navigate(listPath)}
          >
            Huỷ
          </Button>
        </ActionFooter>
      </form>
      <UnsavedChangesDialog
        open={guard.blocked}
        title="Chưa tạo bài kiểm tra"
        message="Bạn đang nhập dở. Tạo bài trước khi rời màn này?"
        saving={action.saving}
        done={leave.done}
        onSave={() =>
          leave.run(action.submit, () => {
            setDone(created.current);
            guard.proceed();
          })
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
