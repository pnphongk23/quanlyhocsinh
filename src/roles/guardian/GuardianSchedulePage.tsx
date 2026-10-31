import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Session } from "../../data/types";
import { api } from "../../data/sync";
import { compareSessions } from "../../data/homework";
import { EmptyState, PageHeader, Segmented, Spinner } from "../../shared/ui";
import { motionClass } from "../../shared/motion";
import { todayISO } from "../../shared/date";
import { monthGrid } from "../../features/schedule/sessionGroups";
import { useAccess } from "../../data/repositories/access";
import { useGuardianContext } from "./guardianContext";
import { childScheduleSessions, childSessionFeed } from "./guardianRead";
import { seenSessionIds } from "./guardianSeen";
import { attendanceText, attendanceTone } from "./guardianFormat";
import { GuardianPill, StarRow } from "./guardianUi";
import GuardianIcon from "./GuardianIcon";
import GuardianNoChild from "./guardianEmpty";
import {
  addDays,
  addMonths,
  isWithinRange,
  monthRange,
  monthTitle,
  scheduleStatus,
  sessionFromApi,
  snapshotRange,
  weekdayDateLabel,
} from "./guardianSchedule";
import g from "./guardian.module.css";

type ViewMode = "day" | "month";
type RemoteState = "idle" | "loading" | "ready" | "offline" | "error";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function GuardianSchedulePage() {
  const { child, error } = useGuardianContext();
  const access = useAccess();
  const today = todayISO();
  const [mode, setMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(today);
  const [remoteSessions, setRemoteSessions] = useState<Session[]>([]);
  const [remoteState, setRemoteState] = useState<RemoteState>("idle");
  const [retry, setRetry] = useState(0);
  const studentId = child?.student.id ?? "";
  const classId = child?.student.classId ?? "";
  const canAttendance = access.can("sessions_attendance", "read");
  const dateRange = useMemo(
    () => mode === "day" ? { from: selectedDate, to: selectedDate } : monthRange(selectedDate.slice(0, 7)),
    [mode, selectedDate],
  );
  const bounds = useMemo(() => snapshotRange(today), [today]);
  const inSnapshot = isWithinRange(dateRange, bounds);

  useEffect(() => {
    if (!studentId || inSnapshot) {
      setRemoteSessions([]);
      setRemoteState("idle");
      return;
    }
    if (navigator.onLine === false) {
      setRemoteSessions([]);
      setRemoteState("offline");
      return;
    }
    const controller = new AbortController();
    setRemoteSessions([]);
    setRemoteState("loading");
    void api.request("GET /calendar", {
      query: { from: dateRange.from, to: dateRange.to },
      signal: controller.signal,
    }).then(({ items }) => {
      if (controller.signal.aborted) return;
      setRemoteSessions(items.filter((item) => item.class_id === classId).map(sessionFromApi));
      setRemoteState("ready");
    }).catch(() => {
      if (!controller.signal.aborted)
        setRemoteState(navigator.onLine === false ? "offline" : "error");
    });
    return () => controller.abort();
  }, [classId, dateRange.from, dateRange.to, inSnapshot, retry, studentId]);

  useEffect(() => {
    const goOnline = () => setRetry((value) => value + 1);
    const goOffline = () => {
      if (!inSnapshot) {
        setRemoteSessions([]);
        setRemoteState("offline");
      }
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [inSnapshot]);

  if (error) return <p className={g.error} role="alert">{error}</p>;
  if (!child) return <GuardianNoChild />;

  const sessions = childScheduleSessions(studentId);
  const inRange = sessions.filter((session) => session.date >= dateRange.from && session.date <= dateRange.to);
  const visibleSessions = [...new Map([...inRange, ...remoteSessions].map((session) => [session.id, session])).values()]
    .filter((session) => session.classId === classId && session.date >= child.student.enrolledAt && (!child.student.leftAt || session.date <= child.student.leftAt))
    .sort(compareSessions);
  const selectedSessions = visibleSessions.filter((session) => session.date === selectedDate);
  const feed = new Map(childSessionFeed(studentId).map((item) => [item.session.id, item]));
  const seen = seenSessionIds(studentId);
  const daysWithSessions = new Set(visibleSessions.map((session) => session.date));
  const outsideSnapshot = !inSnapshot;
  const remoteUnavailable = outsideSnapshot && (remoteState === "offline" || remoteState === "error");
  const remoteLoading = outsideSnapshot && remoteState === "loading";

  const previousDate = () => setSelectedDate((date) => addDays(date, -1));
  const nextDate = () => setSelectedDate((date) => addDays(date, 1));
  const shiftMonth = (amount: number) => setSelectedDate((date) => addMonths(date, amount));

  return (
    <div className={g.page}>
      <PageHeader backTo="/ph" eyebrow={child.student.name} title="Lịch học của con" />
      <div className={g.schedulePage}>
        <Segmented
          label="Cách xem lịch"
          options={[{ value: "day", label: "Ngày" }, { value: "month", label: "Tháng" }]}
          value={mode}
          onChange={(value) => setMode(value as ViewMode)}
        />

        {mode === "month" ? (
          <section className={g.scheduleCalendar} aria-label={monthTitle(selectedDate.slice(0, 7))}>
            <div className={g.scheduleMonthHead}>
              <button type="button" aria-label="Tháng trước" onClick={() => shiftMonth(-1)}>
                <GuardianIcon name="chevron-left" size={18} />
              </button>
              <h2>{monthTitle(selectedDate.slice(0, 7))}</h2>
              <button type="button" aria-label="Tháng sau" onClick={() => shiftMonth(1)}>
                <GuardianIcon name="chevron-right" size={18} />
              </button>
            </div>
            <div className={g.calendarGrid}>
              {WEEKDAYS.map((day) => <span key={day} className={g.calendarWeekday}>{day}</span>)}
              {monthGrid(Number(selectedDate.slice(0, 4)), Number(selectedDate.slice(5, 7)))
                .filter((week) => week.some((day) => day.inMonth))
                .flatMap((week) => week.map((day) =>
                day.inMonth ? (
                  <button
                    key={day.date}
                    type="button"
                    aria-label={weekdayDateLabel(day.date)}
                    aria-pressed={day.date === selectedDate}
                    className={`${g.calendarDay}${day.date === selectedDate ? ` ${g.calendarDaySelected}` : ""}`}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <span>{Number(day.date.slice(8, 10))}</span>
                    {daysWithSessions.has(day.date) && <span className={g.calendarDot} aria-label="Có buổi học" />}
                  </button>
                ) : <span key={day.date} className={g.calendarDayBlank} aria-hidden="true" />
                ))}
            </div>
          </section>
        ) : (
          <section className={g.scheduleDaySwitch} aria-label="Chọn ngày">
            <button type="button" aria-label="Ngày trước" onClick={previousDate}>
              <GuardianIcon name="chevron-left" size={18} />
            </button>
            <strong>{weekdayDateLabel(selectedDate)}</strong>
            <button type="button" aria-label="Ngày sau" onClick={nextDate}>
              <GuardianIcon name="chevron-right" size={18} />
            </button>
            {selectedDate !== today && <button type="button" className={g.scheduleToday} onClick={() => setSelectedDate(today)}>Hôm nay</button>}
          </section>
        )}

        <section className={g.scheduleList}>
          <h2>{weekdayDateLabel(selectedDate)}</h2>
          {remoteUnavailable ? (
            <div className={g.scheduleNetwork} role="alert">
              <p>{remoteState === "offline" ? "Cần kết nối mạng để xem tháng này" : "Không tải được lịch học. Vui lòng thử lại."}</p>
              {remoteState === "error" && <button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button>}
            </div>
          ) : remoteLoading ? (
            <div className={g.scheduleLoading} aria-label="Đang tải lịch"><Spinner /></div>
          ) : selectedSessions.length === 0 ? (
            <EmptyState size="compact" title="Không có buổi học" />
          ) : (
            <ul className={g.rowList}>
              {selectedSessions.map((session) => {
                const item = feed.get(session.id);
                const isNew = item?.stars !== null && item?.stars !== undefined && !seen.has(session.id);
                return (
                  <li key={session.id}>
                    <Link to={`/ph/buoi/${session.id}`} className={`${g.sessionRow} ${motionClass.pressable}`}>
                      <span className={g.rowMain}>
                        <span className={g.rowTitle}>{session.time ?? ""}</span>
                        <span className={g.sessionMeta}>
                          <GuardianPill tone="neutral">{scheduleStatus(session)}</GuardianPill>
                          {item?.attendance ? <GuardianPill tone={attendanceTone(item.attendance)}>{attendanceText[item.attendance]}</GuardianPill> : null}
                          {canAttendance && item && !item.attendance && session.status === "held" && <span className={g.hint}>Chưa điểm danh</span>}
                          {item?.stars !== null && item?.stars !== undefined && <StarRow level={item.stars} size={16} />}
                          {isNew && <GuardianPill tone="primary">Mới</GuardianPill>}
                        </span>
                      </span>
                      <GuardianIcon name="chevron-right" size={18} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
