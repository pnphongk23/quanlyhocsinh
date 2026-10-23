import type { ButtonHTMLAttributes } from "react";
import s from "./ui.module.css";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonClass";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Đang xử lý: disabled, `aria-busy`, vòng quay nhỏ; bề rộng giữ nguyên. */
  loading?: boolean;
}
export function Button({
  variant = "primary",
  size = "sm",
  block = false,
  loading = false,
  disabled,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
        className={buttonClass(s, variant, size, [className, block ? s.block : "", loading ? s.loading : ""].filter(Boolean).join(" "))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    />
  );
}
export default Button;
