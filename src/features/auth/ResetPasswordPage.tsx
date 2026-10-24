import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authFailureMessage, confirmPasswordReset } from "../../data/auth";
import { ApiError } from "../../data/api/client";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength } from "./authUi";
import s from "./auth.module.css";

const EMPTY = { password: "", confirm: "" };
/** Token giữ trong bộ nhớ sau khi đã xoá khỏi URL; render lại (kể cả StrictMode) không mất token. */
let heldToken: string | null = null;

/** Lấy token từ `#token=…` rồi xoá hash để token không nằm lại trong URL hay lịch sử. */
function takeTokenFromHash(): string | null {
  if (typeof window === "undefined") return heldToken;
  const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
  if (token) {
    heldToken = token;
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }
  return heldToken;
}

export function resetFailureMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return "Bạn thử quá nhiều lần. Hãy chờ ít phút rồi thử lại.";
  return authFailureMessage(error);
}

export default function ResetPasswordPage() {
  const [token] = useState(takeTokenFromHash);
  const [form, setForm] = useState(EMPTY);
  const [expired, setExpired] = useState(token === null);
  const [done, setDone] = useState(false);
  const { password, confirm } = form;
  const action = useSaveAction({
    baseline: EMPTY,
    value: form,
    validate: (v) => v.password.length >= 8 && v.password === v.confirm,
    save: async (v) => {
      try {
        await confirmPasswordReset(token ?? "", v.password);
      } catch (error) {
        if (error instanceof ApiError && error.status === 400 && error.error.code === "token_invalid") {
          heldToken = null;
          setExpired(true);
        }
        throw error;
      }
      heldToken = null;
    },
  });
  const mismatch = confirm.length > 0 && confirm !== password;
  const error = action.error && !expired ? resetFailureMessage(action.error) : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.submit()) setDone(true);
  }

  if (done) {
    return <main className={s.page}><div className={s.card}>
      <h1 className={s.title}>Đã đổi mật khẩu</h1>
      <p className={`${s.banner} ${s.bannerInfo} ${s.bannerTop}`} role="status">Đã đổi mật khẩu, mọi thiết bị đã đăng xuất.</p>
      <Link to="/dang-nhap" className={`${s.buttonLink} ${s.submit}`}>Đăng nhập</Link>
    </div></main>;
  }
  if (expired) {
    return <main className={s.page}><div className={s.card}>
      <h1 className={s.title}>Không dùng được link</h1>
      <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">Link hết hạn hoặc đã dùng.</p>
      <Link to="/quen-mat-khau" className={`${s.buttonLink} ${s.submit}`}>Quên mật khẩu</Link>
    </div></main>;
  }
  return <main className={s.page}><div className={s.card}>
    <h1 className={s.title}>Đặt lại mật khẩu</h1>
    <p className={s.description}>Nhập mật khẩu mới cho tài khoản của bạn.</p>
    {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
    <form className={s.form} onSubmit={submit} noValidate>
      <PasswordField label="Mật khẩu mới" value={password} onChange={(value) => setForm((f) => ({ ...f, password: value }))} autoComplete="new-password" id="reset-password" hint={<PasswordStrength password={password} />} />
      <div className={s.checks}><CheckRow ok={password.length >= 8}>Tối thiểu 8 ký tự</CheckRow></div>
      <PasswordField label="Nhập lại mật khẩu mới" value={confirm} onChange={(value) => setForm((f) => ({ ...f, confirm: value }))} autoComplete="new-password" id="reset-confirm" error={mismatch} errorText={mismatch ? "Mật khẩu nhập lại không khớp." : undefined} />
      <Button type="submit" size="lg" block className={s.submitAction} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>Đặt lại mật khẩu</Button>
    </form>
  </div></main>;
}
