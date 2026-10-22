import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createClass } from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import { Button, Input, LinkButton, NoAccess, PageHeader } from "../../shared/ui";
import { WeekdayPicker } from "./WeekdayPicker";
import s from "./classesForm.module.css";

export default function NewClassPage() {
  const navigate = useNavigate();
  const save = useSaveStatus();
  const access = useAccess();
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState("18:30");
  const [error, setError] = useState("");
  if (!access.can("classes", "write")) return <NoAccess what="mục tạo lớp" />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !name.trim() ||
      days.length === 0 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
      setError("Nhập tên lớp, chọn ít nhất một ngày và kiểm tra giờ học.");
      save.setStatus("unsaved");
      return;
    }
    try {
      await createClass({ name, weekdays: days, time });
      save.clearStatus();
      setError("");
      navigate("/lop", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tạo được lớp.");
      save.setStatus("error");
    }
  }
  return (
    <section className={s.page}>
      <PageHeader compact backTo="/lop" title="Tạo lớp mới" />
      <form className={s.form} onSubmit={submit}>
        <Input
          label="Tên lớp"
          value={name}
          placeholder="Ví dụ: IELTS Foundation"
          onChange={(event) => {
            setName(event.target.value);
            save.markUnsaved();
          }}
          required
        />
        <WeekdayPicker
          value={days}
          onChange={(next) => {
            setDays(next);
            save.markUnsaved();
          }}
        />
        <Input
          label="Giờ bắt đầu"
          type="time"
          value={time}
          onChange={(event) => {
            setTime(event.target.value);
            save.markUnsaved();
          }}
          required
        />
        {/* 10-gv-tao-lop-moi: chỉ còn dòng ghi chú thang điểm, không còn segmented */}
        <p className={s.scaleNote}>
          Mỗi bài kiểm tra có thang điểm riêng, mặc định 15; sửa được khi tạo bài.
        </p>
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
          <SaveStatus status={save.status} />
          <div className={s.actions}>
            <div className={s.stickyBar}>
              <LinkButton
                to="/lop"
                variant="surface"
                size="lg"
                className={s.cancel}
              >
                Huỷ
              </LinkButton>
              <Button type="submit" size="lg">
                Tạo lớp
              </Button>
            </div>
          </div>
      </form>
    </section>
  );
}
