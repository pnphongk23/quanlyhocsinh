import { useId, type ReactNode, type InputHTMLAttributes } from "react";
import s from "./ui.module.css";
export function Field({
  label,
  htmlFor,
  children,
  error,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div className={s.field}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && (
        <span role="alert" className={s.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const input = (
    <input
      id={inputId}
      aria-invalid={!!error}
      aria-describedby={error ? inputId + "-error" : undefined}
      className={[s.input, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
  return label ? (
    <div className={s.field}>
      <label htmlFor={inputId}>{label}</label>
      {input}
      {error && (
        <span id={inputId + "-error"} role="alert" className={s.fieldError}>
          {error}
        </span>
      )}
    </div>
  ) : (
    input
  );
}
export default Field;
