import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Người dùng chốt 1/11: "Gán tất cả mặc định" + "Gửi phiếu cả lớp" LUÔN ghim đáy màn trên mobile,
 * không phụ thuộc độ dài danh sách (ảnh 27: danh sách ngắn nên thanh trôi lên giữa màn).
 * jsdom không dàn trang nên test khoá hợp đồng CSS: khung tab giãn hết màn + thanh đáy `margin-top: auto`
 * và vẫn `sticky` để danh sách dài không bị che (đệm đáy `--sticky-clearance`).
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const detailCss = read("src/features/class-space/sessionDetail.module.css");
const panelCss = read("src/features/comments/CommentsPanel.module.css");
const tokensCss = read("src/shared/styles/tokens.css");

function mobileBlock(css: string): string {
  return css.match(/@media \(max-width: 1023px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
}

describe("thanh hành động ở tab Nhận xét", () => {
  it("mobile: màn chi tiết buổi chiếm trọn màn và tab đang mở giãn hết chỗ", () => {
    const block = mobileBlock(detailCss);
    expect(block).toMatch(/\.detail\s*\{\s*min-height:\s*100dvh;\s*\}/);
    expect(block).toMatch(/\.body > div:not\(\[hidden\]\)\s*\{[^}]*flex:\s*1 0 auto[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
    expect(block).toMatch(/\.body > div:not\(\[hidden\]\) > \*\s*\{\s*flex:\s*1 0 auto;\s*\}/);
  });

  it("thanh đáy luôn ở đáy khung và vẫn dính khi danh sách dài", () => {
    const footer = panelCss.match(/\.footerGroup\s*\{[^}]*\}/s)?.[0] ?? "";
    expect(footer).toMatch(/position:\s*sticky/);
    expect(footer).toMatch(/bottom:\s*var\(--sticky-bottom\)/);
    expect(footer).toMatch(/margin-top:\s*auto/);
  });

  it("vùng cuộn vẫn chừa đệm đáy để hàng cuối không bị che", () => {
    expect(tokensCss).toMatch(/--sticky-clearance:\s*calc\(var\(--sticky-bottom\) \+ var\(--page-bottom\)\)/);
    expect(detailCss).toMatch(/\.body\s*\{[^}]*padding:\s*var\(--space-4\) var\(--page-x\) var\(--sticky-clearance\)/s);
  });
});
