import type { ReactNode } from "react";
import s from "./ui.module.css";
import { Mascot, type MascotPose } from "./Mascot";
export type EmptyStateSize = "default" | "compact";
/** Gợi ý kích thước ảnh, khớp `--empty-mascot` / `--empty-mascot-compact`; cỡ hiển thị lấy từ token. */
const MASCOT_HINT: Record<EmptyStateSize, { px: number; token: string }> = {
  default: { px: 96, token: "var(--empty-mascot)" },
  compact: { px: 56, token: "var(--empty-mascot-compact)" },
};
export function EmptyState({
  title = "Chưa có dữ liệu",
  description,
  action,
  size = "default",
  mascot = "cho",
  children,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: EmptyStateSize;
  mascot?: MascotPose;
  children?: ReactNode;
}) {
  const hint = MASCOT_HINT[size];
  return (
    <div className={s.empty + (size === "compact" ? " " + s.emptyCompact : "")} data-size={size}>
      <Mascot pose={mascot} size={hint.px} cssSize={hint.token} />
      <h2 className={s.emptyTitle}>{title}</h2>
      {description && <p className={s.emptyDescription}>{description}</p>}
      {children}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}
export default EmptyState;
