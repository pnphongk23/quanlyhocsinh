import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, login } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { Mascot } from "../../shared/ui/Mascot";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { PasswordField, PhoneField } from "./authUi";
import { landingPathForSession } from "./landingPath";
import s from "./auth.module.css";

const landingPath = () => landingPathForSession(getSession());

const EMPTY_LOGIN = { phone: "", password: "" };

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_LOGIN);
  const phone = form.phone;
  const password = form.password;
  const action = useSaveAction({
    baseline: EMPTY_LOGIN,
    value: form,
    validate: (v) => v.phone.replace(/\D/g, "").length === 9 && v.password.length > 0,
    save: (v) => login(`+84${v.phone.replace(/\D/g, "")}`, v.password),
  });
  const loading = action.saving;
  const error = action.error ? authFailureMessage(action.error) : "";
  if (getSession() && !loading) return <Navigate to={landingPath()} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.submit()) navigate(landingPath(), { replace: true });
  }
  return <main className={s.page}><div className={s.card}>
    <div className={s.brand}><span className={s.logo} aria-hidden="true">L</span><p className={s.brandName}>Quản lý lớp tiếng Anh</p><Mascot pose="chao" size={72} className={s.brandMascot}/></div>
    <h1 className={s.title}>Đăng nhập</h1><p className={s.description}>Dành cho giáo viên và phụ huynh.</p>
    {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
    <form className={s.form} onSubmit={submit} noValidate>
      <PhoneField value={phone} onChange={(value) => setForm((f) => ({ ...f, phone: value }))} error={Boolean(error)} id="login-phone" />
      <PasswordField label="Mật khẩu" value={password} onChange={(value) => setForm((f) => ({ ...f, password: value }))} error={Boolean(error)} autoComplete="current-password" id="login-password" />
      <div className={s.forgotRow}><Link to={`/quen-mat-khau${phone ? `?sdt=+84${phone.replace(/\D/g, "")}` : ""}`} className={s.forgotLink}>Quên mật khẩu?</Link></div>
      <button type="submit" className={s.submit} disabled={!action.canSave} aria-busy={loading || undefined}>{loading ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    </form>
      <div className={s.footerBlock}><p className={s.registerRow}>Chưa có tài khoản? · <Link to="/dang-ky" className={s.registerLink}>Tạo tài khoản</Link></p></div>
  </div></main>;
}
