import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import s from "./motion.module.css";

export interface PageTransitionProps {
  /** Trang đi sâu: trượt ngang 16px (mobile) thay vì trượt lên 8px. */
  detail?: boolean;
  /** Mặc định bọc `<Outlet />`. */
  children?: ReactNode;
}

/** Nội dung mới fade + trượt vào mỗi lần pathname đổi (key theo pathname). Khoảng cách giữa các khối lấy từ `--page-gap` của vùng chứa. */
export function PageTransition({ detail = false, children }: PageTransitionProps) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className={detail ? s.pageDetail : s.page}>
      {children ?? <Outlet />}
    </div>
  );
}
export default PageTransition;
