import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * iOS Safari tự phóng to cả trang khi focus ô nhập có cỡ chữ < 16px (ảnh 28: sheet "Thêm phần BTVN").
 * Không dùng `maximum-scale`/`user-scalable=no` vì chặn luôn zoom của người dùng.
 * Test này chặn hồi quy: mọi ô nhập chữ phải ≥ 16px.
 */
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const tokens = read("src/shared/styles/tokens.css");
const reset = read("src/shared/styles/reset.css");
const indexHtml = read("index.html");

const tokenValues = new Map<string, number>();
for (const match of tokens.matchAll(/--([a-z0-9-]+):\s*([\d.]+)px/g)) tokenValues.set(`--${match[1]}`, Number(match[2]));

function px(value: string): number | null {
  const trimmed = value.trim();
  const token = trimmed.match(/^var\((--[a-z0-9-]+)\)$/);
  if (token) return tokenValues.get(token[1]) ?? null;
  const literal = trimmed.match(/^([\d.]+)px$/);
  if (literal) return Number(literal[1]);
  return null;
}

/** Các rule là ô nhập chữ (không tính checkbox/radio/range/color/file). */
const CONTROL_SELECTORS = [
  "input",
  "textarea",
  "select",
  ".input",
  ".textarea",
  ".noteInput",
  ".sentenceInput",
  ".commentInput",
  ".search",
  ".cell",
];

const CSS_FILES = [
  "src/features/class-space/desktop.module.css",
  "src/features/classes/classes.module.css",
  "src/features/comments/CommentsPanel.module.css",
  "src/features/comments/CommentsDesktop.module.css",
  "src/features/comments/SlipCriteriaFields.module.css",
  "src/features/comments/notesImport.module.css",
  "src/features/homework/HomeworkPanel.module.css",
  "src/features/homework/HomeworkDesktop.module.css",
  "src/features/reports/ReportsPage.module.css",
  "src/features/scores/ScoreGridDesktop.module.css",
  "src/features/students/importStudents.module.css",
  "src/shared/ui/ui.module.css",
];

const SKIP_SELECTOR = /checkbox|radio|\[type="range"\]|\[type="color"\]|\[type="file"\]|placeholder|::/;

function isControlSelector(selector: string): boolean {
  if (SKIP_SELECTOR.test(selector)) return false;
  const names = [...selector.matchAll(/\.([A-Za-z0-9_-]+)|(^|[\s,>+~])(input|textarea|select)\b/g)];
  return names.some((match) => (match[1] ? CONTROL_SELECTORS.includes(`.${match[1]}`) : CONTROL_SELECTORS.includes(match[3])));
}

describe("cỡ chữ ô nhập trên iOS", () => {
  it("viewport không chặn zoom của người dùng", () => {
    expect(indexHtml).toMatch(/name="viewport"[^>]*width=device-width/);
    expect(indexHtml).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/);
  });

  it("reset giữ mọi ô nhập chữ ≥ 16px", () => {
    expect(reset).toMatch(/input,\s*textarea,\s*select\s*\{\s*font-size:\s*max\(16px,\s*1em\);\s*\}/);
  });

  it.each(CSS_FILES)("%s: rule ô nhập khai báo cỡ chữ ≥ 16px", (file) => {
    const css = read(file);
    const tooSmall: string[] = [];
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = match[1];
      if (!isControlSelector(selector)) continue;
      for (const declaration of match[2].matchAll(/font-size:\s*([^;]+)/g)) {
        const value = px(declaration[1]);
        if (value !== null && value < 16) tooSmall.push(`${selector.trim().replace(/\s+/g, " ")} → ${declaration[1].trim()}`);
      }
    }
    expect(tooSmall).toEqual([]);
  });
});
