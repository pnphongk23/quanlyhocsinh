import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import type { OutputChunk } from "rollup";
import { createHash } from "node:crypto";

function appShellServiceWorker(): Plugin {
  return {
    name: "app-shell-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find((item): item is OutputChunk => item.type === "chunk" && !!item.isEntry);
      if (!entry) throw new Error("Could not find the app entry for service worker precache.");
      const assets = new Set<string>([
        "/",
        `/${entry.fileName}`,
        "/fonts/plus-jakarta-sans-latin.woff2",
        "/fonts/plus-jakarta-sans-latin-ext.woff2",
        "/fonts/plus-jakarta-sans-vietnamese.woff2",
      ]);
      const visit = (chunk: OutputChunk) => {
        for (const file of chunk.viteMetadata?.importedCss ?? []) assets.add(`/${file}`);
        for (const file of chunk.imports) {
          const dependency = bundle[file];
          if (dependency?.type === "chunk" && !assets.has(`/${file}`)) { assets.add(`/${file}`); visit(dependency); }
        }
      };
      visit(entry);
      const version = JSON.stringify([...assets].sort());
      const html = bundle["index.html"];
      const revision = createHash("sha256").update(entry.code).update(html?.type === "asset" ? html.source : "").digest("hex").slice(0, 12);
        this.emitFile({ type: "asset", fileName: "sw.js", source: `const CACHE="qlh-shell-${revision}";\nconst ASSETS=${version};\nself.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));\nself.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("qlh-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener("fetch",event=>{const request=event.request;const url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/v1/"))return;if(request.mode==="navigate"){event.respondWith(fetch(request).catch(()=>caches.match("/").then(cached=>cached||Response.error())));return;}event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));});\n` });
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
