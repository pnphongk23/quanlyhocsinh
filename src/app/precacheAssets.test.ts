import type { OutputBundle } from "rollup";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MASCOT_FILES } from "../shared/ui/Mascot";
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

  it("precaches an image for every pose Mascot.tsx can render", () => {
    const list = createAppShellPrecacheList({} as OutputBundle, listMascotAssets(MASCOT_DIR));
    // Tên tư thế lấy từ Mascot.tsx, không chép lại: thêm tư thế mà quên ảnh là test đỏ.
    for (const file of Object.values(MASCOT_FILES)) {
      expect(list).toContain(`/mascot/mit-${file}.webp`);
      expect(list).toContain(`/mascot/mit-${file}@2x.webp`);
    }
  });

  it("precaches every webp in public/mascot and nothing else", () => {
    const onDisk = readdirSync(MASCOT_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".webp"))
      .map((entry) => `/mascot/${entry.name}`)
      .sort();

    expect(listMascotAssets(MASCOT_DIR)).toEqual(onDisk);
    const precached = createAppShellPrecacheList({} as OutputBundle, listMascotAssets(MASCOT_DIR)).filter((url) =>
      url.startsWith("/mascot/"),
    );
    expect(precached.sort()).toEqual(onDisk);
  });
});
