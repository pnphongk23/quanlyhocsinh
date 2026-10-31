import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCurrentClassId,
  listClasses,
} from "../../data/repositories/classes";
import {
  classAttendanceRate,
  listStudents,
} from "../../data/repositories/students";
import { useAccess, visibleClassIds } from "../../data/repositories/access";
import { getSession } from "../../data/auth/session";
import { getStore, useStore } from "../../data/store";
import { refreshNow } from "../../data/sync";
import { greetingFor, initialsOf } from "../../shared/personName";
import type { Class } from "../../data/types";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { usePullToRefresh } from "../../shared/hooks/usePullToRefresh";
import { formatDayMonth, todayISO, weekdayNames } from "../../shared/format";
import {
  Chip,
  EmptyState,
  Fab,
  Icon,
  LinkButton,
  NoAccess,
  PageHeader,
} from "../../shared/ui";
import { PullToRefresh, RefreshButton } from "../../shared/ui/PullToRefresh";
import { TodayCard } from "./TodayCard";
import { buildTodayAgenda, nextSessionOf } from "./todayModel";
import { normalizeWeekdays } from "../../shared/weekdays";
import s from "./classes.module.css";

const WEEKDAY_LABEL: Record<number, string> = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 7: "CN" };
const scheduleText = (item: Class) =>
  [
    normalizeWeekdays(item.weekdays)
      .map((day) => WEEKDAY_LABEL[day])
      .join(" · "),
    item.time,
  ]
    .filter(Boolean)
    .join(" · ");

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
function ClassCard({
  item,
  selected,
  desktop,
}: {
  item: Class;
  selected: boolean;
  desktop: boolean;
}) {
  const students = listStudents(item.id, false);
  const rate = classAttendanceRate(item.id);
  const today = todayISO();
  const next = nextSessionOf(getStore(), item.id, today);
  const accentSelected = desktop && selected;

  return (
    <Link to={`/lop/${item.id}/buoi-hoc`} className={s.classLink}>
      <div
        className={s.classCard + (accentSelected ? " " + s.classCardSelected : "")}
      >
        <h2 className={s.cardTitle}>{item.name}</h2>
        <p className={s.cardSchedule}>{scheduleText(item)}</p>
        {next && (
          <p className={s.cardNext}>
            Buổi tới: {weekdayNames[new Date(next.date + "T12:00:00").getDay()]}{" "}
            {formatDayMonth(next.date)} · {next.time ?? item.time}
          </p>
        )}
        <div className={s.chips}>
          <Chip className={accentSelected ? s.selectedChip : ""}>
            <b>{students.length}</b> học sinh
          </Chip>
          <Chip className={accentSelected ? s.selectedChip : ""}>
            Chuyên cần <b>{rate === null ? "—" : `${Math.round(rate)}%`}</b>
          </Chip>
        </div>
      </div>
    </Link>
  );
}

export default function ClassListPage() {
  useStore();
  const refresh = usePullToRefresh(refreshNow);
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const access = useAccess();
  const [query, setQuery] = useState("");
  const userName = getSession()?.user.display_name ?? "";
  const initials = initialsOf(userName);
  if (!access.can("classes", "read")) return <NoAccess what="lớp học" />;
  const canWrite = access.can("classes", "write");
  const classes = listClasses();
  const currentId = getCurrentClassId();
  const today = todayISO();
  const agenda = buildTodayAgenda(getStore(), today, visibleClassIds());
  const activeCount = classes.filter((item) => item.status === "active").length;
  const keyword = normalize(query.trim());
  const visible = keyword
    ? classes.filter(
        (item) =>
          normalize(item.name).includes(keyword) ||
          listStudents(item.id).some((student) =>
            normalize(student.name).includes(keyword),
          ),
      )
    : classes;

  return (
    <section ref={refresh.containerRef} className={s.page}>
      <PullToRefresh controller={refresh} />
      <PageHeader
        eyebrow={
          desktop ? `Học kỳ này · ${activeCount} lớp đang mở` : greetingFor(userName)
        }
        title={desktop ? "Tất cả lớp" : "Lớp của tôi"}
        actions={
          desktop ? <RefreshButton controller={refresh} /> : (
            <Link to="/cai-dat" className={s.avatar} aria-label="Cài đặt">
              {initials || <Icon name="settings" size={22} />}
            </Link>
          )
        }
      />
      <div className={s.layout}>
        {classes.length > 0 && (
          <div className={s.side}>
            <TodayCard agenda={agenda} />
          </div>
        )}
        <div className={s.main}>
          {desktop && (
            <div className={s.toolbar}>
              <input
                className={s.search}
                type="search"
                aria-label="Tìm lớp"
                placeholder="Tìm lớp hoặc học sinh"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {canWrite && (
                <LinkButton size="md" to="/lop/moi">
                  + Tạo lớp mới
                </LinkButton>
              )}
            </div>
          )}
          {classes.length === 0 ? (
            <EmptyState title="Chưa có lớp học" mascot="cho">
              {canWrite && (
                <LinkButton to="/lop/moi">Tạo lớp đầu tiên</LinkButton>
              )}
            </EmptyState>
          ) : visible.length === 0 ? (
            <EmptyState
              title="Không tìm thấy lớp"
              description="Thử tìm bằng tên lớp hoặc tên học sinh khác."
            />
          ) : (
            <div className={s.grid}>
              {visible.map((item) => (
                <ClassCard
                  key={item.id}
                  item={item}
                  selected={item.id === currentId}
                  desktop={desktop}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {!desktop && canWrite && (
        <Fab label="Tạo lớp mới" onClick={() => navigate("/lop/moi")} />
      )}
    </section>
  );
}
