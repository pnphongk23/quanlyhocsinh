import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * iOS Safari tự phóng to cả trang khi focus ô nhập có cỡ chữ < 16px (ảnh 28: sheet "Thêm phần BTVN").
 * Không dùng `maximum-scale`/`user-scalable=no` vì chặn luôn zoom của người dùng.
 *
 * Test quét toàn bộ mã nguồn: mọi class thật sự gắn trên `<input>/<textarea>/<select>` (trực tiếp, hoặc
 * truyền qua component ô nhập) phải có cỡ chữ ≥ 16px; class chỉ có `font: inherit` mà không có
 * `font-size` riêng cũng bị bắt vì nó ăn theo cỡ chữ của khối cha.
 */
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const tokens = read("src/shared/styles/tokens.css");
const reset = read("src/shared/styles/reset.css");
const indexHtml = read("index.html");

const tokenValues = new Map<string, number>();
for (const match of tokens.matchAll(/--([a-z0-9-]+):\s*([\d.]+)px/g)) tokenValues.set(`--${match[1]}`, Number(match[2]));

/** Giá trị px của một khai báo font-size; null nếu không phải số cụ thể (inherit, em, %…). */
function px(value: string): number | null {
  const trimmed = value.trim();
  const token = trimmed.match(/^var\((--[a-z0-9-]+)\)$/);
  if (token) return tokenValues.get(token[1]) ?? null;
  const literal = trimmed.match(/^([\d.]+)px$/);
  if (literal) return Number(literal[1]);
  return null;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

type Rule = { selector: string; body: string };

function cssRules(css: string): Rule[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({ selector: match[1], body: match[2] }));
}

/** Các selector con nhắm đúng một class (`.foo`, `.foo:hover`, `.a .foo`). */
function selectorParts(selector: string): string[] {
  return selector.split(",").map((part) => part.trim());
}

function targetsClass(part: string, className: string): boolean {
  const last = part.split(/\s+|>/).filter(Boolean).pop() ?? "";
  return new RegExp(`^\\.${className}(?::[a-z-]+(?:\\([^)]*\\))?)*$`).test(last);
}

const CONTROL_TAGS = /<(input|textarea|select)\b/;
/** Component ô nhập: class truyền vào cũng là class của ô nhập. */
const CONTROL_COMPONENTS = /<(Input|Field|TextArea|Textarea|Select|PasswordField|PhoneField)\b/;

type Usage = { tsx: string; cssFile: string; className: string };

const usages = new Map<string, Usage>();
for (const tsx of walk(resolve(root, "src")).filter((path) => path.endsWith(".tsx") && !path.includes(".test."))) {
  const source = readFileSync(tsx, "utf8");
  const modules = new Map<string, string>();
  for (const match of source.matchAll(/import\s+(\w+)\s+from\s+"([^"]+\.module\.css)"/g)) {
    modules.set(match[1], relative(root, resolve(tsx, "..", match[2])));
  }
  if (!modules.size) continue;
  for (const tag of source.matchAll(new RegExp(`${CONTROL_TAGS.source}|${CONTROL_COMPONENTS.source}`, "g"))) {
    const tagText = source.slice(tag.index, tag.index + 400).split(/\/>|>/)[0];
    const className = /className=(\{[\s\S]*?\}|"[^"]*")/.exec(tagText)?.[1] ?? "";
    for (const ref of className.matchAll(/\b(\w+)\.([A-Za-z0-9_-]+)/g)) {
      const cssFile = modules.get(ref[1]);
      if (!cssFile) continue;
      const key = `${cssFile}|${ref[2]}`;
      if (!usages.has(key)) usages.set(key, { tsx: relative(root, tsx), cssFile, className: ref[2] });
    }
  }
}

const cssCache = new Map<string, Rule[]>();
function rulesOf(cssFile: string): Rule[] {
  if (!cssCache.has(cssFile)) cssCache.set(cssFile, cssRules(read(cssFile)));
  return cssCache.get(cssFile)!;
}

describe("cỡ chữ ô nhập trên iOS", () => {
  it("viewport không chặn zoom của người dùng", () => {
    expect(indexHtml).toMatch(/name="viewport"[^>]*width=device-width/);
    expect(indexHtml).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/);
  });

  it("reset giữ mọi ô nhập chữ ≥ 16px theo token", () => {
    expect(reset).toMatch(/input,\s*textarea,\s*select\s*\{\s*font-size:\s*max\(var\(--text-base\),\s*1em\);\s*\}/);
    expect(tokenValues.get("--text-base")).toBeGreaterThanOrEqual(16);
  });

  it("tìm được class ô nhập trong mã nguồn (test không rỗng)", () => {
    expect(usages.size).toBeGreaterThan(12);
  });

  it.each([...usages.values()].map((usage) => [`${usage.cssFile} .${usage.className}`, usage] as const))(
    "%s khai báo cỡ chữ ≥ 16px",
    (_label, usage) => {
      const rules = rulesOf(usage.cssFile).filter((rule) => selectorParts(rule.selector).some((part) => targetsClass(part, usage.className)));
      const declared = rules.flatMap((rule) => [...rule.body.matchAll(/font-size:\s*([^;]+)/g)].map((match) => match[1].trim()));
      const inheritsFont = rules.some((rule) => /font:\s*inherit/.test(rule.body));

      const tooSmall = declared.filter((value) => {
        const size = px(value);
        return size !== null && size < 16;
      });
      expect(tooSmall, `${usage.cssFile} .${usage.className} (dùng ở ${usage.tsx})`).toEqual([]);

      // Rule tự khai báo `font: inherit` nhưng không có `font-size` riêng → ăn theo cỡ chữ khối cha.
      if (inheritsFont) {
        expect(declared.length, `${usage.cssFile} .${usage.className} chỉ có font: inherit (dùng ở ${usage.tsx})`).toBeGreaterThan(0);
      }
    },
  );
});
