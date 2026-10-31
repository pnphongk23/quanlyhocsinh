import { describe, expect, it } from "vitest";
import { pwaGuideReason } from "./pwaPrompt";

describe("pwaGuideReason", () => {
  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Zalo/24.10.1",
    "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FBAN/FBIOS;FBAV/480.0.0.0.0",
    "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Messenger/480.0.0.0",
    "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Instagram 350.0.0.0.0",
    "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Line/14.0.0",
  ])("detects in-app browser UA: %s", (ua) => {
    expect(pwaGuideReason(ua, false)).toBe("in-app-browser");
  });

  it("shows the guide in iPhone Safari until installed", () => {
    expect(pwaGuideReason("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Mobile Safari/604.1", false))
      .toBe("iphone-not-installed");
  });

  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Mobile Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
  ])("does not show in an installed app or a regular browser: %s", (ua) => {
    expect(pwaGuideReason(ua, true)).toBeNull();
  });

  it("does not show on desktop Safari", () => {
    expect(pwaGuideReason("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15", false)).toBeNull();
  });
});
