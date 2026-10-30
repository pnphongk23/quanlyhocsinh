import type { PillTone } from "../../shared/ui";
import type { Session, StoreState } from "../../data/types";
import { sessionDateLabel } from "../../data/sessionLabel";
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
  /** Số em còn việc (phiếu chưa gửi, BTVN chưa chấm); điểm danh thì không có. */
  students?: number;
}

export interface TodayEntry {
  session: Session;
  classId: string;
  className: string;
  time: string;
  /** Ngày buổi học, ví dụ "T3 · 21/10". */
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
/** Số dòng mỗi nhóm "Việc còn dở" hiện khi thu gọn. */
export const BACKLOG_GROUP_VISIBLE = 2;

const BACKLOG_GROUP_LABELS: Record<TodayTaskKind, string> = {
  attendance: "Điểm danh chưa xong",
  tickets: "Phiếu chưa gửi",
  homework: "BTVN chưa chấm",
};

export interface BacklogGroup {
  kind: TodayTaskKind;
  label: string;
  items: BacklogItem[];
}

/** Gộp việc còn dở theo loại (điểm danh, phiếu, BTVN), giữ thứ tự mới nhất trước trong nhóm. */
export function groupBacklog(items: BacklogItem[]): BacklogGroup[] {
  return (Object.keys(BACKLOG_GROUP_LABELS) as TodayTaskKind[])
    .map((kind) => ({ kind, label: BACKLOG_GROUP_LABELS[kind], items: items.filter((item) => item.task.kind === kind) }))
    .filter((group) => group.items.length > 0);
}

export interface TodayAgenda {
  date: string;
  /** Việc chưa xong của buổi đã diễn ra, mới nhất trước. */
  backlog: BacklogItem[];
  /** Buổi hôm nay chưa huỷ, xếp theo giờ. */
  entries: TodayEntry[];
  /** Buổi kế tiếp, chỉ có khi hôm nay không có buổi nào. */
  next: TodayEntry | null;
}

function numberOf(_state: StoreState, session: Session): string {
  return sessionDateLabel(session.date);
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
      students: unsent,
    });
  // Đếm số em còn phần chưa chấm (ungradedParts là lượt em × phần, dễ hiểu nhầm).
  const ungraded = ungradedHomeworkNotice(state, session.id).students.length;
  if (ungraded > 0)
    tasks.push({
      kind: "homework",
      label: `BTVN chưa chấm (${ungraded} em)`,
      tab: "btvn",
      students: ungraded,
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
  if (entries.length) return { date: today, backlog, entries, next: null };
  const next = sessions
    .filter((session) => session.status === "planned" && session.date > today)
    .sort(compareSessions)[0];
  return {
    date: today,
    backlog,
    entries,
    next: next ? entryFor(state, next, today) : null,
  };
}
