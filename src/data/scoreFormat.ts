export function parseHalfScore(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^(?:\d+)(?:\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || Math.abs(value * 2 - Math.round(value * 2)) > 1e-9)
    return null;
  return value;
}

/** Hiển thị điểm: bỏ ".0", số lẻ dùng dấu phẩy (10 → "10", 7.5 → "7,5"). */
export function formatScore(value: number | null): string {
  if (value === null) return "Chưa có điểm";
  return String(Number(value.toFixed(2))).replace(".", ",");
}
