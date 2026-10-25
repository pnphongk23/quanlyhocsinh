import type { OutputBundle } from "rollup";

const SHELL_ASSETS = [
  "/",
  "/fonts/plus-jakarta-sans-latin.woff2",
  "/fonts/plus-jakarta-sans-latin-ext.woff2",
  "/fonts/plus-jakarta-sans-vietnamese.woff2",
];
const PRECACHE_ASSET = /\.(?:m?js|css|woff2?|ttf|otf|webp|png|jpe?g|gif|svg|avif|ico)$/i;

export function createAppShellPrecacheList(bundle: OutputBundle): string[] {
  const emittedAssets = Object.values(bundle)
    .filter((item) => PRECACHE_ASSET.test(item.fileName))
    .map((item) => `/${item.fileName}`);
  return [...new Set([...SHELL_ASSETS, ...emittedAssets])].sort();
}
