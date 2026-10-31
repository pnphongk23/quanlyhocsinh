/**
 * Nguồn của service worker khung app (`/sw.js`), sinh lúc build từ danh sách precache.
 * Tách khỏi `vite.config.ts` để test được phần dễ sai: precache phải bỏ qua HTTP cache.
 */

export interface PrecacheEntry {
  url: string;
  /** `reload`: bỏ qua HTTP cache. Bắt buộc vì ảnh Mít giữ nguyên tên file khi nội dung đổi. */
  cache: "reload";
}

/**
 * Precache luôn tải lại từ mạng: `/mascot/*` có `max-age` trong `public/_headers`, nên fetch theo
 * chế độ mặc định có thể lấy bản còn tươi trong HTTP cache của máy — khi deploy sửa nội dung một
 * ảnh mà giữ tên file, service worker mới sẽ ghi bản cũ đó vào cache mới rồi phục vụ cache-first.
 */
export function createPrecacheEntries(assets: readonly string[]): PrecacheEntry[] {
  return assets.map((url) => ({ url, cache: "reload" }));
}

export interface ServiceWorkerOptions {
  cacheName: string;
  assets: readonly string[];
}

/** Sinh mã `sw.js`: precache toàn bộ khung app, rồi phục vụ cache-first cho tài nguyên tĩnh. */
export function buildServiceWorkerSource({ cacheName, assets }: ServiceWorkerOptions): string {
  const requestList = createPrecacheEntries(assets)
    .map((entry) => `new Request(${JSON.stringify(entry.url)},{cache:"reload"})`)
    .join(",");
  return [
    `const CACHE=${JSON.stringify(cacheName)};`,
    `const ASSETS=[${assets.map((url) => JSON.stringify(url)).join(",")}];`,
    `const PRECACHE=[${requestList}];`,
    `self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting())));`,
    `self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("qlh-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));`,
    `self.addEventListener("fetch",event=>{const request=event.request;const url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/v1/"))return;if(request.mode==="navigate"){event.respondWith(fetch(request).catch(()=>caches.match("/").then(cached=>cached||Response.error())));return;}if(url.pathname.startsWith("/assets/")){event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&!response.headers.get("content-type")?.includes("text/html"))await cache.put(request,response.clone());return response;}));return;}event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));});`,
    "",
  ].join("\n");
}
