#!/usr/bin/env node
/**
 * Kiểm tokens.css và tokens.json cùng giá trị (Pha 1 · QL-004).
 *
 *   node design/responsive-mock/tokens-check.mjs
 *
 * So từng khai báo trong `:root` (mốc mobile) và hai khối ghi đè
 * `@media (min-width: 640px)` (tablet) / `@media (min-width: 1024px)` (desktop)
 * với các nhóm tương ứng trong `tokens.json`. Thiếu/khác giá trị → exit 1.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tokens");
const css = await readFile(path.join(dir, "tokens.css"), "utf8");
const json = JSON.parse(await readFile(path.join(dir, "tokens.json"), "utf8"));

/** Bỏ comment rồi tách các khai báo `--ten: giá trị;` của một khối. */
function declarations(block) {
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = new Map();
  for (const match of clean.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    found.set(match[1], match[2].trim().replace(/\s+/g, " "));
  }
  return found;
}

/** Nội dung khối @media đầu tiên khớp điều kiện. */
function mediaBlock(condition) {
  const start = css.indexOf(`@media ${condition}`);
  if (start < 0) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  return "";
}

const tabletAt = css.indexOf("@media (min-width: 640px)");
const rootStart = css.indexOf(":root {");
const hasFabAt = css.indexOf(":root[data-has-fab]");
const rootBlock = css.slice(rootStart, hasFabAt > 0 ? hasFabAt : tabletAt);
const cssLayers = {
  mobile: declarations(rootBlock),
  tablet: declarations(mediaBlock("(min-width: 640px)")),
  desktop: declarations(mediaBlock("(min-width: 1024px)")),
};

/** Nhóm trong tokens.json tương ứng từng mốc; `font` là ngoại lệ duy nhất. */
const JSON_GROUPS = [
  "color", "text", "leading", "weight", "space", "roleSpacing", "radius", "shadow",
  "z", "size", "safeArea", "fab", "motion", "state", "grid", "breakpointVar",
];
const DOC_ONLY = new Set(["$comment", "breakpoint", "reducedMotion", "tablet", "desktop"]);

const problems = [];
const compare = (layer, expected) => {
  const actual = cssLayers[layer];
  for (const [name, value] of expected) {
    const cssValue = actual.get(name);
    if (cssValue === undefined) problems.push(`${layer}: tokens.css thiếu ${name}`);
    else if (cssValue !== value) problems.push(`${layer}: ${name} css="${cssValue}" json="${value}"`);
  }
  for (const name of actual.keys()) {
    if (!expected.has(name)) problems.push(`${layer}: tokens.json thiếu ${name} (css có giá trị)`);
  }
};

const keysOf = (object) => Object.entries(object ?? {}).filter(([key]) => !key.startsWith("$"));

compare("mobile", new Map([["--font-sans", json.font.sans], ...JSON_GROUPS.flatMap((group) => keysOf(json[group]).map(([key, value]) => [`--${key}`, String(value)]))]));
compare("tablet", new Map(keysOf(json.tablet).map(([key, value]) => [`--${key}`, String(value)])));
compare("desktop", new Map(keysOf(json.desktop).map(([key, value]) => [`--${key}`, String(value)])));

// Mốc khổ ghi ở cả hai nơi, dạng tài liệu (không dùng trong @media).
if (!json.breakpoint?.note?.includes("640")) problems.push("breakpoint.note không nhắc mốc tablet 640");

const unmapped = Object.keys(json).filter((key) => !DOC_ONLY.has(key) && !JSON_GROUPS.includes(key) && key !== "font");
if (unmapped.length) problems.push(`tokens.json có nhóm chưa được kiểm: ${unmapped.join(", ")}`);

if (problems.length) {
  console.error(`tokens.css và tokens.json lệch ${problems.length} chỗ:`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `tokens.css và tokens.json khớp: ${cssLayers.mobile.size} token mobile, ${cssLayers.tablet.size} tablet, ${cssLayers.desktop.size} desktop.`,
);
