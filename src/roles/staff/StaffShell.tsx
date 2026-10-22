import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getSession } from "../../data/auth/session";
import { getStore, replaceStore, useStore } from "../../data/store";
import SaveStatus from "../../shared/SaveStatus";
import { Icon } from "../../shared/ui";
import { PageTransition } from "../../shared/motion";
import styles from "../../app/shell.module.css";

const desktopItems = [
  ["/lop", "Lớp"],
  ["class-diem-danh", "Điểm danh"],
  ["class-diem", "Điểm số"],
  ["class-hoc-sinh", "Học sinh"],
  ["class-bao-cao", "Báo cáo"],
  ["/cai-dat", "Cài đặt"],
] as const;

function classPath(classId: string | undefined, section: string): string {
  return classId ? `/lop/${classId}/${section}` : "/lop";
}

function isDetailPath(pathname: string): boolean {
  return pathname.split("/").filter(Boolean).length > 2;
}

export function Component() {
  const store = useStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const session = getSession();
  const membership = session?.me.memberships.find(
    (item) => item.id === session.activeMembershipId && item.status === "active",
  );
  const activeClass = store.classes.find(
    (item) => item.id === store.currentClassId,
  );
  const activeMember = store.members.find(
    (member) => member.id === store.activeMemberId,
  );
  const userName = session?.user.display_name ?? activeMember?.name ?? "";
  const workspaceLabel = userName
    ? `Lớp của ${userName}`
    : membership?.workspace.name ?? "Lớp học";
  const links = desktopItems.map(([to, label]) => {
    const requiresClass = to.startsWith("class-");
    const href = to.startsWith("class-")
      ? classPath(activeClass?.id, to.slice("class-".length))
      : to;
    return { href, label, disabled: requiresClass && !activeClass };
  });

  return (
    <div className={styles.staffDesktop} data-role="staff">
      <a className={styles.staffSkip} href="#staff-content">
        Đến nội dung
      </a>
      <SaveStatus className={styles.staffMobileSaveStatus} />
      <aside className={styles.staffSidebar}>
        <NavLink to="/lop" className={styles.staffBrand}>
          {workspaceLabel}
        </NavLink>
        <div className={styles.staffClassPicker}>
          <button
            type="button"
            className={styles.staffClassScope}
            aria-expanded={classMenuOpen}
            aria-haspopup="listbox"
            onClick={() => setClassMenuOpen((open) => !open)}
          >
            <span>Đang xem lớp</span>
            <strong>
              <span>{activeClass?.name ?? "Chưa chọn lớp"}</span>
              <span aria-hidden="true" className={styles.staffClassChevron}>
                ⌄
              </span>
            </strong>
          </button>
          {classMenuOpen && (
            <div
              className={styles.staffClassMenu}
              role="listbox"
              aria-label="Chọn lớp"
            >
              {store.classes.map((klass) => (
                <button
                  type="button"
                  key={klass.id}
                  role="option"
                  aria-selected={klass.id === activeClass?.id}
                  onClick={() => {
                    replaceStore({ ...getStore(), currentClassId: klass.id });
                    setClassMenuOpen(false);
                    if (pathname.startsWith("/lop/"))
                      navigate(`/lop/${klass.id}`);
                  }}
                >
                  {klass.name}
                </button>
              ))}
            </div>
          )}
        </div>
          <nav className={styles.staffSideNav} aria-label="Điều hướng nhân sự">
            {links.map(({ href, label, disabled }) => {
              if (disabled) {
                return (
                  <span
                    key={label}
                    className={`${styles.staffNavItem} ${styles.staffNavDisabled}`}
                    aria-disabled="true"
                  >
                    {label}
                  </span>
                );
              }
              return (
                <NavLink
                  key={label}
                  to={href}
                  end
                  className={({ isActive }) => {
                    const scoreReport =
                      label === "Điểm số" && pathname.includes("/bao-cao-diem");
                    const selected = isActive || scoreReport;
                    return `${styles.staffNavItem}${selected ? ` ${styles.staffNavActive}` : ""}`;
                  }}
                >
                  {label}
                </NavLink>
              );
            })}
        </nav>
        <SaveStatus className={styles.staffDesktopSaveStatus} />
      </aside>
        <main id="staff-content" className={styles.staffContent}>
          <PageTransition detail={isDetailPath(pathname)} />
      </main>
      <nav className={styles.staffTabbar} aria-label="Điều hướng chính">
        <NavLink to="/lop">
          <Icon name="classes" />
          Lớp
        </NavLink>
        <NavLink to="/lich">
          <Icon name="calendar" />
          Lịch
        </NavLink>
        <NavLink to="/cai-dat">
          <Icon name="settings" />
          Cài đặt
        </NavLink>
      </nav>
    </div>
  );
}
