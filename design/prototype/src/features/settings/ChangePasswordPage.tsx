import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { PASSWORD_MIN_LENGTH } from "../../data/authAccounts";
import { PASSWORD_ERRORS, changePassword } from "../../data/repositories/auth";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, Icon } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength } from "../auth/authUi";
import a from "../auth/auth.module.css";
import s from "./settings.module.css";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";

/**
 * Đổi mật khẩu trong Cài đặt (mobile). Trên web desktop khối đổi mật khẩu nằm
 * ngay trong màn Cài đặt nên đường dẫn này quay về đó.
 */
export default function ChangePasswordPage() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const saved = useSavedPeek();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const mismatch = confirm.length > 0 && confirm !== next;
  const action = useSaveAction({
    baseline: { current: "", next: "", confirm: "" },
    value: { current, next, confirm },
    validate: (value) =>
      Boolean(value.current) &&
      value.next.length >= PASSWORD_MIN_LENGTH &&
      value.confirm === value.next,
    save: (value) => {
      try {
        changePassword(value.current, value.next, value.confirm);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : PASSWORD_ERRORS.wrong);
        return false;
      }
    },
  });
  const blocked = !action.canSave;
  if (desktop) return <Navigate to="/cai-dat" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((await action.submit()) && (await saved.peek())) navigate("/cai-dat", { replace: true });
  }

  return (
    <main className={s.passwordPage}>
      <Link to="/cai-dat" className={s.backButton} aria-label="Quay lại">
        <Icon name="back" />
      </Link>
      <h1 className={s.pageTitle}>Đổi mật khẩu</h1>
      <form className={a.form + " " + a.formFill} onSubmit={submit} noValidate>
        <PasswordField
          label="Mật khẩu hiện tại"
          value={current}
          onChange={(value) => {
            setCurrent(value);
            setError("");
          }}
          autoComplete="current-password"
          id="change-current"
        />
        <PasswordField
          label="Mật khẩu mới"
          value={next}
          onChange={(value) => {
            setNext(value);
            setError("");
          }}
          autoComplete="new-password"
          id="change-new"
          error={Boolean(error)}
          errorText={error || undefined}
          hint={<PasswordStrength password={next} />}
        />
        <PasswordField
          label="Nhập lại mật khẩu mới"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          id="change-confirm"
          error={mismatch}
          errorText={mismatch ? PASSWORD_ERRORS.mismatch : undefined}
        />
        <div className={a.checks}>
          <CheckRow ok={next.length >= PASSWORD_MIN_LENGTH}>
            Tối thiểu {PASSWORD_MIN_LENGTH} ký tự
          </CheckRow>
        </div>
        <Button
          type="submit"
          size="lg"
          block
          className={a.submitSticky}
          disabled={blocked}
          loading={action.saving}
          done={action.justSaved}
        >
          Lưu mật khẩu mới
        </Button>
      </form>
    </main>
  );
}
