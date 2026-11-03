import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const tokens = read("src/shared/styles/tokens.css");

describe("một token sao dùng chung", () => {
  it("không còn màu sao ghi cứng ở danh sách, phiếu cũ/mức và màn phụ huynh", () => {
    for (const path of [
      "src/features/comments/CommentsPanel.tsx",
      "src/features/comments/TicketEditor.tsx",
      "src/roles/guardian/guardianUi.tsx",
    ]) {
      const source = read(path);
      expect(source, path).not.toMatch(/#E5A50A|#B7791F|#D2D7DF/i);
      expect(source, path).toContain("var(--color-star)");
    }
    for (const path of [
      "src/features/comments/SlipCriteriaFields.module.css",
      "src/features/comments/SlipLevelFields.module.css",
    ]) {
      expect(read(path), path).toMatch(/\.starFilled\s*\{[^}]*fill:\s*var\(--color-star\)/s);
    }
    expect(tokens).toMatch(/--color-star:\s*#e5a50a/i);
  });
});
