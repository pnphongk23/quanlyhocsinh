import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
assert(entry, "Missing entry in Vite manifest");
function closure(keys) {
  const seen = new Set();
  function visit(key) {
    if (seen.has(key)) return;
    assert(manifest[key], `Missing chunk ${key}`);
    seen.add(key);
    (manifest[key].imports ?? []).forEach(visit);
  }
  keys.forEach(visit);
  return [...seen];
}
function measure(keys) {
  const chunks = closure(keys).map((key) => manifest[key]);
  const jsFiles = new Set(chunks.map((chunk) => chunk.file).filter((file) => file.endsWith(".js")));
  const cssFiles = new Set(chunks.flatMap((chunk) => chunk.css ?? []));
  const sum = (files) => [...files].reduce((total, file) => total + gzipSync(readFileSync(`dist/${file}`)).byteLength, 0);
  return { jsGzipBytes: sum(jsFiles), cssGzipBytes: sum(cssFiles), files: [...jsFiles] };
}
const initial = measure([entry]);
assert(initial.jsGzipBytes <= 200_000, `Initial JS exceeds 200 KB gzip: ${initial.jsGzipBytes}`);
assert(initial.jsGzipBytes + initial.cssGzipBytes <= 250_000, "Initial JS+CSS exceeds 250 KB gzip");
const shellKeys = ["src/roles/staff/StaffShell.tsx", "src/roles/guardian/GuardianShell.tsx"];
for (const key of shellKeys) {
  assert(manifest[key]?.isDynamicEntry, `${key} must be lazy`);
  assert(!closure([entry]).includes(key), `${key} leaked into initial chunk`);
}
assert(!closure([shellKeys[0]]).includes(shellKeys[1]), "Staff shell includes guardian shell");
assert(!closure([shellKeys[1]]).includes(shellKeys[0]), "Guardian shell includes staff shell");
const firstRoutes = ["src/features/classes/ClassListPage.tsx", "src/roles/guardian/GuardianOverviewPage.tsx"];
for (const key of firstRoutes) assert(manifest[key]?.isDynamicEntry, `${key} must be a lazy first route`);
console.log(JSON.stringify({ initial, staffFirstRoute: measure([entry, shellKeys[0], firstRoutes[0]]), guardianFirstRoute: measure([entry, shellKeys[1], firstRoutes[1]]) }, null, 2));
