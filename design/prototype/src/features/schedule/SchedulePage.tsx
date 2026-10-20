import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  groupEntriesByDate,
  listScheduleEntries,
  monthGrid,
  type ScheduleEntry,
} from "../../data/sessionGroups";
import { listClasses } from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import { sessionNumber,
  sessionPrefix } from "../../data/repositories/sessions";
import {
  formatDayMonth,
  formatWeekdayDate,
  todayISO,
  weekdayNames,
} from "../../shared/format";
import { Icon, NoAccess, PageHeader, Segmented } from "../../shared/ui";
import type { PillTone } from "../../shared/ui";
import { useOnline } from "../../shared/hooks/useOnline";
import {
  scheduleState,
  trimMonthWeeks,
  upcomingEntries,
} from "./scheduleModel";
import s from "./schedule.module.css";

type View = "day" | "month";
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
type CalendarEntry = ScheduleEntry;
type Lead = (entry: CalendarEntry) => string;

const toneClass: Record<PillTone, string> = {
  neutral: s.toneNeutral,
  success: s.toneSuccess,
  warning: s.toneWarning,
  error: s.toneError,
  primary: s.tonePrimary,
};

function isoFromDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
function dateAt(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
function addDays(iso: string, amount: number): string {
  const date = dateAt(iso);
  date.setDate(date.getDate() + amount);
  return isoFromDate(date);
}
function shortWeekday(iso: string): string {
  return weekdayNames[dateAt(iso).getDay()];
}
function fullDateLabel(iso: string): string {
  const date = dateAt(iso);
  return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
}
const timeLead: Lead = (entry) => entry.session.time ?? "--:--";

function getEntries(): CalendarEntry[] {
  return listScheduleEntries("0001-01-01", "9999-12-31").map((entry) => ({
    ...entry,
    sessionNumber: sessionNumber(entry.session),
  }));
}

function sessionMeta(entry: CalendarEntry): string {
  const parts = [sessionPrefix(entry.session)];
  if (entry.session.origin === "manual") {
    const note = entry.session.note?.trim();
    parts.push(note || "Buổi lẻ");
  }
  return parts.join(" · ");
}

function SessionCard({
  entry,
  today,
  lead,
}: {
  entry: CalendarEntry;
  today: string;
  lead: string;
}) {
  const state = scheduleState(entry.session, today);
  return (
    <Link
      className={s.card}
      to={`/lop/${entry.classId}/buoi-hoc/${entry.session.id}`}
    >
      <span className={s.cardLead}>{lead}</span>
      <span className={s.cardBody}>
        <span className={s.cardTitle} title={entry.className}>
          {entry.className}
        </span>
        <span className={s.cardMeta}>{sessionMeta(entry)}</span>
      </span>
      {state.action === "checkin" ? (
        <span className={s.cardAction}>{state.label}</span>
      ) : (
        <span className={`${s.cardStatus} ${toneClass[state.tone]}`}>
          {state.label}
        </span>
      )}
    </Link>
  );
}

function SessionList({
  items,
  today,
  lead,
}: {
  items: CalendarEntry[];
  today: string;
  lead: Lead;
}) {
  return (
    <div className={s.cards}>
      {items.map((entry) => (
        <SessionCard
          key={entry.session.id}
          entry={entry}
          today={today}
          lead={lead(entry)}
        />
      ))}
    </div>
  );
}

function DayEmpty({ date }: { date: string }) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon} aria-hidden="true">
        <Icon name="calendar" size={32} />
      </span>
      <div className={s.emptyText}>
        <h2 className={s.emptyTitle}>Không có buổi học</h2>
        <p className={s.emptyBody}>
          Ngày {formatDayMonth(date)} chưa có buổi học nào. Chọn ngày khác để
          xem lịch.
        </p>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const today = todayISO();
  const online = useOnline();
  const access = useAccess();
  const [view, setView] = useState<View>("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState("all");
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<CalendarEntry[] | null>(() => {
    try {
      return getEntries();
    } catch {
      return null;
    }
  });
  const classes = listClasses().filter((klass) => klass.status === "active");
  const filtered = useMemo(
    () =>
      (entries ?? []).filter(
        (entry) => selectedClass === "all" || entry.classId === selectedClass,
      ),
    [entries, selectedClass],
  );
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const group of groupEntriesByDate(filtered)) {
      map.set(group.date, group.entries as CalendarEntry[]);
    }
    return map;
  }, [filtered]);
  const dateEntries = entriesByDate.get(selectedDate) ?? [];
  const missedEntries = useMemo(
    () =>
      filtered.filter(
        (entry) =>
          entry.session.status === "planned" && entry.session.date < today,
      ),
    [filtered, today],
  );
  const upcoming = useMemo(
    () => upcomingEntries(filtered, selectedDate > today ? selectedDate : today),
    [filtered, selectedDate, today],
  );
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = dateAt(today);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });
  const weeks = useMemo(
    () => trimMonthWeeks(monthGrid(visibleMonth.year, visibleMonth.month)),
    [visibleMonth],
  );

  if (!access.can("sessions_attendance", "read"))
    return <NoAccess what="lịch học" />;

  const monthTitle = `Tháng ${visibleMonth.month}, ${visibleMonth.year}`;
  const currentMonth = dateAt(today);

  const changeView = (next: string) => {
    setView(next as View);
    if (next === "month") {
      const date = dateAt(selectedDate);
      setVisibleMonth({ year: date.getFullYear(), month: date.getMonth() + 1 });
    }
  };
  const changeDay = (offset: number) =>
    setSelectedDate((date) => addDays(date, offset));
  const changeMonth = (offset: number) => {
    const currentDay = dateAt(selectedDate).getDate();
    const next = new Date(visibleMonth.year, visibleMonth.month - 1 + offset, 1, 12);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12).getDate();
    next.setDate(Math.min(currentDay, lastDay));
    setSelectedDate(isoFromDate(next));
    setVisibleMonth({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };
  const goToday = () => {
    setSelectedDate(today);
    setVisibleMonth({
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth() + 1,
    });
  };
  const retry = () => {
    try {
      setEntries(getEntries());
      setError("");
    } catch {
      setError("Không tải được lịch đã lưu. Hãy thử tải lại trang.");
    }
  };

  const dayBar = (
    <section className={s.dayBar} aria-label="Chọn ngày">
      <button
        type="button"
        className={s.navButton}
        aria-label="Hôm trước"
        onClick={() => changeDay(-1)}
      >
        <Icon name="back" />
      </button>
      <div className={s.dayBarCenter}>
        <span className={s.dayLabel}>{formatWeekdayDate(selectedDate)}</span>
        {selectedDate === today ? (
          <span className={s.dayHint}>Hôm nay</span>
        ) : (
          <button type="button" className={s.dayJump} onClick={goToday}>
            Về hôm nay
          </button>
        )}
      </div>
      <button
        type="button"
        className={s.navButton}
        aria-label="Hôm sau"
        onClick={() => changeDay(1)}
      >
        <Icon name="chevron-right" />
      </button>
    </section>
  );

  return (
    <div className={s.page}>
      <PageHeader title="Lịch" />

      <div className={s.viewSwitch}>
        <Segmented
          label="Chọn cách xem lịch"
          value={view}
          onChange={changeView}
          options={[
            { value: "day", label: "Ngày" },
            { value: "month", label: "Tháng" },
          ]}
        />
      </div>

      <section className={s.filters} aria-label="Lọc theo lớp">
        <div className={s.filterScroller}>
          <button
            type="button"
            className={`${s.filterChip} ${selectedClass === "all" ? s.filterSelected : ""}`}
            aria-pressed={selectedClass === "all"}
            onClick={() => setSelectedClass("all")}
          >
            Tất cả lớp
          </button>
          {classes.map((klass) => (
            <button
              type="button"
              key={klass.id}
              className={`${s.filterChip} ${selectedClass === klass.id ? s.filterSelected : ""}`}
              aria-pressed={selectedClass === klass.id}
              title={klass.name}
              onClick={() => setSelectedClass(klass.id)}
            >
              {klass.name}
            </button>
          ))}
        </div>
      </section>

      {!online && (
        <p className={s.offline} role="status">
          Đang ngoại tuyến · Lịch đang hiển thị dữ liệu đã lưu trên thiết bị.
        </p>
      )}

      {entries === null ? (
        <div className={s.errorBanner} role="alert">
          <span className={s.errorText}>
            {error || "Không tải được lịch đã lưu."}
          </span>
          <button type="button" className={s.retryButton} onClick={retry}>
            Thử lại
          </button>
        </div>
      ) : view === "day" ? (
        <>
          {dayBar}
          {dateEntries.length ? (
            <SessionList items={dateEntries} today={today} lead={timeLead} />
          ) : (
            <DayEmpty date={selectedDate} />
          )}
          {missedEntries.length > 0 && (
            <section className={s.group} aria-label="Buổi chưa điểm danh">
              <h2 className={s.groupLabel}>Chưa điểm danh</h2>
              <SessionList
                items={missedEntries}
                today={today}
                lead={(entry) => formatDayMonth(entry.session.date)}
              />
            </section>
          )}
          {upcoming.length > 0 && (
            <section className={s.group} aria-label="Buổi sắp tới">
              <h2 className={s.groupLabel}>Sắp tới</h2>
              <SessionList
                items={upcoming}
                today={today}
                lead={(entry) => shortWeekday(entry.session.date)}
              />
            </section>
          )}
        </>
      ) : (
        <>
          <section className={s.monthCard} aria-label={`Lịch ${monthTitle}`}>
            <div className={s.monthHead}>
              <button
                type="button"
                className={s.navButton}
                aria-label="Tháng trước"
                onClick={() => changeMonth(-1)}
              >
                <Icon name="back" />
              </button>
              <h2 className={s.monthTitle}>{monthTitle}</h2>
              <button
                type="button"
                className={s.navButton}
                aria-label="Tháng sau"
                onClick={() => changeMonth(1)}
              >
                <Icon name="chevron-right" />
              </button>
            </div>
            {visibleMonth.month !== currentMonth.getMonth() + 1 ||
            visibleMonth.year !== currentMonth.getFullYear() ? (
              <button type="button" className={s.monthJump} onClick={goToday}>
                Về tháng này
              </button>
            ) : null}
            <div className={s.monthGrid} role="group" aria-label={monthTitle}>
              {WEEKDAYS.map((day) => (
                <span key={day} className={s.monthWeekday}>
                  {day}
                </span>
              ))}
              {weeks.flat().map(({ date, inMonth }) => {
                if (!inMonth)
                  return (
                    <span
                      key={date}
                      className={s.monthEmpty}
                      aria-hidden="true"
                    />
                  );
                const dayEntries = entriesByDate.get(date) ?? [];
                const isToday = date === today;
                const isSelected = date === selectedDate;
                return (
                  <button
                    type="button"
                    key={date}
                    className={[
                      s.monthDay,
                      isSelected ? s.monthDaySelected : "",
                      isToday && !isSelected ? s.monthDayToday : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={isSelected}
                    aria-label={`${fullDateLabel(date)}, ${
                      dayEntries.length
                        ? `${dayEntries.length} buổi học`
                        : "không có buổi học"
                    }`}
                    onClick={() => setSelectedDate(date)}
                  >
                    {dateAt(date).getDate()}
                    {dayEntries.length ? (
                      <span className={s.dot} aria-hidden="true" />
                    ) : (
                      <span className={s.dotEmpty} aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
          <p className={s.groupLabel}>{formatWeekdayDate(selectedDate)}</p>
          {dateEntries.length ? (
            <SessionList items={dateEntries} today={today} lead={timeLead} />
          ) : (
            <DayEmpty date={selectedDate} />
          )}
        </>
      )}

      <span className={s.srOnly} role="status">
        {selectedDate === today
          ? "Đang chọn hôm nay"
          : `Đang chọn ${formatWeekdayDate(selectedDate)}`}
      </span>
    </div>
  );
}
