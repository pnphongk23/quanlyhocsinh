import { Link, type LinkProps } from "react-router-dom";
import s from "./ui.module.css";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonClass";
export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}
export function LinkButton({
  variant = "primary",
  size = "sm",
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClass(s, variant, size, className)} {...props} />;
}
export default LinkButton;
