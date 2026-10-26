import { useState, type FormEvent } from "react";
import { getClass } from "../../data/repositories/classes";
import {
  createStudent,
  classAttendanceRate,
  listStudents,
  markStudentLeft,
  updateStudentPhone,
} from "../../data/repositories/students";
import { listSessions } from "../../data/repositories/sessions";
import { listAttendance } from "../../data/repositories/attendance";
import { useAccess } from "../../data/repositories/access";
import type { Attendance, Class, Session, Student } from "../../data/types";
import { todayISO } from "../../shared/format";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, EmptyState, Input, Modal, UnsavedChangesDialog } from "../../shared/ui";
import { ClassOptionsMenu, type ClassOption } from "../classes/ClassOptionsMenu";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import s from "./StudentsDesktop.module.css";
import d from "../class-space/desktop.module.css";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";

/**
 * Tỉ lệ chuyên cần dạng "17/18": số buổi có đi học (Có mặt / Muộn / Có phép —
 * có phép không bị trừ chuyên cần) trên số buổi đã diễn ra trong thời gian em
 * học ở lớp. Trả null khi chưa có buổi nào.
 */
export function attendanceSummary(
  sessions: Session[],
  records: Attendance[],
  student: Student,
): { attended: number; total: number } | null {
  const held = sessions.filter(
    (session) =>
      session.status === "held" &&
      session.date >= student.enrolledAt &&
      (!student.leftAt || session.date <= student.leftAt),
  );
  if (!held.length) return null;
  const attended = held.filter((session) => {
    const record = records.find(
      (item) =>
        item.sessionId === session.id && item.studentId === student.id,
    );
    return (
      record?.status === "present" ||
      record?.status === "late"
    );
  }).length;
  return { attended, total: held.length };
}

export default function StudentsDesktop({ classId }: { classId: string }) {
  const access = useAccess();
  const klass = getClass(classId) as Class | undefined;
  const students = listStudents(classId);
  const active = students.filter((student) => student.status === "active");
  const canWrite = access.can("students", "write");
  const sessions = listSessions(classId);
  const records = sessions
    .filter((session) => session.status === "held")
    .flatMap((session) => listAttendance(session.id));
  const [menuStudentId, setMenuStudentId] = useState<string | null>(null);
  const [phoneFor, setPhoneFor] = useState<Student | null>(null);
  const [leavingStudent, setLeavingStudent] = useState<Student | null>(null);
  const [adding, setAdding] = useState(false);

  if (!klass) return null;

  const rowMenu = (student: Student): ClassOption[] => [
    {
      label: "Sửa số điện thoại",
      icon: "edit",
      onSelect: () => {
        setMenuStudentId(null);
        setPhoneFor(student);
      },
    },
    ...(student.status === "active"
      ? [
          {
            label: "Đánh dấu nghỉ",
            icon: "archive" as const,
            danger: true,
            onSelect: () => {
              setMenuStudentId(null);
              setLeavingStudent(student);
            },
          },
        ]
      : []),
  ];

  return (
    <main className={d.page}>
      <ClassDesktopHeader
        classId={classId}
        klass={klass}
        actions={
          canWrite ? (
            <Button size="md" onClick={() => setAdding(true)}>
              + Thêm học sinh
            </Button>
          ) : undefined
        }
      />

        <div className={s.stats}>
          <div className={d.statCard}>
            <div><div className={d.statValue}>{active.length}</div><div className={d.statLabel}>đang học</div></div>
            <span className={s.statDivider} />
            <div><div className={d.statValue}>{students.length - active.length}</div><div className={d.statLabel}>đã nghỉ</div></div>
            <span className={s.statDivider} />
            <div><div className={d.statValue}>{classAttendanceRate(classId) === null ? "—" : `${Math.round(classAttendanceRate(classId)!)}%`}</div><div className={d.statLabel}>chuyên cần lớp</div></div>
          </div>
        </div>

      <div className={d.card}>
        {students.length === 0 ? (
          <EmptyState
            title="Chưa có học sinh"
            description="Thêm học sinh để bắt đầu quản lý lớp."
            action={
              canWrite ? (
                <Button size="md" onClick={() => setAdding(true)}>
                  + Thêm học sinh
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
        <table className={s.table}>
          <colgroup>
            <col />
              <col style={{ width: 84 }} />
              <col style={{ width: 48 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Học sinh</th>
                <th>Chuyên cần</th>
                <th aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
                const rate = attendanceSummary(sessions, records, student);
              return (
                <tr key={student.id}>
                  <td>
                    <span className={s.studentName}>{student.name}</span>
                    <span className={s.studentMeta}>
                      {student.guardianRelation ?? "Phụ huynh"} ·{" "}
                      {student.parentPhone || "Chưa có SĐT"}
                    </span>
                  </td>
                    <td className={s.rateCell}>
                    {rate ? `${rate.attended}/${rate.total}` : "Chưa có"}
                  </td>
                  <td>
                    <div className={s.menuWrap}>
                      <button
                        type="button"
                        className={d.rowButton}
                        aria-label={`Thêm tùy chọn ${student.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuStudentId === student.id}
                        onClick={() =>
                          setMenuStudentId(
                            menuStudentId === student.id ? null : student.id,
                          )
                        }
                      >
                        <span aria-hidden="true">⋯</span>
                      </button>
                      <ClassOptionsMenu
                        open={menuStudentId === student.id}
                        onClose={() => setMenuStudentId(null)}
                        items={rowMenu(student)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className={s.footnote}>
            Số điện thoại phụ huynh được lưu trong hồ sơ học sinh.
            Một số điện thoại có thể liên kết với nhiều con.
        </p>
          </>
        )}
      </div>

      {adding && (
        <AddStudentModal classId={classId} onClose={() => setAdding(false)} />
      )}
      {phoneFor && (
        <PhoneModal student={phoneFor} onClose={() => setPhoneFor(null)} />
      )}
      {leavingStudent && (
        <LeaveStudentModal
          student={leavingStudent}
          onClose={() => setLeavingStudent(null)}
        />
      )}
    </main>
  );
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== "save_failed"
    ? error.message
    : fallback;
}

/**
 * Modal có form: đóng khi còn nhập dở thì hỏi (Lưu / Bỏ thay đổi / Ở lại).
 * `Modal` chỉ báo đóng sau khi chạy xong animation ra, nên khi bị chặn hộp
 * thoại hiện lại ngay sau nhịp đó.
 */
function useGuardedClose(dirty: boolean, onClose: () => void) {
  const [asking, setAsking] = useState(false);
  return {
    asking,
    request: () => (dirty ? setAsking(true) : onClose()),
    stay: () => setAsking(false),
  };
}

function AddStudentModal({
  classId,
  onClose,
}: {
  classId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const action = useSaveAction({
    baseline: { name: "", phone: "" },
    value: { name, phone },
    validate: (next) => next.name.trim() !== "",
    save: (next) =>
      createStudent({
        classId,
        name: next.name.trim(),
        parentPhone: next.phone.trim(),
        enrolledAt: todayISO(),
      }),
  });
  const saved = useSavedPeek();
  const closeNow = () => {
    saved.cancel();
    onClose();
  };
  const close = useGuardedClose(action.dirty, closeNow);
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if ((await action.submit()) && (await saved.peek())) onClose();
  }
  return (
    <>
      <Modal
        title="Thêm học sinh"
        open
        onClose={close.request}
        footer={
          <Button
            size="lg"
            type="submit"
            form="add-student-form"
            loading={action.saving}
            done={action.justSaved}
            disabled={!action.canSave}
          >
            Lưu học sinh
          </Button>
        }
      >
        <form id="add-student-form" className={s.form} onSubmit={submit}>
          <Input
            label="Họ và tên học sinh"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            label="Số điện thoại phụ huynh (tuỳ chọn)"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <p className={d.muted13}>
            Phụ huynh dùng số này để đăng ký và đăng nhập.
          </p>
          {action.error != null && (
            <p role="alert" className={d.error}>
              {errorText(action.error, "Không thể lưu học sinh. Vui lòng thử lại.")}
            </p>
          )}
        </form>
      </Modal>
      {close.asking && (
        <UnsavedChangesDialog
          open
          title="Học sinh chưa lưu"
          message="Bạn đang nhập dở thông tin học sinh. Lưu trước khi đóng?"
          saving={action.saving}
          done={action.justSaved}
          onSave={() => void submit()}
          onDiscard={closeNow}
          onStay={() => {
            saved.cancel();
            close.stay();
          }}
        />
      )}
    </>
  );
}

const PHONE_PATTERN = /^[0-9+().\s-]{6,20}$/;

function PhoneModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const initial = student.parentPhone ?? "";
  const [phone, setPhone] = useState(initial);
  const trimmed = phone.trim();
  const phoneInvalid = trimmed !== "" && !PHONE_PATTERN.test(trimmed);
  const action = useSaveAction({
    baseline: initial.trim(),
    value: trimmed,
    validate: () => !phoneInvalid,
    save: (next) => updateStudentPhone(student.id, next),
  });
  const saved = useSavedPeek();
  const closeNow = () => {
    saved.cancel();
    onClose();
  };
  const close = useGuardedClose(action.dirty, closeNow);
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if ((await action.submit()) && (await saved.peek())) onClose();
  }
  return (
    <>
      <Modal
        title="Sửa số điện thoại phụ huynh"
        open
        onClose={close.request}
        footer={
          <Button
            size="lg"
            type="submit"
            form="edit-phone-form"
            loading={action.saving}
            done={action.justSaved}
            disabled={!action.canSave}
          >
            Lưu số điện thoại
          </Button>
        }
      >
        <form id="edit-phone-form" className={s.form} onSubmit={submit}>
          <Input
            label="Số điện thoại phụ huynh"
            name="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoFocus
          />
          <p className={d.muted13}>
            Đổi số điện thoại sẽ gỡ liên kết phụ huynh cũ khỏi hồ sơ học sinh.
          </p>
          {phoneInvalid && <p className={d.error}>Số điện thoại không hợp lệ.</p>}
          {action.error != null && (
            <p role="alert" className={d.error}>
              {errorText(action.error, "Không lưu được số điện thoại.")}
            </p>
          )}
        </form>
      </Modal>
      <UnsavedChangesDialog
        open={close.asking}
        title="Số điện thoại chưa lưu"
        message="Bạn đang sửa dở số điện thoại. Lưu trước khi đóng?"
        saving={action.saving}
        done={action.justSaved}
        onSave={() => void submit()}
        onDiscard={closeNow}
        onStay={() => {
            saved.cancel();
            close.stay();
          }}
      />
    </>
  );
}

function LeaveStudentModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const action = useSaveAction({
    baseline: false,
    value: true,
    save: () => markStudentLeft(student.id, todayISO()),
  });
  const error = action.error
    ? errorText(action.error, "Không thể cập nhật trạng thái học sinh.")
    : "";
  const saved = useSavedPeek();
  const closeNow = () => {
    saved.cancel();
    onClose();
  };
  async function confirm() {
    if ((await action.submit()) && (await saved.peek())) onClose();
  }
  return (
    <Modal
      title="Đánh dấu học sinh đã nghỉ?"
      open
      onClose={closeNow}
      footer={
        <Button
          variant="danger"
          size="md"
          loading={action.saving}
          done={action.justSaved}
          disabled={!action.canSave}
          onClick={() => void confirm()}
        >
          Xác nhận nghỉ học
        </Button>
      }
    >
      <div className={s.form}>
        <p className={d.muted14}>
          Ngày nghỉ là hôm nay. Điểm và điểm danh cũ vẫn được giữ trong lịch
          sử lớp.
        </p>
        {error && (
          <p role="alert" className={d.error}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
