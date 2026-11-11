import type { ReactNode } from "react";
import { PageShell, type PageShellProps } from "./PageShell";
import s from "./layout.module.css";

export interface FormPageProps extends Omit<PageShellProps, "children"> {
  children: ReactNode;
  footer?: ReactNode;
}

export function FormPage({ children, footer, ...pageProps }: FormPageProps) {
  return <PageShell {...pageProps} className={`${s.formPage} ${pageProps.className ?? ""}`}>
    <div className={s.formColumn}>
      <div className={s.formBody} data-measure="form-body">{children}</div>
      {footer ? <footer className={s.formFooter} data-measure="form-footer">{footer}</footer> : null}
    </div>
  </PageShell>;
}
