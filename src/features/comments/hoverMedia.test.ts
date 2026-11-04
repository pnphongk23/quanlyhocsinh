import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { readCss } from "../../test/cssMedia";

/** Trả selector có :hover nằm ngoài mọi @media (hover: hover), kể cả trong @media max-width. */
function hoverViolations(css: string, insideHover = false): string[] {
  const found: string[] = [];
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open < 0) break;
    let depth = 0;
    let close = open;
    for (; close < css.length; close++) {
      if (css[close] === "{") depth++;
      else if (css[close] === "}" && --depth === 0) break;
    }
    const prelude = css.slice(index, open).trim();
    const body = css.slice(open + 1, close);
    if (prelude.startsWith("@media")) {
      found.push(...hoverViolations(body, insideHover || /hover\s*:\s*hover/.test(prelude)));
    } else if (prelude.startsWith("@supports") || prelude.startsWith("@layer") || prelude.startsWith("@container")) {
      found.push(...hoverViolations(body, insideHover));
    } else if (prelude.includes(":hover") && !insideHover) {
      found.push(prelude);
    }
    index = close + 1;
  }
  return found;
}

describe("hover chỉ trên thiết bị có hover", () => {
  it("bắt được :hover ngoài media, kể cả trong @media (max-width)", () => {
    expect(hoverViolations(".x:hover{color:red}")).toEqual([".x:hover"]);
    expect(hoverViolations("@media (max-width: 600px){.x:hover{color:red}}")).toEqual([".x:hover"]);
    expect(hoverViolations("@media (hover: hover){.x:hover{color:red}}")).toEqual([]);
    expect(hoverViolations("@media (max-width: 600px){@media (hover: hover){.x:hover{color:red}}}")).toEqual([]);
  });

  it("mọi :hover trong toàn src/**/*.css nằm trong @media (hover: hover)", () => {
    const files = readdirSync(resolve(process.cwd(), "src"), { recursive: true })
      .filter((file): file is string => typeof file === "string" && file.endsWith(".css"))
      .map((file) => join("src", file));
    expect(files.length).toBeGreaterThan(30);
    for (const file of files) {
      expect(hoverViolations(readCss(file)), file).toEqual([]);
    }
  });
});
