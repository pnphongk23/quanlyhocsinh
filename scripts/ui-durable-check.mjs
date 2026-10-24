import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { entities, identity, sessionFor } from "./ui-audit-fixtures/demo.mjs";
import { mockWriteResponse } from "./ui-audit-fixtures/mock-write-responses.mjs";

const root = process.cwd();
const base = "http://127.0.0.1:5197";
const planDir = "/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-feedback-20261024";
const outDir = path.join(planDir, "shots", "after");
let server;
let browser;
const result = { candidate: "", latencyMs: [], batch: null, roots: [] };

async function routeMock(page, tracker = null) {
  const mockEntities = structuredClone(entities);
  await page.route("**/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.pathname.endsWith("/me")) return route.fulfill({ json: sessionFor("staff").me });
    const writeResponse = mockWriteResponse(request, mockEntities);
    if (writeResponse) return route.fulfill({ json: writeResponse });
    if (url.pathname === "/v1/sync/snapshot") return route.fulfill({ json: { cursor: 0, epoch: 1, entities: ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report", "report_publication"] } });
    const entity = url.pathname.match(/\/v1\/sync\/snapshot\/([^/]+)$/)?.[1];
    if (entity) {
      const table = ({ class: "classes", student: "students", class_session: "sessions", attendance: "attendance", test: "tests", score: "scores", slip: "slips", homework_section: "homeworkSections", homework_grade: "homeworkGrades", report: "reports", report_publication: "reportPublications" })[entity] ?? `${entity}s`;
      return route.fulfill({ json: { items: mockEntities[table] ?? [], next_after: null } });
    }
    if (url.pathname === "/v1/sync/pull") return route.fulfill({ json: { cursor: 0, epoch: 1, has_more: false, upserts: {}, deleted: [] } });
    if (url.pathname === "/v1/sync/push" && method === "POST") {
      const body = request.postDataJSON();
      tracker?.pushes.push({ commands: body.commands ?? [], at: Date.now() });
      return route.fulfill({ json: { cursor: 0, epoch: 1, results: (body.commands ?? []).map((c) => ({ id: c.id, status: "applied", version: 1 })) } });
    }
    return route.fulfill({ status: 200, json: {} });
  });
}

async function seed(page) {
  const session = sessionFor("staff");
  await page.addInitScript((value) => localStorage.setItem("qlh.session.v1", JSON.stringify(value)), session);
  await page.goto(base + "/dang-nhap", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ identity, entities }) => {
    const fields = { classes:["key","identity","id"], students:["key","identity","class_id","id"], sessions:["key","identity","class_id","date","id"], attendance:["key","identity","session_id","student_id"], tests:["key","identity","class_id","date","id"], scores:["key","identity","test_id","student_id"], slips:["key","identity","session_id","student_id"], homeworkSections:["key","identity","session_id","id"], homeworkGrades:["key","identity","section_id","student_id"], reports:["key","identity","class_id","student_id","month"], reportPublications:["key","identity","report_id","publication_no"], outbox:["id","identity","status","created_at"], meta:["key","identity"] };
    const request = indexedDB.open("qlh-web", 10);
    const db = await new Promise((resolve, reject) => { request.onupgradeneeded=()=>{for(const [n,fs] of Object.entries(fields))if(!request.result.objectStoreNames.contains(n)){const s=request.result.createObjectStore(n,{keyPath:fs[0]});for(const f of fs.slice(1))s.createIndex(f,f)}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error); });
    const active=`${identity.userId}:${identity.workspaceId}:${identity.membershipId}`;
    await new Promise((resolve,reject)=>{const tx=db.transaction(Object.keys(entities),"readwrite");for(const [table,rows] of Object.entries(entities)){const entity=table==="homeworkSections"?"homework_section":table==="homeworkGrades"?"homework_grade":table==="reportPublications"?"report_publication":table==="sessions"?"class_session":table.replace(/s$/,'');for(const row of rows)tx.objectStore(table).put({...row,identity:active,key:`${active}|${entity}|${row.id??`${row.session_id}|${row.student_id}|${row.test_id??''}`}`,entity})}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
  }, { identity, entities });
}

async function appPage(viewport, route, tracker = null) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await routeMock(page, tracker);
  await seed(page);
  await page.goto(base + route, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.trim().length > 10, null, { timeout: 10000 });
  return { page, context };
}

async function measureLatency() {
  for (let i = 0; i < 10; i++) {
    const tracker = { pushes: [] };
    const { page, context } = await appPage({ width: 1440, height: 900 }, "/lop/demo-6a/bai-kiem-tra/demo-test", tracker);
    try {
      await page.getByRole("textbox", { name: "Điểm Học sinh 1" }).fill(String(10.5 + (i % 2) * 0.5));
      const start = Date.now();
      const response = page.waitForResponse((r) => new URL(r.url()).pathname === "/v1/sync/push" && r.request().method() === "POST", { timeout: 7000 });
      await page.getByRole("button", { name: "Lưu điểm", exact: true }).click();
      const pushed = await response;
      await pushed.finished();
      result.latencyMs.push(Date.now() - start);
    } finally { await context.close(); }
  }
  const ordered = [...result.latencyMs].sort((a,b)=>a-b);
  result.latencySummary = { min: ordered[0], median: (ordered[4] + ordered[5]) / 2, max: ordered.at(-1), under1s: ordered.filter((n)=>n<1000).length };
}

async function measureBatch() {
  const tracker = { pushes: [] };
  const { page, context } = await appPage({ width: 1440, height: 900 }, "/lop/demo-6a/diem", tracker);
  try {
    const inputs = page.getByRole("textbox", { name: /Điểm/ });
    const count = await inputs.count();
    const changed = Math.min(count, 8);
    for (let i = 0; i < changed; i++) await inputs.nth(i).fill(String(7 + (i % 7) * 0.5));
    await page.getByRole("button", { name: "Lưu điểm", exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => (b.getAttribute("aria-label") || b.innerText).trim() === "Đã lưu"), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    result.batch = { scoreInputs: count, changed: changed, pushRequests: tracker.pushes.length, commandsPerRequest: tracker.pushes.map((p) => p.commands.length) };
  } finally { await context.close(); }
}

async function rootChecks() {
  const immediate = path.join(outDir, "root-immediate");
  for (const auth of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__foundationFlash = false;
      const detect = () => { if (/FoundationHome|Chào mừng|Tổng quan/.test(document.body?.innerText ?? "")) window.__foundationFlash = true; };
      new MutationObserver(detect).observe(document, { childList: true, subtree: true, characterData: true });
      document.addEventListener("DOMContentLoaded", detect);
    });
    if (auth) {
      await page.addInitScript((s) => localStorage.setItem("qlh.session.v1", JSON.stringify(s)), sessionFor("staff"));
      await routeMock(page);
    }
    await page.goto(base + "/", { waitUntil: "commit" });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve()))).catch(() => {});
    await page.screenshot({ path: `${immediate}-${auth ? "staff" : "unauth"}.png`, fullPage: false }).catch(() => {});
    await page.waitForFunction((expected) => location.pathname === expected, auth ? "/lop" : "/dang-nhap", { timeout: 8000 }).catch(() => {});
    const row = { auth, path: new URL(page.url()).pathname, expected: auth ? "/lop" : "/dang-nhap", foundationFlash: await page.evaluate(() => window.__foundationFlash).catch(() => null), screenshot: `${immediate}-${auth ? "staff" : "unauth"}.png` };
    result.roots.push(row);
    await context.close();
  }
}

try {
  result.candidate = (await (await import("node:child_process")).execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })).trim();
} catch { result.candidate = "unknown"; }
try {
  await mkdir(outDir, { recursive: true });
  let executablePath;
  try { await access("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"); executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; } catch {}
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  server = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", "5197", "--strictPort"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`Vite preview did not start on :5197; ${output}`)), 45000);
    const ready = (data) => { output += String(data); if (output.includes("127.0.0.1:5197")) { clearTimeout(timer); resolve(); } };
    server.stdout.on("data", ready); server.stderr.on("data", ready);
    server.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Vite preview exited code=${code}; ${output}`)); });
  });
  await measureLatency();
  await measureBatch();
  await rootChecks();
} catch (error) { result.error = String(error?.stack ?? error); process.exitCode = 1; }
finally { await browser?.close(); server?.kill(); }
const file = path.join(planDir, "tools", "durable-browser-results.json");
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
