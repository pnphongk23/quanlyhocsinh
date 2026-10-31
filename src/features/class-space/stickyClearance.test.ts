import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * jsdom không dàn trang: kiểm hợp đồng CSS giữa thanh hành động dính đáy và đệm đáy vùng cuộn.
 * Trên iPhone có safe-area (`--sticky-bottom` = 34px) đệm đáy cũ chỉ có `--page-bottom` (16px)
 * nên mép thanh che 6px thẻ cuối khi cuộn hết; đệm đáy phải bằng `--sticky-clearance`.
 */
const tokensCss = readFileSync("src/shared/styles/tokens.css", "utf8");
const sessionDetailCss = readFileSync("src/features/class-space/sessionDetail.module.css", "utf8");
const shellCss = readFileSync("src/app/shell.module.css", "utf8");

describe("đệm đáy vùng cuộn của màn chi tiết buổi học", () => {
  it("token đệm = safe-area dưới của thanh dính + đệm trang", () => {
    expect(tokensCss).toMatch(/--sticky-clearance:\s*calc\(var\(--sticky-bottom\) \+ var\(--page-bottom\)\)/);
    expect(tokensCss).toMatch(/--sticky-bottom:\s*var\(--tabbar-total\)/);
  });

  it("khung chi tiết buổi đệm đáy bằng token đệm sticky, không chỉ --page-bottom", () => {
    const body = sessionDetailCss.match(/\.body\s*\{[^}]*\}/s)?.[0] ?? "";
    expect(body).toMatch(/padding:\s*var\(--space-4\) var\(--page-x\) var\(--sticky-clearance\)/);
    expect(body).not.toMatch(/var\(--page-x\) var\(--page-bottom\)/);
  });

  it("màn con mobile đặt thanh dính sát safe-area và bỏ chỗ của thanh tab dưới", () => {
    expect(shellCss).toMatch(/--sticky-bottom:\s*var\(--safe-bottom\)/);
    expect(shellCss).toMatch(/--tabbar-total:\s*var\(--safe-bottom\)/);
  });
});
