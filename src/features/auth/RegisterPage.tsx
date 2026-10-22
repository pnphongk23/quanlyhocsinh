import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, registerParent, registerTeacher } from "../../data/auth";
import { ApiError } from "../../data/api/client";
import { getSession } from "../../data/auth/session";
import { Icon, Segmented } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength, PhoneField } from "./authUi";
import s from "./auth.module.css";
import r from "./registerGuardian.module.css";

type RegisterRole = "teacher" | "guardian";

export function registrationErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.error.code === "phone_registered") {
    return "Số điện thoại đã có tài khoản. Hãy đăng nhập.";
  }
  return authFailureMessage(error);
}

const ROLE_OPTIONS = [
  { value: "teacher", label: "Giáo viên" },
  { value: "guardian", label: "Phụ huynh" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<RegisterRole>("teacher");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const registrationComplete = useRef(false);
  // Keep the form mounted while its own register request installs the new session;
  // the submit handler sends the user straight to the newly created workspace.
  if (getSession() && !loading && !registrationComplete.current) return <Navigate to="/chon-vai-tro" replace />;

  const guardian = role === "guardian";
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nhập tên hiển thị của bạn.");
    if (!guardian && !workspaceName.trim()) return setError("Nhập tên không gian làm việc.");
    if (phone.replace(/\D/g, "").length !== 9) return setError("Số điện thoại không hợp lệ.");
    if (password.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự.");
    if (password !== confirm) return setError("Mật khẩu nhập lại không khớp.");

    setLoading(true);
    try {
      const formattedPhone = `+84${phone.replace(/\D/g, "")}`;
      if (guardian) await registerParent(formattedPhone, password, name.trim());
      else await registerTeacher(formattedPhone, password, name.trim(), workspaceName.trim());
      const memberships = getSession()?.me.memberships ?? [];
      registrationComplete.current = true;
      navigate(guardian ? (memberships.length > 1 ? "/chon-vai-tro" : "/ph") : "/lop", { replace: true });
    } catch (cause) {
      setError(registrationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.backRow}>
          <Link to="/dang-nhap" className={s.backButton} aria-label="Quay lại đăng nhập"><Icon name="back" /></Link>
          <Link to="/dang-nhap" className={s.backLink}><Icon name="back" size={18} /> Quay lại đăng nhập</Link>
        </div>
        <h1 className={s.title}>{guardian ? "Tạo tài khoản phụ huynh" : "Tạo không gian làm việc"}</h1>
        <div className={r.roleSwitch}>
          <span className={r.roleLabel}>Bạn đăng ký với vai trò</span>
          <Segmented
            label="Bạn đăng ký với vai trò"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(value) => { setRole(value as RegisterRole); setError(""); }}
          />
        </div>
        {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
        <form className={s.form} onSubmit={submit} noValidate>
          <div className={s.field}>
            <label htmlFor="register-name">Tên hiển thị</label>
            <div className={s.textBox}>
              <input id="register-name" className={s.textInput} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder={guardian ? "Mẹ của Minh Anh" : "Cô Lan"} />
            </div>
          </div>
          {!guardian && <div className={s.field}>
            <label htmlFor="register-workspace">Tên không gian làm việc</label>
            <div className={s.textBox}>
              <input id="register-workspace" className={s.textInput} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} autoComplete="organization" placeholder="Lớp của cô Lan" />
            </div>
          </div>}
          <PhoneField value={phone} onChange={setPhone} id="register-phone" />
          <PasswordField label="Mật khẩu" value={password} onChange={setPassword} autoComplete="new-password" id="register-password" hint={<PasswordStrength password={password} />} />
          <div className={s.checks}><CheckRow ok={password.length >= 8}>Tối thiểu 8 ký tự</CheckRow></div>
          <PasswordField label="Nhập lại mật khẩu" value={confirm} onChange={setConfirm} autoComplete="new-password" id="register-confirm" error={mismatch} errorText={mismatch ? "Mật khẩu nhập lại không khớp." : undefined} />
          <p className={s.note}>{guardian ? "Con sẽ tự hiện ở đây khi hồ sơ học sinh có đúng số điện thoại này. Chưa khớp hồ sơ nào thì bạn vẫn dùng được tài khoản." : "Người tạo là quản trị viên đầu tiên của không gian làm việc."}</p>
          <button type="submit" className={s.submit} disabled={loading}>{loading ? "Đang tạo…" : guardian ? "Tạo tài khoản" : "Tạo không gian làm việc"}</button>
        </form>
      </div>
    </main>
  );
}
