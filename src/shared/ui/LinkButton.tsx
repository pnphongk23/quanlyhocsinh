import { Link, type LinkProps } from "react-router-dom";
import s from "./ui.module.css";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonClass";
export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}
export function LinkButton({
  variant = "primary",
  size = "sm",
  block = false,
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClass(s, variant, size, block ? (className ? className + " " : "") + s.block : className)} {...props} />;
}
export default LinkButton;
