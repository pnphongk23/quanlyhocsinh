import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAccess } from "../data/repositories/access";
import { listClasses } from "../data/repositories/classes";
import { useStore } from "../data/store";
import type { PermissionGroup } from "../data/types";
import { features } from "../shared/features";
import { useIsDesktop } from "../shared/hooks/useIsDesktop";
import SaveStatus from "../shared/SaveStatus";
import { Icon, type IconName } from "../shared/ui";
import s from "./shell.module.css";

const WORKSPACE_NAME = "Lớp của cô Lan";

/** Tabbar mobile giữ nguyên 3 mục, không đổi theo quyền. */
const items: Array<{ to: string; label: string; icon: IconName }> = [
  { to: "/lop", label: "Lớp", icon: "classes" },
  { to: "/lich", label: "Lịch", icon: "calendar" },
  { to: "/cai-dat", label: "Cài đặt", icon: "settings" },
];

interface NavItem {
  to: string;
  label: string;
  /** Đánh dấu active cho màn con cùng nhóm (vd. báo cáo điểm thuộc Điểm số). */
  match?: (pathname: string) => boolean;
}

/**
 * Lớp đang mở để gắn vào các lối vào theo lớp (Điểm danh, Điểm số, Học sinh,
 * Báo cáo). Ưu tiên lớp đang mở nếu vai trò hiện tại thấy được lớp đó.
 */
function scopedClassId(
  currentClassId: string | null,
  visible: Array<{ id: string }>,
): string | null {
  if (currentClassId && visible.some((klass) => klass.id === currentClassId))
    return currentClassId;
  return visible[0]?.id ?? null;
}

/** Lối vào desktop theo quyền: nhân sự không bao giờ thấy mục quản trị. */
export function desktopNav(
  can: (group: PermissionGroup, level: "read" | "write") => boolean,
  isAdmin: boolean,
  isStaff: boolean,
  memberId: string | null,
  classId: string | null,
): NavItem[] {
  const links: NavItem[] = [{ to: "/lop", label: "Lớp" }];
  const classPath = (suffix: string) =>
    classId ? `/lop/${classId}/${suffix}` : "/lop";

  if (can("sessions_attendance", "read"))
    links.push({ to: classPath("diem-danh"), label: "Điểm danh" });
  if (can("scores", "read"))
    links.push({
      to: classPath("diem"),
      label: "Điểm số",
      match: classId
        ? (pathname) => pathname.startsWith(`/lop/${classId}/bao-cao-diem`)
        : undefined,
    });
  if (can("students", "read"))
    links.push({ to: classPath("hoc-sinh"), label: "Học sinh" });
  if (can("comments_reports", "read"))
    links.push({ to: classPath("bao-cao"), label: "Báo cáo" });
  if (can("lectures", "read"))
    links.push({ to: "/bai-giang", label: "Bài giảng" });

  if (isAdmin) links.push({ to: "/phan-cong", label: "Phân công" });

  if (isStaff) {
    links.push({ to: "/lich-day", label: "Lịch dạy" });
    // Cờ Lương tắt thì bỏ hẳn lối vào, code màn Lương vẫn giữ.
    if (features.payroll) {
      if (isAdmin) links.push({ to: "/luong", label: "Lương" });
      else if (memberId)
        links.push({ to: `/luong/${memberId}`, label: "Lương của tôi" });
    }
  }

  if (isAdmin) {
    links.push({ to: "/hoc-phi", label: "Học phí" });
    links.push({ to: "/nhan-su", label: "Nhân sự" });
    links.push({ to: "/vai-tro", label: "Vai trò" });
  }

  links.push({ to: "/cai-dat", label: "Cài đặt" });
  return links;
}

export function TeacherShell() {
  const desktop = useIsDesktop();
  return desktop ? <DesktopShell /> : <MobileShell />;
}

function MobileShell() {
  return (
    <div className={s.mobile}>
      <a className={s.skip} href="#noi-dung">
        Đến nội dung
      </a>
        <SaveStatus className={s.mobileSaveStatus} />
      <main id="noi-dung" className={s.content}>
        <Outlet />
      </main>
      <nav className={s.tabbar} aria-label="Điều hướng chính">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              s.tab + (isActive ? " " + s.tabActive : "")
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function DesktopShell() {
  const state = useStore();
  const access = useAccess();
  const { pathname } = useLocation();
  const classId = scopedClassId(state.currentClassId, listClasses());
  const links = desktopNav(
    access.can,
    access.isAdmin,
    access.role?.kind === "staff",
    access.member?.id ?? null,
    classId,
  );
  return (
    <div className={s.desktop}>
      <a className={s.skip} href="#noi-dung">
        Đến nội dung
      </a>
      <aside className={s.sidebar}>
        <NavLink to="/lop" className={s.brand}>
          {WORKSPACE_NAME}
        </NavLink>
        <nav className={s.sideNav} aria-label="Điều hướng chính">
          {links.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === "/lop"}
              className={({ isActive }) =>
                s.navItem +
                (isActive || item.match?.(pathname) ? " " + s.navActive : "")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
          <SaveStatus className={s.desktopSaveStatus} />
      </aside>
      <main id="noi-dung" className={s.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default TeacherShell;
