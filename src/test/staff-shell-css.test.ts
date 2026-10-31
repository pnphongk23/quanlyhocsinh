import { describe, expect, it } from "vitest";
import { globalCss, mediaBlocks, readCss } from "./cssMedia";

const shell = readCss("src/app/shell.module.css");
const tokens = readCss("src/shared/styles/tokens.css");

describe("staff shell FAB tokens", () => {
  it("chỉ đổi biến đệm cho khung chi tiết trong khung mobile, desktop giữ --fab-bottom của token", () => {
    // Trước đây .staffDetail đổi --fab-bottom ngoài media query nên desktop xuống 16px thay vì 24px.
    expect(globalCss(shell)).not.toMatch(/--(fab-bottom|tabbar-total|sticky-bottom)\s*:/);
    const mobile = mediaBlocks(shell, "(max-width: 1023px)").join("\n");
    expect(mobile).toMatch(/:global\(:root\[data-staff-detail\]\)\s*\{[^}]*--tabbar-total:\s*var\(--safe-bottom\)/);
    expect(mobile).toMatch(/:global\(:root\[data-staff-detail\]\)\s*\{[^}]*--fab-bottom:\s*calc\(var\(--safe-bottom\) \+ var\(--fab-inset\)\)/);
    // Token gốc vẫn để desktop 24px cho nút nổi.
    expect(mediaBlocks(tokens, "(min-width: 1024px)").join("\n")).toMatch(/--fab-bottom:\s*var\(--space-24\)/);
  });
});
