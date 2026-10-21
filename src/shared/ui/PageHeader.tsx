import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import s from "./ui.module.css";
import { Icon } from "./Icon";
export interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  compact?: boolean;
  overlay?: ReactNode;
}
export function PageHeader({
  eyebrow,
  title,
  actions,
  backTo,
  compact = false,
  overlay,
}: PageHeaderProps) {
  return (
    <header className={s.pageHeader}>
      <div className={s.pageHeaderMain}>
        {backTo && (
          <Link to={backTo} className={s.backButton} aria-label="Quay lại">
            <Icon name="back" />
          </Link>
        )}
        <div className={[s.pageTitle, compact ? s.compactTitle : ""].join(" ")}>
          {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
          <h1>{title}</h1>
          {overlay}
        </div>
      </div>
      {actions && <div className={s.pageActions}>{actions}</div>}
    </header>
  );
}
export default PageHeader;
