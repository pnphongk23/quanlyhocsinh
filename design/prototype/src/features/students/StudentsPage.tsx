import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  listStudents,
  markStudentLeft,
  studentAbsenceWarning,
  studentAttendanceRate,
} from "../../data/repositories/students";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import { formatDate, todayISO } from "../../shared/format";
import { SaveStatus } from "../../shared/SaveStatus";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Button,
  Card,
  EmptyState,
  Fab,
  Icon,
  Modal,
  NoAccess,
  Pill,
  Sheet,
} from "../../shared/ui";
import AddStudentModal from "./AddStudentModal";
import StudentsDesktop from "./StudentsDesktop";
import s from "./students.module.css";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";

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
  const saved = useSavedPeek();
  useEffect(() => saved.cancel, [saved, leavingId]);
  const [menuStudentId, setMenuStudentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const markLeft = useSaveAction<string | null>({
    baseline: null,
    value: leavingId,
    validate: (value) => value !== null,
    save: doMarkLeft,
  });
  if (!access.can("students", "read")) return <NoAccess what="học sinh" />;
  const canWrite = access.can("students", "write");

  if (desktop) return <StudentsDesktop classId={classId} />;

  async function doMarkLeft() {
    if (!leavingId) return;
    try {
      markStudentLeft(leavingId, todayISO());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái học sinh.");
      throw cause;
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
          <Card><EmptyState title="Chưa có học sinh" description="Thêm học sinh để bắt đầu quản lý lớp." /></Card>
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

      {adding && (
        <AddStudentModal classId={classId} onClose={() => setAdding(false)} />
      )}

      <Modal title="Đánh dấu học sinh đã nghỉ?" open={Boolean(leavingId)} onClose={() => setLeavingId(null)}>
        <div className={s.confirmation}>
          <p>Ngày nghỉ là hôm nay. Điểm và điểm danh cũ vẫn được giữ trong lịch sử lớp.</p>
          {error && <p role="alert" className={s.error}>{error}</p>}
          <Button
            variant="danger"
            disabled={!markLeft.canSave}
            loading={markLeft.saving}
            done={markLeft.justSaved}
            onClick={async () => { if ((await markLeft.submit()) && (await saved.peek())) setLeavingId(null); }}
          >Xác nhận nghỉ học</Button>
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
