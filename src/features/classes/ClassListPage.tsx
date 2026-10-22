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
import { getStore, useStore } from "../../data/store";
import type { Class } from "../../data/types";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { formatDayMonth, todayISO, weekdayNames } from "../../shared/format";
import {
  Chip,
  EmptyState,
  Fab,
  LinkButton,
  NoAccess,
  PageHeader,
} from "../../shared/ui";
import { TodayCard } from "./TodayCard";
import { buildTodayAgenda, nextSessionOf } from "./todayModel";
import s from "./classes.module.css";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const scheduleText = (item: Class) =>
  [
    WEEKDAY_ORDER.filter((day) => item.weekdays.includes(day))
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

  return (
    <Link to={`/lop/${item.id}/buoi-hoc`} className={s.classLink}>
      <div
        className={
          s.classCard + (desktop && selected ? " " + s.classCardSelected : "")
        }
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
          <Chip>
            <b>{students.length}</b> học sinh
          </Chip>
          <Chip>
            Chuyên cần <b>{rate === null ? "—" : `${Math.round(rate)}%`}</b>
          </Chip>
        </div>
      </div>
    </Link>
  );
}

export default function ClassListPage() {
  useStore();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const access = useAccess();
  const [query, setQuery] = useState("");
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
    <section className={s.page}>
      <PageHeader
        eyebrow={
          desktop ? `Học kỳ này · ${activeCount} lớp đang mở` : "Xin chào, cô Lan"
        }
        title={desktop ? "Tất cả lớp" : "Lớp của tôi"}
        actions={
          desktop ? undefined : (
            <Link to="/cai-dat" className={s.avatar} aria-label="Cài đặt">
              CL
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
            <EmptyState title="Không tìm thấy lớp" />
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
