import type { ButtonHTMLAttributes } from "react";
import s from "./ui.module.css";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonClass";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}
export function Button({
  variant = "primary",
  size = "sm",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
        className={buttonClass(s, variant, size, block ? (className ? className + " " : "") + s.block : className)}
      {...props}
    />
  );
}
export default Button;
