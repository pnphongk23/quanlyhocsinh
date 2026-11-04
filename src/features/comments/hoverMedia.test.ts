import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { globalCss, readCss } from "../../test/cssMedia";

const hasHoverOutsideMedia = (css: string): boolean => globalCss(css).includes(":hover");

describe("hover chỉ trên thiết bị có hover", () => {
  it("phát hiện được :hover ngoài @media (hover: hover)", () => {
    expect(hasHoverOutsideMedia(".x:hover{color:red}")).toBe(true);
    expect(hasHoverOutsideMedia(".x{color:red}")).toBe(false);
    expect(hasHoverOutsideMedia("@media (hover: hover){.x:hover{color:red}}")).toBe(false);
  });

  it("mọi :hover trong comments, shared/ui và guardian nằm trong @media (hover: hover)", () => {
    const roots = ["src/features/comments", "src/shared/ui", "src/roles/guardian"];
    const files = roots.flatMap((root) => readdirSync(resolve(process.cwd(), root), { recursive: true })
      .filter((file): file is string => typeof file === "string" && file.endsWith(".css"))
      .map((file) => join(root, file)));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) expect(hasHoverOutsideMedia(readCss(file)), file).toBe(false);
  });
});
