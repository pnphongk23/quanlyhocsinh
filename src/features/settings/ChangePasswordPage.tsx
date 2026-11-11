import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, changePassword } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button } from "../../shared/ui";
import { FormPage } from "../../shared/layout";
import { CheckRow, PasswordField, PasswordStrength } from "../auth/authUi";
import a from "../auth/auth.module.css";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";

const PASSWORD_MIN_LENGTH = 8;


export const EMPTY_PASSWORD_FORM = { current: "", next: "", confirm: "" };

/** Đủ ba ô, mật khẩu mới từ 8 ký tự, khớp ô nhập lại và khác mật khẩu hiện tại. */
export function isPasswordFormValid(v: typeof EMPTY_PASSWORD_FORM): boolean {
  return Boolean(v.current) && v.next.length >= PASSWORD_MIN_LENGTH && v.next === v.confirm && v.next !== v.current;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const saved = useSavedPeek();
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

  const mismatch = confirm.length > 0 && confirm !== next;
  const sameAsCurrent = next.length > 0 && next === current;
  const error = action.error
    ? authFailureMessage(action.error)
    : sameAsCurrent
      ? "Mật khẩu mới phải khác mật khẩu hiện tại."
      : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((await action.submit()) && (await saved.peek())) navigate("/cai-dat", { replace: true });
  }

  return (
    <FormPage
      breadcrumb={<><Link to="/cai-dat">Cài đặt</Link><span aria-hidden="true">/</span><span>Đổi mật khẩu</span></>}
      backTo="/cai-dat"
      title="Đổi mật khẩu"
      subtitle="Mật khẩu mới cần ít nhất 8 ký tự và khác mật khẩu hiện tại."
      footer={<><Button type="button" variant="neutral" onClick={() => navigate("/cai-dat")}>Huỷ</Button><Button type="submit" form="change-password-form" size="lg" disabled={!action.canSave} loading={action.saving} done={action.justSaved}>Lưu mật khẩu mới</Button></>}
    >
      <form id="change-password-form" className={`${a.form} ${a.formFill}`} onSubmit={submit} noValidate>
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
        <div className={a.checks} data-measure="form-field">
          <CheckRow ok={next.length >= PASSWORD_MIN_LENGTH}>
            Tối thiểu {PASSWORD_MIN_LENGTH} ký tự
          </CheckRow>
        </div>
      </form>
    </FormPage>
  );
}
