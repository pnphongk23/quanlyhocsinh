import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { pendingCommandCount } from "../../data/outbox";
import { Mascot } from "../../shared/ui/Mascot";
import s from "./guardianEmpty.module.css";

/**
 * "Chưa có con nào được liên kết" (spec mục 4 "Tài khoản"): phụ huynh đã đăng
 * ký nhưng SĐT chưa khớp hồ sơ học sinh nào. Giải thích rõ cách liên kết: nhờ
 * giáo viên nhập đúng SĐT này vào hồ sơ con, hệ thống tự liên kết (kể cả khi
 * hồ sơ được khai sau). Vẫn mở được Cài đặt và Đăng xuất.
 */
export default function GuardianNoChild() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const rawPhone = getSession()?.user.phone ?? "";
  const digits = rawPhone.replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
  const phone = digits.length === 9
    ? `+84 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : rawPhone;

  async function signOut() {
    try {
      if (await pendingCommandCount()) {
        setError("Còn thay đổi chưa đồng bộ. Vui lòng chờ đồng bộ trước khi đăng xuất.");
        return;
      }
      await logout();
      navigate("/dang-nhap", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng xuất.");
    }
  }

  return (
    <main className={s.page}>
      <Mascot pose="cho" size={112} />
      <h1 className={s.title}>Chưa có con nào được liên kết</h1>
      <p className={s.text}>
        Số điện thoại bạn dùng để đăng ký chưa khớp hồ sơ học sinh nào.
      </p>
      {phone && (
        <p className={s.phone} aria-label={`Số điện thoại đang đăng nhập ${phone}`}>
          {phone}
        </p>
      )}
      <p className={s.text}>
        Nhờ cô giáo nhập đúng số điện thoại này vào hồ sơ của con. Khi hồ sơ có
        số này, con sẽ tự hiện ở đây.
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.actions}>
        <Link to="/cai-dat" className={s.secondary}>
          Cài đặt
        </Link>
        <button type="button" className={s.secondary} onClick={signOut}>
          Đăng xuất
        </button>
      </div>
    </main>
  );
}
