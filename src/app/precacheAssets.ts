import type { OutputBundle } from "rollup";
import { readdirSync } from "node:fs";

const SHELL_ASSETS = [
  "/",
  "/fonts/plus-jakarta-sans-latin.woff2",
  "/fonts/plus-jakarta-sans-latin-ext.woff2",
  "/fonts/plus-jakarta-sans-vietnamese.woff2",
];
const PRECACHE_ASSET = /\.(?:m?js|css|woff2?|ttf|otf|webp|png|jpe?g|gif|svg|avif|ico)$/i;

/**
 * Toàn bộ ảnh Mít trong `public/mascot` (1x và @2x). Đọc thư mục lúc build nên thêm tư thế mới
 * không phải sửa danh sách tay; thiếu một tư thế là nó phải tải qua mạng mỗi lần hiện.
 */
export function listMascotAssets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.webp$/i.test(entry.name))
    .map((entry) => `/mascot/${entry.name}`)
    .sort();
}

export function createAppShellPrecacheList(bundle: OutputBundle, mascotAssets: readonly string[] = []): string[] {
  const emittedAssets = Object.values(bundle)
    .filter((item) => PRECACHE_ASSET.test(item.fileName))
    .map((item) => `/${item.fileName}`);
  return [...new Set([...SHELL_ASSETS, ...mascotAssets, ...emittedAssets])].sort();
}
