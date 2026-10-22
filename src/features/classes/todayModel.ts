import type { PillTone } from "../../shared/ui";
import type { Session, StoreState } from "../../data/types";
import {
  buildTicketRows,
  compareSessions,
  ungradedHomeworkNotice,
} from "../../data/homework";
import type { SessionTab } from "../class-space/SessionDetailPage";

/**
 * Khối "Hôm nay" của màn Lớp học (spec 5.1): các buổi hôm nay của mọi lớp
 * đang mở và việc còn dang dở của từng buổi. Hàm thuần, nhận state + ngày.
 */
export type TodayTaskKind = "attendance" | "tickets" | "homework";

export interface TodayTask {
  kind: TodayTaskKind;
  label: string;
  tab: SessionTab;
}

export interface TodayEntry {
  session: Session;
  classId: string;
  className: string;
  time: string;
  /** "Buổi 9" hoặc "Buổi bù" khi buổi không có số. */
  prefix: string;
  statusLabel: string;
  statusTone: PillTone;
  tasks: TodayTask[];
}

/** Một việc chưa xong của buổi đã diễn ra. */
export interface BacklogItem {
  session: Session;
  classId: string;
  className: string;
  prefix: string;
  task: TodayTask;
}

/** Số ngày gần nhất (tính cả hôm nay lùi lại) xét "việc còn dở". */
export const BACKLOG_DAYS = 14;
export const BACKLOG_MAX_LINES = 5;

export interface TodayAgenda {
  date: string;
  /** Việc chưa xong của buổi đã diễn ra, mới nhất trước; đã cắt còn tối đa 5 dòng. */
  backlog: BacklogItem[];
  /** Số việc còn dở bị cắt khỏi `backlog` ("và n việc khác"). */
  backlogMore: number;
  /** Buổi hôm nay chưa huỷ, xếp theo giờ. */
  entries: TodayEntry[];
  /** Buổi kế tiếp, chỉ có khi hôm nay không có buổi nào. */
  next: TodayEntry | null;
}

function numberOf(state: StoreState, session: Session): string {
  const ordered = state.sessions
    .filter((item) => item.classId === session.classId && item.status !== "cancelled")
    .sort(compareSessions);
  const index = ordered.findIndex((item) => item.id === session.id);
  if (index >= 0) return `Buổi ${index + 1}`;
  return session.makeup ? "Buổi bù" : "Buổi học";
}

function tasksFor(state: StoreState, session: Session, today: string): TodayTask[] {
  // Buổi chưa tới chưa có gì để làm.
  if (session.date > today) return [];
  const tasks: TodayTask[] = [];
  if (session.status === "planned")
    tasks.push({ kind: "attendance", label: "Điểm danh chưa xong", tab: "diem-danh" });
  const unsent = buildTicketRows(state, session.id).filter(
    (row) => row.status !== "sent",
  ).length;
  if (unsent > 0)
    tasks.push({
      kind: "tickets",
      label: `Phiếu chưa gửi (${unsent} em)`,
      tab: "nhan-xet",
    });
  // Đếm số em còn phần chưa chấm (ungradedParts là lượt em × phần, dễ hiểu nhầm).
  const ungraded = ungradedHomeworkNotice(state, session.id).students.length;
  if (ungraded > 0)
    tasks.push({
      kind: "homework",
      label: `BTVN chưa chấm (${ungraded} em)`,
      tab: "btvn",
    });
  return tasks;
}

function entryFor(
  state: StoreState,
  session: Session,
  today: string,
): TodayEntry {
  const klass = state.classes.find((item) => item.id === session.classId);
  const held = session.status === "held";
  const upcoming = session.date > today;
  return {
    session,
    classId: session.classId,
    className: klass?.name ?? "",
    time: session.time ?? klass?.time ?? "",
    prefix: numberOf(state, session),
    statusLabel: held ? "Đã điểm danh" : upcoming ? "Chưa tới" : "Chưa điểm danh",
    statusTone: held ? "success" : upcoming ? "neutral" : "warning",
    tasks: tasksFor(state, session, today),
  };
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildBacklog(
  state: StoreState,
  sessions: Session[],
  today: string,
): BacklogItem[] {
  const from = addDays(today, -BACKLOG_DAYS);
  return sessions
    .filter((session) => session.date < today && session.date >= from)
    .sort((a, b) => compareSessions(b, a))
    .flatMap((session) => {
      const entry = entryFor(state, session, today);
      return entry.tasks.map((task) => ({
        session,
        classId: session.classId,
        className: entry.className,
        prefix: entry.prefix,
        task,
      }));
    });
}

/** Buổi chưa huỷ kế tiếp của lớp từ hôm nay trở đi; null nếu chưa có. */
export function nextSessionOf(
  state: StoreState,
  classId: string,
  today: string,
): Session | null {
  return (
    state.sessions
      .filter(
        (session) =>
          session.classId === classId &&
          session.status === "planned" &&
          session.date >= today,
      )
      .sort(compareSessions)[0] ?? null
  );
}

const byTimeThenName = (a: TodayEntry, b: TodayEntry) =>
  a.time.localeCompare(b.time) || a.className.localeCompare(b.className, "vi");

/** `scope` null = thấy mọi lớp; ngược lại chỉ các lớp trong tập. */
export function buildTodayAgenda(
  state: StoreState,
  today: string,
  scope: Set<string> | null = null,
): TodayAgenda {
  const open = new Set(
    state.classes
      .filter((item) => item.status === "active" && (!scope || scope.has(item.id)))
      .map((item) => item.id),
  );
  const sessions = state.sessions.filter(
    (session) => open.has(session.classId) && session.status !== "cancelled",
  );
  const entries = sessions
    .filter((session) => session.date === today)
    .map((session) => entryFor(state, session, today))
    .sort(byTimeThenName);
  const backlog = buildBacklog(state, sessions, today);
  const shown = {
    backlog: backlog.slice(0, BACKLOG_MAX_LINES),
    backlogMore: Math.max(0, backlog.length - BACKLOG_MAX_LINES),
  };
  if (entries.length) return { date: today, ...shown, entries, next: null };
  const next = sessions
    .filter((session) => session.status === "planned" && session.date > today)
    .sort(compareSessions)[0];
  return {
    date: today,
    ...shown,
    entries,
    next: next ? entryFor(state, next, today) : null,
  };
}
