export const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
export const SESSION_RENEW_BELOW_MS = 150 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoAt(epochMs: number): string {
  return new Date(epochMs).toISOString();
}

export function isoAfterMs(ms: number, from: number = Date.now()): string {
  return isoAt(from + ms);
}
