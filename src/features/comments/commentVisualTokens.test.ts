import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(resolve(process.cwd(), "src/shared/styles/tokens.css"), "utf8");
const criteriaCss = readFileSync(resolve(process.cwd(), "src/features/comments/CriteriaMode.module.css"), "utf8");
const fieldsCss = readFileSync(resolve(process.cwd(), "src/features/comments/SlipCriteriaFields.module.css"), "utf8");
const panelCss = readFileSync(resolve(process.cwd(), "src/features/comments/CommentsPanel.module.css"), "utf8");
const desktopCss = readFileSync(resolve(process.cwd(), "src/features/comments/CommentsDesktop.module.css"), "utf8");
const panelTsx = readFileSync(resolve(process.cwd(), "src/features/comments/CommentsPanel.tsx"), "utf8");
const desktopTsx = readFileSync(resolve(process.cwd(), "src/features/comments/CommentsDesktop.tsx"), "utf8");
const criteriaModeTsx = readFileSync(resolve(process.cwd(), "src/features/comments/CriteriaMode.tsx"), "utf8");
const uiCss = readFileSync(resolve(process.cwd(), "src/shared/ui/ui.module.css"), "utf8");

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

  it("labels absent chips with the warning-tone Pill instead of a dashed border", () => {
    expect(criteriaCss).not.toMatch(/\.absenceLabel\s*\{/);
    expect(criteriaModeTsx).toMatch(/!row\.attended && <Pill tone="warning">Vắng<\/Pill>/);
    // Tông cảnh báo = cặp token --state-pending-* trong Pill dùng chung.
    expect(uiCss).toMatch(/\.pillWarning\s*\{[^}]*background:\s*var\(--state-pending-bg\)[^}]*color:\s*var\(--state-pending-fg\)/s);
    expect(criteriaCss).not.toMatch(/\.absent\s*\{[^}]*opacity\s*:/s);
    expect(criteriaCss).not.toMatch(/\.legacy\s*\{[^}]*opacity\s*:/s);
  });

  it("keeps selected disabled controls at full contrast without double dimming", () => {
    // Chip chỉ xem: chỉ opacity để chip đạt (nền chọn) vẫn khác chip chưa đạt.
    expect(criteriaCss).toMatch(/\.disabled\s*\{\s*opacity:\s*var\(--state-disabled-opacity\);\s*\}/);
    expect(criteriaCss).not.toMatch(/\.disabled\s*\{[^}]*background/s);
    // Nút disabled theo quy ước repo (ui.module.css `.button:disabled`): nền neutral-soft + chữ muted, không opacity.
    expect(fieldsCss).toMatch(/\.criterion:disabled[^{]*\{[^}]*background:\s*var\(--color-neutral-soft\)[^}]*color:\s*var\(--color-muted\)/s);
    expect(fieldsCss).not.toMatch(/\.criterion(?:On)?:disabled[^{]*\{[^}]*opacity/s);
    // Ô chữ chỉ xem: nền trung tính nhưng chữ vẫn --color-text, không mờ.
    expect(fieldsCss).toMatch(/\.sentenceInput:read-only[\s\S]*?color:\s*var\(--color-text\)/);
    expect(fieldsCss).not.toMatch(/:read-only[^{]*\{[^}]*opacity/s);
    // Nút gửi/ô sao giữ nguyên cách thể hiện cũ.
    expect(panelCss).toMatch(/\.starOptionOn:disabled\s*\{[^}]*opacity:\s*1/s);
  });

  it("fades non-interactive criteria chips with the disabled state token", () => {
    expect(criteriaCss).toMatch(/\.disabled\s*\{[^}]*opacity:\s*var\(--state-disabled-opacity\)/s);
  });

  it("keeps the list rules the mobile panel still uses", () => {
    expect(panelCss).toMatch(/\.absentHeading\s*\{\s*padding:\s*var\(--space-8\) 0;\s*color:\s*var\(--color-muted\);\s*font-size:\s*var\(--text-md\);\s*font-weight:\s*var\(--weight-semibold\);\s*\}/);
    expect(panelCss).toMatch(/\.ticket:disabled\s*\{\s*opacity:\s*var\(--state-disabled-opacity\);\s*cursor:\s*default;\s*\}/);
    expect(panelCss).toMatch(/\.absentActions\s*\{\s*padding:\s*0 var\(--space-8\) var\(--space-8\);\s*\}/);
  });

  it("has a rule for every class the panels reference (no silently dropped styles)", () => {
    const classesOf = (source: string) => [...new Set([...source.matchAll(/\bs\.([A-Za-z0-9_]+)/g)].map((match) => match[1]))];
    const styledIn = (css: string) => new Set([...css.matchAll(/\.([A-Za-z0-9_]+)/g)].map((match) => match[1]));
    const missing = (tsx: string, css: string) => {
      const styled = styledIn(css);
      return classesOf(tsx).filter((name) => !styled.has(name)).sort();
    };
    expect(missing(panelTsx, panelCss)).toEqual([]);
    expect(missing(desktopTsx, desktopCss)).toEqual([]);
  });
});
