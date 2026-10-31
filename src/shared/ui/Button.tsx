import type { ButtonHTMLAttributes } from "react";
import s from "./ui.module.css";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonClass";
import { Icon } from "./Icon";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Đang xử lý: disabled, `aria-busy`, vòng quay nhỏ; bề rộng giữ nguyên. */
  loading?: boolean;
  /** Vừa lưu xong: hiện dấu check + "Đã lưu" thay nhãn, bề rộng giữ nguyên, báo `aria-live="polite"`. */
  done?: boolean;
}
export function Button({
  variant = "primary",
  size = "sm",
  block = false,
  loading = false,
  done = false,
  disabled,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const showDone = done && !loading;
  return (
    <button
      type={type}
      className={buttonClass(s, variant, size, [className, block ? s.block : "", loading ? s.loading : "", showDone ? s.done : ""].filter(Boolean).join(" "))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-live="polite"
      {...props}
    >
      {showDone ? (
        <>
          <span className={s.doneLabelHidden}>{children}</span>
          <span className={s.doneLabel}>
            <Icon name="check" size={18} />
            Đã lưu
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
export default Button;
