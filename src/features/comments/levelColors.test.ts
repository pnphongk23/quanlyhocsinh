import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const tokens = read("src/shared/styles/tokens.css");

function tokenValue(name: string): string {
  const value = tokens.match(new RegExp(`--${name}:\\s*(#[\\da-f]{6})`, "i"))?.[1];
  if (!value) throw new Error(`Missing color token: ${name}`);
  return value;
}
function luminance(hex: string): number {
  const channels = hex.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(foreground: string, background: string): number {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("màu theo mức", () => {
  it("Tốt/Đạt/Cần cố gắng dùng token success/primary/warning, chữ trên nền đạt AA", () => {
    const levels = read("src/shared/ui/levelSegmented.module.css");
    expect(levels).toMatch(/\[data-tone="success"\][\s\S]*?--level-good-bg/);
    expect(levels).toMatch(/\[data-tone="primary"\][\s\S]*?--level-ok-bg/);
    expect(levels).toMatch(/\[data-tone="warning"\][\s\S]*?--level-needs-work-bg/);
    const pairs = [
      ["color-success", "color-success-soft"],
      ["color-primary-ink", "color-primary-soft"],
      ["color-warning", "color-warning-soft"],
    ] as const;
    for (const [fg, bg] of pairs) {
      expect(contrast(tokenValue(fg), tokenValue(bg)), `${fg} trên ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("không dùng đỏ cho mức Cần cố gắng", () => {
    const levels = read("src/shared/ui/levelSegmented.module.css");
    expect(levels).not.toMatch(/--level-needs-work[^;]*--color-error/);
    expect(tokens).toMatch(/--level-needs-work-fg:\s*var\(--state-pending-fg\)/);
  });
});
