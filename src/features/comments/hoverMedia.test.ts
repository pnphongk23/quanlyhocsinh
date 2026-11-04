import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function violations(css: string): string[] {
  const found: string[] = [];
  const stack: boolean[] = [];
  let selector = "";
  for (const char of css) {
    if (char === "{") {
      stack.push(/@media[^{]*hover\s*:\s*hover/.test(selector));
      selector = "";
    } else if (char === "}") {
      stack.pop();
      selector = "";
    } else {
      selector += char;
      if (char === ";" ) selector = "";
    }
    if (char === ":" && selector.endsWith(":hover") && !stack.some(Boolean)) found.push(selector.trim());
  }
  return found;
}

describe("hover chỉ trên thiết bị có hover", () => {
  it("mọi :hover trong comments và shared/ui nằm trong @media (hover: hover)", () => {
    const roots = ["src/features/comments", "src/shared/ui"];
    const files = roots.flatMap((root) => readdirSync(resolve(process.cwd(), root), { recursive: true })
      .filter((file): file is string => typeof file === "string" && file.endsWith(".css"))
      .map((file) => join(resolve(process.cwd(), root), file)));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const css = readFileSync(file, "utf8");
      expect(violations(css), `${file}: ${violations(css).join(", ")}`).toEqual([]);
    }
  });
});
