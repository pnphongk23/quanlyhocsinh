import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const tokens = read("src/shared/styles/tokens.css");

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(a: string, b: string): number {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe("một token sao dùng chung", () => {
  it("không còn màu sao ghi cứng ở danh sách, phiếu cũ/mức và màn phụ huynh", () => {
    const ariaLabels: Record<string, RegExp> = {
      "src/features/comments/CommentsPanel.tsx": /aria-label=\{`\$\{row\.stars\} sao`\}/,
      "src/features/comments/TicketEditor.tsx": /aria-label=\{`\$\{level \?\? 0\} sao`\}/,
      "src/roles/guardian/guardianUi.tsx": /aria-label=\{label \?\? `\$\{level\} sao`\}/,
    };
    for (const [path, ariaLabel] of Object.entries(ariaLabels)) {
      const source = read(path);
      expect(source, path).not.toMatch(/#E5A50A|#B7791F|#D2D7DF/i);
      expect(source, path).toContain("var(--color-star)");
      expect(source, path).toMatch(ariaLabel);
    }
    for (const path of [
      "src/features/comments/SlipCriteriaFields.module.css",
      "src/features/comments/SlipLevelFields.module.css",
    ]) {
      expect(read(path), path).toMatch(/\.starFilled\s*\{[^}]*fill:\s*var\(--color-star\)/s);
    }
    expect(tokens).toMatch(/--color-star:\s*#b7791f/i);
    expect(contrast("#b7791f", "#ffffff")).toBeGreaterThanOrEqual(3);
  });

  it("mọi CSS trong src và prototype (trừ file token) không ghi cứng màu sao", () => {
    const roots = ["src", "design/prototype/src"];
    const files = roots.flatMap((root) => readdirSync(resolve(process.cwd(), root), { recursive: true })
      .filter((file): file is string => typeof file === "string" && file.endsWith(".css") && !file.endsWith("tokens.css"))
      .map((file) => join(resolve(process.cwd(), root), file)));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      expect(read(file), file).not.toMatch(/#e5a50a|#b7791f/i);
    }
  });
});
