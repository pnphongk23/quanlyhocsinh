import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(resolve(process.cwd(), "src/shared/styles/tokens.css"), "utf8");
const criteriaCss = readFileSync(resolve(process.cwd(), "src/features/comments/CriteriaMode.module.css"), "utf8");
const fieldsCss = readFileSync(resolve(process.cwd(), "src/features/comments/SlipCriteriaFields.module.css"), "utf8");
const panelCss = readFileSync(resolve(process.cwd(), "src/features/comments/CommentsPanel.module.css"), "utf8");

function token(name: string): string {
  const value = tokens.match(new RegExp(`--${name}:\\s*(#[\\da-f]{6})`, "i"))?.[1];
  if (!value) throw new Error(`Missing color token: ${name}`);
  return value;
}

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("comments visual contrast", () => {
  it("uses AA text contrast for the slip star count", () => {
    expect(fieldsCss).toMatch(/\.starValue\s*\{[^}]*color:\s*var\(--color-text\)/s);
    expect(contrast(token("color-text"), token("color-neutral-soft"))).toBeGreaterThanOrEqual(4.5);
  });

  it("uses a soft informational banner with AA text contrast", () => {
    expect(criteriaCss).toMatch(/\.previewBanner\s*\{[^}]*background:\s*var\(--color-primary-soft\)[^}]*color:\s*var\(--color-primary-ink\)/s);
    expect(contrast(token("color-primary-ink"), token("color-primary-soft"))).toBeGreaterThanOrEqual(4.5);
  });

  it("labels absent chips without fading selected or legacy chip text", () => {
    expect(criteriaCss).toMatch(/\.absenceLabel\s*\{[^}]*border:\s*1px dashed currentColor/s);
    expect(criteriaCss).not.toMatch(/\.absent\s*\{[^}]*opacity\s*:/s);
    expect(criteriaCss).not.toMatch(/\.legacy\s*\{[^}]*opacity\s*:/s);
  });

  it("keeps selected disabled controls at full contrast", () => {
    expect(fieldsCss).toMatch(/\.criterionOn:disabled\s*\{[^}]*opacity:\s*1/s);
    expect(panelCss).toMatch(/\.starOptionOn:disabled\s*\{[^}]*opacity:\s*1/s);
  });

  it("fades non-interactive criteria chips with the disabled state token", () => {
    expect(criteriaCss).toMatch(/\.disabled\s*\{[^}]*opacity:\s*var\(--state-disabled-opacity\)/s);
  });
});
