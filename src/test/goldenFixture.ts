import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bộ ca vàng (golden) cho bộ phân tích ghi chú và nhập danh sách nằm trong repo tại
 * `plans/20261028-ai-features/` và là dữ liệu riêng tư: không chép nội dung golden hay
 * ca thật sang test, commit hoặc tài liệu khác. Thiếu file là lỗi thật (CI phải đỏ),
 * không phải trường hợp bỏ qua.
 */
/** Gốc repo suy ra từ vị trí file này (`src/test` → lên hai cấp), không phụ thuộc cwd. */
export const GOLDEN_FILES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../plans/20261028-ai-features");

/** Các chỗ có fixture: `QLH_GOLDEN_DIR` (bản khác khi cần), rồi thư mục trong repo. */
export function goldenCandidates(fileName: string): string[] {
  const configured = process.env.QLH_GOLDEN_DIR?.trim();
  return [
    ...(configured ? [path.join(configured, fileName)] : []),
    path.join(GOLDEN_FILES_DIR, fileName),
  ];
}

/** Đường dẫn fixture đã có trên đĩa; ném lỗi kèm mọi đường dẫn đã thử khi không tìm thấy. */
export function goldenFixturePath(fileName: string): string {
  const candidates = goldenCandidates(fileName);
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const error = new Error(`ENOENT: không thấy golden fixture "${fileName}". Đã thử: ${candidates.join(", ")}`) as NodeJS.ErrnoException;
  error.code = "ENOENT";
  throw error;
}

/** Đọc fixture; thiếu file thì lỗi ENOENT nêu đường dẫn đã thử, không bỏ qua. */
export function readGoldenFixture<T>(fileName: string): T {
  const file = goldenFixturePath(fileName);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}
