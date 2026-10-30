import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** jsdom không dàn trang: kiểm hợp đồng CSS ép ô ngày/giờ iOS Safari vừa khung và căn trái. */
describe.each(["src/features/class-space/sessions.module.css", "src/shared/ui/ui.module.css"])("ô ngày/giờ trong %s", (file) => {
  const css = readFileSync(file, "utf8");
  it("ép khung: min-width 0, bỏ appearance gốc, căn trái giá trị iOS", () => {
    expect(css).toMatch(/min-width:\s*0/);
    expect(css).toMatch(/-webkit-appearance:\s*none/);
    expect(css).toMatch(/::-webkit-date-and-time-value\s*\{[^}]*text-align:\s*left/);
    expect(css).toMatch(/\[type="date"\][\s\S]*?display:\s*flex/);
  });
});
