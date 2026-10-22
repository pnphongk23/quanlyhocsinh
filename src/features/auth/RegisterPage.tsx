import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, registerTeacher } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { Icon } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength, PhoneField } from "./authUi";
import s from "./auth.module.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState(""); const [workspace, setWorkspace] = useState("");
  const [phone, setPhone] = useState(""); const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  if (getSession()) return <Navigate to="/lop" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (password.length < 8) { setError("Mật khẩu cần có ít nhất 8 ký tự."); return; }
    if (password !== confirm) { setError("Mật khẩu nhập lại chưa khớp."); return; }
    setLoading(true);
    try { await registerTeacher(`+84${phone.replace(/\D/g, "")}`, password, name, workspace); navigate("/lop", { replace: true }); }
    catch (cause) { setError(authFailureMessage(cause)); }
    finally { setLoading(false); }
  }
  return <main className={s.page}><div className={s.card}>
    <div className={s.backRow}><Link to="/dang-nhap" className={s.backButton} aria-label="Quay lại đăng nhập"><Icon name="back"/></Link><Link to="/dang-nhap" className={s.backLink}><Icon name="back" size={18}/> Quay lại đăng nhập</Link></div>
    <h1 className={s.title}>Tạo không gian làm việc</h1>
    {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.field}><label htmlFor="register-name">Tên hiển thị</label><div className={s.textBox}><input id="register-name" className={s.textInput} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Cô Lan" required/></div></div>
      <div className={s.field}><label htmlFor="register-workspace">Tên không gian làm việc</label><div className={s.textBox}><input id="register-workspace" className={s.textInput} value={workspace} onChange={e=>setWorkspace(e.target.value)} autoComplete="organization" placeholder="Lớp của cô Lan" required/></div></div>
      <PhoneField value={phone} onChange={setPhone} id="register-phone"/>
      <PasswordField label="Mật khẩu" value={password} onChange={setPassword} autoComplete="new-password" id="register-password" hint={<PasswordStrength password={password}/>}/>
      <div className={s.checks}><CheckRow ok={password.length>=8}>Tối thiểu 8 ký tự</CheckRow></div>
      <PasswordField label="Nhập lại mật khẩu" value={confirm} onChange={setConfirm} autoComplete="new-password" id="register-confirm" error={Boolean(confirm && confirm!==password)} errorText={confirm && confirm!==password ? "Mật khẩu nhập lại chưa khớp." : undefined}/>
      <p className={s.note}>Người tạo là quản trị viên đầu tiên của không gian làm việc.</p>
      <button type="submit" className={s.submit} disabled={loading}>{loading ? "Đang tạo…" : "Tạo không gian làm việc"}</button>
    </form>
  </div></main>;
}
