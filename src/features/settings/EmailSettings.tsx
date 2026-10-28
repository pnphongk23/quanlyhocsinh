import { useState, useSyncExternalStore, type FormEvent } from "react";
import { setAccountEmail } from "../../data/auth";
import { ApiError, rateLimitMessage } from "../../data/api/client";
import { getSession, subscribeSession } from "../../data/auth/session";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";
import { Button } from "../../shared/ui";
import { EmailField, PasswordField, emailFieldError, looksLikeEmail } from "../auth/authUi";
import m from "./emailSettings.module.css";

type Mode = "view" | "edit" | "remove";

/** Lỗi lưu email: `password` hiện tại ô mật khẩu, `email` tại ô email, `banner` đầu form. */
export function emailSaveFailure(error: unknown): { password: string; email: string; banner: string } {
  const none = { password: "", email: "", banner: "" };
  if (!(error instanceof ApiError)) return { ...none, banner: "Không thể kết nối. Hãy kiểm tra mạng rồi thử lại." };
  if (error.status === 401) return { ...none, password: "Mật khẩu hiện tại chưa đúng." };
  if (error.status === 429) return { ...none, banner: rateLimitMessage(error) };
  const email = emailFieldError(error);
  if (email) return { ...none, email };
  return { ...none, banner: "Không thể lưu email. Hãy thử lại." };
}

/** Email khôi phục: xem, thêm, sửa, xoá; mọi thay đổi cần mật khẩu hiện tại (PUT /me/email). */
export function EmailSettings({ idPrefix }: { idPrefix: string }) {
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const saved = session?.user.email ?? "";
  const [mode, setMode] = useState<Mode>("view");
  const peek = useSavedPeek();
  const [form, setForm] = useState({ email: "", password: "" });
  const action = useSaveAction({
    baseline: { email: mode === "edit" ? saved : "", password: "" },
    value: form,
    validate: (v) => Boolean(v.password) && (mode === "remove" || looksLikeEmail(v.email)),
    save: (v) => setAccountEmail(mode === "remove" ? null : v.email.trim(), v.password),
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

  return (
    <section className={m.block} aria-label="Email khôi phục">
      <div className={m.head}>
        <span className={m.label}>Email khôi phục</span>
        <span className={`${m.value}${saved ? "" : ` ${m.empty}`}`}>{saved || "Chưa có"}</span>
      </div>
      <p className={m.hint}>Email chỉ dùng để lấy lại mật khẩu.</p>
      {mode === "view" ? (
        <div className={m.actions}>
          <Button type="button" variant="secondary" size="md" onClick={() => open("edit")}>{saved ? "Sửa email" : "Thêm email"}</Button>
          {saved && <Button type="button" variant="neutral" size="md" onClick={() => open("remove")}>Xoá email</Button>}
        </div>
      ) : (
        <form className={m.form} onSubmit={submit} noValidate>
          {mode === "edit" && (
            <EmailField label="Email" value={form.email} onChange={(email) => setForm((f) => ({ ...f, email }))} id={`${idPrefix}-email`} errorText={failure.email} />
          )}
          <PasswordField
            label="Mật khẩu hiện tại"
            value={form.password}
            onChange={(password) => setForm((f) => ({ ...f, password }))}
            id={`${idPrefix}-email-password`}
            autoComplete="current-password"
            error={Boolean(failure.password)}
            errorText={failure.password || undefined}
          />
          {failure.banner && <p className={m.banner} role="alert">{failure.banner}</p>}
          <div className={m.actions}>
            <Button type="submit" size="md" variant={mode === "remove" ? "danger" : "primary"} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
              {mode === "remove" ? "Xoá email" : "Lưu email"}
            </Button>
            <Button type="button" variant="neutral" size="md" disabled={action.saving} onClick={() => open("view")}>Huỷ</Button>
          </div>
        </form>
      )}
    </section>
  );
}
