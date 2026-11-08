/**
 * Cờ thử nghiệm phiếu 3 mức + bộ tiêu chí nhận xét tự tạo.
 * Chỉ bật ở `.env.dev`; mặc định tắt nên cờ tắt giữ nguyên hành vi hiện tại.
 * Tách khỏi `src/shared/featureFlags.ts` để màn cũ mock module đó không ảnh hưởng.
 */
export function criteriaLevelsEnabled(): boolean {
  return import.meta.env.VITE_CRITERIA_LEVELS === "1";
}
