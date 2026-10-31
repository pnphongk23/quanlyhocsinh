import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { authFailureMessage, registerParent, registerTeacher } from "../../data/auth";
import { ApiError } from "../../data/api/client";
import { nationalPhoneDisplay } from "../../data/auth/phone";
import { getSession } from "../../data/auth/session";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, Icon } from "../../shared/ui";
import { landingPathForSession } from "./landingPath";
import { CheckRow, EmailField, PasswordField, PasswordStrength, PhoneField, emailFieldError, looksLikeEmail } from "./authUi";
import s from "./auth.module.css";

type RegisterRole = "teacher" | "guardian";

/** Trạng thái điều hướng từ bước kiểm tra SĐT ở màn đăng nhập. */
interface RegisterLocationState { phone?: string; role?: RegisterRole }

export function registrationErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.error.code === "phone_registered") {
    return "Số điện thoại đã có tài khoản. Hãy đăng nhập.";
  }
  if (error instanceof ApiError && error.status === 403 && error.error.details?.reason === "phone_not_declared") {
    return "Số điện thoại này chưa được khai trong hệ thống. Hãy liên hệ người quản lý lớp.";
  }
  return authFailureMessage(error);
}

const EMPTY_FORM = { name: "", workspaceName: "", phone: "", email: "", password: "", confirm: "" };

export default function RegisterPage() {
  const navigate = useNavigate();
  const from = (useLocation().state ?? {}) as RegisterLocationState;
  const guardian = from.role === "guardian" && Boolean(from.phone);
  const [initialForm] = useState(() => ({ ...EMPTY_FORM, phone: from.phone ? nationalPhoneDisplay(from.phone) : "" }));
  const [form, setForm] = useState(initialForm);
  const { name, workspaceName, phone, email, password, confirm } = form;
  const setField = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const registrationComplete = useRef(false);
  const action = useSaveAction({
    baseline: initialForm,
    value: form,
    validate: (v) =>
      (guardian || (Boolean(v.name.trim()) && Boolean(v.workspaceName.trim()))) &&
      v.phone.replace(/\D/g, "").length === 9 &&
      (!v.email.trim() || looksLikeEmail(v.email)) &&
      v.password.length >= 8 &&
      v.password === v.confirm,
    save: async (v) => {
      const formattedPhone = `+84${v.phone.replace(/\D/g, "")}`;
      if (guardian) await registerParent(formattedPhone, v.password);
      else await registerTeacher(formattedPhone, v.password, v.name.trim(), v.workspaceName.trim(), v.email.trim() || undefined);
      registrationComplete.current = true;
    },
  });
  const loading = action.saving;
  const emailError = action.error ? emailFieldError(action.error) : "";
  const error = action.error && !emailError ? registrationErrorMessage(action.error) : "";
  // Keep the form mounted while its own register request installs the new session;
  // the submit handler sends the user straight to the newly created workspace.
  if (getSession() && !loading && !registrationComplete.current) return <Navigate to="/chon-vai-tro" replace />;

  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await action.submit())) return;
    navigate(guardian ? landingPathForSession(getSession()) : "/lop", { replace: true });
  }

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.backRow}>
          <Link to="/dang-nhap" className={s.backButton} aria-label="Quay lại đăng nhập"><Icon name="back" /></Link>
          <Link to="/dang-nhap" className={s.backLink}><Icon name="back" size={18} /> Quay lại đăng nhập</Link>
        </div>
        <h1 className={s.title}>{guardian ? "Đặt mật khẩu" : "Tạo không gian làm việc"}</h1>
        {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
        <form className={s.form} onSubmit={submit} noValidate>
          {!guardian && <div className={s.field}>
            <label htmlFor="register-name">Tên hiển thị</label>
            <div className={s.textBox}>
              <input id="register-name" className={s.textInput} value={name} onChange={(event) => setField("name")(event.target.value)} autoComplete="name" placeholder="Cô Lan" />
            </div>
          </div>}
          {!guardian && <div className={s.field}>
            <label htmlFor="register-workspace">Tên không gian làm việc</label>
            <div className={s.textBox}>
              <input id="register-workspace" className={s.textInput} value={workspaceName} onChange={(event) => setField("workspaceName")(event.target.value)} autoComplete="organization" placeholder="Lớp của cô Lan" />
            </div>
          </div>}
          <PhoneField value={phone} onChange={setField("phone")} id="register-phone" readOnly={guardian} />
          {!guardian && <EmailField label="Email (không bắt buộc)" value={email} onChange={setField("email")} id="register-email" errorText={emailError} hint={<p className={s.note}>Email chỉ dùng để lấy lại mật khẩu.</p>} />}
          <PasswordField label="Mật khẩu" value={password} onChange={setField("password")} autoComplete="new-password" id="register-password" hint={<PasswordStrength password={password} />} />
          <div className={s.checks}><CheckRow ok={password.length >= 8}>Tối thiểu 8 ký tự</CheckRow></div>
          <PasswordField label="Nhập lại mật khẩu" value={confirm} onChange={setField("confirm")} autoComplete="new-password" id="register-confirm" error={mismatch} errorText={mismatch ? "Mật khẩu nhập lại không khớp." : undefined} />
          <p className={s.note}>{guardian ? "Đặt mật khẩu lần đầu để vào ứng dụng. Các vai trò được khai cho số này sẽ hiện sau khi đăng nhập." : "Người tạo là quản trị viên đầu tiên của không gian làm việc."}</p>
          <Button type="submit" size="lg" block className={s.submitAction} disabled={!action.canSave} loading={loading} done={action.justSaved}>{guardian ? "Vào ứng dụng" : "Tạo không gian làm việc"}</Button>
        </form>
      </div>
    </main>
  );
}
