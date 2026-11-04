import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import type { OutputChunk } from "rollup";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createAppShellPrecacheList, listMascotAssets } from "./src/app/precacheAssets";
import { buildServiceWorkerSource } from "./src/app/serviceWorkerSource";

const PUBLIC_DIR = "public";
const MASCOT_DIR = join(PUBLIC_DIR, "mascot");

function appShellServiceWorker(includeChickHeads: boolean): Plugin {
  return {
    name: "app-shell-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
        const entry = Object.values(bundle).find((item): item is OutputChunk => item.type === "chunk" && !!item.isEntry);
        if (!entry) throw new Error("Could not find the app entry for service worker precache.");
        const assets = createAppShellPrecacheList(bundle, listMascotAssets(MASCOT_DIR, includeChickHeads));
        const html = bundle["index.html"];
        const revisionHash = createHash("sha256");
        for (const path of assets) {
          const item = bundle[path.slice(1)];
          revisionHash.update(path);
          // Ảnh trong public/ không nằm trong bundle: băm nội dung file để đổi ảnh là đổi cache SW.
          if (!item) {
            if (path !== "/") revisionHash.update(readFileSync(join(PUBLIC_DIR, path)));
          } else revisionHash.update(item.type === "chunk" ? item.code : item.source);
        }
        if (html?.type === "asset") revisionHash.update(html.source);
        const revision = revisionHash.digest("hex").slice(0, 12);
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: buildServiceWorkerSource({ cacheName: `qlh-shell-${revision}`, assets }),
        });
    },
  };
}
/** Cờ tắt: bỏ ảnh đầu gà khỏi bản build (public được Vite chép nguyên thư mục). */
function chickHeadAssets(includeChickHeads: boolean): Plugin {
  let outDir = "dist";
  return {
    name: "chick-head-assets",
    apply: "build",
    configResolved(config) { outDir = config.build.outDir; },
    async closeBundle() {
      if (includeChickHeads) return;
      for (const name of ["mit-head-on", "mit-head-off"]) {
        for (const suffix of ["", "@2x", "@3x"]) {
          await rm(join(outDir, "mascot", `${name}${suffix}.webp`), { force: true });
        }
      }
    },
  };
}
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const includeChickHeads = env.VITE_CRITERIA_LEVELS === "1";
  // Build cờ tắt: thay module meter bằng stub để không còn chuỗi head-on/head-off trong JS.
  // Bỏ qua khi chạy Vitest để test dùng module thật.
  const meterStub: Plugin | null = !process.env.VITEST && !includeChickHeads
    ? {
        name: "level-chick-meter-stub",
        apply: "build",
        enforce: "pre",
        resolveId(source) {
          return /(?:^|\/)LevelChickMeter$/.test(source)
            ? resolve(process.cwd(), "src/shared/ui/LevelChickMeterStub.tsx")
            : null;
        },
      }
    : null;
  return {
  plugins: [react(), ...(meterStub ? [meterStub] : []), appShellServiceWorker(includeChickHeads), chickHeadAssets(includeChickHeads)],
  build: { manifest: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Nhiều test chờ hold thật (loading 400 ms, "Đã lưu" 800/1600 ms) và route lazy; máy tải cao thì 5 s mặc định không đủ.
    testTimeout: 20000,
  },
  };
});
