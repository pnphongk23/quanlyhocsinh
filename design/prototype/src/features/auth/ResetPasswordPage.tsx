import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PASSWORD_MIN_LENGTH } from "../../data/authAccounts";
import {
  PASSWORD_ERRORS,
  confirmPasswordReset,
  isResetTokenUsable,
} from "../../data/repositories/auth";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, EmptyState } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength } from "./authUi";
import s from "./auth.module.css";

type Stage = "form" | "invalid" | "done";

/** Token trong fragment `#token=…` (không đi vào log máy chủ hay lịch sử truy vấn). */
function tokenFromHash(hash: string): string {
  return new URLSearchParams(hash.replace(/^#/, "")).get("token") ?? "";
}

/**
 * Đặt mật khẩu mới từ link trong email (`/dat-lai-mat-khau#token=…`). Link hết
 * hạn hoặc đã dùng thì báo lỗi kèm đường về Quên mật khẩu; đổi thành công thì
 * mọi thiết bị bị đăng xuất.
 */
export default function ResetPasswordPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => tokenFromHash(hash));
  const [stage, setStage] = useState<Stage>(() =>
    token && isResetTokenUsable(token) ? "form" : "invalid",
  );
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  // Bỏ token khỏi thanh địa chỉ sau khi đã đọc.
  useEffect(() => {
    if (hash) navigate({ hash: "" }, { replace: true });
  }, [hash, navigate]);

  const mismatch = confirm.length > 0 && confirm !== next;
  const action = useSaveAction({
    baseline: { next: "", confirm: "" },
    value: { next, confirm },
    validate: (value) =>
      value.next.length >= PASSWORD_MIN_LENGTH && value.confirm === value.next,
    save: (value) => {
      const result = confirmPasswordReset(token, value.next, value.confirm);
      if (result.kind === "ok") {
        setStage("done");
        return true;
      }
      if (result.kind === "token_invalid") {
        setStage("invalid");
        return false;
      }
      setError(
        result.kind === "too_short"
          ? PASSWORD_ERRORS.tooShort
          : PASSWORD_ERRORS.mismatch,
      );
      return false;
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action.submit();
  }

  return (
    <main className={s.page}>
      <div className={s.card}>
        <h1 className={s.title}>Đặt mật khẩu mới</h1>

        {stage === "invalid" && (
          <div className={s.resultBlock} role="alert">
            <EmptyState
              mascot="cho"
              title="Link không dùng được"
              description="Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Hãy yêu cầu một link mới."
              action={
                <Link to="/quen-mat-khau" className={s.buttonLink + " " + s.submit + " " + s.resultButton}>
                  Quên mật khẩu
                </Link>
              }
            />
          </div>
        )}

        {stage === "done" && (
          <div className={s.resultBlock} role="status">
            <EmptyState
              mascot="vui"
              title="Đã đổi mật khẩu"
              description="Mọi thiết bị đã đăng xuất. Hãy đăng nhập bằng mật khẩu mới."
              action={
                <Link to="/dang-nhap" className={s.buttonLink + " " + s.submit + " " + s.resultButton}>
                  Đăng nhập
                </Link>
              }
            />
          </div>
        )}

        {stage === "form" && (
          <>
            <p className={s.description}>
              Chọn mật khẩu mới cho tài khoản của bạn. Link này chỉ dùng được một
              lần.
            </p>
            <form className={s.form + " " + s.forgotPhone} onSubmit={submit} noValidate>
              <PasswordField
                label="Mật khẩu mới"
                value={next}
                onChange={(value) => {
                  setNext(value);
                  setError("");
                }}
                autoComplete="new-password"
                id="reset-new"
                error={Boolean(error)}
                errorText={error || undefined}
                hint={<PasswordStrength password={next} />}
              />
              <div className={s.checks}>
                <CheckRow ok={next.length >= PASSWORD_MIN_LENGTH}>
                  Tối thiểu {PASSWORD_MIN_LENGTH} ký tự
                </CheckRow>
              </div>
              <PasswordField
                label="Nhập lại mật khẩu mới"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                id="reset-confirm"
                error={mismatch}
                errorText={mismatch ? PASSWORD_ERRORS.mismatch : undefined}
              />
              <Button
                type="submit"
                size="lg"
                block
                className={s.submitAction}
                disabled={!action.canSave}
                loading={action.saving}
              >
                Đặt mật khẩu mới
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
