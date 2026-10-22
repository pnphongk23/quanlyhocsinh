import type { StoreState } from "../../data/types";
import { formatDayMonth, weekdayNames } from "../../shared/format";
import { LinkButton } from "../../shared/ui";
import { Link } from "react-router-dom";
import { sessionPrefix } from "../../data/repositories/sessions";
import { buildTodayAgenda } from "./todayModel";
import s from "./today.module.css";

export function TodayCard({ state, today }: { state: StoreState; today: string }) {
  const agenda = buildTodayAgenda(state, today);
  const sessions = agenda.todaySessions.length ? agenda.todaySessions : agenda.nextSession ? [agenda.nextSession] : [];
  const [year, month, day] = today.split("-").map(Number);
  const weekday = weekdayNames[new Date(year, month - 1, day, 12).getDay()];
  return (
    <aside className={s.card} aria-label="Hôm nay">
      <h2 className={s.heading}>Hôm nay · {weekday} {formatDayMonth(today)}</h2>
      {sessions.map((session) => {
        const klass = state.classes.find((item) => item.id === session.classId);
        if (!klass) return null;
        return (
          <LinkButton key={session.id} className={s.session} variant="surface" to={`/lop/${session.classId}/buoi-hoc/${session.id}`}>
            <strong>{klass.name} · {sessionPrefix(session)}</strong>
            <span>{weekdayNames[new Date(`${session.date}T12:00:00`).getDay()]} {formatDayMonth(session.date)} · {session.time ?? klass.time}</span>
          </LinkButton>
        );
      })}
      {agenda.tasks.length > 0 && <h3 className={s.subheading}>Việc còn dở</h3>}
      <ul className={s.tasks}>
        {agenda.tasks.map((task, index) => (
          <li key={`${task.session.id}:${task.tab}:${index}`}>
            <Link to={`/lop/${task.session.classId}/buoi-hoc/${task.session.id}?tab=${task.tab}`}>{task.label}</Link>
          </li>
        ))}
      </ul>
      {agenda.remaining > 0 && <p className={s.remaining}>và {agenda.remaining} việc khác</p>}
      {!sessions.length && <p className={s.empty}>Chưa có buổi học sắp tới.</p>}
    </aside>
  );
}
