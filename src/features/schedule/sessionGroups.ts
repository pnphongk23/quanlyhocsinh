import type { Session, StoreState } from "../../data/types";
import { getStore } from "../../data/store";

export function splitSessions(
  sessions: Session[],
  today: string,
): { current: Session[]; upcoming: Session[]; past: Session[] } {
  const current = sessions.filter((session) => session.date === today);
  if (!current.length) {
    const next = sessions
      .filter((session) => session.status === "planned" && session.date > today)
        .sort((a, b) => `${a.date} ${a.time ?? "00:00"}`.localeCompare(`${b.date} ${b.time ?? "00:00"}`))[0];
    if (next) current.push(next);
  }
  const currentIds = new Set(current.map((session) => session.id));
  const upcoming = sessions
    .filter((session) => session.status === "planned" && session.date > today && !currentIds.has(session.id))
    .sort((a, b) => `${a.date} ${a.time ?? "00:00"}`.localeCompare(`${b.date} ${b.time ?? "00:00"}`));
  const past = sessions
    .filter((session) => session.date < today && (session.status === "held" || session.status === "cancelled" || session.status === "planned"))
    .sort((a, b) => `${b.date} ${b.time ?? "00:00"}`.localeCompare(`${a.date} ${a.time ?? "00:00"}`));
  return { current: current.sort((a, b) => `${a.date} ${a.time ?? "00:00"}`.localeCompare(`${b.date} ${b.time ?? "00:00"}`)), upcoming, past };
}

export type ScheduleEntry = { session: Session; classId: string; className: string };
export function listScheduleEntries(from: string, to: string, _today?: string): ScheduleEntry[] {
  const state = getStore() as StoreState;
  const active = new Map(state.classes.filter((item) => item.status === "active").map((item) => [item.id, item.name]));
  return state.sessions
    .filter((session) => active.has(session.classId) && session.date >= from && session.date <= to)
    .map((session) => ({ session, classId: session.classId, className: active.get(session.classId)! }))
      .sort((a, b) => `${a.session.date} ${a.session.time ?? "00:00"}`.localeCompare(`${b.session.date} ${b.session.time ?? "00:00"}`));
}
export function groupEntriesByDate(entries: ScheduleEntry[]): { date: string; entries: ScheduleEntry[] }[] {
  const groups: { date: string; entries: ScheduleEntry[] }[] = [];
  for (const entry of entries) {
    const date = entry.session.date;
    const last = groups[groups.length - 1];
    if (last?.date === date) last.entries.push(entry);
    else groups.push({ date, entries: [entry] });
  }
  return groups;
}

function dateString(year: number, month0: number, day: number): string {
  const date = new Date(year, month0, day, 12);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
export function monthGrid(year: number, month1to12: number): { date: string; inMonth: boolean }[][] {
  if (!Number.isInteger(year) || !Number.isInteger(month1to12) || month1to12 < 1 || month1to12 > 12)
    throw new Error("Tháng hoặc năm không hợp lệ.");
  const first = new Date(year, month1to12 - 1, 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month1to12 - 1, 1 - mondayOffset, 12);
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + weekday, 12);
      return { date: dateString(date.getFullYear(), date.getMonth(), date.getDate()), inMonth: date.getMonth() === month1to12 - 1 };
    }),
  );
}
