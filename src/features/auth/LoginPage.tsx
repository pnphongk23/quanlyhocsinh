import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, login } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { Mascot } from "../../shared/ui/Mascot";
import { PasswordField, PhoneField } from "./authUi";
import s from "./auth.module.css";

function landingPath() {
  const session = getSession();
  if (session?.me.memberships.length !== 1) return "/chon-vai-tro";
  return session.me.memberships[0].role.scope_kind === "linked_students" ? "/ph" : "/lop";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (getSession()) return <Navigate to={landingPath()} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try { await login(`+84${phone.replace(/\D/g, "")}`, password); navigate(landingPath(), { replace: true }); }
    catch (cause) { setError(authFailureMessage(cause)); }
    finally { setLoading(false); }
  }
  return <main className={s.page}><div className={s.card}>
    <div className={s.brand}><span className={s.logo} aria-hidden="true">L</span><p className={s.brandName}>Quản lý lớp tiếng Anh</p><Mascot pose="chao" size={72} className={s.brandMascot}/></div>
    <h1 className={s.title}>Đăng nhập</h1><p className={s.description}>Dành cho giáo viên và phụ huynh.</p>
    {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
    <form className={s.form} onSubmit={submit} noValidate>
      <PhoneField value={phone} onChange={setPhone} error={Boolean(error)} id="login-phone" />
      <PasswordField label="Mật khẩu" value={password} onChange={setPassword} error={Boolean(error)} autoComplete="current-password" id="login-password" />
      <div className={s.forgotRow}><Link to={`/quen-mat-khau${phone ? `?sdt=+84${phone.replace(/\D/g, "")}` : ""}`} className={s.forgotLink}>Quên mật khẩu?</Link></div>
      <button type="submit" className={s.submit} disabled={loading}>{loading ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    </form>
    <div className={s.footerBlock}><p className={s.registerRow}>Chưa có không gian làm việc? <Link to="/dang-ky" className={s.registerLink}>Đăng ký cho giáo viên</Link></p>
      <p className={s.hintCard}><strong>Phụ huynh:</strong> dùng số điện thoại đã khai trong hồ sơ học sinh và mật khẩu tài khoản.</p>
    </div>
  </div></main>;
}
