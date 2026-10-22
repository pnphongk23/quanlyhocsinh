import { useState, type FormEvent } from "react";
import { getClass } from "../../data/repositories/classes";
import {
  createStudent,
  listStudents,
  markStudentLeft,
  updateStudentPhone,
} from "../../data/repositories/students";
import { listSessions } from "../../data/repositories/sessions";
import { listAttendance } from "../../data/repositories/attendance";
import { useAccess } from "../../data/repositories/access";
import type { Attendance, Class, Session, Student } from "../../data/types";
import { todayISO } from "../../shared/format";
import { useSaveStatus } from "../../shared/SaveStatus";
import { Button, Input, Modal } from "../../shared/ui";
import { ClassOptionsMenu, type ClassOption } from "../classes/ClassOptionsMenu";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import s from "./StudentsDesktop.module.css";
import d from "../class-space/desktop.module.css";

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
      record?.status === "late" ||
      record?.status === "excused"
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
  const [phoneError, setPhoneError] = useState("");
  const [leavingStudent, setLeavingStudent] = useState<Student | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const save = useSaveStatus();

  if (!klass) return null;

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await createStudent({
        classId,
        name: String(data.get("name") ?? "").trim(),
        parentPhone: String(data.get("phone") ?? "").trim(),
        enrolledAt: todayISO(),
      });
      setAdding(false);
      setError("");
      save.clearStatus();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu học sinh. Vui lòng thử lại.",
      );
      save.setStatus("error");
    }
  }

  async function savePhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phoneFor) return;
    const data = new FormData(event.currentTarget);
    try {
      await updateStudentPhone(phoneFor.id, String(data.get("phone") ?? ""));
      setPhoneFor(null);
      setPhoneError("");
    } catch (cause) {
      setPhoneError(
        cause instanceof Error ? cause.message : "Không lưu được số điện thoại.",
      );
    }
  }

  const rowMenu = (student: Student): ClassOption[] => [
    {
      label: "Sửa số điện thoại",
      icon: "edit",
      onSelect: () => {
        setMenuStudentId(null);
        setPhoneError("");
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

      {error && (
        <p role="alert" className={d.error}>
          {error}
        </p>
      )}

        <div className={s.stats}>
          <div className={d.statCard}>
            <div className={d.statValue}>{active.length}</div>
            <div className={d.statLabel}>đang học</div>
          </div>
        </div>

      <div className={d.card}>
        <table className={s.table}>
          <colgroup>
            <col />
              <col style={{ width: 190 }} />
              <col style={{ width: 84 }} />
              <col style={{ width: 48 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Lớp đang học</th>
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
                  <td className={s.classCell}>{klass.name}</td>
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
      </div>

      <Modal
        title="Thêm học sinh"
        open={adding}
        onClose={() => {
          setAdding(false);
          save.clearStatus();
        }}
      >
        <form className={s.form} onSubmit={addStudent}>
          <Input
            label="Họ và tên học sinh"
            name="name"
            autoComplete="name"
            onChange={save.markUnsaved}
            required
          />
          <Input
            label="Số điện thoại phụ huynh (tuỳ chọn)"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            onChange={save.markUnsaved}
          />
          <p className={d.muted13}>
            Phụ huynh dùng số này để đăng ký và đăng nhập.
          </p>
          <Button size="lg" type="submit">
            Lưu học sinh
          </Button>
        </form>
      </Modal>

      <Modal
        title="Sửa số điện thoại phụ huynh"
        open={phoneFor !== null}
        onClose={() => setPhoneFor(null)}
      >
        <form className={s.form} onSubmit={savePhone}>
          <Input
            label="Số điện thoại phụ huynh"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={phoneFor?.parentPhone ?? ""}
            autoFocus
          />
          <p className={d.muted13}>
              Đổi số điện thoại sẽ gỡ liên kết phụ huynh cũ khỏi hồ sơ học sinh.
          </p>
          {phoneError && (
            <p role="alert" className={d.error}>
              {phoneError}
            </p>
          )}
          <Button size="lg" type="submit">
            Lưu số điện thoại
          </Button>
        </form>
      </Modal>


      <Modal
        title="Đánh dấu học sinh đã nghỉ?"
        open={leavingStudent !== null}
        onClose={() => setLeavingStudent(null)}
      >
        <div className={s.form}>
          <p className={d.muted14}>
            Ngày nghỉ là hôm nay. Điểm và điểm danh cũ vẫn được giữ trong lịch
            sử lớp.
          </p>
          <Button
            variant="danger"
            size="md"
            onClick={async () => {
              if (!leavingStudent) return;
              try {
                await markStudentLeft(leavingStudent.id, todayISO());
                setLeavingStudent(null);
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Không thể cập nhật trạng thái học sinh.",
                );
              }
            }}
          >
            Xác nhận nghỉ học
          </Button>
        </div>
      </Modal>
    </main>
  );
}
