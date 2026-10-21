import type { ButtonHTMLAttributes } from "react";
import s from "./ui.module.css";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonClass";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}
export function Button({
  variant = "primary",
  size = "sm",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(s, variant, size, className)}
      {...props}
    />
  );
}
export default Button;
