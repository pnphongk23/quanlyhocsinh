import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getClass,
  getCurrentClassId,
  listClasses,
} from "../../data/repositories/classes";
import {
  classAttendanceRate,
  listStudents,
} from "../../data/repositories/students";
import { listPlannedSessions, sessionPrefix } from "../../data/repositories/sessions";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import type { Class } from "../../data/types";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { todayISO } from "../../shared/format";
import {
  Chip,
  EmptyState,
  Fab,
  LinkButton,
  NoAccess,
  PageHeader,
} from "../../shared/ui";
import s from "./classes.module.css";

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

  return (
    <Link to={`/lop/${item.id}/buoi-hoc`} className={s.classLink}>
      <div
        className={
          s.classCard + (desktop && selected ? " " + s.classCardSelected : "")
        }
      >
        <h2 className={s.cardTitle}>{item.name}</h2>
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
  const todaySession = listPlannedSessions().find(
    (session) => session.date === today,
  );
  const todayClass = todaySession ? getClass(todaySession.classId) : undefined;
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
          desktop ? (
            <>
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
            </>
          ) : (
            <Link to="/cai-dat" className={s.avatar} aria-label="Cài đặt">
              CL
            </Link>
          )
        }
      />
      {!desktop && todaySession && todayClass && (
        <div className={s.today}>
          <div className={s.todayText}>
            <p className={s.todayEyebrow}>Hôm nay · {todayClass.time}</p>
            <p className={s.todayTitle}>
              {todayClass.name} · {sessionPrefix(todaySession)}
            </p>
          </div>
          <LinkButton
            variant="surface"
            className={s.todayAction}
            to={`/lop/${todaySession.classId}/buoi-hoc/${todaySession.id}`}
          >
            Điểm danh
          </LinkButton>
        </div>
      )}
      {classes.length === 0 ? (
        <EmptyState title="Chưa có lớp học">
          {canWrite && <LinkButton to="/lop/moi">Tạo lớp đầu tiên</LinkButton>}
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
        {!desktop && canWrite && (
          <Fab label="Tạo lớp mới" onClick={() => navigate("/lop/moi")} />
        )}
    </section>
  );
}
