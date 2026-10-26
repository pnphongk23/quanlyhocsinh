import { NavLink, useLocation } from "react-router-dom";
import { useAccess } from "../data/repositories/access";
import { getClass, listClasses } from "../data/repositories/classes";
import { useStore } from "../data/store";
import type { PermissionGroup } from "../data/types";
import { features } from "../shared/features";
import { currentWorkspaceName } from "../data/repositories/auth";
import { useIsDesktop } from "../shared/hooks/useIsDesktop";
import SaveStatus from "../shared/SaveStatus";
import { PageTransition } from "../shared/motion";
import { Icon, type IconName } from "../shared/ui";
import s from "./shell.module.css";

/** Tabbar mobile giữ nguyên 3 mục, không đổi theo quyền. */
const items: Array<{ to: string; label: string; icon: IconName }> = [
  { to: "/lop", label: "Lớp", icon: "classes" },
  { to: "/lich", label: "Lịch", icon: "calendar" },
  { to: "/cai-dat", label: "Cài đặt", icon: "settings" },
];

interface NavItem {
  to: string;
  label: string;
  /** Mục con của "Lớp": chỉ hiện khi đã chọn lớp, thụt lề dưới "Lớp". */
  child?: boolean;
  /** Đánh dấu active cho màn con cùng nhóm (vd. báo cáo điểm thuộc Điểm số). */
  match?: (pathname: string) => boolean;
}

/**
 * Lớp đang mở để gắn vào các mục con của "Lớp" (Điểm danh, Điểm số, Học sinh,
 * Báo cáo). Chỉ lấy lớp đã chọn mà vai trò hiện tại thấy được; chưa chọn thì
 * không có mục con.
 */
function scopedClassId(
  currentClassId: string | null,
  visible: Array<{ id: string }>,
): string | null {
  return currentClassId && visible.some((klass) => klass.id === currentClassId)
    ? currentClassId
    : null;
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
  const classPath = (suffix: string) => `/lop/${classId}/${suffix}`;

  if (classId) {
    if (can("sessions_attendance", "read"))
      links.push({ to: classPath("diem-danh"), label: "Điểm danh", child: true });
    if (can("scores", "read"))
      links.push({
        to: classPath("diem"),
        label: "Điểm số",
        child: true,
        match: (pathname) =>
          pathname.startsWith(`/lop/${classId}/bao-cao-diem`),
      });
    if (can("students", "read"))
      links.push({ to: classPath("hoc-sinh"), label: "Học sinh", child: true });
    if (can("comments_reports", "read"))
      links.push({ to: classPath("bao-cao"), label: "Báo cáo", child: true });
  }
  // Ngoài Bản đầu (spec mục 8): mỗi cờ tắt thì bỏ hẳn lối vào, code màn giữ.
  if (features.lectures && can("lectures", "read"))
    links.push({ to: "/bai-giang", label: "Bài giảng" });

  if (features.staffing && isAdmin)
    links.push({ to: "/phan-cong", label: "Phân công" });

  if (isStaff) {
    if (features.staffing)
      links.push({ to: "/lich-day", label: "Lịch dạy" });
    if (features.payroll) {
      if (isAdmin) links.push({ to: "/luong", label: "Lương" });
      else if (memberId)
        links.push({ to: `/luong/${memberId}`, label: "Lương của tôi" });
    }
  }

  if (features.staffing && isAdmin) {
    links.push({ to: "/nhan-su", label: "Nhân sự" });
    links.push({ to: "/vai-tro", label: "Vai trò" });
  }
  if (features.tuition && isAdmin)
    links.push({ to: "/hoc-phi", label: "Học phí" });

  links.push({ to: "/cai-dat", label: "Cài đặt" });
  return links;
}

export function TeacherShell() {
  const desktop = useIsDesktop();
  return desktop ? <DesktopShell /> : <MobileShell />;
}

/** Trang đi sâu trên mobile (/lop/:id/...): trượt ngang thay vì trượt lên. */
function isDetailPath(pathname: string): boolean {
  return pathname.split("/").filter(Boolean).length > 2;
}

function MobileShell() {
  const { pathname } = useLocation();
  return (
    <div className={s.mobile}>
      <a className={s.skip} href="#noi-dung">
        Đến nội dung
      </a>
        <SaveStatus className={s.mobileSaveStatus} />
      <main id="noi-dung" className={s.content}>
        <PageTransition detail={isDetailPath(pathname)} />
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
  const currentClass = classId ? getClass(classId) : undefined;
  const links = desktopNav(
    access.can,
    access.isAdmin,
    access.role?.kind === "staff",
    access.member?.id ?? null,
    classId,
  );
  // Đúng một mục selected: mục con khớp route thì mục con, không thì "Lớp".
  const path = pathname.replace(/\/$/, "");
  const childMatch = links.some(
    (item) => item.child && (path === item.to || item.match?.(path)),
  );
  const lopSelected = path.startsWith("/lop") && !childMatch;
  return (
    <div className={s.desktop}>
      <a className={s.skip} href="#noi-dung">
        Đến nội dung
      </a>
      <aside className={s.sidebar}>
        <NavLink to="/lop" className={s.brand}>
          {currentWorkspaceName()}
        </NavLink>
        <div className={s.currentClass}>
          <span className={s.currentClassLabel}>Đang xem lớp</span>
          <span className={s.currentClassName}>
            {currentClass?.name ?? "Chưa chọn lớp"}
            <Icon name="chevron-down" size={14} />
          </span>
        </div>
        <nav className={s.sideNav} aria-label="Điều hướng chính">
          {links.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === "/lop" || item.child}
              className={({ isActive }) => {
                if (item.to === "/lop")
                  return (
                    s.navItem +
                    (lopSelected ? " " + s.navActive : "") +
                    (childMatch ? " " + s.navGroupOpen : "")
                  );
                return (
                  s.navItem +
                  (item.child ? " " + s.navChild : "") +
                  (isActive || item.match?.(pathname) ? " " + s.navActive : "")
                );
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
          <SaveStatus className={s.desktopSaveStatus} />
      </aside>
      <main id="noi-dung" className={s.content}>
        <PageTransition />
      </main>
    </div>
  );
}

export default TeacherShell;
