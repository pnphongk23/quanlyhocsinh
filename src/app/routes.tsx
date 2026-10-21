import { Link, Outlet, useRouteError } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
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
    ...staffRoutes, ...guardianRoutes, ...accountRoutes,
    { path: "*", element: <main className={styles.content}><h1>Không tìm thấy màn hình</h1><Link to="/">Về trang đầu</Link></main> },
  ],
}];
