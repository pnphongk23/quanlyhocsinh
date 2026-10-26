import { useState, type FormEvent } from "react";
import {
  EMAIL_INVALID,
  PASSWORD_WRONG,
} from "../../data/authAccounts";
import {
  currentRecoveryEmail,
  saveRecoveryEmail,
} from "../../data/repositories/auth";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button } from "../../shared/ui";
import { EmailField, PasswordField } from "../auth/authUi";
import s from "./recoveryEmail.module.css";

/**
 * Email khôi phục trong Cài đặt (spec mục 4 "Tài khoản"): xem, sửa hoặc xoá
 * email của tài khoản đang đăng nhập. Mỗi lần lưu phải nhập mật khẩu hiện tại.
 * Email chỉ dùng để lấy lại mật khẩu.
 */
export default function RecoveryEmailCard() {
  const [stored, setStored] = useState(currentRecoveryEmail);
  const [email, setEmail] = useState(stored);
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function apply(nextEmail: string, currentPassword: string): boolean {
    try {
      const saved = saveRecoveryEmail(nextEmail, currentPassword);
      setStored(saved);
      setEmail(saved);
      setPassword("");
      setEmailError("");
      setPasswordError("");
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : PASSWORD_WRONG;
      if (message === EMAIL_INVALID) setEmailError(message);
      else setPasswordError(message);
      return false;
    }
  }

  const saveAction = useSaveAction({
    baseline: { email: stored, password: "" },
    value: { email, password },
    validate: (value) =>
      value.email.trim() !== "" &&
      value.email.trim().toLowerCase() !== stored &&
      value.password !== "",
    save: (value) => apply(value.email, value.password),
  });
  const removeAction = useSaveAction({
    baseline: { password: "" },
    value: { password },
    validate: (value) => stored !== "" && value.password !== "",
    save: (value) => apply("", value.password),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveAction.submit();
  }

  return (
    <section className={s.card} aria-label="Email khôi phục">
      <h2 className={s.head}>Email khôi phục</h2>
      <p className={s.hint}>Email chỉ dùng để lấy lại mật khẩu.</p>
      <p className={s.current} role="status">
        {stored
          ? `Đang dùng: ${stored}`
          : "Chưa có email. Thêm email để tự đặt lại mật khẩu khi quên."}
      </p>
      <form className={s.form} onSubmit={submit} noValidate>
        <EmailField
          label={stored ? "Email mới" : "Email"}
          value={email}
          onChange={(value) => {
            setEmail(value);
            setEmailError("");
          }}
          errorText={emailError}
          id="settings-email"
        />
        <PasswordField
          label="Mật khẩu hiện tại"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setPasswordError("");
          }}
          autoComplete="current-password"
          error={Boolean(passwordError)}
          errorText={passwordError || undefined}
          hint={
            <p className={s.hint}>Cần mật khẩu hiện tại để lưu hoặc xoá email.</p>
          }
          id="settings-email-password"
        />
        <div className={s.actions}>
          {stored && (
            <Button
              variant="secondary"
              disabled={!removeAction.canSave}
              loading={removeAction.saving}
              onClick={() => void removeAction.submit()}
            >
              Xoá email
            </Button>
          )}
          <Button
            type="submit"
            disabled={!saveAction.canSave}
            loading={saveAction.saving}
            done={saveAction.justSaved}
          >
            Lưu email
          </Button>
        </div>
      </form>
    </section>
  );
}
