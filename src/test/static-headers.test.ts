import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface Rule {
  pattern: string;
  headers: Record<string, string>;
}

/** Đọc `public/_headers` kiểu Cloudflare Pages: một dòng không thụt lề mở rule, các dòng thụt lề là header. */
function parseHeaders(source: string): Rule[] {
  const rules: Rule[] = [];
  let current: Rule | null = null;
  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    const at = line.indexOf(":");
    if (!current || at < 0) continue;
    current.headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return rules;
}

const RULES = parseHeaders(readFileSync(join(process.cwd(), "public", "_headers"), "utf8"));
const headersFor = (path: string): Record<string, string> => {
  const merged: Record<string, string> = {};
  for (const rule of RULES) {
    const matches = rule.pattern === "/*" || rule.pattern === path || (rule.pattern.endsWith("/*") && path.startsWith(rule.pattern.slice(0, -1)));
    if (!matches) continue;
    for (const [name, value] of Object.entries(rule.headers)) if (!(name in merged)) merged[name] = value;
  }
  return merged;
};

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
});
