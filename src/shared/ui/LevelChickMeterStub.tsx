/**
 * Stub khi cờ tắt (Vite alias ở build staging/prod): không kéo mã/URL ảnh đầu gà
 * vào bundle. UI dùng meter vốn đã bị ẩn khi cờ tắt nên chỉ cần render rỗng.
 */
export function ChickHead() {
  return null;
}

export function LevelChickMeter() {
  return null;
}

export function levelChickCount(level: "needs_work" | "ok" | "good"): 1 | 2 | 3 {
  return level === "good" ? 3 : level === "ok" ? 2 : 1;
}
