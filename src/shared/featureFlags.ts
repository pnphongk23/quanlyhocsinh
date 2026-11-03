/** Cờ tính năng tạm ẩn khỏi giao diện; mã và test của tính năng vẫn giữ nguyên. */
export const FEATURE_NOTES_IMPORT = false;

/**
 * Thử nghiệm phiếu 3 mức + "Hôm nay học" + kỹ năng chấm thêm.
 * Chỉ bật ở `.env.dev`; mặc định tắt nên cờ tắt giữ nguyên hành vi hiện tại.
 */
export function criteriaLevelsEnabled(): boolean {
  return import.meta.env.VITE_CRITERIA_LEVELS === "1";
}
