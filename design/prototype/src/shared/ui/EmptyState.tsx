import type { ReactNode } from "react";
import s from "./ui.module.css";
import { Mascot, type MascotPose } from "./Mascot";
export type EmptyStateSize = "default" | "compact";
const MASCOT_SIZE: Record<EmptyStateSize, string> = {
  default: "var(--empty-mascot)",
  compact: "var(--empty-mascot-compact)",
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
  return (
    <div className={s.empty + (size === "compact" ? " " + s.emptyCompact : "")} data-size={size}>
      <Mascot pose={mascot} cssSize={MASCOT_SIZE[size]} />
      <h2 className={s.emptyTitle}>{title}</h2>
      {description && <p className={s.emptyDescription}>{description}</p>}
      {children}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}
export default EmptyState;
