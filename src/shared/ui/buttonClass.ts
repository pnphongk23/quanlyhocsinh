export type ButtonVariant =
  | "primary"
  | "secondary"
  | "surface"
  | "neutral"
  | "danger"
  | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClass(
  styles: Record<string, string>,
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
): string {
  return [
    styles.button,
    size === "sm" ? "" : styles[size],
    variant === "primary" ? "" : styles[variant],
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
