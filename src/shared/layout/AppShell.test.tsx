import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("./layout.module.css");

function mediaBlock(query: string) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`@media \\(${escaped}\\) \\{([\\s\\S]*?)\\n\\}`, "m"));
  expect(match, `missing @media (${query}) block`).toBeTruthy();
  return match?.[1] ?? "";
}

describe("AppShell responsive CSS", () => {
  it("hides mobile SaveStatus with stronger specificity and places desktop grid explicitly", () => {
    const tablet = mediaBlock("min-width: 640px");
    const desktop = mediaBlock("min-width: 1024px");

    // Two class selectors outrank SaveStatus's single .pill class, independent of chunk order.
    expect(tablet).toMatch(/\.appShell\s*>\s*\.mobileSaveStatus\s*\{\s*display:\s*none/);
    expect(desktop).toMatch(/\.sidebar\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1;/);
    expect(desktop).toMatch(/\.content\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1;/);
  });
});
