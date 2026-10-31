import { describe, expect, it } from "vitest";
import { buildServiceWorkerSource, createPrecacheEntries } from "./serviceWorkerSource";

const ASSETS = ["/", "/assets/index-abc.js", "/mascot/mit-main.webp", "/mascot/mit-main@2x.webp"];

describe("service worker precache", () => {
  it("fetches every precache asset with cache: reload so a warm HTTP cache cannot pin an old file", () => {
    const entries = createPrecacheEntries(ASSETS);
    expect(entries.map((entry) => entry.url)).toEqual(ASSETS);
    expect(entries.every((entry) => entry.cache === "reload")).toBe(true);
  });

  it("builds the install step on those requests instead of bare URL strings", () => {
    const source = buildServiceWorkerSource({ cacheName: "qlh-shell-abc123", assets: ASSETS });
    // Cache.addAll với chuỗi URL sẽ fetch theo chế độ mặc định (đi qua HTTP cache) — không được dùng.
    expect(source).not.toContain("cache.addAll(ASSETS)");
    expect(source).toContain("cache.addAll(PRECACHE)");
    for (const url of ASSETS) {
      expect(source).toContain(`new Request(${JSON.stringify(url)},{cache:"reload"})`);
      // Vẫn giữ danh sách URL để đối chiếu khi đọc file sw.js đã build.
      expect(JSON.parse(source.match(/const ASSETS=(\[.*?\]);/)![1])).toContain(url);
    }
    expect(source).toContain('const CACHE="qlh-shell-abc123"');
  });

  it("keeps API calls out of the cache and serves app assets cache-first", () => {
    const source = buildServiceWorkerSource({ cacheName: "qlh-shell-abc123", assets: ASSETS });
    expect(source).toContain('url.pathname.startsWith("/v1/")');
    expect(source).toContain('url.pathname.startsWith("/assets/")');
    expect(source).toContain("caches.match(request).then(cached=>cached||fetch(request))");
    // Chỉ dọn cache khung app, không đụng cache khác của app.
    expect(source).toContain('key.startsWith("qlh-shell-")&&key!==CACHE');
  });
});
