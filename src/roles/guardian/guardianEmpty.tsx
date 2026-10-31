import { Link } from "react-router-dom";
import { EmptyState } from "../../shared/ui";
import s from "./guardianEmpty.module.css";

/**
 * "Chưa có con nào được liên kết" (spec mục 4 "Tài khoản"): phụ huynh đã đăng
 * ký nhưng SĐT chưa khớp hồ sơ học sinh nào. Giải thích rõ cách liên kết: nhờ
 * giáo viên nhập đúng SĐT này vào hồ sơ con, hệ thống tự liên kết (kể cả khi
 * hồ sơ được khai sau). Vẫn mở được Cài đặt và Đăng xuất.
 */
export default function GuardianNoChild() {
  return (
    <main className={s.page}>
      <EmptyState
        title="Chưa có con nào được liên kết"
        description="Số điện thoại bạn dùng để đăng ký chưa khớp hồ sơ học sinh nào. Nhờ cô giáo nhập đúng số điện thoại này vào hồ sơ của con. Khi hồ sơ có số này, con sẽ tự hiện ở đây."
        action={
          <Link to="/cai-dat" className={s.secondary}>
            Cài đặt
          </Link>
        }
      />
    </main>
  );
}
