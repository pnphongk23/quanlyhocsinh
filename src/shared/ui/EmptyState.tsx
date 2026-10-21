import type { ReactNode } from "react";
import s from "./ui.module.css";
export function EmptyState({
  title = "Chưa có dữ liệu",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <h2 className={s.emptyTitle}>{title}</h2>
      {children}
    </div>
  );
}
export default EmptyState;
