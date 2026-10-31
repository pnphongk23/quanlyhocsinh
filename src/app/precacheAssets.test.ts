import type { OutputBundle } from "rollup";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAppShellPrecacheList, listMascotAssets } from "./precacheAssets";

const MASCOT_DIR = join(process.cwd(), "public", "mascot");

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

    expect(createAppShellPrecacheList(bundle, ["/mascot/mit-main.webp", "/mascot/mit-main@2x.webp"])).toEqual([
      "/",
      "/assets/ScoreGridTab-hash.css",
      "/assets/ScoreGridTab-hash.js",
      "/assets/font-hash.woff2",
      "/assets/logo-hash.webp",
      "/assets/main.js",
      "/fonts/plus-jakarta-sans-latin-ext.woff2",
      "/fonts/plus-jakarta-sans-latin.woff2",
      "/fonts/plus-jakarta-sans-vietnamese.woff2",
      "/mascot/mit-main.webp",
      "/mascot/mit-main@2x.webp",
    ]);
  });

  it("precaches every mascot image in public/mascot, including new poses", () => {
    const onDisk = readdirSync(MASCOT_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".webp"))
      .map((entry) => `/mascot/${entry.name}`)
      .sort();

    expect(listMascotAssets(MASCOT_DIR)).toEqual(onDisk);
    // Mọi tư thế trong Mascot.tsx phải có mặt (1x và @2x) để đổi tư thế không phải tải qua mạng.
    const list = createAppShellPrecacheList({} as OutputBundle, listMascotAssets(MASCOT_DIR));
    const poses = ["main", "khen", "dong-vien", "cho", "chao", "dang-tai", "avatar", "sao-0", "sao-1", "sao-2", "sao-3", "sao-4", "sao-5"];
    for (const pose of poses) {
      expect(list).toContain(`/mascot/mit-${pose}.webp`);
      expect(list).toContain(`/mascot/mit-${pose}@2x.webp`);
    }
  });
});
