import { useEffect, useState, type MutableRefObject, type ReactNode } from "react";
import { useStore } from "../../data/store";
import { useSaveStatus } from "../../shared/SaveStatus";
import { listStudentsForSession, studentAbsenceWarning } from "../../data/repositories/students";
import { getSession } from "../../data/repositories/sessions";
import { listAttendance, saveAttendanceBatchDurable } from "../../data/repositories/attendance";
import { useAccess } from "../../data/repositories/access";
import type { Attendance as AttendanceRecord } from "../../data/types";
import { formatDayMonth } from "../../shared/format";
import { deepEqual, useSaveAction } from "../../shared/hooks/useSaveAction";
import { ActionFooter, Button, EmptyState, NoAccess } from "../../shared/ui";
import { studentsForSession } from "./sessionRoster";
import s from "./AttendancePanel.module.css";

type AttendanceState = AttendanceRecord["status"];
type Draft = { status: AttendanceState | null };
type Variant = "mobile" | "tablet" | "desktop";

const states: AttendanceState[] = ["present", "absent", "late"];
const summaryStates: AttendanceState[] = ["present", "late", "absent"];
const labels: Record<AttendanceState, string> = {
  present: "Có mặt",
  late: "Muộn",
  absent: "Vắng",
};

export default function AttendancePanel({
  classId: _classId,
  sessionId,
  variant = "mobile",
  tabBar,
  onDirtyChange,
  readOnly = false,
  saveRef,
}: {
  classId: string;
  sessionId: string;
  variant?: Variant;
  tabBar?: (actions?: ReactNode) => ReactNode;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
  saveRef?: MutableRefObject<(() => unknown) | null>;
}) {
  useStore();
  const { markUnsaved, clearStatus, setStatus } = useSaveStatus();
  const access = useAccess();
  const canEdit = access.can("sessions_attendance", "write");
  const viewOnly = readOnly || !canEdit;
  const viewOnlyNoticeId = readOnly ? "attendance-read-only-reason" : !canEdit ? "attendance-permission-reason" : undefined;
  const session = getSession(sessionId);
  const allStudents = listStudentsForSession(sessionId, true);
  const students = session ? studentsForSession(allStudents, session) : [];
  const stored = listAttendance(sessionId);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState("");
  const storedFor = (studentId: string) => stored.find((record) => record.studentId === studentId);
  const draftFor = (studentId: string): Draft => drafts[studentId] ?? { status: storedFor(studentId)?.status ?? null };
  const rows = students.map((student) => ({ student, ...draftFor(student.id) }));
  const baseline: Record<string, Draft> = {};
  const value: Record<string, Draft> = {};
  for (const student of students) {
    baseline[student.id] = { status: storedFor(student.id)?.status ?? null };
    value[student.id] = draftFor(student.id);
  }
  const touched = students.some((student) => !deepEqual(value[student.id], baseline[student.id]));
  const action = useSaveAction<Record<string, Draft>>({
    baseline,
    value,
    save: async () => {
      if (!session || !rows.some((row) => row.status !== null)) return false;
      try {
        await saveAttendanceBatchDurable(rows.flatMap((row) => row.status ? [{ sessionId, studentId: row.student.id, status: row.status }] : []));
        setDrafts({});
        setError("");
        clearStatus();
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không lưu được điểm danh.");
        setStatus("error");
        return false;
      }
    },
  });

  useEffect(() => { onDirtyChange?.(touched); }, [touched, onDirtyChange]);
  const save = () => { void action.submit(); };
  useEffect(() => { if (saveRef) saveRef.current = save; });

  if (!access.can("sessions_attendance", "read")) return <NoAccess what="điểm danh" />;
  if (!session) return <p className={s.error}>Không tìm thấy buổi học.</p>;

  const counts = summaryStates.map((state) => rows.filter((row) => (viewOnly ? storedFor(row.student.id)?.status : row.status) === state).length);
  const unmarkedCount = students.length - counts.reduce((total, count) => total + count, 0);
  const allUnmarked = students.length > 0 && unmarkedCount === students.length;
  const warnings = students.filter((student) => studentAbsenceWarning(student.id));
  const errorBanner = error ? <div className={s.saveError} role="alert"><span className={s.saveErrorText}>{error}</span><button type="button" className={s.retry} onClick={save}>Thử lại</button></div> : null;

  function setRow(studentId: string, status: AttendanceState) {
    markUnsaved();
    setError("");
    setDrafts((current) => ({ ...current, [studentId]: { ...draftFor(studentId), status } }));
  }
  function cycle(studentId: string) {
    const current = draftFor(studentId).status;
    setRow(studentId, current ? states[(states.indexOf(current) + 1) % states.length] : "present");
  }
  function allPresent() {
    markUnsaved();
    setDrafts(Object.fromEntries(students.map((student) => [student.id, { ...draftFor(student.id), status: "present" as const }])));
  }
  const actions = !viewOnly ? <><Button variant="secondary" onClick={allPresent}>Tất cả có mặt</Button><Button disabled={!action.canSave} loading={action.saving} done={action.justSaved} onClick={save}>Lưu điểm danh</Button></> : undefined;

  const attention = !viewOnly ? <article className={s.attention} data-measure="block">
    <h2 className={s.attentionTitle}>Cần chú ý</h2>
    {warnings.length ? warnings.map((student) => <p className={s.warning} key={student.id}>{student.name} vắng ít nhất 2 buổi liên tiếp.</p>) : <EmptyState size="compact" title="Chưa có học sinh vắng 2 buổi liên tiếp" />}
  </article> : null;

  if (variant !== "mobile") {
    const countSummary = allUnmarked
      ? <span>Chưa điểm danh <b>{unmarkedCount}</b> em</span>
      : <><span><b className={s.countPresent}>{counts[0]}</b> Có mặt</span><span><b className={s.countLate}>{counts[1]}</b> Muộn</span><span><b className={s.countAbsent}>{counts[2]}</b> Vắng</span></>;
    const table = <section className={s.rosterCard} data-measure="block" aria-label="Danh sách điểm danh">
      <table className={s.table}>
        <thead><tr><th>Học sinh</th><th>Trạng thái</th></tr></thead>
        <tbody>{rows.map((row) => {
          const status = viewOnly ? storedFor(row.student.id)?.status ?? null : row.status;
          return <tr key={row.student.id} data-measure="row">
            <td className={s.tableName}>{row.student.name}</td>
            <td><div className={s.statusColumn} data-measure="status">
              {status === null && <span className={s.unmarkedLabel}>Chưa điểm danh</span>}
              <div className={s.statusGroup} role="group" aria-label={`Trạng thái của ${row.student.name}${status === null ? ": Chưa điểm danh" : ""}`}>
                {summaryStates.map((state) => <button key={state} type="button" aria-pressed={status === state} disabled={viewOnly} className={`${s.segment} ${status === state ? s[`selected_${state}`] : ""}`} onClick={() => setRow(row.student.id, state)}>{labels[state]}</button>)}
              </div>
            </div></td>
          </tr>;
        })}</tbody>
      </table>
      <div className={s.countRow}>{countSummary}</div>
    </section>;
    return <div className={s.widePanel}>
      {tabBar?.(actions)}
      {readOnly && <p id="attendance-read-only-reason" className={s.notice}>Chỉ điểm danh được từ ngày học ({formatDayMonth(session.date)}) trở đi. Bây giờ bạn chỉ xem hoặc huỷ buổi.</p>}
      {!readOnly && !canEdit && <p id="attendance-permission-reason" className={s.notice}>Bạn chỉ có quyền xem điểm danh của buổi học này.</p>}
      {errorBanner}
      <div className={`${s.wideLayout} ${variant === "desktop" ? s.desktopLayout : s.tabletLayout}`}>
        <div className={s.mainColumn}>{table}{attention}</div>
        {variant === "desktop" && <aside className={s.summaryPanel} data-measure="block" aria-label="Tóm tắt buổi">
          <h2 className={s.summaryTitle}>Tóm tắt buổi</h2>
          <dl className={s.summaryList}>
            <div><dt>Sĩ số</dt><dd>{students.length}</dd></div>
            <div><dt>Có mặt</dt><dd>{counts[0]}</dd></div>
            <div><dt>Muộn</dt><dd>{counts[1]}</dd></div>
            <div><dt>Vắng</dt><dd>{counts[2]}</dd></div>
            <div><dt>Chưa điểm danh</dt><dd>{unmarkedCount}</dd></div>
          </dl>
          <p className={s.hint}>Muộn tính là có đi học.{readOnly ? " Chỉ điểm danh được từ ngày học trở đi." : ""}</p>
        </aside>}
      </div>
    </div>;
  }

  return <div className={s.mobilePanel}>
    {tabBar?.()}
    {errorBanner}
    {!viewOnly && <div className={s.summaryRow}>
      <p className={`${s.summary} ${allUnmarked ? s.summaryUnmarked : ""}`}>{allUnmarked ? <>Chưa điểm danh <b>{unmarkedCount}</b> em</> : <><b>{counts[2]}</b> vắng mặt</>}</p>
      <Button variant="secondary" onClick={allPresent}>Tất cả có mặt</Button>
    </div>}
    {readOnly && <p id="attendance-read-only-reason" className={s.notice}>Chỉ điểm danh được từ ngày học ({formatDayMonth(session.date)}) trở đi. Bây giờ bạn chỉ xem hoặc huỷ buổi.</p>}
    {!readOnly && !canEdit && <p id="attendance-permission-reason" className={s.notice}>Bạn chỉ có quyền xem điểm danh của buổi học này.</p>}
    <section className={s.rosterList} aria-label="Danh sách điểm danh">
      {rows.map((row) => {
        const status = viewOnly ? storedFor(row.student.id)?.status ?? null : row.status;
        const displayState = status ? labels[status] : viewOnly ? "–" : "Chưa điểm danh";
        const statusClass = status ? s[status] : s.unmarked;
        return <div className={s.mobileRow} key={row.student.id} data-measure="row">
          <span className={s.avatar} aria-hidden="true">{row.student.name.split(/\s+/).slice(-2).map((word) => word[0]).join("")}</span>
          <span className={s.personName}>{row.student.name}</span>
          <button type="button" data-measure="status" aria-label={viewOnly ? `${row.student.name}: ${displayState}` : `${row.student.name}: ${displayState}. Bấm để đổi`} className={`${s.statusChip} ${statusClass}`} disabled={viewOnly} onClick={() => cycle(row.student.id)}>{displayState}</button>
        </div>;
      })}
    </section>
    {attention}
    <ActionFooter className={s.stickyBar} hint={!viewOnly && !action.dirty ? "Chưa có thay đổi để lưu" : undefined}>
      <Button size="lg" onClick={save} disabled={viewOnly || !action.canSave} loading={action.saving} done={action.justSaved} aria-describedby={viewOnlyNoticeId}>{readOnly ? "Điểm danh" : "Lưu điểm danh"}</Button>
    </ActionFooter>
  </div>;
}
