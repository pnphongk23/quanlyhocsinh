import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getSession } from "../../data/auth/session";
import { useStore } from "../../data/store";
import SaveStatus from "../../shared/SaveStatus";
import styles from "../../app/shell.module.css";

const desktopItems = [
  ["/lop", "Lớp"],
  ["class-buoi-hoc", "Điểm danh"],
  ["class-diem", "Điểm số"],
  ["class-hoc-sinh", "Học sinh"],
  ["class-bao-cao", "Báo cáo"],
  ["/cai-dat", "Cài đặt"],
] as const;

function classPath(classId: string | undefined, section: string): string {
  return classId ? `/lop/${classId}/${section}` : "/lop";
}

export function Component() {
  const store = useStore();
  const { pathname } = useLocation();
  const session = getSession();
  const membership = session?.me.memberships.find(
    (item) => item.id === session.activeMembershipId && item.status === "active",
  );
  const activeClass = store.classes.find((item) => item.id === store.currentClassId);
  const activeMember = store.members.find((member) => member.id === store.activeMemberId);
  const userName =
    session?.user.display_name ??
    activeMember?.name ?? "";
  const workspaceLabel = userName
    ? `Lớp của ${userName}`
    : membership?.workspace.name ?? "Lớp học";
  const roleName =
    membership?.role.name ??
    store.roles.find((role) => role.id === activeMember?.roleId)?.name ??
    "Nhân sự";
  const links = desktopItems.map(([to, label]) => {
    const href = to.startsWith("class-")
      ? classPath(activeClass?.id, to.slice("class-".length))
      : to;
    return { href, label };
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
        <div className={styles.staffClassScope}>
          <span>Đang xem lớp</span>
          <strong>{activeClass?.name ?? "Chưa chọn lớp"}</strong>
        </div>
        <nav className={styles.staffSideNav} aria-label="Điều hướng nhân sự">
          {links.map(({ href, label }) => (
            <NavLink
              key={label}
              to={href}
              end={href === "/lop"}
              className={({ isActive }) => {
                const scoreReport =
                  label === "Điểm số" && pathname.includes("/bao-cao-diem");
                return `${styles.staffNavItem}${isActive || scoreReport ? ` ${styles.staffNavActive}` : ""}`;
              }}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.staffRole}>
          <SaveStatus className={styles.staffDesktopSaveStatus} />
          <span>{roleName}</span>
        </div>
      </aside>
      <main id="staff-content" className={styles.staffContent}>
        <Outlet />
      </main>
      <nav className={styles.staffTabbar} aria-label="Điều hướng chính">
        <NavLink to="/lop" end>Lớp</NavLink>
        <NavLink to="/lich">Lịch</NavLink>
        <NavLink to="/cai-dat">Cài đặt</NavLink>
      </nav>
    </div>
  );
}
