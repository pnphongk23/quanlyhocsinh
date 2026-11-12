import type { ReactNode } from "react";
import s from "./desktopOnly.module.css";

/** Keeps desktop-only actions in the shared PageShell actions slot. */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return <div className={s.desktopOnly}>{children}</div>;
}
