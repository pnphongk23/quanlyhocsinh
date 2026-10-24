import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useMatches,
  useParams,
} from "react-router-dom";
import {
  getClass,
  getCurrentClassId,
  hasClass,
  setCurrentClass,
} from "../../data/repositories/classes";
import { getSession } from "../../data/repositories/sessions";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import type { PermissionGroup } from "../../data/types";
import { EmptyState, Icon, LinkButton, NoAccess } from "../../shared/ui";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { ClassOptionsMenu, type ClassOption } from "../classes/ClassOptionsMenu";
import { ArchiveClassDialog } from "../classes/ArchiveClassDialog";
import { EditClassModal } from "../classes/EditClassModal";
import { EditClassSchedule } from "../classes/EditClassSchedule";
import { motionClass, useSlideIndicator } from "../../shared/motion";
import s from "./classSpace.module.css";

const tabs: Array<{ to: string; label: string; group: PermissionGroup }> = [
  { to: "buoi-hoc", label: "Buổi học", group: "sessions_attendance" },
  { to: "bai-kiem-tra", label: "Bài kiểm tra", group: "scores" },
  { to: "diem", label: "Điểm", group: "scores" },
  { to: "hoc-sinh", label: "Học sinh", group: "students" },
  { to: "bao-cao", label: "Báo cáo", group: "comments_reports" },
];

const SESSION_PATH = /^\/lop\/[^/]+\/buoi-hoc\/([^/]+)\/?$/;

/** Id buổi học trong URL nếu đang mở đúng màn chi tiết buổi. */
function sessionIdFromPath(pathname: string): string | null {
  const match = SESSION_PATH.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function ClassSpaceLayout() {
  useStore();
  const desktop = useIsDesktop();
  const { classId = "" } = useParams();
  const { pathname } = useLocation();
  const matches = useMatches();
  const access = useAccess();
  const subTabsRef = useRef<HTMLElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [error, setError] = useState("");
  const klass = getClass(classId);
  // Ngoại lệ hẹp: đúng buổi mình dạy thay thì mở màn chi tiết buổi (không mở cả lớp).
  const pathSessionId = sessionIdFromPath(pathname);
  const pathSession = pathSessionId ? getSession(pathSessionId) : undefined;
  const substituteSession =
    !klass && pathSession && pathSession.classId === classId
      ? pathSession
      : undefined;
  const canWriteClasses = access.can("classes", "write");
  const visibleTabs = tabs.filter((tab) => access.can(tab.group, "read"));
  const detail = matches.some(
    (match) => (match.handle as { detail?: boolean } | undefined)?.detail,
  );
  useEffect(() => {
    if (klass && getCurrentClassId() !== classId) setCurrentClass(classId);
  }, [classId, klass]);
  useLayoutEffect(() => {
    const nav = subTabsRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    nav.scrollTo({
      left:
        nav.scrollLeft +
        activeRect.left -
        navRect.left -
        (nav.clientWidth - active.clientWidth) / 2,
      behavior: "auto",
    });
  }, [pathname]);
  const indicatorReady = useSlideIndicator(
    subTabsRef,
    pathname + (klass ? ":1" : ":0"),
  );
  if (!klass && !substituteSession)
    return hasClass(classId) ? (
      <NoAccess what="lớp này" />
    ) : (
      <EmptyState title="Không tìm thấy lớp">
        <LinkButton to="/lop">Về danh sách lớp</LinkButton>
      </EmptyState>
    );
  // Web desktop: mỗi trang tự dựng khung đầu lớp (breadcrumb, tiêu đề, nút
  // chính của tab) bằng ClassDesktopHeader; layout chỉ giữ phần kiểm quyền.
  if (desktop) return <Outlet />;
  // Buổi dạy thay chỉ mở nội dung buổi, không hiện tab của lớp và không đặt
  // lớp ngoài phạm vi làm lớp đang mở.
  if (detail || substituteSession) return <Outlet />;
  if (!klass) return <NoAccess what="lớp này" />;
  const options: ClassOption[] = [
    {
      label: "Sửa lớp",
      icon: "edit",
      onSelect: () => {
        setOptionsOpen(false);
        setEditOpen(true);
      },
    },
    {
      label: "Sửa lịch học",
      icon: "calendar",
      onSelect: () => {
        setOptionsOpen(false);
        setScheduleOpen(true);
      },
    },
    {
      label: "Lưu trữ lớp",
      icon: "archive",
      danger: true,
      onSelect: () => {
        setOptionsOpen(false);
        setArchiveOpen(true);
      },
    },
  ];
  return (
    <section className={s.space}>
      <header className={s.header}>
        <div className={s.headerRow}>
          <Link to="/lop" className={s.iconButton} aria-label="Quay lại">
            <Icon name="back" />
          </Link>
          <h1 className={s.title}>{klass.name}</h1>
          {canWriteClasses && (
            <div className={s.menuWrap}>
              <button
                type="button"
                className={s.iconButton}
                aria-label="Tuỳ chọn lớp"
                aria-haspopup="menu"
                aria-expanded={optionsOpen}
                onClick={() => {
                  setOptionsOpen(true);
                  setError("");
                }}
              >
                <Icon name="more" />
              </button>
              <ClassOptionsMenu
                open={optionsOpen}
                onClose={() => setOptionsOpen(false)}
                items={klass.status === "archived" ? undefined : options}
                note={
                  klass.status === "archived" ? "Lớp này đã lưu trữ." : undefined
                }
              />
            </div>
          )}
        </div>
        <nav ref={subTabsRef} className={s.subTabs} aria-label="Mục của lớp">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={`/lop/${classId}/${tab.to}`}
              end={tab.to === visibleTabs[0]?.to}
              className={({ isActive }) =>
                s.subTab + (isActive ? " " + s.subTabActive : "")
              }
            >
              {tab.label}
            </NavLink>
          ))}
          <span
            aria-hidden="true"
            className={
              motionClass.indicator +
              (indicatorReady ? " " + motionClass.indicatorReady : "") +
              " " +
              s.slideBar
            }
          />
        </nav>
      </header>
      <div className={s.body}>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <Outlet />
      </div>
      {editOpen && (
        <EditClassModal
          classId={classId}
          onClose={() => setEditOpen(false)}
          onEditSchedule={() => setScheduleOpen(true)}
        />
      )}
      <ArchiveClassDialog
        open={archiveOpen}
        classId={classId}
        className={klass.name}
        onClose={() => setArchiveOpen(false)}
      />
      {scheduleOpen && (
        <EditClassSchedule
          classId={classId}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </section>
  );
}
