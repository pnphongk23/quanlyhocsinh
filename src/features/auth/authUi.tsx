import { useId, useState, type ReactNode } from "react";
import { Icon } from "../../shared/ui";
import s from "./auth.module.css";

/** Ô số điện thoại có tiền tố +84 cố định (spec mục 4 "Tài khoản"). */
export function PhoneField({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  error = false,
  label = "Số điện thoại",
  id,
}: {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  label?: string;
  id?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={s.field}>
      <label htmlFor={inputId}>{label}</label>
      <div
        className={[
          s.phoneBox,
          disabled ? s.boxDisabled : "",
          readOnly ? s.boxReadOnly : "",
          error ? s.boxError : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={s.prefix}>+84</span>
        <input
          id={inputId}
          className={s.phoneInput}
          value={value}
          onChange={(event) => {
            const digits = event.target.value
              .replace(/[^\d]/g, "")
              .replace(/^84/, "")
              .replace(/^0/, "")
              .slice(0, 9);
            onChange?.(digits.match(/\d{1,3}/g)?.join(" ") ?? "");
          }}
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="900 000 001"
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error || undefined}
        />
        {readOnly && (
          <span className={s.readOnlyTag}>
            <Icon name="lock" size={16} />
            Chỉ đọc
          </span>
        )}
      </div>
    </div>
  );
}

/** Ô mật khẩu có nút hiện/ẩn (spec mục 4 "Tài khoản"). */
export function PasswordField({
  label,
  value,
  onChange,
  name,
  autoComplete = "current-password",
  error = false,
  errorText,
  disabled = false,
  id,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  autoComplete?: string;
  error?: boolean;
  errorText?: string;
  disabled?: boolean;
  id?: string;
  hint?: ReactNode;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  const [shown, setShown] = useState(false);
  return (
    <div className={s.field}>
      <label htmlFor={inputId}>{label}</label>
      <div
        className={[
          s.passwordBox,
          disabled ? s.boxDisabled : "",
          error ? s.boxError : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          id={inputId}
          name={name}
          className={s.passwordInput}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error || undefined}
        />
        <button
          type="button"
          className={s.eye}
          aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={shown}
          disabled={disabled}
          onClick={() => setShown((current) => !current)}
        >
          <Icon name="eye" />
        </button>
      </div>
      {errorText && (
        <p className={s.fieldError} role="alert">
          {errorText}
        </p>
      )}
      {hint}
    </div>
  );
}

/** Thanh độ mạnh 4 đoạn + nhãn (gợi ý, không chặn đăng ký). */
export function PasswordStrength({ password }: { password: string }) {
  const score = (password.length >= 8 ? 1 : 0) + (password.length >= 12 ? 1 : 0) + (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 1 : 0) + (/\d/.test(password) || /[^\w\s]/.test(password) ? 1 : 0);
  const label = ["Yếu", "Yếu", "Trung bình", "Khá", "Mạnh"][Math.min(score, 4)];
  if (!password) return null;
  return (
    <div className={s.strength} aria-label={`Độ mạnh mật khẩu: ${label}`}>
      <div className={s.strengthBars} aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={
              s.strengthBar +
                (index < score ? " " + s.strengthBarOn : "")
            }
          />
        ))}
      </div>
        <span className={s.strengthLabel}>{label}</span>
    </div>
  );
}

/** Dòng quy tắc mật khẩu: dấu tích xanh khi đạt, chấm xám khi chưa. */
export function CheckRow({
  ok,
  children,
}: {
  ok: boolean;
  children: ReactNode;
}) {
  return (
    <p className={s.checkRow + (ok ? " " + s.checkOk : "")}>
      <span className={s.checkDot} aria-hidden="true">
        {ok ? <Icon name="check" size={14} /> : null}
      </span>
      {children}
    </p>
  );
}
