import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  currentPhoneLabel,
  logout,
} from "../../data/repositories/auth";
import { EmptyState } from "../../shared/ui";
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
  const phone = currentPhoneLabel();

  function signOut() {
    try {
      logout();
      navigate("/dang-nhap", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng xuất.");
    }
  }

  return (
    <main className={s.page}>
      <EmptyState
        title="Chưa có con nào được liên kết"
        description="Số điện thoại bạn dùng để đăng ký chưa khớp hồ sơ học sinh nào. Nhờ cô giáo nhập đúng số điện thoại này vào hồ sơ của con. Khi hồ sơ có số này, con sẽ tự hiện ở đây."
        action={
          <div className={s.actions}>
            <Link to="/cai-dat" className={s.secondary}>
              Cài đặt
            </Link>
            <button type="button" className={s.secondary} onClick={signOut}>
              Đăng xuất
            </button>
          </div>
        }
      >
        {phone && (
          <p className={s.phone} aria-label={`Số điện thoại đang đăng nhập ${phone}`}>
            {phone}
          </p>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </EmptyState>
    </main>
  );
}
