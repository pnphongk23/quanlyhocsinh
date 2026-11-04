import { describe, expect, it } from "vitest";
import postcss from "postcss";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { readCss } from "../../test/cssMedia";

interface HoverAnalysis {
  /** Selector có :hover nhưng không nằm trong @media (hover: hover). */
  outside: string[];
  /** Selector không có :hover bị bọc trong @media (hover: hover). */
  nonHoverInside: string[];
}

function analyzeHover(css: string): HoverAnalysis {
  const root = postcss.parse(css);
  const outside: string[] = [];
  const nonHoverInside: string[] = [];
  root.walkRules((rule) => {
    let insideHover = false;
    let parent = rule.parent as postcss.Node | undefined;
    while (parent) {
      const atRule = parent as postcss.AtRule;
      if (atRule.type === "atrule" && atRule.name === "media" && /hover\s*:\s*hover/.test(atRule.params)) insideHover = true;
      parent = parent.parent as postcss.Node | undefined;
    }
    const selectors = rule.selector.split(",").map((selector) => selector.trim());
    if (insideHover) {
      nonHoverInside.push(...selectors.filter((selector) => !selector.includes(":hover")));
    } else {
      outside.push(...selectors.filter((selector) => selector.includes(":hover")));
    }
  });
  return { outside, nonHoverInside };
}

describe("hover chỉ trên thiết bị có hover", () => {
  it("bắt :hover ngoài media, kể cả trong @media max-width hoặc sau comment", () => {
    expect(analyzeHover(".x:hover{color:red}").outside).toEqual([".x:hover"]);
    expect(analyzeHover("@media (max-width: 600px){.x:hover{color:red}}").outside).toEqual([".x:hover"]);
    expect(analyzeHover("/* note */\n.x:hover{color:red}").outside).toEqual([".x:hover"]);
    expect(analyzeHover("@media (max-width: 600px){.p{&:hover{color:red}}}").outside).toEqual(["&:hover"]);
    // Comment đứng trước @media không được làm sót block.
    expect(analyzeHover("/* note */\n@media (hover: hover){.x:hover{color:red}}")).toEqual({ outside: [], nonHoverInside: [] });
    expect(analyzeHover("@media (max-width: 600px){@media (hover: hover){.x:hover{color:red}}}")).toEqual({ outside: [], nonHoverInside: [] });
  });

  it("bắt selector không-hover bị bọc trong @media (hover: hover)", () => {
    expect(analyzeHover("@media (hover: hover){.x:hover,.y{color:red}}").nonHoverInside).toEqual([".y"]);
    expect(analyzeHover("@media (hover: hover){.p{&:hover{color:red}}}").nonHoverInside).toEqual([".p"]);
  });

  it("mọi :hover trong toàn src/**/*.css nằm trong @media (hover: hover) và không bọc selector khác", () => {
    const files = readdirSync(resolve(process.cwd(), "src"), { recursive: true })
      .filter((file): file is string => typeof file === "string" && file.endsWith(".css"))
      .map((file) => join("src", file));
    expect(files.length).toBeGreaterThan(30);
    for (const file of files) {
      expect(analyzeHover(readCss(file)), file).toEqual({ outside: [], nonHoverInside: [] });
    }
  });
});
