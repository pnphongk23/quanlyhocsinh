import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import type { OutputChunk } from "rollup";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAppShellPrecacheList, listMascotAssets } from "./src/app/precacheAssets";
import { buildServiceWorkerSource } from "./src/app/serviceWorkerSource";

const PUBLIC_DIR = "public";
const MASCOT_DIR = join(PUBLIC_DIR, "mascot");

function appShellServiceWorker(): Plugin {
  return {
    name: "app-shell-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
        const entry = Object.values(bundle).find((item): item is OutputChunk => item.type === "chunk" && !!item.isEntry);
        if (!entry) throw new Error("Could not find the app entry for service worker precache.");
        const assets = createAppShellPrecacheList(bundle, listMascotAssets(MASCOT_DIR));
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
export default defineConfig({
  plugins: [react(), appShellServiceWorker()],
  build: { manifest: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Nhiều test chờ hold thật (loading 400 ms, "Đã lưu" 800/1600 ms) và route lazy; máy tải cao thì 5 s mặc định không đủ.
    testTimeout: 20000,
  },
});
