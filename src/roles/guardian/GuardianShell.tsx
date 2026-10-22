import { NavLink, Outlet, useLocation } from "react-router-dom";
import { GuardianProvider } from "./guardianContext";
import GuardianIcon, { type GuardianIconName } from "./GuardianIcon";
import s from "./guardianShell.module.css";

/**
 * Khung màn phụ huynh: khung hẹp 390–480px (dùng điện thoại là chính) và
 * thanh tab dưới 5 mục đúng ảnh 15: Tổng quan, Điểm danh, Điểm số, Nhận xét,
 * Báo cáo. Trang Phiếu buổi học và BTVN của con thuộc nhóm "Nhận xét" nên tab
 * Nhận xét vẫn sáng khi mở hai màn đó (ảnh 08, 09, 34, 35).
 */
const tabs: Array<{
  to: string;
  label: string;
  icon: GuardianIconName;
  end?: boolean;
  match?: (pathname: string) => boolean;
}> = [
  { to: "/ph", label: "Tổng quan", icon: "home", end: true },
  { to: "/ph/diem-danh", label: "Điểm danh", icon: "attendance" },
  { to: "/ph/diem-so", label: "Điểm số", icon: "scores" },
  {
    to: "/ph/nhan-xet",
    label: "Nhận xét",
    icon: "comments",
    match: (pathname) =>
      pathname.startsWith("/ph/nhan-xet") || pathname.startsWith("/ph/btvn"),
  },
  { to: "/ph/bao-cao", label: "Báo cáo", icon: "reports" },
];

function GuardianTabbar() {
  const { pathname } = useLocation();
  return (
    <nav className={s.tabbar} aria-label="Điều hướng phụ huynh">
      {tabs.map((tab) => {
        const active = tab.match
          ? tab.match(pathname)
          : tab.end
            ? pathname === tab.to
            : pathname.startsWith(tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            aria-current={active ? "page" : undefined}
            className={s.tab + (active ? " " + s.tabActive : "")}
          >
            <GuardianIcon name={tab.icon} />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Component() {
  return (
    <GuardianProvider>
      <div className={s.app} data-role="guardian">
        <a className={s.skip} href="#noi-dung">
          Đến nội dung
        </a>
        <main id="noi-dung" className={s.content}>
          <Outlet />
        </main>
        <GuardianTabbar />
      </div>
    </GuardianProvider>
  );
}
