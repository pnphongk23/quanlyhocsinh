import { useEffect, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { useStore } from "../../data/store";
import { useSaveStatus } from "../../shared/SaveStatus";
import {
  listStudentsForSession,
  studentAbsenceWarning,
} from "../../data/repositories/students";
import { getSession, sessionPrefix } from "../../data/repositories/sessions";
import {
  listAttendance,
  saveAttendanceBatch,
} from "../../data/repositories/attendance";
import { useAccess } from "../../data/repositories/access";
import type { Attendance as AttendanceRecord } from "../../data/types";
import { formatDayMonth, formatWeekdayDate } from "../../shared/format";
import { Button } from "../../shared/ui";
import { studentsForSession } from "./sessionRoster";
import s from "./AttendanceDesktop.module.css";
import d from "../class-space/desktop.module.css";

type AttendanceState = AttendanceRecord["status"];
type Draft = { status: AttendanceState; lateAt: string; note: string };

const STATES: AttendanceState[] = ["present", "late", "excused", "absent"];
const LABELS: Record<AttendanceState, string> = {
  present: "Có mặt",
  late: "Muộn",
  excused: "Có phép",
  absent: "Vắng",
};

/** Hai chữ đầu của hai từ cuối — cùng quy ước avatar toàn app. */
/**
 * Tab Điểm danh trên web desktop (ảnh 03): bảng 4 trạng thái, ô giờ đến khi
 * Muộn, dòng đếm, thẻ "Người dạy" chỉ đọc. Mobile giữ AttendancePanel.
 */
export default function AttendanceDesktop({
  classId,
  sessionId,
  readOnly = false,
  onDirtyChange,
  saveRef,
  tabBar,
}: {
  classId: string;
  sessionId: string;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  saveRef?: MutableRefObject<(() => void) | null>;
  /** Hàng 3 tab của buổi + nút chính, để nút nằm cùng hàng với tab. */
  tabBar: (actions: ReactNode) => ReactNode;
}) {
    useStore();
  const { markUnsaved, clearStatus, setStatus } = useSaveStatus();
  const access = useAccess();
  const canEdit = access.can("sessions_attendance", "write");
  const viewOnly = readOnly || !canEdit;
  const session = getSession(sessionId);
  const students = session
    ? studentsForSession(listStudentsForSession(sessionId, true), session)
    : [];
  const stored = listAttendance(sessionId);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty = Object.keys(drafts).length > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  if (!session) return null;

  const draftFor = (studentId: string): Draft => {
    const existing = stored.find((record) => record.studentId === studentId);
    return (
      drafts[studentId] ?? {
        status: existing?.status ?? "present",
        lateAt: existing?.lateAt ?? "",
        note: existing?.note ?? "",
      }
    );
  };
  const rows = students.map((student) => ({
    student,
    ...draftFor(student.id),
  }));
  const counts = STATES.map(
    (status) => rows.filter((row) => row.status === status).length,
  );
  const warnings = students.filter((student) => studentAbsenceWarning(student.id));

  function setRow(studentId: string, patch: Partial<Draft>) {
    markUnsaved();
    setError("");
    setSaved(false);
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...draftFor(studentId), ...patch },
    }));
  }

  function allPresent() {
    markUnsaved();
    setSaved(false);
    setDrafts(
      Object.fromEntries(
        students.map((student) => [
          student.id,
          { ...draftFor(student.id), status: "present" as const },
        ]),
      ),
    );
  }

  function save() {
    try {
      saveAttendanceBatch(
        rows.map((row) => ({
          sessionId,
          studentId: row.student.id,
          status: row.status,
          note: row.note.trim(),
          lateAt: row.status === "late" ? row.lateAt || null : null,
        })),
      );
      setDrafts({});
      setError("");
      setSaved(true);
      clearStatus();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được điểm danh.",
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    if (saveRef) saveRef.current = save;
  });

  return (
    <div className={d.page}>
      {tabBar(
        viewOnly ? undefined : (
          <>
            <Button variant="secondary" size="md" onClick={allPresent}>
              Tất cả có mặt
            </Button>
            <Button size="md" onClick={save}>
              Lưu điểm danh
            </Button>
          </>
        ),
      )}

      {readOnly && (
        <p className={d.inlineHint}>
          Chỉ điểm danh được từ ngày học ({formatDayMonth(session.date)}) trở đi.
          Bây giờ bạn chỉ xem hoặc huỷ buổi.
        </p>
      )}
      {error && (
        <p role="alert" className={d.error}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className={d.successNote}>
          Đã lưu điểm danh buổi {sessionPrefix(session).toLowerCase()}.
        </p>
      )}

      <div className={d.split}>
        <section className={d.mainColumn}>
          <div className={d.card}>
            <table className={s.table}>
              <colgroup>
                <col style={{ width: 180 }} />
                <col style={{ width: 330 }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>Học sinh</th>
                  <th>Trạng thái</th>
                  <th>Giờ đến (nếu muộn)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.student.id}>
                    <td className={s.studentName}>{row.student.name}</td>
                    <td>
                      <div
                        className={s.statusGroup}
                        role="group"
                        aria-label={`Trạng thái của ${row.student.name}`}
                      >
                        {STATES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            aria-pressed={row.status === status}
                            disabled={viewOnly}
                            className={
                              s.statusButton +
                              (row.status === status
                                ? " " + s[`on_${status}`]
                                : "")
                            }
                            onClick={() =>
                              setRow(row.student.id, { status })
                            }
                          >
                            {LABELS[status]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      {row.status === "late" && (
                        <label className={s.lateField}>
                          <span>Đến lúc</span>
                          <input
                            className={s.timeInput}
                            type="time"
                            aria-label={`Giờ đến muộn của ${row.student.name}`}
                            value={row.lateAt}
                            disabled={viewOnly}
                            onChange={(event) =>
                              setRow(row.student.id, {
                                lateAt: event.target.value,
                              })
                            }
                          />
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.countRow}>
              <span>
                <b className={s.countPresent}>{counts[0]}</b> Có mặt
              </span>
              <span>
                <b className={s.countLate}>{counts[1]}</b> Muộn
              </span>
              <span>
                <b className={s.countExcused}>{counts[2]}</b> Có phép
              </span>
              <span>
                <b className={s.countAbsent}>{counts[3]}</b> Vắng
              </span>
            </div>
          </div>
          <p className={d.muted13}>
            {sessionPrefix(session)} · {formatWeekdayDate(session.date)}
            {session.time ? ` · ${session.time}` : ""}
            {warnings.length
              ? ` · ${warnings
                  .map((student) => student.name)
                  .join(", ")} vắng 2 buổi liền`
              : ""}
          </p>
        </section>

      </div>
    </div>
  );
}
