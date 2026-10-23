import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import {
  getCurrentClassId,
  setCurrentClass,
} from "../../data/repositories/classes";
import { useAccess } from "../../data/repositories/access";
import { listStudents } from "../../data/repositories/students";
import type { Class, PermissionGroup, Session } from "../../data/types";
import {
  formatClassSchedule,
  formatDayMonth,
  formatWeekdayDate,
  todayISO,
  weekdayNames,
} from "../../shared/format";
import { Icon } from "../../shared/ui";
import {
  ClassOptionsMenu,
  type ClassOption,
} from "../classes/ClassOptionsMenu";
import { ArchiveClassDialog } from "../classes/ArchiveClassDialog";
import { EditClassModal } from "../classes/EditClassModal";
import { EditClassSchedule } from "../classes/EditClassSchedule";
import { sessionPrefix } from "../../data/repositories/sessions";
import { useSlideIndicator } from "../../shared/motion";
import s from "./desktop.module.css";

/** Năm tab của lớp, đúng thứ tự ảnh 01…15. */
const TABS: Array<{ to: string; label: string; group: PermissionGroup }> = [
  { to: "buoi-hoc", label: "Buổi học", group: "sessions_attendance" },
  { to: "bai-kiem-tra", label: "Bài kiểm tra", group: "scores" },
  { to: "diem", label: "Điểm", group: "scores" },
  { to: "hoc-sinh", label: "Học sinh", group: "students" },
  { to: "bao-cao", label: "Báo cáo", group: "comments_reports" },
];

/** "Thứ Ba 21/10" — chữ "hôm nay" ở phụ đề đầu lớp (ảnh 01). */
export function todayLabel(today = todayISO()): string {
  const [year, month, day] = today.split("-").map(Number);
  const weekday = weekdayNames[new Date(year, month - 1, day, 12).getDay()];
  return `${weekday} ${formatDayMonth(today)}`;
}

/** Phụ đề đầu lớp: "10 học sinh · Thứ Hai, Thứ Tư 18:00 · hôm nay Thứ Ba 20/10". */
export function classSubtitle(
  klass: Class,
  studentCount: number,
  today?: string,
): string {
  // "Thứ Hai, Thứ Tư 18:00" — không lặp dấu "·" giữa các cụm.
  const schedule = formatClassSchedule(klass).replace(" · ", " ");
  return `${studentCount} học sinh · ${schedule} · hôm nay ${todayLabel(today)}`;
}

/** Tiêu đề buổi học trên web: "Buổi 9 · Thứ Hai, 19 tháng 10 · 18:00". */
export function sessionHeading(session: Session, classTime?: string): string {
  const time = session.time ?? classTime;
  const base = `${sessionPrefix(session)} · ${formatWeekdayDate(session.date)}`;
  return time ? `${base} · ${time}` : base;
}

/** Tab đang mở theo đường dẫn; mặc định Buổi học. */
export function activeClassTab(pathname: string): string {
  const found = TABS.find((tab) => pathname.includes(`/${tab.to}`));
  return found?.to ?? TABS[0].to;
}

/**
 * Khung đầu màn "Chi tiết lớp" trên web desktop (ảnh 01…15): breadcrumb, tiêu
 * đề lớp hoặc buổi, phụ đề, nút "…", nút chính của tab và hàng 5 tab.
 * Mobile dùng khung riêng trong ClassSpaceLayout nên không bị ảnh hưởng.
 */
export default function ClassDesktopHeader({
  classId,
  klass,
  session,
  actions,
  extraMenuItems,
}: {
  classId: string;
  klass: Class;
  session?: Session;
  /** Nút chính của tab hiện tại (Thêm buổi lẻ, Lưu điểm, …). */
  actions?: ReactNode;
  /** Mục thêm vào menu "…" (ví dụ Hủy buổi của màn chi tiết buổi). */
  extraMenuItems?: ClassOption[];
}) {
  const access = useAccess();
  const { pathname } = useLocation();
  const active = activeClassTab(pathname);
  const [error, setError] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const canWriteClasses = access.can("classes", "write");
  const visibleTabs = TABS.filter((tab) => access.can(tab.group, "read"));
  const studentCount = listStudents(classId).length;
  const activeLabel = visibleTabs.find((tab) => tab.to === active)?.label;
  const tabsRef = useRef<HTMLElement>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const indicatorReady = useSlideIndicator(tabsRef, active);

  useEffect(() => {
    if (getCurrentClassId() !== classId) setCurrentClass(classId);
  }, [classId]);

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
        setError("");
        setConfirmArchive(true);
      },
    },
  ];
  const menuItems = [...(extraMenuItems ?? []), ...options];

  return (
    <>
      <header className={s.header}>
        <nav className={s.breadcrumb} aria-label="Đường dẫn">
          <Link className={s.crumbLink} to="/lop">
            Lớp
          </Link>
          <span className={s.crumbSep} aria-hidden="true">
            /
          </span>
          {session ? (
            <>
              <Link className={s.crumbLink} to={`/lop/${classId}/buoi-hoc`}>
                {klass.name}
              </Link>
              <span className={s.crumbSep} aria-hidden="true">
                /
              </span>
              <Link className={s.crumbLink} to={`/lop/${classId}/buoi-hoc`}>
                Buổi học
              </Link>
              <span className={s.crumbSep} aria-hidden="true">
                /
              </span>
              <span className={s.crumbCurrent}>{sessionPrefix(session)}</span>
            </>
          ) : (
            <>
              <Link className={s.crumbLink} to={`/lop/${classId}/buoi-hoc`}>
                {klass.name}
              </Link>
              {activeLabel && (
                <>
                  <span className={s.crumbSep} aria-hidden="true">
                    /
                  </span>
                  <span className={s.crumbCurrent}>{activeLabel}</span>
                </>
              )}
            </>
          )}
        </nav>
        <div className={s.titleRow}>
          <div className={s.titleBlock}>
            <h1 className={s.title}>
              {session ? sessionHeading(session, klass.time) : klass.name}
            </h1>
            <p className={s.subtitle}>
              {session
                ? klass.name
                : classSubtitle(klass, studentCount)}
            </p>
          </div>
          <div className={s.headerActions}>
            {canWriteClasses && (
              <div className={s.menuWrap}>
                <button
                  type="button"
                  className={s.menuButton}
                  aria-label="Thêm tùy chọn"
                  aria-haspopup="menu"
                  aria-expanded={optionsOpen}
                  onClick={() => setOptionsOpen(true)}
                >
                  <Icon name="more" size={20} />
                </button>
                <ClassOptionsMenu
                  open={optionsOpen}
                  onClose={() => setOptionsOpen(false)}
                  items={menuItems}
                />
              </div>
            )}
            {actions}
          </div>
        </div>
          <nav ref={tabsRef} className={s.tabs} aria-label="Mục của lớp">
          {visibleTabs.map((tab) => (
            <Link
              key={tab.to}
              to={`/lop/${classId}/${tab.to}`}
              aria-current={tab.to === active ? "page" : undefined}
              className={s.tab + (tab.to === active ? " " + s.tabActive : "")}
            >
              {tab.label}
            </Link>
            ))}
            <span className={s.slideBar + (indicatorReady ? ` ${s.slideBarReady}` : "")} aria-hidden="true" />
          </nav>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <ArchiveClassDialog
        open={confirmArchive}
        classId={classId}
        className={klass.name}
        onClose={() => setConfirmArchive(false)}
      />
      {editOpen && (
        <EditClassModal
          classId={classId}
          onClose={() => setEditOpen(false)}
          onEditSchedule={() => setScheduleOpen(true)}
        />
      )}
      {scheduleOpen && (
        <EditClassSchedule
          classId={classId}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </>
  );
}
