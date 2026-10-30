import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDayMonth, formatWeekdayDate, weekdayNames } from "../../shared/format";
import { EmptyState, Pill } from "../../shared/ui";
import { BACKLOG_GROUP_VISIBLE, groupBacklog } from "./todayModel";
import type { BacklogGroup, TodayAgenda, TodayEntry } from "./todayModel";
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

function BacklogGroupView({ group }: { group: BacklogGroup }) {
  const [open, setOpen] = useState(false);
  const hidden = group.items.length - BACKLOG_GROUP_VISIBLE;
  const shown = open ? group.items : group.items.slice(0, BACKLOG_GROUP_VISIBLE);
  return (
    <section className={s.group} aria-label={group.label}>
      <div className={s.groupHead}>
        <h4 className={s.groupTitle}>
          {group.label} ({group.items.length})
        </h4>
        {hidden > 0 && (
          <button type="button" className={s.groupToggle} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Thu gọn" : `Xem thêm (${hidden})`}
          </button>
        )}
      </div>
      <ul className={s.tasks}>
        {shown.map((item) => (
          <li key={item.session.id + item.task.kind}>
            <Link
              to={`/lop/${item.classId}/buoi-hoc/${item.session.id}?tab=${item.task.tab}`}
              className={s.task + " " + s.backlogTask}
            >
              <span className={s.backlogText}>
                {item.className} · {formatDayMonth(item.session.date)}
              </span>
              {item.task.students !== undefined && <span className={s.backlogCount}>{item.task.students} em</span>}
              <span aria-hidden>›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
          {!hasTasks && (
            <EmptyState size="compact" title="Không có việc cần làm" />
          )}
        </>
      ) : (
        <>
          <EmptyState
            size="compact"
            title="Hôm nay không có buổi học"
            description={agenda.next ? undefined : "Chưa có buổi nào sắp tới."}
          />
          {agenda.next && (
            <>
              <p className={s.nextLabel}>
                Buổi kế tiếp · {formatWeekdayDate(agenda.next.session.date)}
              </p>
              <ul className={s.list}>
                <Entry entry={agenda.next} showDate />
              </ul>
            </>
          )}
        </>
      )}
      {agenda.backlog.length > 0 && (
        <section className={s.backlog} aria-label="Việc còn dở">
          <h3 className={s.backlogTitle}>Việc còn dở</h3>
          {groupBacklog(agenda.backlog).map((group) => (
            <BacklogGroupView key={group.kind} group={group} />
          ))}
        </section>
      )}
    </aside>
  );
}
