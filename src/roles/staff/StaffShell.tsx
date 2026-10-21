import { NavLink, Outlet } from "react-router-dom";
import styles from "../../app/shell.module.css";
export function Component() {
  return <div className={styles.shell} data-role="staff"><header className={styles.header}><strong>Quản lý lớp</strong><span>Nhân sự</span></header><nav className={styles.nav} aria-label="Điều hướng nhân sự"><NavLink to="/lop">Lớp học</NavLink><NavLink to="/lich">Lịch</NavLink><NavLink to="/cai-dat">Cài đặt</NavLink></nav><main className={styles.content}><Outlet /></main></div>;
}
