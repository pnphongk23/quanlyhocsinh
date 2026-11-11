import type { ReactNode } from "react";
import { useLayout } from "./useLayout";

export interface ResponsiveSlotProps {
  mobile: ReactNode;
  tablet?: ReactNode;
  desktop?: ReactNode;
}

/** Selects one page slot from the shared layout size, keeping breakpoint logic out of routes. */
export function ResponsiveSlot({ mobile, tablet, desktop }: ResponsiveSlotProps) {
  const layout = useLayout();
  if (layout === "desktop") return desktop ?? tablet ?? mobile;
  if (layout === "tablet") return tablet ?? mobile;
  return mobile;
}
