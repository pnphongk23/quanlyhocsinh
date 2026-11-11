import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { layoutAllowlist } from "./layoutAllowlist";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const exceptions = new Set(["src/shared/styles/tokens.css"]);
const outsideLayout = (file: string) => !file.startsWith("src/shared/layout/") && !exceptions.has(file);
async function files(dir: string, extension: string): Promise<string[]> {
  const entries = await readdir(path.join(root, dir), { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return files(relative, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [relative] : [];
  }))).flat();
}
const count = (text: string, regex: RegExp) => [...text.matchAll(regex)].length;
function responsiveHookCount(text: string) {
  const calls = count(text, /useIsDesktop\s*\(/g);
  const importedWithoutCall = calls === 0 && /\bimport\b[^;\n]*\buseIsDesktop\b/.test(text) ? 1 : 0;
  const widthQueries = [...text.matchAll(/matchMedia\s*\(\s*(["'`])([^"'`]*\b(?:min-width|max-width|width)\b[^"'`]*)\1/gi)].length;
  const variableQueries = [...text.matchAll(/matchMedia\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g)].filter((m) => new RegExp(`\\b(?:const|let|var)\\s+${m[1]}\\s*=\\s*.[^\\n]*\\b(?:min-width|max-width|width)\\b`).test(text)).length;
  return calls + importedWithoutCall + widthQueries + variableQueries;
}
async function countsFor(file: string) {
  const text = await readFile(path.join(root, file), "utf8");
  let hardcoded = count(text, /#(?:[\da-f]{3,8})\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/gi);
  const dimensions = /\b(font-size|padding|margin|gap|top|left|right|bottom|width|height)\s*:\s*([^;}]+)/gi;
  for (const match of text.matchAll(dimensions)) {
    const value = match[2].replace(/var\s*\([^)]*\)/gi, " ");
    for (const size of value.matchAll(/(-?\d+(?:\.\d+)?)(px|rem|em|vh|vw)\b/gi)) {
      if (Number(size[1]) !== 0) hardcoded++;
    }
  }
  return {
    media: count(text, /@media\s*\([^)]*\b(?:min-width|max-width|width)\s*:/gi),
    responsiveHook: responsiveHookCount(text),
    hardcoded,
  };
}

describe("responsive layout structure gate", () => {
  it("blocks new width breakpoints, viewport hooks, and hard-coded visual values", async () => {
    const css = await files("src", ".css");
    const code = [...await files("src", ".tsx"), ...await files("src", ".ts")].filter((file) => !file.startsWith("src/test/") && !file.startsWith("src/shared/layout/"));
    const actual: { media: Record<string, number>; responsiveHook: Record<string, number>; hardcoded: Record<string, number> } = { media: {}, responsiveHook: {}, hardcoded: {} };
    for (const file of css) {
      const value = await countsFor(file);
      if (outsideLayout(file) && value.media) actual.media[file] = value.media;
      if (outsideLayout(file) && value.hardcoded) actual.hardcoded[file] = value.hardcoded;
    }
    for (const file of code) {
      if (!outsideLayout(file)) continue;
      const value = await countsFor(file);
      if (value.responsiveHook) actual.responsiveHook[file] = value.responsiveHook;
    }
    const failures: string[] = [];
    for (const rule of ["media", "responsiveHook", "hardcoded"] as const) {
      const allowed = layoutAllowlist[rule] as Record<string, number>;
      for (const file of new Set([...Object.keys(actual[rule]), ...Object.keys(allowed)])) {
        const n = actual[rule][file] ?? 0;
        const baseline = allowed[file] ?? 0;
        if (n > baseline) failures.push(`${rule}: ${file} ${n} > allowlist ${baseline}`);
        if (n < baseline) console.warn(`[layout gate] giảm ${rule}: ${file} ${baseline} → ${n}; cập nhật allowlist sau khi xác nhận.`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("requires routed settings and attendance screens to use a shared page template", async () => {
    const routed = [
      "src/features/settings/SettingsPage.tsx", "src/features/settings/ChangePasswordPage.tsx",
      "src/features/settings/EmailSettings.tsx", "src/features/comments/CriteriaSetSettingsPage.tsx",
      "src/features/class-space/SessionDetailPage.tsx",
    ];
    const exceptions = layoutAllowlist.routeTemplate as Record<string, number>;
    const failures: string[] = [];
    for (const file of routed) {
      const text = await readFile(path.join(root, file), "utf8");
      const usesTemplate = /PageShell|FormPage|MasterDetailPage/.test(text);
      const current = usesTemplate ? 0 : 1;
      const baseline = exceptions[file] ?? 0;
      if (current > baseline) failures.push(`${file}: not rendered through a shared page template`);
      if (current < baseline) console.warn(`[layout gate] migrated route: ${file}; remove from routeTemplate allowlist.`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
