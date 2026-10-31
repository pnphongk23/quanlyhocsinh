import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("chuyển trang", () => {
  const css = readFileSync("src/shared/motion/motion.module.css", "utf8");
  it("animation vào trang không giữ transform sau khi xong (fill-mode backwards)", () => {
    for (const name of ["pageIn", "pageInDetail"]) {
      expect(css).toMatch(new RegExp(`animation:\\s*${name}\\s[^;]*\\sbackwards;`));
    }
    expect(css).not.toMatch(/animation:\s*page[^;]*\sboth;/);
  });
});
