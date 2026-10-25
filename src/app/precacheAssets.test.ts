import type { OutputBundle } from "rollup";
import { describe, expect, it } from "vitest";
import { createAppShellPrecacheList } from "./precacheAssets";

describe("app shell precache assets", () => {
  it("includes lazy route chunks, their CSS, and bundled images and fonts", () => {
    const bundle = {
      "main.js": { type: "chunk", fileName: "assets/main.js" },
      "scores.js": { type: "chunk", fileName: "assets/ScoreGridTab-hash.js" },
      "scores.css": { type: "asset", fileName: "assets/ScoreGridTab-hash.css" },
      "logo.webp": { type: "asset", fileName: "assets/logo-hash.webp" },
      "font.woff2": { type: "asset", fileName: "assets/font-hash.woff2" },
      "manifest.json": { type: "asset", fileName: ".vite/manifest.json" },
      "debug.map": { type: "asset", fileName: "assets/main.js.map" },
    } as unknown as OutputBundle;

    expect(createAppShellPrecacheList(bundle)).toEqual([
      "/",
      "/assets/ScoreGridTab-hash.css",
      "/assets/ScoreGridTab-hash.js",
      "/assets/font-hash.woff2",
      "/assets/logo-hash.webp",
      "/assets/main.js",
      "/fonts/plus-jakarta-sans-latin-ext.woff2",
      "/fonts/plus-jakarta-sans-latin.woff2",
      "/fonts/plus-jakarta-sans-vietnamese.woff2",
    ]);
  });
});
