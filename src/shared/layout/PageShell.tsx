import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../ui";
import s from "./layout.module.css";

export interface PageShellProps {
  breadcrumb?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  children: ReactNode;
  className?: string;
}

export function PageShell({ breadcrumb, eyebrow, title, subtitle, actions, backTo, children, className }: PageShellProps) {
  return (
    <section className={`${s.page} ${className ?? ""}`.trim()}>
      <div className={s.pageColumn}>
        <div className={s.pageMeta}>
          {backTo ? <Link className={s.backLink} to={backTo}><Icon name="back" /> Quay lại</Link> : null}
          {breadcrumb ? <nav className={s.breadcrumb} aria-label="Đường dẫn">{breadcrumb}</nav> : null}
        </div>
        <header className={s.pageHeader}>
          <div className={s.pageHeading}>
            {eyebrow ? <p className={s.eyebrow}>{eyebrow}</p> : null}
            <h1 className={s.title}>{title}</h1>
            {subtitle ? <p className={s.subtitle}>{subtitle}</p> : null}
          </div>
          {actions ? <div className={s.pageActions}>{actions}</div> : null}
        </header>
        <div className={s.pageBody} data-measure="content">{children}</div>
      </div>
    </section>
  );
}
