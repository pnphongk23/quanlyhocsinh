import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, changePassword } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { Button, Icon } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength } from "../auth/authUi";
import a from "../auth/auth.module.css";
import s from "./settings.module.css";
import { savedPeek } from "../closeAfterSaved";

const PASSWORD_MIN_LENGTH = 8;


export const EMPTY_PASSWORD_FORM = { current: "", next: "", confirm: "" };

/** Đủ ba ô, mật khẩu mới từ 8 ký tự, khớp ô nhập lại và khác mật khẩu hiện tại. */
export function isPasswordFormValid(v: typeof EMPTY_PASSWORD_FORM): boolean {
  return Boolean(v.current) && v.next.length >= PASSWORD_MIN_LENGTH && v.next === v.confirm && v.next !== v.current;
}

export default function ChangePasswordPage() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_PASSWORD_FORM);
  const { current, next, confirm } = form;
  const setField = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const action = useSaveAction({
    baseline: EMPTY_PASSWORD_FORM,
    value: form,
    validate: isPasswordFormValid,
    save: (v) => changePassword(v.current, v.next),
  });
  if (!getSession()) return <Navigate to="/dang-nhap" replace />;
  if (desktop) return <Navigate to="/cai-dat" replace />;

  const mismatch = confirm.length > 0 && confirm !== next;
  const sameAsCurrent = next.length > 0 && next === current;
  const error = action.error
    ? authFailureMessage(action.error)
    : sameAsCurrent
      ? "Mật khẩu mới phải khác mật khẩu hiện tại."
      : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.submit()) {
      await savedPeek();
      navigate("/cai-dat", { replace: true });
    }
  }

  return (
    <main className={s.passwordPage}>
      <Link to="/cai-dat" className={s.backButton} aria-label="Quay lại">
        <Icon name="back" />
      </Link>
      <h1 className={s.pageTitle}>Đổi mật khẩu</h1>
      <form className={`${a.form} ${a.formFill}`} onSubmit={submit} noValidate>
        <PasswordField
          label="Mật khẩu hiện tại"
          value={current}
          onChange={setField("current")}
          autoComplete="current-password"
          id="change-current"
        />
        <PasswordField
          label="Mật khẩu mới"
          value={next}
          onChange={setField("next")}
          autoComplete="new-password"
          id="change-new"
          error={Boolean(error)}
          errorText={error || undefined}
          hint={<PasswordStrength password={next} />}
        />
        <PasswordField
          label="Nhập lại mật khẩu mới"
          value={confirm}
          onChange={setField("confirm")}
          autoComplete="new-password"
          id="change-confirm"
          error={mismatch}
          errorText={mismatch ? "Mật khẩu nhập lại chưa khớp." : undefined}
        />
        <div className={a.checks}>
          <CheckRow ok={next.length >= PASSWORD_MIN_LENGTH}>
            Tối thiểu {PASSWORD_MIN_LENGTH} ký tự
          </CheckRow>
        </div>
        <Button type="submit" size="lg" block className={a.submitSticky} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
          Lưu mật khẩu mới
        </Button>
      </form>
    </main>
  );
}
