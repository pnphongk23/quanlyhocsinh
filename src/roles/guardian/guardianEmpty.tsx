import { Link } from "react-router-dom";
import { Mascot } from "../../shared/ui/Mascot";
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
      <Mascot pose="cho" size={112} />
      <h1 className={s.title}>Chưa có con nào được liên kết</h1>
      <p className={s.text}>
        Số điện thoại bạn dùng để đăng ký chưa khớp hồ sơ học sinh nào.
      </p>
      <p className={s.text}>
        Nhờ cô giáo nhập đúng số điện thoại này vào hồ sơ của con. Khi hồ sơ có
        số này, con sẽ tự hiện ở đây.
      </p>
        <div className={s.actions}>
          <Link to="/cai-dat" className={s.secondary}>
            Cài đặt
          </Link>
      </div>
    </main>
  );
}
