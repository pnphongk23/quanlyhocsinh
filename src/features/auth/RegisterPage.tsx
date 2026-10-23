import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, registerParent, registerTeacher } from "../../data/auth";
import { ApiError } from "../../data/api/client";
import { getSession } from "../../data/auth/session";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
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

const EMPTY_FORM = { name: "", workspaceName: "", phone: "", password: "", confirm: "" };

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<RegisterRole>("teacher");
  const [form, setForm] = useState({ name: "", workspaceName: "", phone: "", password: "", confirm: "" });
  const { name, workspaceName, phone, password, confirm } = form;
  const setField = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const registrationComplete = useRef(false);
  const guardian = role === "guardian";
  const action = useSaveAction({
    baseline: EMPTY_FORM,
    value: form,
    validate: (v) =>
      Boolean(v.name.trim()) &&
      (guardian || Boolean(v.workspaceName.trim())) &&
      v.phone.replace(/\D/g, "").length === 9 &&
      v.password.length >= 8 &&
      v.password === v.confirm,
    save: async (v) => {
      const formattedPhone = `+84${v.phone.replace(/\D/g, "")}`;
      if (guardian) await registerParent(formattedPhone, v.password, v.name.trim());
      else await registerTeacher(formattedPhone, v.password, v.name.trim(), v.workspaceName.trim());
      registrationComplete.current = true;
    },
  });
  const loading = action.saving;
  const error = action.error ? registrationErrorMessage(action.error) : "";
  // Keep the form mounted while its own register request installs the new session;
  // the submit handler sends the user straight to the newly created workspace.
  if (getSession() && !loading && !registrationComplete.current) return <Navigate to="/chon-vai-tro" replace />;

  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await action.submit())) return;
    const memberships = getSession()?.me.memberships ?? [];
    navigate(guardian ? (memberships.length > 1 ? "/chon-vai-tro" : "/ph") : "/lop", { replace: true });
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
            onChange={(value) => setRole(value as RegisterRole)}
          />
        </div>
        {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
        <form className={s.form} onSubmit={submit} noValidate>
          <div className={s.field}>
            <label htmlFor="register-name">Tên hiển thị</label>
            <div className={s.textBox}>
              <input id="register-name" className={s.textInput} value={name} onChange={(event) => setField("name")(event.target.value)} autoComplete="name" placeholder={guardian ? "Mẹ của Minh Anh" : "Cô Lan"} />
            </div>
          </div>
          {!guardian && <div className={s.field}>
            <label htmlFor="register-workspace">Tên không gian làm việc</label>
            <div className={s.textBox}>
              <input id="register-workspace" className={s.textInput} value={workspaceName} onChange={(event) => setField("workspaceName")(event.target.value)} autoComplete="organization" placeholder="Lớp của cô Lan" />
            </div>
          </div>}
          <PhoneField value={phone} onChange={setField("phone")} id="register-phone" />
          <PasswordField label="Mật khẩu" value={password} onChange={setField("password")} autoComplete="new-password" id="register-password" hint={<PasswordStrength password={password} />} />
          <div className={s.checks}><CheckRow ok={password.length >= 8}>Tối thiểu 8 ký tự</CheckRow></div>
          <PasswordField label="Nhập lại mật khẩu" value={confirm} onChange={setField("confirm")} autoComplete="new-password" id="register-confirm" error={mismatch} errorText={mismatch ? "Mật khẩu nhập lại không khớp." : undefined} />
          <p className={s.note}>{guardian ? "Con sẽ tự hiện ở đây khi hồ sơ học sinh có đúng số điện thoại này. Chưa khớp hồ sơ nào thì bạn vẫn dùng được tài khoản." : "Người tạo là quản trị viên đầu tiên của không gian làm việc."}</p>
          <button type="submit" className={s.submit} disabled={!action.canSave} aria-busy={loading || undefined}>{loading ? "Đang tạo…" : guardian ? "Tạo tài khoản" : "Tạo không gian làm việc"}</button>
        </form>
      </div>
    </main>
  );
}
