import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  LOGIN_INVALID,
  LOGIN_LOCKED,
  getAuthSession,
  isPhoneLocked,
  login,
} from "../../data/repositories/auth";
import { normalizePhone, rememberPhone } from "../../data/authAccounts";
import { roleLandingPath } from "../../roles/guardian/roleLanding";
import { Button } from "../../shared/ui";
import { Mascot } from "../../shared/ui/Mascot";
import { PasswordField, PhoneField } from "./authUi";
import s from "./auth.module.css";


/**
 * Đăng nhập dùng chung cho giáo viên và phụ huynh bằng SĐT + mật khẩu (spec
 * mục 4 "Tài khoản"). Không SMS, không OTP: sai 5 lần liên tiếp thì khoá tạm
 * 15 phút, thông báo lỗi không nói rõ SĐT hay mật khẩu sai.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const session = getAuthSession();
  const action = useSaveAction({
    baseline: { phone: "", password: "" },
    value: { phone, password },
    validate: (value) => value.phone.trim() !== "" && value.password !== "",
    save: (value) => {
      rememberPhone(normalizePhone(value.phone));
      try {
        login(value.phone, value.password);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : LOGIN_INVALID;
        if (message === LOGIN_LOCKED) {
          setLocked(true);
          setError("");
        } else {
          setError(message);
          setLocked(isPhoneLocked(value.phone));
        }
        return false;
      }
    },
  });

  /** Trang đầu sau đăng nhập: chọn vai trò hoặc vào ứng dụng. */
  function landingPath(): string {
    return (getAuthSession()?.memberIds.length ?? 0) > 1
      ? "/chon-vai-tro"
      : roleLandingPath();
  }

  if (session) return <Navigate to={landingPath()} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.submit()) navigate(landingPath(), { replace: true });
  }

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.brand}>
          <span className={s.logo} aria-hidden="true">
            L
          </span>
          <p className={s.brandName}>Quản lý lớp tiếng Anh</p>
          <Mascot pose="chao" size={72} className={s.brandMascot} />
        </div>
        <h1 className={s.title}>Đăng nhập</h1>
        <p className={s.description}>Dành cho giáo viên và phụ huynh.</p>

        {locked ? (
          <p className={s.banner + " " + s.bannerWarn + " " + s.bannerTop} role="alert">
            {LOGIN_LOCKED}
          </p>
        ) : (
          error && (
            <p
              className={s.banner + " " + s.bannerError + " " + s.bannerTop}
              role="alert"
            >
              {error}
            </p>
          )
        )}

        <form className={s.form} onSubmit={submit} noValidate>
          <PhoneField
            value={phone}
            onChange={setPhone}
            disabled={locked}
            error={Boolean(error) && !locked}
            id="login-phone"
          />
          <PasswordField
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            disabled={locked}
            error={Boolean(error) && !locked}
            autoComplete="current-password"
            id="login-password"
          />
          <div className={s.forgotRow}>
            <Link
              to={
                normalizePhone(phone)
                  ? `/quen-mat-khau?sdt=${normalizePhone(phone)}`
                  : "/quen-mat-khau"
              }
              className={s.forgotLink}
            >
              Quên mật khẩu?
            </Link>
          </div>
          <Button type="submit" size="lg" block className={s.submitAction} disabled={locked || !action.canSave} loading={action.saving} done={action.justSaved}>
            Đăng nhập
          </Button>
        </form>

        <div className={s.footerBlock}>
          <p className={s.registerRow}>
            Chưa có tài khoản?{" "}
            <Link to="/dang-ky" className={s.registerLink}>
              Tạo tài khoản
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
