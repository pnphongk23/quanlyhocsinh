import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../data/store";
import { createTest, DEFAULT_TEST_MAX } from "../../data/repositories/tests";
import { getClass } from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import { useSaveStatus } from "../../shared/SaveStatus";
import { todayISO } from "../../shared/format";
import { Button, Input, NoAccess, PageHeader } from "../../shared/ui";
import { AlertTriangleIcon } from "./ScoreIcons";
import s from "./scores.module.css";

export default function NewTestPage() {
  const { classId = "" } = useParams();
  const navigate = useNavigate();
  useStore();
  const { markUnsaved, clearStatus, setStatus } = useSaveStatus();
  const access = useAccess();
  const classItem = getClass(classId);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => todayISO());
  const [max, setMax] = useState(String(DEFAULT_TEST_MAX));
  const [error, setError] = useState("");
  const listPath = `/lop/${classId}/bai-kiem-tra`;

  if (!access.can("scores", "write"))
    return <NoAccess what="mục tạo bài kiểm tra" />;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!classItem) {
      setError("Không tìm thấy lớp học.");
      return;
    }
    if (!name.trim()) {
      setError("Nhập tên bài kiểm tra.");
      return;
    }
    if (!date) {
      setError("Chọn ngày kiểm tra.");
      return;
    }
    try {
      const test = createTest({ classId, name, date, max: Number(max.trim()) });
      setError("");
      clearStatus();
      navigate(`/lop/${classId}/bai-kiem-tra/${test.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tạo được bài kiểm tra.",
      );
      setStatus("error");
    }
  }

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
            markUnsaved();
            setError("");
          }}
          required
        />
        <Input
          label="Ngày kiểm tra"
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            markUnsaved();
            setError("");
          }}
          required
        />
        <Input
          label="Điểm tối đa"
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          step={1}
          value={max}
          onChange={(event) => {
            setMax(event.target.value);
            markUnsaved();
            setError("");
          }}
          required
        />
        <p className={s.hint}>
          Mỗi bài có thang điểm riêng, mặc định {DEFAULT_TEST_MAX}. Sửa được lúc
          tạo bài hoặc khi sửa bài.
        </p>
        {error && (
          <p role="alert" className={s.errorBanner}>
            <AlertTriangleIcon size={18} />
            <span className={s.errorBannerText}>{error}</span>
          </p>
        )}
        <div className={s.actions}>
          <Button type="submit" size="lg">
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
        </div>
      </form>
    </section>
  );
}
