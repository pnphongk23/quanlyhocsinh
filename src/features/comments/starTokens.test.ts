import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const tokens = read("src/shared/styles/tokens.css");

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
  });
});
