import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, checkPhone, login } from "../../data/auth";
import type { PhoneCheckNext } from "../../data/api/client";
import { normalizePhone } from "../../data/auth/phone";
import { getSession } from "../../data/auth/session";
import { Button } from "../../shared/ui";
import { Mascot } from "../../shared/ui/Mascot";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { PasswordField, PhoneField } from "./authUi";
import { landingPathForSession } from "./landingPath";
import s from "./auth.module.css";

const landingPath = () => landingPathForSession(getSession());

class InvalidPhoneError extends Error {}

/** Lỗi bước nhập SĐT: sai định dạng (báo sau khi bấm Tiếp tục) hoặc lỗi máy chủ. */
function phoneStepMessage(error: unknown): string {
  return error instanceof InvalidPhoneError ? "Số điện thoại không hợp lệ." : authFailureMessage(error);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [phoneInput, setPhoneInput] = useState("");
  const [password, setPassword] = useState("");
  // Số đã chuẩn hoá khi máy chủ xác nhận có tài khoản; có giá trị nghĩa là đang ở bước mật khẩu.
  const [loginPhone, setLoginPhone] = useState<string | null>(null);
  const checked = useRef<{ phone: string; next: PhoneCheckNext } | null>(null);

  const phoneStep = useSaveAction({
    baseline: "",
    isEqual: () => false,
    value: phoneInput,
    validate: (v) => v.trim() !== "",
    save: async (v) => {
      const phone = normalizePhone(v);
      if (!phone) throw new InvalidPhoneError();
      checked.current = { phone, next: await checkPhone(phone) };
    },
  });
  const passwordStep = useSaveAction({
    baseline: "",
    value: password,
    validate: (v) => v.length > 0,
    save: (v) => login(loginPhone ?? "", v),
  });

  const loading = phoneStep.saving || passwordStep.saving;
  const phoneError = phoneStep.error ? phoneStepMessage(phoneStep.error) : "";
  const passwordError = passwordStep.error ? authFailureMessage(passwordStep.error) : "";
  const error = loginPhone === null ? phoneError : passwordError;
  if (getSession() && !loading) return <Navigate to={landingPath()} replace />;

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await phoneStep.submit()) || !checked.current) return;
    const { phone, next } = checked.current;
    if (next === "login") setLoginPhone(phone);
    else navigate("/dang-ky", { state: { phone, role: next === "guardian_setup" ? "guardian" : "teacher" } });
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await passwordStep.submit()) navigate(landingPath(), { replace: true });
  }

  function changePhone() {
    setLoginPhone(null);
    setPassword("");
    phoneStep.reset();
    passwordStep.reset();
  }

  return <main className={s.page}><div className={s.card}>
    <div className={s.brand}><Mascot pose="chao" size={72} className={s.brandMascot}/></div>
    <h1 className={s.title}>Đăng nhập</h1>
    {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
    {loginPhone === null ? (
      <form className={s.form} onSubmit={submitPhone} noValidate>
        <PhoneField free value={phoneInput} onChange={setPhoneInput} error={Boolean(phoneError)} id="login-phone" />
        <Button type="submit" size="lg" block className={s.submitAction} disabled={!phoneStep.canSave} loading={phoneStep.saving}>Tiếp tục</Button>
      </form>
    ) : (
      <form className={s.form} onSubmit={submitPassword} noValidate>
        <PhoneField free readOnly value={phoneInput} id="login-phone" />
        <PasswordField label="Mật khẩu" value={password} onChange={setPassword} error={Boolean(passwordError)} autoComplete="current-password" id="login-password" />
        <div className={s.forgotRow}>
          <button type="button" className={s.forgotLink} onClick={changePhone}>Đổi số</button>
          <Link to={`/quen-mat-khau?sdt=${encodeURIComponent(loginPhone)}`} className={s.forgotLink}>Quên mật khẩu?</Link>
        </div>
        <Button type="submit" size="lg" block className={s.submitAction} disabled={!passwordStep.canSave} loading={passwordStep.saving} done={passwordStep.justSaved}>Đăng nhập</Button>
      </form>
    )}
  </div></main>;
}
