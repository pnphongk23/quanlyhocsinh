import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { login, getAuthSession } from "../../data/repositories/auth";
import { useStore } from "../../data/store";
import { Icon } from "../../shared/ui";
import s from "./auth.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  useStore();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Nhiều vai trò thì chọn vai trò trước, một vai trò thì vào thẳng lớp.
  const landingPath = () =>
    (getAuthSession()?.memberIds.length ?? 0) > 1 ? "/chon-vai-tro" : "/lop";
  if (getAuthSession()) return <Navigate to={landingPath()} replace />;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      login(
        String(data.get("email") ?? ""),
        String(data.get("password") ?? ""),
      );
      navigate(landingPath(), { replace: true });
    } catch {
      setError(
        "Không thể đăng nhập. Kiểm tra thông tin hoặc dung lượng lưu trữ.",
      );
    }
  }
  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.brand}>
          <span className={s.logo}>L</span>
          <p className={s.brandName}>Lớp của cô Lan</p>
          <h1 className={s.title}>Chào mừng trở lại</h1>
          <p className={s.description}>
            Đăng nhập để quản lý lớp, điểm danh và điểm số.
          </p>
        </div>
        <form className={s.form} onSubmit={submit}>
          <div className={s.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className={s.input}
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>
          <div className={s.field}>
            <label htmlFor="password">Mật khẩu</label>
            <div className={s.passwordWrap}>
              <input
                id="password"
                className={s.input + " " + s.passwordInput}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={s.eye}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((value) => !value)}
              >
                <Icon name="eye" />
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <button type="submit" className={s.submit}>
            Đăng nhập
          </button>
        </form>
        <p className={s.footer}>
          Prototype: dùng email và mật khẩu bất kỳ. Dữ liệu chỉ lưu trên máy này.
        </p>
      </div>
    </main>
  );
}
