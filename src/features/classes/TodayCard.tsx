import { Link } from "react-router-dom";
import { formatDayMonth, formatWeekdayDate, weekdayNames } from "../../shared/format";
import { Pill } from "../../shared/ui";
import type { TodayAgenda, TodayEntry } from "./todayModel";
import s from "./today.module.css";

const sessionHref = (entry: TodayEntry, tab?: string) =>
  `/lop/${entry.classId}/buoi-hoc/${entry.session.id}` + (tab ? `?tab=${tab}` : "");

function Entry({ entry, showDate }: { entry: TodayEntry; showDate?: boolean }) {
  return (
    <li className={s.entry}>
      <Link to={sessionHref(entry)} className={s.entryHead}>
        <span className={s.time}>{entry.time}</span>
        <span className={s.entryText}>
          <span className={s.entryClass}>{entry.className}</span>
          <span className={s.entrySub}>
            {showDate && `${formatDayMonth(entry.session.date)} · `}
            {entry.prefix}
          </span>
        </span>
        <Pill tone={entry.statusTone}>{entry.statusLabel}</Pill>
      </Link>
      {entry.tasks.length > 0 && (
        <ul className={s.tasks}>
          {entry.tasks.map((task) => (
            <li key={task.kind}>
              <Link to={sessionHref(entry, task.tab)} className={s.task}>
                {task.label}
                <span aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function TodayCard({ agenda }: { agenda: TodayAgenda }) {
  const weekday = weekdayNames[new Date(agenda.date + "T12:00:00").getDay()];
  const hasTasks = agenda.entries.some((entry) => entry.tasks.length > 0);
  return (
    <aside className={s.card} aria-label="Hôm nay">
      <h2 className={s.title}>
        Hôm nay · {weekday} {formatDayMonth(agenda.date)}
      </h2>
      {agenda.entries.length > 0 ? (
        <>
          <ul className={s.list}>
            {agenda.entries.map((entry) => (
              <Entry key={entry.session.id} entry={entry} />
            ))}
          </ul>
          {!hasTasks && <p className={s.note}>Không có việc cần làm</p>}
        </>
      ) : (
        <>
          <p className={s.note}>Hôm nay không có buổi học.</p>
          {agenda.next ? (
            <>
              <p className={s.nextLabel}>
                Buổi kế tiếp · {formatWeekdayDate(agenda.next.session.date)}
              </p>
              <ul className={s.list}>
                <Entry entry={agenda.next} showDate />
              </ul>
            </>
          ) : (
            <p className={s.note}>Chưa có buổi nào sắp tới.</p>
          )}
        </>
      )}
      {agenda.backlog.length > 0 && (
        <section className={s.backlog} aria-label="Việc còn dở">
          <h3 className={s.backlogTitle}>Việc còn dở</h3>
          <ul className={s.tasks}>
            {agenda.backlog.map((item) => (
              <li key={item.session.id + item.task.kind}>
                <Link
                  to={`/lop/${item.classId}/buoi-hoc/${item.session.id}?tab=${item.task.tab}`}
                  className={s.task + " " + s.backlogTask}
                >
                  <span className={s.backlogText}>
                    <span>{item.task.label}</span>
                    <span className={s.backlogSub}>
                      {item.className} · {item.prefix} · {formatDayMonth(item.session.date)}
                    </span>
                  </span>
                  <span aria-hidden>›</span>
                </Link>
              </li>
            ))}
          </ul>
          {agenda.backlogMore > 0 && (
            <p className={s.note}>và {agenda.backlogMore} việc khác</p>
          )}
        </section>
      )}
    </aside>
  );
}
