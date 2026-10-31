export type PwaGuideReason = "in-app-browser" | "iphone-not-installed";

const IN_APP_BROWSER = /\b(zalo|fban|fbav|fb_iab|fb4a|messenger|instagram|line\/|micromessenger|;\s*wv\)|\bwv\b|webview)\b/i;
const IPHONE = /iphone|ipod/i;

/** Pure eligibility check, kept separate so browser strings can be tested without DOM globals. */
export function pwaGuideReason(userAgent: string, isStandalone: boolean): PwaGuideReason | null {
  if (IN_APP_BROWSER.test(userAgent)) return "in-app-browser";
  if (IPHONE.test(userAgent) && !isStandalone) return "iphone-not-installed";
  return null;
}

export const PWA_GUIDE_DISMISSED_KEY = "qlh:pwa-guide-dismissed";
