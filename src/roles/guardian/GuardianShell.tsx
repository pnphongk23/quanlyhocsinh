import { NavLink, Outlet } from "react-router-dom";
import styles from "../../app/shell.module.css";
export function Component() {
  return <div className={styles.shell} data-role="guardian"><header className={styles.header}><strong>Quản lý lớp</strong><span>Phụ huynh</span></header><nav className={styles.nav} aria-label="Điều hướng phụ huynh"><NavLink to="/ph" end>Tổng quan</NavLink><NavLink to="/ph/diem-danh">Điểm danh</NavLink><NavLink to="/ph/diem-so">Điểm số</NavLink><NavLink to="/ph/nhan-xet">Nhận xét</NavLink><NavLink to="/ph/btvn">Bài tập về nhà</NavLink><NavLink to="/ph/bao-cao">Báo cáo</NavLink><NavLink to="/cai-dat">Cài đặt</NavLink></nav><main className={styles.content}><Outlet /></main></div>;
}
