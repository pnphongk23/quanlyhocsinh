import type { ReactNode } from "react";
import s from "./ui.module.css";
import { Mascot, type MascotPose } from "./Mascot";
export function EmptyState({
  title = "Chưa có dữ liệu",
  mascot,
  children,
}: {
  title?: string;
  mascot?: MascotPose;
  children?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      {mascot && <Mascot pose={mascot} size={80} />}
      <h2 className={s.emptyTitle}>{title}</h2>
      {children}
    </div>
  );
}
export default EmptyState;
