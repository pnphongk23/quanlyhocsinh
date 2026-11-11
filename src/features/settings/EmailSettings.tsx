import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { setAccountEmail } from "../../data/auth";
import { ApiError, rateLimitMessage } from "../../data/api/client";
import { getSession, subscribeSession } from "../../data/auth/session";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";
import { FormPage } from "../../shared/layout";
import { Button, Icon } from "../../shared/ui";
import { EmailField, PasswordField, emailFieldError, looksLikeEmail } from "../auth/authUi";
import settings from "./settings.module.css";
import s from "./emailSettings.module.css";

type Mode = "view" | "edit" | "remove";

export function emailSaveFailure(error: unknown): { password: string; email: string; banner: string } {
  const none = { password: "", email: "", banner: "" };
  if (!(error instanceof ApiError)) return { ...none, banner: "Không thể kết nối. Hãy kiểm tra mạng rồi thử lại." };
  if (error.status === 401) return { ...none, password: "Mật khẩu hiện tại chưa đúng." };
  if (error.status === 429) return { ...none, banner: rateLimitMessage(error) };
  const email = emailFieldError(error);
  if (email) return { ...none, email };
  return { ...none, banner: "Không thể lưu email. Hãy thử lại." };
}

export function EmailSettingsSummary() {
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const email = session?.user.email ?? "";
  return (
    <Link className={settings.menuRow} data-measure="row" to="/cai-dat/email">
      <span className={settings.rowMain}>
        <span className={settings.rowTitle}>Email khôi phục</span>
        <span className={settings.rowDescription}>{email ? `${email} · dùng để lấy lại mật khẩu` : "Chưa có email · dùng để lấy lại mật khẩu"}</span>
      </span>
      <Icon name="chevron-right" />
    </Link>
  );
}

/** Email khôi phục: xem, thêm, sửa, xoá; mọi thay đổi cần mật khẩu hiện tại. */
export default function EmailSettingsPage() {
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const saved = session?.user.email ?? "";
  const [mode, setMode] = useState<Mode>("edit");
  const [form, setForm] = useState({ email: saved, password: "" });
  const peek = useSavedPeek();
  const action = useSaveAction({
    baseline: { email: mode === "edit" ? saved : "", password: "" },
    value: form,
    validate: (value) => Boolean(value.password) && (mode === "remove" || looksLikeEmail(value.email)),
    save: (value) => setAccountEmail(mode === "remove" ? null : value.email.trim(), value.password),
  });
  const failure = action.error ? emailSaveFailure(action.error) : { password: "", email: "", banner: "" };

  function open(next: Mode) {
    peek.cancel();
    action.reset();
    setForm({ email: next === "edit" ? saved : "", password: "" });
    setMode(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((await action.submit()) && (await peek.peek())) setMode("view");
  }

  const footer = mode === "view" ? null : (
    <>
      <Button type="button" variant="neutral" disabled={action.saving} onClick={() => setMode("view")}>Huỷ</Button>
      {mode === "edit" && saved && <Button type="button" variant="danger" disabled={action.saving} onClick={() => open("remove")}>Xoá email</Button>}
      <Button type="submit" form="email-settings-form" variant={mode === "remove" ? "danger" : "primary"} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
        {mode === "remove" ? "Xoá email" : "Lưu email"}
      </Button>
    </>
  );

  return (
    <FormPage
      breadcrumb={<><Link to="/cai-dat">Cài đặt</Link><span aria-hidden="true">/</span><span>Email khôi phục</span></>}
      backTo="/cai-dat"
      title="Email khôi phục"
      subtitle="Email chỉ dùng để lấy lại mật khẩu, không hiện với phụ huynh."
      footer={footer}
    >
      {mode === "view" ? (
        <section className={s.savedPanel} aria-label="Email khôi phục">
          <p className={s.savedValue}>{saved || "Chưa có email khôi phục."}</p>
          <div className={s.actions}>
            <Button variant="secondary" onClick={() => open("edit")}>{saved ? "Sửa email" : "Thêm email"}</Button>
            {saved && <Button variant="danger" onClick={() => open("remove")}>Xoá email</Button>}
          </div>
        </section>
      ) : (
        <form id="email-settings-form" className={s.form} onSubmit={submit} noValidate>
          {mode === "edit" && <EmailField label="Email" value={form.email} onChange={(email) => setForm((current) => ({ ...current, email }))} id="email-address" errorText={failure.email} />}
          <PasswordField
            label="Mật khẩu hiện tại"
            value={form.password}
            onChange={(password) => setForm((current) => ({ ...current, password }))}
            id="email-current-password"
            autoComplete="current-password"
            error={Boolean(failure.password)}
            errorText={failure.password || undefined}
            hint={mode === "edit" ? "Cần mật khẩu hiện tại để đổi email." : undefined}
          />
          {failure.banner && <p className={s.banner} role="alert">{failure.banner}</p>}
        </form>
      )}
    </FormPage>
  );
}
