import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  createStudent,
  listStudents,
  markStudentLeft,
  studentAbsenceWarning,
  studentAttendanceRate,
} from "../../data/repositories/students";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import { formatDate, todayISO } from "../../shared/format";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Button,
  Card,
  EmptyState,
  Fab,
  Icon,
  Input,
  Modal,
  NoAccess,
  Pill,
  Sheet,
} from "../../shared/ui";
import StudentsDesktop from "./StudentsDesktop";
import s from "./students.module.css";

export default function StudentsPage() {
  useStore();
  const desktop = useIsDesktop();
  const access = useAccess();
  const { classId = "" } = useParams();
  const students = listStudents(classId);
  const active = students.filter((student) => student.status === "active");
  const absenceWarnings = active.filter((student) => studentAbsenceWarning(student.id)).length;
  const [adding, setAdding] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [menuStudentId, setMenuStudentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const save = useSaveStatus();
  if (!access.can("students", "read")) return <NoAccess what="học sinh" />;
  const canWrite = access.can("students", "write");

  if (desktop) return <StudentsDesktop classId={classId} />;

  function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      createStudent({
        classId,
        name: String(data.get("name") ?? "").trim(),
        parentPhone: String(data.get("phone") ?? "").trim(),
        enrolledAt: todayISO(),
      });
      setAdding(false);
      setError("");
      save.clearStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu học sinh. Vui lòng thử lại.");
      save.setStatus("error");
    }
  }

  function markLeft() {
    if (!leavingId) return;
    try {
      markStudentLeft(leavingId, todayISO());
      setLeavingId(null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái học sinh.");
    }
  }

  const rowContent = (student: (typeof students)[number]) => {
    const nameParts = student.name.trim().split(/\s+/).slice(-2);
    const initials = nameParts.map((part) => part[0]).join("").toLocaleUpperCase("vi-VN");
    const enrollment = `Vào lớp ${formatDate(student.enrolledAt)}${student.leftAt ? ` · Rời lớp ${formatDate(student.leftAt)}` : ""}`;
    return { initials, enrollment };
  };

  return (
    <main className={s.page}>
      <SaveStatus />

      <p className={s.stats} aria-label="Thống kê học sinh">
        {active.length} đang học · {students.length - active.length} đã nghỉ (giữ lịch sử) · {absenceWarnings} vắng 2 buổi liền
      </p>

      {error && <p role="alert" className={s.error}>{error}</p>}
      {students.length === 0 ? (
          <Card><EmptyState title="Chưa có học sinh" mascot="cho"><p>Thêm học sinh để bắt đầu quản lý lớp.</p></EmptyState></Card>
      ) : (
        <div className={s.list}>{students.map((student) => {
          const { initials, enrollment } = rowContent(student);
          return <Card key={student.id} className={s.student}>
            <div className={s.avatar} aria-hidden="true">{initials}</div>
            <div className={s.details}>
              <strong>{student.name}</strong>
              <span>{student.parentPhone ? `Phụ huynh · ${student.parentPhone}` : "Chưa có số điện thoại phụ huynh"}</span>
              <span>{enrollment}</span>
            </div>
              {student.status === "left" && <Pill tone="neutral">Đã nghỉ</Pill>}
              {canWrite && (
                <button
                  type="button"
                  className={s.moreButton}
                  aria-label={`Tuỳ chọn ${student.name}`}
                  title={`Tuỳ chọn ${student.name}`}
                  onClick={() => setMenuStudentId(student.id)}
                >
                  <Icon name="more" />
                </button>
              )}
          </Card>;
        })}</div>
      )}

      {canWrite && (
        <Fab label="Thêm học sinh" onClick={() => { setAdding(true); setError(""); }} />
      )}

      <Modal title="Thêm học sinh" open={adding} onClose={() => { setAdding(false); setError(""); save.clearStatus(); }}>
        <form className={s.form} onSubmit={addStudent}>
          <Input label="Họ và tên học sinh" name="name" autoComplete="name" onChange={save.markUnsaved} required />
          <Input label="Số điện thoại phụ huynh (tuỳ chọn)" name="phone" type="tel" inputMode="tel" autoComplete="tel" onChange={save.markUnsaved} />
          <p className={s.note}>Chỉ lưu số điện thoại trong hồ sơ. Chưa gửi lời mời hoặc tin nhắn.</p>
          {error && <p role="alert" className={s.error}>{error}</p>}
          <SaveStatus status={save.status} />
          <Button size="lg" type="submit">Lưu học sinh</Button>
        </form>
      </Modal>

      <Modal title="Đánh dấu học sinh đã nghỉ?" open={Boolean(leavingId)} onClose={() => setLeavingId(null)}>
        <div className={s.confirmation}>
          <p>Ngày nghỉ là hôm nay. Điểm và điểm danh cũ vẫn được giữ trong lịch sử lớp.</p>
          {error && <p role="alert" className={s.error}>{error}</p>}
          <Button variant="danger" onClick={markLeft}>Xác nhận nghỉ học</Button>
        </div>
      </Modal>

      <Sheet title="Tuỳ chọn học sinh" open={Boolean(menuStudentId)} onClose={() => setMenuStudentId(null)}>
        {menuStudentId && students.find((student) => student.id === menuStudentId)?.status === "active" ? (
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              setLeavingId(menuStudentId);
              setMenuStudentId(null);
              setError("");
            }}
          >
            Đánh dấu nghỉ
          </Button>
        ) : (
          <p className={s.note}>Học sinh đã nghỉ. Điểm và điểm danh cũ vẫn được giữ trong lịch sử lớp.</p>
        )}
      </Sheet>
    </main>
  );
}
