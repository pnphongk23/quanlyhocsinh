import { Link, Outlet, redirect, useRouteError } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { authRedirect } from "../data/auth";
import { initializeSession } from "../data/auth/session";
import { staffRoutes } from "../roles/staff/routes";
import { guardianRoutes } from "../roles/guardian/routes";
import { accountRoutes } from "../roles/account/routes";
import styles from "./shell.module.css";
function FoundationHome() {
  return <main className={styles.content}><h1>Quản lý lớp</h1><p>Khung ứng dụng · Đợt A</p><nav className={styles.nav} aria-label="Mở khung theo vai trò"><Link to="/lop">Khung nhân sự</Link><Link to="/ph">Khung phụ huynh</Link><Link to="/dang-nhap">Đăng nhập</Link></nav></main>;
}
function RouteError() {
  useRouteError();
  return <main className={styles.content}><h1>Không thể mở màn hình</h1><Link to="/">Về trang đầu</Link></main>;
}
export const routes: RouteObject[] = [{
  element: <Outlet />, errorElement: <RouteError />,
  children: [
    { path: "/", element: <FoundationHome /> },
      ...guardRoutes(staffRoutes, "staff"), ...guardRoutes(guardianRoutes, "guardian"), ...accountRoutes,
    { path: "*", element: <main className={styles.content}><h1>Không tìm thấy màn hình</h1><Link to="/">Về trang đầu</Link></main> },
  ],
}];

function guardRoutes(routes: RouteObject[], role: "staff" | "guardian"): RouteObject[] {
  return routes.map((route) => ({ ...route, loader: async ({ request }) => {
    await initializeSession();
    const target = authRedirect(role);
    if (target) {
      const url = new URL(request.url);
      throw redirect(`${target}?next=${encodeURIComponent(url.pathname + url.search)}`);
    }
    return undefined;
  } }));
}
