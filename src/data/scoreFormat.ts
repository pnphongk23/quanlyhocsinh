export function parseHalfScore(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^(?:\d+)(?:\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || Math.abs(value * 2 - Math.round(value * 2)) > 1e-9)
    return null;
  return value;
}

export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}
