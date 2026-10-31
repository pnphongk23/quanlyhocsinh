import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Bộ ca vàng (golden) cho bộ phân tích ghi chú và nhập danh sách là dữ liệu riêng tư:
 * không chép nội dung sang test/commit khác. Test đọc qua helper này để máy có fixture
 * vẫn chạy đủ ca, còn nơi không có fixture thì skip thay vì crash lúc import (CI).
 */
export const GOLDEN_SKIP_REASON = "golden fixture is private and not in the repo";
/** Thư mục fixture khi nó có trong checkout. */
export const GOLDEN_FILES_DIR = path.join("plans", "20261028-ai-features");
/** Chỗ để fixture trên máy dev, giữ cách chạy cục bộ trước đây. */
export const GOLDEN_LOCAL_FALLBACK_DIR = path.join("/Users", "phamnhuphong", "Git", "quanlyhocsinh", "plans", "20261028-ai-features");

/** Các chỗ có thể có fixture, theo thứ tự: `QLH_GOLDEN_DIR`, thư mục trong repo, rồi máy dev. */
export function goldenCandidates(fileName: string): string[] {
  const configured = process.env.QLH_GOLDEN_DIR?.trim();
  return [
    ...(configured ? [path.join(configured, fileName)] : []),
    path.resolve(process.cwd(), GOLDEN_FILES_DIR, fileName),
    path.join(GOLDEN_LOCAL_FALLBACK_DIR, fileName),
  ];
}

/** Chọn đường dẫn đầu tiên có file; `null` khi không có chỗ nào (điều kiện skip). */
export function pickGoldenPath(candidates: readonly string[], exists: (candidate: string) => boolean = existsSync): string | null {
  return candidates.find((candidate) => exists(candidate)) ?? null;
}

/** Đường dẫn fixture theo thứ tự trên, hoặc `null` khi máy này không có fixture. */
export function goldenFixturePath(fileName: string): string | null {
  return pickGoldenPath(goldenCandidates(fileName));
}

/** Đọc fixture đã tìm thấy; `null` khi không có (dùng cho `describe.skipIf`/`it.skipIf`). */
export function readGoldenFixture<T>(fileName: string): T | null {
  const file = goldenFixturePath(fileName);
  return file ? (JSON.parse(readFileSync(file, "utf8")) as T) : null;
}
