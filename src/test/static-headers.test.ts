import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface Rule {
  pattern: string;
  headers: [string, string][];
}

/** Đọc `public/_headers` kiểu Cloudflare Pages: một dòng không thụt lề mở rule, các dòng thụt lề là header. */
function parseHeaders(source: string): Rule[] {
  const rules: Rule[] = [];
  let current: Rule | null = null;
  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    const at = line.indexOf(":");
    if (!current || at < 0) continue;
    current.headers.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
  }
  return rules;
}

const RULES = parseHeaders(readFileSync(join(process.cwd(), "public", "_headers"), "utf8"));

function matches(pattern: string, path: string): boolean {
  if (pattern === "/*" || pattern === "*") return true;
  if (pattern.endsWith("/*")) return path.startsWith(pattern.slice(0, -1));
  return pattern === path;
}

/** Cloudflare Pages: request khớp nhiều rule thì hưởng header của tất cả, giá trị cùng tên được nối bằng ", ". */
function rawHeaderValues(path: string): [string, string][] {
  return RULES.filter((rule) => matches(rule.pattern, path)).flatMap((rule) => rule.headers);
}

function headersFor(path: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const [name, value] of rawHeaderValues(path)) {
    merged[name] = name in merged ? `${merged[name]}, ${value}` : value;
  }
  return merged;
}

const SAMPLE_PATHS = [
  "/",
  "/sw.js",
  "/manifest.webmanifest",
  "/assets/index-abc123.js",
  "/fonts/plus-jakarta-sans-latin.woff2",
  "/mascot/mit-main.webp",
  "/mascot/mit-sao-2@2x.webp",
  "/privacy",
];

describe("public/_headers", () => {
  it("lets mascot images be reused without a revalidation round-trip", () => {
    const headers = headersFor("/mascot/mit-sao-2@2x.webp");
    const cacheControl = headers["Cache-Control"] ?? "";
    expect(cacheControl).toContain("max-age=3600");
    expect(cacheControl).toContain("stale-while-revalidate=604800");
    // Tên file không có hash nội dung nên không được immutable.
    expect(cacheControl).not.toContain("immutable");
  });

  it("keeps the service worker and manifest uncached", () => {
    expect(headersFor("/sw.js")["Cache-Control"]).toBe("no-cache");
    expect(headersFor("/manifest.webmanifest")["Cache-Control"]).toBe("no-cache");
  });

  it("keeps the CSP on every path, including mascots", () => {
    for (const path of ["/", "/sw.js", "/mascot/mit-main.webp", "/assets/index-abc123.js"]) {
      const csp = headersFor(path)["Content-Security-Policy"] ?? "";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("img-src 'self' data:");
      expect(csp).toContain("frame-ancestors 'none'");
    }
  });

  it("sets each header name from one matching rule only", () => {
    for (const path of SAMPLE_PATHS) {
      const seen = new Set<string>();
      for (const [name] of rawHeaderValues(path)) {
        const key = name.toLowerCase();
        expect(seen.has(key), `${path}: "${name}" bị đặt ở nhiều rule`).toBe(false);
        seen.add(key);
      }
    }
  });
});
