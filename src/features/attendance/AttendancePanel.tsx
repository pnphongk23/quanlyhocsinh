import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";
import { useStore } from "../../data/store";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useSaveStatus } from "../../shared/SaveStatus";
import { listStudentsForSession, studentAbsenceWarning } from "../../data/repositories/students";
import { getSession, sessionPrefix } from "../../data/repositories/sessions";
import {
  listAttendance,
  saveAttendanceBatchDurable,
} from "../../data/repositories/attendance";
import { useAccess } from "../../data/repositories/access";
import type { Attendance as AttendanceRecord } from "../../data/types";
import { formatDayMonth, formatWeekdayDate } from "../../shared/format";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { ActionFooter, Button, EmptyState, NoAccess } from "../../shared/ui";
import { studentsForSession } from "./sessionRoster";
import s from "./AttendancePanel.module.css";

type AttendanceState = AttendanceRecord["status"];
const states: AttendanceState[] = ["present", "absent", "late"];
const summaryStates: AttendanceState[] = ["present", "late", "absent"];
const labels: Record<AttendanceState, string> = {
  present: "Có mặt",
  late: "Muộn",
  absent: "Vắng",
};
type Draft = { status: AttendanceState };
type SwipeGesture = {
  pointerId: number;
  studentId: string;
  startX: number;
  startY: number;
  direction: "late" | "absent" | null;
  distance: number;
};
type SwipeState = {
  studentId: string;
  offset: number;
  direction: "late" | "absent";
};
const MAX_SWIPE = 120;
const SWIPE_THRESHOLD = 64;

export default function AttendancePanel({
  classId,
  sessionId,
  onDirtyChange,
  readOnly = false,
  saveRef,
}: {
  classId: string;
  sessionId: string;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
  saveRef?: MutableRefObject<(() => void) | null>;
}) {
  useStore();
  const desktop = useIsDesktop();
  const { markUnsaved, clearStatus, setStatus } = useSaveStatus();
  const access = useAccess();
  const canEdit = access.can("sessions_attendance", "write");
  const viewOnly = readOnly || !canEdit;
  const viewOnlyNoticeId = readOnly
    ? "attendance-read-only-reason"
    : !canEdit
      ? "attendance-permission-reason"
      : undefined;
  const session = getSession(sessionId);
  const allStudents = listStudentsForSession(sessionId, true);
  const students = session ? studentsForSession(allStudents, session) : [];
  const stored = listAttendance(sessionId);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState("");
  const gesture = useRef<SwipeGesture | null>(null);
  const [swipe, setSwipe] = useState<SwipeState | null>(null);
  const draftFor = (studentId: string): Draft => {
    const existing = stored.find((record) => record.studentId === studentId);
    return (
      drafts[studentId] ?? { status: existing?.status ?? "present" }
    );
  };
  const rows = students.map((student) => ({
    student,
    ...draftFor(student.id),
  }));
  const storedFor = (studentId: string) =>
    stored.find((record) => record.studentId === studentId);
  const counts = useMemo(
    () =>
      summaryStates.map((state) =>
        rows.filter((row) =>
          viewOnly
            ? storedFor(row.student.id)?.status === state
            : row.status === state,
        ).length,
      ),
    [rows, viewOnly, stored],
  );

  const storedRows = Object.fromEntries(
    students.map((student) => {
      const record = stored.find((item) => item.studentId === student.id);
      return [
        student.id,
        { status: record?.status ?? "present" },
      ];
    }),
  );
  const typedRows = Object.fromEntries(
    rows.map((row) => [
      row.student.id,
      { status: row.status },
    ]),
  );
  const action = useSaveAction({
    baseline: storedRows,
    value: typedRows,
    save: () => persist(),
  });
  const dirty = action.dirty;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const warnings = students.filter((student) =>
    studentAbsenceWarning(student.id),
  );
  const setRow = (studentId: string, patch: Partial<Draft>) => {
    markUnsaved();
    setError("");
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...draftFor(studentId), ...patch },
    }));
  };
  const cycle = (studentId: string) => {
    const current = draftFor(studentId).status;
    setRow(studentId, {
      status: states[(states.indexOf(current) + 1) % states.length],
    });
  };
  const startSwipe = (
    event: ReactPointerEvent<HTMLDivElement>,
    studentId: string,
  ) => {
    if (viewOnly || desktop || !event.isPrimary || event.button !== 0) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("button, input, textarea, select, a")
    )
      return;
    gesture.current = {
      pointerId: event.pointerId,
      studentId,
      startX: event.clientX,
      startY: event.clientY,
      direction: null,
      distance: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.direction && Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
    if (!current.direction && Math.abs(dy) >= Math.abs(dx) * 1.2) {
      gesture.current = null;
      setSwipe(null);
      return;
    }
    if (Math.abs(dx) < Math.abs(dy) * 1.2) {
      current.distance = 0;
      setSwipe(null);
      return;
    }
    const direction = dx < 0 ? "late" : "absent";
    const offset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, dx));
    current.direction = direction;
    current.distance = Math.abs(dx);
    setSwipe({ studentId: current.studentId, offset, direction });
  };
  const finishSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.direction && current.distance >= SWIPE_THRESHOLD) {
      setRow(current.studentId, { status: current.direction });
    }
    gesture.current = null;
    setSwipe(null);
  };
  const cancelSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    setSwipe(null);
  };
  const allPresent = () => {
    markUnsaved();
    setDrafts(
      Object.fromEntries(
        students.map((student) => [
          student.id,
          { ...draftFor(student.id), status: "present" as const },
        ]),
      ),
    );
  };
  /** Trả `false` khi lưu lỗi (useSaveAction giữ dirty để thử lại). */
  const persist = async (): Promise<boolean> => {
    if (!session) return false;
    try {
      await saveAttendanceBatchDurable(
        rows.map((row) => ({
          sessionId: session.id,
          studentId: row.student.id,
          status: row.status,
        })),
      );
      setDrafts({});
      setError("");
      clearStatus();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được điểm danh.",
      );
      setStatus("error");
      return false;
    }
  };
  const save = () => {
    void action.submit();
  };
  useEffect(() => {
    if (saveRef) saveRef.current = save;
  });

  if (!access.can("sessions_attendance", "read"))
    return <NoAccess what="điểm danh" />;

  if (!session) return <p className={s.error}>Không tìm thấy buổi học.</p>;

  const errorBanner = error ? (
    <div className={s.saveError} role="alert">
      <span className={s.saveErrorIcon} aria-hidden="true">
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
        </svg>
      </span>
      <span className={s.saveErrorText}>{error}</span>
      <button type="button" className={s.retry} onClick={save}>
        Thử lại
      </button>
    </div>
  ) : null;

  return (
    <section className={s.panel}>
      {/* 16: hàng tóm tắt "N vắng mặt" + "Tất cả có mặt";
          web 89: nút nằm cùng hàng với tiêu đề, tóm tắt 4 trạng thái trong thẻ */}
      {!viewOnly && (
      <div className={s.summaryRow}>
        {!desktop && !readOnly && (
          <p className={s.summary}>
            <b>{counts[2]}</b> vắng mặt
          </p>
        )}
        <div className={s.summaryActions}>
          {!viewOnly && (
            <Button
              variant="secondary"
              size={desktop ? "md" : "sm"}
              onClick={allPresent}
            >
              Tất cả có mặt
            </Button>
          )}
          {desktop && (
            <Button
              size="md"
              onClick={save}
              disabled={viewOnly}
              aria-describedby={viewOnlyNoticeId}
            >
              Lưu điểm danh
            </Button>
          )}
        </div>
      </div>
      )}
      {readOnly && (
        <p id="attendance-read-only-reason" className={s.notice}>
          <span className={s.noticeIcon} aria-hidden="true">
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z" />
            </svg>
          </span>
          <span>
            Chỉ điểm danh được từ ngày học ({formatDayMonth(session.date)}) trở
            đi. Bây giờ bạn chỉ xem hoặc huỷ buổi.
          </span>
        </p>
      )}
      {!readOnly && !canEdit && (
        <p id="attendance-permission-reason" className={s.notice}>
          Bạn chỉ có quyền xem điểm danh của buổi học này.
        </p>
      )}
      {!viewOnly && (
        <p className={s.hint}>Vuốt phải: vắng · Vuốt trái: muộn</p>
      )}
      {desktop && errorBanner}

      <div className={s.layout}>
        <div className={s.rosterWrap}>
          {desktop && (
            <div className={s.cardHead}>
              <p className={s.cardTitle}>
                {sessionPrefix(session)}
                {session.time ? ` · ${session.time}` : ""}
              </p>
              <p className={s.cardSummary}>
                <b>{counts[0]}</b> có mặt · <b>{counts[1]}</b> muộn ·{" "}
                <b>{counts[2]}</b> vắng
              </p>
            </div>
          )}
          <div className={desktop ? s.rosterCard : s.rosterList}>
            {rows.map((row) => {
              const attendance = storedFor(row.student.id);
              const savedStatus = attendance?.status;
              const displayState = viewOnly
                ? savedStatus
                  ? labels[savedStatus]
                  : "–"
                : labels[row.status];
              const statusClass = viewOnly
                ? savedStatus
                  ? s[savedStatus]
                  : s.unmarked
                : s[row.status];
              const active =
                swipe?.studentId === row.student.id ? swipe : null;

              return (
                <div className={s.rowWrap} key={row.student.id}>
                  {!desktop && !viewOnly && (
                    <div className={s.swipeBackground} aria-hidden="true">
                      <span className={s.swipeAbsent}>Vắng</span>
                      <span className={s.swipeLate}>Muộn</span>
                    </div>
                  )}
                  <div
                    className={
                      s.studentRow + (readOnly ? " " + s.studentRowLocked : "")
                    }
                    style={
                      active
                        ? { transform: `translateX(${active.offset}px)` }
                        : undefined
                    }
                    onPointerDown={(event) =>
                      startSwipe(event, row.student.id)
                    }
                    onPointerMove={moveSwipe}
                    onPointerUp={finishSwipe}
                    onPointerCancel={cancelSwipe}
                    onLostPointerCapture={cancelSwipe}
                  >
                    <div className={s.avatar}>
                      {row.student.name
                        .split(/\s+/)
                        .slice(-2)
                        .map((word) => word[0])
                        .join("")}
                    </div>
                    <div className={s.person}>
                      <span className={s.personName}>{row.student.name}</span>
                    </div>
                    <button
                      type="button"
                      aria-label={
                        viewOnly
                          ? `${row.student.name}: ${displayState}`
                          : `${row.student.name}: ${labels[row.status]}. Bấm để đổi`
                      }
                      className={s.statusButton + " " + statusClass}
                      disabled={viewOnly}
                      onClick={() => cycle(row.student.id)}
                    >
                      <span className={s.statusPill}>{displayState}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!viewOnly && (
          <div className={s.sideColumn}>
            <article className={s.attention}>
              <h2 className={s.attentionTitle}>Cần chú ý</h2>
              {warnings.length ? (
                warnings.map((student) => (
                  <p className={s.warning} key={student.id}>
                    {student.name} vắng ít nhất 2 buổi liên tiếp.
                  </p>
                ))
              ) : (
                <EmptyState
                  size="compact"
                  title="Chưa có học sinh vắng 2 buổi liên tiếp"
                />
              )}
            </article>
            {desktop && (
              <p className={s.footnote}>
                Muộn tính là có đi học
              </p>
            )}
          </div>
        )}
      </div>

      {!desktop && (
        <ActionFooter
          className={s.stickyBar}
          hint={!viewOnly && !action.dirty ? "Chưa có thay đổi để lưu" : undefined}
        >
          {errorBanner}
          <Button
            size="lg"
            onClick={save}
            disabled={viewOnly || !action.canSave}
            loading={action.saving}
            done={action.justSaved}
            aria-describedby={viewOnlyNoticeId}
          >
            {readOnly ? "Điểm danh" : "Lưu điểm danh"}
          </Button>
        </ActionFooter>
      )}
    </section>
  );
}
