import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAuthSession, RESET_ERRORS, lookupPasswordReset, requestPasswordReset, type ResetLookup } from "../../data/repositories/auth";
import {
  EMAIL_INVALID,
  RESET_TOKEN_TTL_MS,
  lastPhone,
  maskEmail,
  normalizePhone,
  parseEmail,
} from "../../data/authAccounts";
import { getStore } from "../../data/store";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, EmptyState, Icon } from "../../shared/ui";
import { EmailField, PhoneField } from "./authUi";
import s from "./auth.module.css";

export type ForgotVariant = "guardian" | "teacher";

/**
 * Vai trò của SĐT (giáo viên hay phụ huynh), dùng để chọn lời nhắc phù hợp.
 */
export function resolveVariant(
  override: string | null,
  phone: string,
): ForgotVariant {
  if (override === "phu-huynh") return "guardian";
  if (override === "giao-vien") return "teacher";
  if (!phone) return "guardian";
  const state = getStore();
  const roleKinds = state.members
    .filter((member) => member.phone.replace(/^0/, "") === phone)
    .map(
      (member) => state.roles.find((role) => role.id === member.roleId)?.kind,
    );
  return roleKinds.includes("staff") ? "teacher" : "guardian";
}

/** SĐT hiển thị trong ô: ưu tiên `?sdt=`, rồi SĐT vừa nhập, rồi phiên hiện tại. */
export function forgotPhone(params: URLSearchParams): string {
  return (
    normalizePhone(params.get("sdt") ?? "") ||
    lastPhone() ||
    getAuthSession()?.phone ||
    ""
  );
}

const MINUTES = RESET_TOKEN_TTL_MS / 60000;

/** Chữ số đã chuẩn hoá → dạng hiển thị trong ô nhập "900 000 001". */
function phoneInputFor(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "").replace(/^0/, "");
  if (digits.length !== 9) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/**
 * Quên mật khẩu bằng email đã lưu (spec mục 4 "Tài khoản"): nhập SĐT; tài khoản
 * có email thì hỏi "Gửi link đặt lại mật khẩu tới t***@gmail.com?" và chỉ gửi
 * khi email nhập KHỚP email đã lưu. Không có cách nhập email mới ở màn này.
 */
export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const [phone, setPhone] = useState(() => {
    const initial = forgotPhone(params);
    return initial ? phoneInputFor(initial) : "";
  });
  const [lookup, setLookup] = useState<ResetLookup | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sent, setSent] = useState<{ token: string } | null>(null);

  const lookupAction = useSaveAction({
    baseline: { phone: "" },
    value: { phone },
    validate: (value) => normalizePhone(value.phone) !== "",
    save: (value) => {
      const result = lookupPasswordReset(value.phone);
      setLookup(result);
      setEmail(result.kind === "has_email" ? result.prefill : "");
      setEmailError("");
      return result.kind !== "no_account";
    },
  });

  const sendAction = useSaveAction({
    baseline: { email: "" },
    value: { email },
    validate: (value) => value.email.trim() !== "",
    save: (value) => {
      if (parseEmail(value.email) === null) {
        setEmailError(EMAIL_INVALID);
        return false;
      }
      const result = requestPasswordReset(phone, value.email);
      if (result.kind === "sent") {
        setSent({ token: result.token });
        return true;
      }
      setEmailError(
        result.kind === "email_mismatch"
          ? RESET_ERRORS.emailMismatch
          : EMAIL_INVALID,
      );
      return false;
    },
  });

  function changePhone(value: string) {
    setPhone(value);
    setLookup(null);
    setSent(null);
    setEmailError("");
  }

  async function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupAction.submit();
  }

  async function submitSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendAction.submit();
  }

  const noAccess = lookup?.kind === "no_account";
  const maskedEmail = lookup?.kind === "has_email" ? lookup.emailMasked : "";
  const sentTo = sent ? maskEmail(parseEmail(email) ?? "") : "";

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.backRow}>
          <Link to="/dang-nhap" className={s.backButton} aria-label="Quay lại đăng nhập">
            <Icon name="back" />
          </Link>
          <Link to="/dang-nhap" className={s.backLink}>
            <Icon name="back" size={18} />
            Quay lại đăng nhập
          </Link>
        </div>
        <h1 className={s.title}>Quên mật khẩu?</h1>

        {sent ? (
          <div className={s.resultBlock} role="status">
            <EmptyState
              mascot="vui"
              title="Đã gửi link đặt lại mật khẩu"
              description={`Link gửi tới ${sentTo}, hạn ${MINUTES} phút và chỉ dùng được một lần. Kiểm tra cả thư rác.`}
              action={
                <Link to="/dang-nhap" className={s.buttonLink + " " + s.submit + " " + s.resultButton}>
                  Quay lại đăng nhập
                </Link>
              }
            />
            <p className={s.resultNote}>
              Bản thử không gửi mail thật.{" "}
              <Link
                to={{ pathname: "/dat-lai-mat-khau", hash: `#token=${sent.token}` }}
                className={s.resultLink}
              >
                Mở link trong mail
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className={s.description}>
              Nhập số điện thoại của tài khoản. Link đặt lại mật khẩu sẽ gửi tới
              email bạn đã lưu trong Cài đặt.
            </p>

            <form className={s.form + " " + s.forgotPhone} onSubmit={submitLookup} noValidate>
              <PhoneField
                value={phone}
                onChange={changePhone}
                error={noAccess}
                id="forgot-phone"
              />
              {noAccess && (
                <p className={s.fieldError} role="alert">
                  Không tìm thấy tài khoản với số điện thoại này. Kiểm tra lại số
                  hoặc tạo tài khoản mới.
                </p>
              )}
              {!lookup && (
                <Button
                  type="submit"
                  size="lg"
                  block
                  className={s.submitAction}
                  disabled={!lookupAction.canSave}
                  loading={lookupAction.saving}
                >
                  Tiếp tục
                </Button>
              )}
            </form>

            {lookup?.kind === "no_email" && (
              <div className={s.resultBlock} role="status">
                <EmptyState
                  mascot="cho"
                  title="Tài khoản này chưa có email"
                  description="Không thể gửi link đặt lại. Hãy liên hệ người vận hành và cung cấp số điện thoại tài khoản để được đặt lại mật khẩu."
                  action={
                    <Link to="/dang-nhap" className={s.buttonLink + " " + s.submit + " " + s.resultButton}>
                      Quay lại đăng nhập
                    </Link>
                  }
                />
              </div>
            )}

            {lookup?.kind === "has_email" && (
              <form className={s.form} onSubmit={submitSend} noValidate>
                <p className={s.confirmPrompt}>
                  Gửi link đặt lại mật khẩu tới <b>{maskedEmail}</b>?
                </p>
                <EmailField
                  label="Nhập đầy đủ email này để xác nhận"
                  value={email}
                  onChange={(value) => {
                    setEmail(value);
                    setEmailError("");
                  }}
                  errorText={emailError}
                  id="forgot-email"
                />
                <Button
                  type="submit"
                  size="lg"
                  block
                  className={s.submitAction}
                  disabled={!sendAction.canSave}
                  loading={sendAction.saving}
                >
                  Gửi
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
