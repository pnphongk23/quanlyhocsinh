import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import type { OutputChunk } from "rollup";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAppShellPrecacheList, listMascotAssets } from "./src/app/precacheAssets";

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
        const version = JSON.stringify(assets);
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
        this.emitFile({ type: "asset", fileName: "sw.js", source: `const CACHE="qlh-shell-${revision}";\nconst ASSETS=${version};\nself.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));\nself.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("qlh-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener("fetch",event=>{const request=event.request;const url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/v1/"))return;if(request.mode==="navigate"){event.respondWith(fetch(request).catch(()=>caches.match("/").then(cached=>cached||Response.error())));return;}if(url.pathname.startsWith("/assets/")){event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&!response.headers.get("content-type")?.includes("text/html"))await cache.put(request,response.clone());return response;}));return;}event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));});\n` });
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
