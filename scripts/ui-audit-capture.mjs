import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "playwright";
import { entities, identity, rolePickerSession, sessionFor } from "./ui-audit-fixtures/demo.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((all, arg, i, list) => arg.startsWith("--") ? [...all, [arg.slice(2), list[i + 1]?.startsWith("--") ? "true" : list[i + 1]]] : all, []));
const team = args.team ?? "all";
const phase = args.phase ?? "before";
const scenario = args.scenario ?? "default";
const base = args.base ?? "http://127.0.0.1:5181";
const out = path.resolve(args.out ?? "/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit");
const phaseOut = ["before", "after"].includes(path.basename(out)) ? out : path.join(out, phase);
  if (!/^(T|A|B|C|all)$/.test(team) || !/^(before|after)$/.test(phase) || !/^(default|save-error|offline|save-states)$/.test(scenario)) throw new Error("Usage: --team T|A|B|C|all --phase before|after [--scenario save-error|offline|save-states] [--base URL] [--out DIR]");
const credentialPath = process.env.QLH_STAGING_CREDENTIAL_FILE ?? "/tmp/qlh-staging-demo.txt";
const staging = new URL(base).hostname === "qlh-staging-web.pages.dev";
if (staging) {
  try { await readFile(credentialPath, "utf8"); }
  catch { throw new Error("Staging capture requires QLH_STAGING_CREDENTIAL_FILE; credential contents are never printed."); }
  throw new Error("Staging credentials are present, but this harness currently supports local demo capture only.");
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname, ".."));
let server;
if (base.includes("127.0.0.1:5181") || base.includes("localhost:5181")) {
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5181", "--strictPort"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Vite did not become ready on port 5181.")), 45000);
    const onData = (chunk) => { if (/127\.0\.0\.1:5181|localhost:5181/.test(String(chunk))) { clearTimeout(timeout); resolve(); } };
    server.stdout.on("data", onData); server.stderr.on("data", onData);
    server.once("exit", () => { clearTimeout(timeout); reject(new Error("Vite exited before becoming ready on port 5181.")); });
  }).catch((error) => { server.kill(); throw error; });
}
const viewports = [
  { name: "390x844", width: 390, height: 844, mobile: true },
  { name: "375x667", width: 375, height: 667, mobile: true },
  { name: "430x932", width: 430, height: 932, mobile: true },
  { name: "1024x768", width: 1024, height: 768, mobile: false },
  { name: "1440x900", width: 1440, height: 900, mobile: false },
];
const plans = {
  A: { viewports: [...viewports.slice(0, 3), viewports[3]], role: "staff", routes: [["/lop", "classes"], ["/lop/moi", "create-class"], ["/lich", "schedule"], ["/lop/demo-6a/buoi-hoc", "class-sessions"], ["/lop/demo-6a/hoc-sinh", "class-students"], ["/lop/demo-empty/hoc-sinh", "empty-students"], ["/lop/demo-6a/bai-kiem-tra", "tests"], ["/lop/demo-6a/bai-kiem-tra/demo-test", "test-scores"], ["/lop/demo-6a/diem", "score-grid"], ["/lop/demo-6a/bao-cao", "reports"], ["/lop/demo-6a/buoi-hoc/demo-past", "session-detail"]] },
  B: { viewports: [viewports[4], viewports[3]], role: "staff", routes: [["/lop", "classes"], ["/lop/demo-6a/buoi-hoc", "class-sessions"], ["/lop/demo-6a/hoc-sinh", "class-students"], ["/lop/demo-6a/bai-kiem-tra", "tests"], ["/lop/demo-6a/diem", "score-grid"], ["/lop/demo-6a/bao-cao", "reports"], ["/lop/demo-6a/buoi-hoc/demo-past", "session-detail"]] },
  C: { viewports: [viewports[0], viewports[1], viewports[2], viewports[4], viewports[3]], role: "guardian", routes: [["/ph", "guardian-home"], ["/ph/nhan-xet", "guardian-comments"], ["/ph/buoi/demo-past", "guardian-session"], ["/ph/diem", "guardian-scores"], ["/ph/bao-cao", "guardian-reports"], ["/dang-nhap", "login"], ["/dang-ky", "register"], ["/quen-mat-khau", "forgot-password"], ["/chon-vai-tro", "role-picker"], ["/cai-dat", "settings"], ["/cai-dat/doi-mat-khau", "change-password"], ["/dang-nhap", "pwa-guide"]] },
  T: { viewports, role: "staff", routes: [["/lop", "shell-tabs"], ["/lop/demo-6a/buoi-hoc", "shell-class-tabs"], ["/lop/demo-6a/buoi-hoc/demo-past", "session-sheet-menu"]] },
};
const selected = scenario === "default" ? team === "all" ? ["T", "A", "B", "C"] : [team] : scenario === "save-states" ? (team === "all" ? ["A", "B", "C"] : [team]) : [team];
if (scenario !== "default" && scenario !== "save-states" && team !== "A") throw new Error("Save-error/offline scenarios run with --team A only.");
const scenarioViewports = [viewports[0], viewports[4]];
const scenarioRoutes = [["/lop/demo-6a/bai-kiem-tra/demo-test", "test-scores"], ["/lop/demo-6a/buoi-hoc/demo-past", "session-detail"], ["/lop/moi", "create-class"]];
const rows = [];
const overlap = [];
const saveActions = [];
let pushRequestCount = 0;
let pushCommandCount = 0;
async function maxSequence(directory) {
  let max = 0;
  const visit = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else { const n = Number(entry.name.match(/^(\d+)-/)?.[1] ?? 0); if (n > max) max = n; }
    }
  };
    for (const name of selected) for (const vp of scenario === "save-states" ? scenarioViewports : plans[name].viewports) await visit(path.join(phaseOut, name, vp.name, ...(scenario === "save-states" ? [] : ["v2"])));
  return max;
}
let sequence = await maxSequence(out);
async function screenshot(page, teamName, viewport, label, state, fullPage = !viewport.mobile) {
  const file = `${String(++sequence).padStart(3, "0")}-${label}-${state}.png`;
    const dir = path.join(phaseOut, teamName, viewport.name, ...(scenario === "save-states" ? [] : ["v2"]));
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, file), fullPage, animations: "disabled" });
    return `${scenario === "save-states" ? `save-states/${phase}/${teamName}/${viewport.name}` : `${phase}/${teamName}/${viewport.name}/v2`}/${file}`;
}
async function seed(page, role, base) {
  const session = sessionFor(role);
  await page.addInitScript((value) => { localStorage.setItem("qlh.session.v1", JSON.stringify(value)); }, session);
  await page.goto(new URL("/dang-nhap", base).href, { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ role, identity, entities, session }) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("qlh-web", 1);
      req.onupgradeneeded = () => {
        const storeIndexes = { classes: ["key", "identity", "id"], students: ["key", "identity", "class_id", "id"], sessions: ["key", "identity", "class_id", "date", "id"], attendance: ["key", "identity", "session_id", "student_id"], tests: ["key", "identity", "class_id", "date", "id"], scores: ["key", "identity", "test_id", "student_id"], slips: ["key", "identity", "session_id", "student_id"], homeworkSections: ["key", "identity", "session_id", "id"], homeworkGrades: ["key", "identity", "section_id", "student_id"], reports: ["key", "identity", "class_id", "student_id", "month"], reportPublications: ["key", "identity", "report_id", "publication_no"], outbox: ["id", "identity", "status", "created_at"], meta: ["key", "identity"] };
        for (const [table, indexes] of Object.entries(storeIndexes)) {
          if (!req.result.objectStoreNames.contains(table)) { const store = req.result.createObjectStore(table, { keyPath: indexes[0] }); for (const index of indexes.slice(1)) store.createIndex(index, index); }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const activeIdentity = role === "guardian" ? `${session.user.id}:${identity.workspaceId}:${session.activeMembershipId}` : `${identity.userId}:${identity.workspaceId}:${identity.membershipId}`;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(Object.keys(entities), "readwrite");
      for (const [table, rows] of Object.entries(entities)) {
        const entity = table === "homeworkSections" ? "homework_section" : table === "homeworkGrades" ? "homework_grade" : table === "reportPublications" ? "report_publication" : table === "sessions" ? "class_session" : table.replace(/s$/, "");
        rows.forEach((row) => tx.objectStore(table).put({ ...row, identity: activeIdentity, key: `${activeIdentity}|${entity}|${row.id ?? row.session_id + "|" + row.student_id + "|" + (row.test_id ?? "")}`, entity }));
      }
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { role, identity, entities, session });
}
async function recordHorizontalOverflow(page, name, vp, route, label) {
  if (vp.width !== 1024) return;
  const measure = await page.evaluate(() => ({ viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, rootWidth: document.querySelector("#root")?.scrollWidth ?? null, horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, document.querySelector("#root")?.scrollWidth ?? 0) > innerWidth }));
  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "horizontal-overflow-check", status: "measured", image: "—", reason: JSON.stringify(measure) });
}
async function recordSaveActions(page, name, vp, route, label) {
  const controls = await page.evaluate(() => [...document.querySelectorAll('button,[role="button"],input[type="submit"]')]
    .map((el) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height || getComputedStyle(el).visibility === 'hidden') return null;
      const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
      if (!/(lưu|tạo|gửi|phát hành|đăng nhập|đăng ký|đổi mật khẩu|xoá|xóa|hủy|huỷ|xác nhận|điểm danh|lưu trữ|thêm học sinh|lưu phần)/i.test(text)) return null;
      return { label: text, disabled: Boolean(el.disabled), ariaBusy: el.getAttribute('aria-busy') ?? '', title: el.getAttribute('title') ?? '', describedBy: el.getAttribute('aria-describedby') ?? '' };
    }).filter(Boolean));
  for (const control of controls) saveActions.push({ team: name, viewport: vp.name, route, screen: label, ...control, requestsBefore: pushRequestCount, commandsBefore: pushCommandCount });
  return controls;
}
async function readOutboxCount(page) {
  return page.evaluate(async () => {
    const databases = await indexedDB.databases?.() ?? [];
    if (!databases.some((database) => database.name === "qlh-web")) return null;
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("qlh-web");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!db.objectStoreNames.contains("outbox")) { db.close(); return 0; }
    const count = await new Promise((resolve, reject) => {
      const request = db.transaction("outbox", "readonly").objectStore("outbox").count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return count;
  }).catch(() => null);
}
async function captureSaveFlow(page, name, vp, route, screen, actionName, button, reason = "") {
  const requestStart = pushRequestCount, commandStart = pushCommandCount, outboxStart = await readOutboxCount(page);
  await button.evaluate((el) => { el.click(); el.click(); });
  await page.waitForTimeout(150);
  const pendingImage = await screenshot(page, name, vp, screen, `${actionName}-saving-double-tap`, false);
  await page.waitForTimeout(3200);
  const successImage = await screenshot(page, name, vp, screen, `${actionName}-after-save`, false);
  const evidence = `pushRequests=${pushRequestCount - requestStart}; pushCommands=${pushCommandCount - commandStart}; outbox before=${outboxStart}; outbox after=${await readOutboxCount(page)}${reason ? `; ${reason}` : ""}`;
  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label: screen, state: `${actionName}-saving-double-tap`, status: "captured", image: pendingImage, reason: evidence });
  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label: screen, state: `${actionName}-after-save`, status: "captured", image: successImage, reason: evidence });
}
try {
  let executablePath;
  try { await access("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"); executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; } catch {}
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  for (const name of selected) {
      const spec = scenario === "default" ? plans[name] : scenario === "save-states" ? { ...plans[name], viewports: scenarioViewports } : { ...plans.A, viewports: scenarioViewports, routes: scenarioRoutes };
    for (const vp of spec.viewports) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile });
          const page = await context.newPage();
          page.setDefaultTimeout(7000);
          let scenarioPushResult = "not-requested";
          let guardianUnlinkedMode = false;
          let sessionRole = spec.role;
          await page.route("**/v1/**", async (route) => {
          const url = new URL(route.request().url());
          if (url.pathname.endsWith("/me")) {
              const me = sessionFor(sessionRole).me;
            if (guardianUnlinkedMode && me.memberships[0]?.students) me.memberships[0].students = [];
            return route.fulfill({ json: me });
          }
        if (url.pathname === "/v1/sync/snapshot") return route.fulfill({ json: { cursor: 0, epoch: 1, entities: ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report", "report_publication"] } });
        const snapshotEntity = url.pathname.match(/\/v1\/sync\/snapshot\/([^/]+)$/)?.[1];
        if (snapshotEntity) {
          const table = ({ class: "classes", student: "students", class_session: "sessions", attendance: "attendance", test: "tests", score: "scores", slip: "slips", homework_section: "homeworkSections", homework_grade: "homeworkGrades", report: "reports", report_publication: "reportPublications" })[snapshotEntity] ?? `${snapshotEntity}s`;
          return route.fulfill({ json: { items: entities[table] ?? [], next_after: null } });
        }
        if (url.pathname === "/v1/sync/pull") return route.fulfill({ json: { cursor: 0, epoch: 1, has_more: false, server_time: new Date().toISOString(), upserts: {}, deleted: [] } });
          if (url.pathname === "/v1/sync/push" && route.request().method() === "POST") {
            pushRequestCount += 1;
          if (scenario === "save-error") { scenarioPushResult = "503-rejected"; return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "demo_save_rejected" }) }); }
          if (scenario === "offline") { scenarioPushResult = "aborted-offline"; return route.abort("internetdisconnected"); }
          scenarioPushResult = "200-applied";
            const body = route.request().postDataJSON();
            pushCommandCount += body.commands?.length ?? 0;
            if (scenario === "save-states") await new Promise((resolve) => setTimeout(resolve, 3000));
          return route.fulfill({ json: { cursor: 0, epoch: 1, results: (body.commands ?? []).map((command) => ({ id: command.id, status: "applied", version: 1 })) } });
        }
        return route.fulfill({ status: 200, json: {} });
      });
        await seed(page, spec.role, base);
          for (const [route, label] of spec.routes) {
            let status = "captured", reason = "";
            let scenarioStep = "open-route";
            try {
              if (label === "change-password") {
                const passwordContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile });
                const passwordPage = await passwordContext.newPage();
                passwordPage.setDefaultTimeout(7000);
                await passwordPage.route("**/v1/**", (passwordRoute) => {
                  if (new URL(passwordRoute.request().url()).pathname.endsWith("/me")) return passwordRoute.fulfill({ json: sessionFor("staff").me });
                  return passwordRoute.fulfill({ status: 200, json: {} });
                });
                await seed(passwordPage, "staff", base);
                await passwordPage.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
                await passwordPage.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 6000 }).catch(() => {});
                if (vp.mobile && passwordPage.url().includes("/cai-dat/doi-mat-khau")) {
                  const mainImage = await screenshot(passwordPage, name, vp, label, "main");
                  rows.push({ team: name, viewport: vp.name, route, url: passwordPage.url(), label, state: "màn chính", status: "captured", image: mainImage, reason: "Context sạch đã đăng nhập với vai giáo viên." });
                  if (scenario === "save-states") await recordSaveActions(passwordPage, name, vp, route, label);
                  const fields = passwordPage.locator('input[type="password"]');
                  if (await fields.count() >= 3) {
                    await fields.nth(0).fill("demo-current"); await fields.nth(1).fill("demo-current"); await fields.nth(2).fill("demo-current");
                    await passwordPage.locator('button[type="submit"]').click();
                    const errorImage = await screenshot(passwordPage, name, vp, label, "form-validation-error");
                    rows.push({ team: name, viewport: vp.name, route, url: passwordPage.url(), label, state: "form-validation-error", status: "captured", image: errorImage, reason: "Mật khẩu mới trùng mật khẩu hiện tại." });
                    const input = fields.first(); await input.focus(); const focusImage = await screenshot(passwordPage, name, vp, label, "keyboard-focus");
                    rows.push({ team: name, viewport: vp.name, route, url: passwordPage.url(), label, state: "keyboard-focus", status: "captured", image: focusImage, reason: "" });
                    if (scenario === "save-states") {
                      await fields.nth(0).fill("Demo-Current-2026!"); await fields.nth(1).fill("Demo-New-2026!"); await fields.nth(2).fill("Demo-New-2026!");
                      const submit = passwordPage.locator('button[type="submit"]');
                      const validImage = await screenshot(passwordPage, name, vp, label, "change-password-edited-valid", false);
                      rows.push({ team: name, viewport: vp.name, route, url: passwordPage.url(), label, state: "change-password-edited-valid", status: "captured", image: validImage, reason: `disabled=${await submit.isDisabled()}` });
                      await captureSaveFlow(passwordPage, name, vp, route, label, "change-password", submit, "API mock local; fake values");
                    }
                  }
                } else {
                  status = "unavailable";
                  reason = "ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã).";
                  rows.push({ team: name, viewport: vp.name, route, url: passwordPage.url(), label, state: "màn chính", status, image: "—", reason });
                }
                await recordHorizontalOverflow(passwordPage, name, vp, route, label);
                await passwordContext.close();
                continue;
              }
              if (["login", "register", "forgot-password", "role-picker"].includes(label)) {
              const authContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile });
              const authPage = await authContext.newPage();
              authPage.setDefaultTimeout(7000);
              const multi = label === "role-picker" ? rolePickerSession() : null;
              if (multi) await authPage.addInitScript((value) => localStorage.setItem("qlh.session.v1", JSON.stringify(value)), multi);
              await authPage.route("**/v1/**", (requestRoute) => {
                if (new URL(requestRoute.request().url()).pathname.endsWith("/me") && multi) return requestRoute.fulfill({ json: multi.me });
                return requestRoute.fulfill({ status: 200, json: {} });
              });
              await authPage.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
              await authPage.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 6000 }).catch(() => {});
                  const authImage = await screenshot(authPage, name, vp, label, "main");
                  rows.push({ team: name, viewport: vp.name, route, url: authPage.url(), label, state: "màn chính", status: "captured", image: authImage, reason: label === "role-picker" ? "Fixture có hai vai đang hoạt động." : "Context sạch, không có storage đăng nhập." });
                  if (scenario === "save-states") await recordSaveActions(authPage, name, vp, route, label);
                await recordHorizontalOverflow(authPage, name, vp, route, label);
              if (label !== "role-picker") {
                const submit = authPage.locator('button[type="submit"]').first();
                if (await submit.count()) { await submit.click(); const errorImage = await screenshot(authPage, name, vp, label, "form-validation-error"); rows.push({ team: name, viewport: vp.name, route, url: authPage.url(), label, state: "form-validation-error", status: "captured", image: errorImage, reason: "" }); }
                const input = authPage.locator("input:visible").first();
                if (vp.mobile && await input.count()) { await input.focus(); const focusImage = await screenshot(authPage, name, vp, label, "keyboard-focus"); rows.push({ team: name, viewport: vp.name, route, url: authPage.url(), label, state: "keyboard-focus", status: "captured", image: focusImage, reason: "" }); }
              }
              if (scenario === "save-states" && ["login", "register"].includes(label)) {
                const inputs = authPage.locator("input:visible");
                for (let i = 0; i < await inputs.count(); i++) {
                  const input = inputs.nth(i), type = await input.getAttribute("type"), nameAttr = (await input.getAttribute("name")) ?? "";
                  if (type === "password") await input.fill("Demo-Pass-2026!");
                  else if (type === "tel" || /phone/i.test(nameAttr)) await input.fill("09000000001");
                  else if (type === "email") await input.fill("demo@example.test");
                  else await input.fill(label === "register" ? "Không gian Demo" : "Người dùng Demo");
                }
                const submit = authPage.locator('button[type="submit"]:visible').first();
                if (await submit.count()) {
                  const validImage = await screenshot(authPage, name, vp, label, `${label}-edited-valid`, false);
                  rows.push({ team: name, viewport: vp.name, route, url: authPage.url(), label, state: `${label}-edited-valid`, status: "captured", image: validImage, reason: `disabled=${await submit.isDisabled()}` });
                  await captureSaveFlow(authPage, name, vp, route, label, label, submit, "API mock local; fake values");
                }
              }
              await authContext.close();
              continue;
            }
            if (label === "pwa-guide") {
              const cdp = await context.newCDPSession(page);
              await cdp.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Instagram/360.0" });
              await page.evaluate(() => localStorage.removeItem("qlh:pwa-guide-dismissed"));
              await page.goto("about:blank");
              await page.goto(new URL("/dang-nhap", base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
            } else {
              await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
            }
            await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 6000 }).catch(() => {});
              await page.addStyleTag({ content: ":root{--safe-top:env(safe-area-inset-top,0px);--safe-bottom:env(safe-area-inset-bottom,0px)}" }).catch(() => {});
              const initialText = (await page.locator("body").innerText().catch(() => "")).slice(0, 1000);
              if (label === "change-password" && !vp.mobile) { status = "unavailable"; reason = "ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã)."; }
            if (/không tìm thấy màn hình|không tìm thấy lớp|lỗi ứng dụng|không có quyền xem/i.test(initialText)) { status = "unavailable"; reason = "Route không render được nội dung dự kiến với fixture local."; }
              const image = await screenshot(page, name, vp, label, "main", scenario === "default" ? !vp.mobile : false);
              rows.push({ team: name, viewport: vp.name, route: label === "pwa-guide" ? "/dang-nhap (PwaGuideGate, Instagram UA)" : route, url: page.url(), label, state: "màn chính", status, image, reason });
              await recordHorizontalOverflow(page, name, vp, route, label);
              if (scenario === "save-states") await recordSaveActions(page, name, vp, route, label);
              if (["save-error", "offline"].includes(scenario) && status === "captured") {
              const actionName = label === "test-scores" ? "nhập điểm" : label === "session-detail" ? "điểm danh" : "tạo lớp";
              if (scenario === "offline") { scenarioStep = "set-offline"; await context.setOffline(true); }
              if (label === "test-scores") {
                scenarioStep = "change-score";
                const scoreInput = page.locator('input[aria-label^="Điểm "]').first();
                await scoreInput.fill("10.5");
                await page.waitForFunction(() => { const b=[...document.querySelectorAll("button")].find(x => x.textContent.trim()==="Lưu điểm"); return b && !b.disabled; });
                scenarioStep = "submit-score";
                await page.getByRole("button", { name: "Lưu điểm", exact: true }).click();
              } else if (label === "session-detail") {
                scenarioStep = "change-attendance";
                await page.getByRole("button", { name: "Tất cả có mặt", exact: true }).click();
                await page.waitForFunction(() => { const b=[...document.querySelectorAll("button")].find(x => x.textContent.trim()==="Lưu điểm danh"); return b && !b.disabled; });
                scenarioStep = "submit-attendance";
                await page.getByRole("button", { name: "Lưu điểm danh", exact: true }).click();
              } else {
                scenarioStep = "fill-class";
                await page.locator("input").first().fill("Lớp kiểm tra lưu");
                scenarioStep = "choose-class-day";
                const weekdays = page.getByRole("button", { name: /^T[2-7]$/ });
                if (await weekdays.count()) await weekdays.first().click();
                scenarioStep = "submit-class";
                await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
              }
              scenarioStep = "wait-for-save-state";
              await page.waitForTimeout(3500);
              const diagnostic = await page.evaluate(() => {
                const text = document.body.innerText;
                const terms = [...text.matchAll(/[^\n]*(?:lỗi lưu|thử lại|đang chờ|chưa gửi|ngoại tuyến|không có kết nối|không lưu được|gửi lại|chưa đồng bộ|đang đồng bộ|lưu trên thiết bị|lưu cục bộ)[^\n]*/gi)].map((m) => m[0].trim()).slice(0, 8);
                const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }; };
                const buttons = [...document.querySelectorAll("button,[role=button]")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
                const fab = buttons.find((el) => { const r = el.getBoundingClientRect(); return r.width >= 40 && r.width <= 72 && r.height >= 40 && r.height <= 72 && /\+|thêm|tạo/i.test(el.innerText || el.getAttribute("aria-label") || ""); });
                const tabs = [...document.querySelectorAll("nav")].map((el) => ({ el, rect: el.getBoundingClientRect() })).filter(({ rect }) => rect.height > 0 && rect.bottom <= innerHeight + 1).sort((a, b) => b.rect.bottom - a.rect.bottom)[0]?.el;
                const notice = [...document.querySelectorAll("body *")].find((el) => { const r=el.getBoundingClientRect(); return el.children.length === 0 && r.width > 0 && r.height > 0 && /lỗi lưu|thử lại|đang chờ|ngoại tuyến|không có kết nối|không lưu được|gửi lại|chưa đồng bộ|đang đồng bộ|lưu trên thiết bị|lưu cục bộ/i.test(el.textContent || ""); });
                const overlap = (a,b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
                const nr=notice?.getBoundingClientRect(), fr=fab?.getBoundingClientRect(), tr=tabs?.getBoundingClientRect();
                const root=document.querySelector("#root");
                return { notices: terms, retryButtons: buttons.filter((el) => /thử lại|gửi lại/i.test(el.innerText || el.getAttribute("aria-label") || "")).map((el) => (el.innerText || el.getAttribute("aria-label") || "").trim()), notice: box(notice), fab: box(fab), bottomTabs: box(tabs), noticeOverlapsFab: overlap(nr,fr), noticeOverlapsBottomTabs: overlap(nr,tr), viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, rootWidth: root?.scrollWidth ?? null }, frame: box(root) };
              });
              diagnostic.pushResult = scenarioPushResult;
              const scenarioImage = await screenshot(page, name, vp, label, `${scenario}-${actionName}`, false);
              rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: `${scenario}-${actionName}`, status: "captured", image: scenarioImage, reason: JSON.stringify(diagnostic) });
              if (scenario === "offline") await context.setOffline(false);
              continue;
            }
              const captureInteraction = async (state) => {
              const shot = await screenshot(page, name, vp, label, state);
              rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state, status: "captured", image: shot, reason: "" });
              };
              if (status === "captured" && label === "class-students" && vp.mobile) {
                const measures = await page.evaluate(() => {
                  const box = (selector) => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return { selector, left: Math.round(r.left), right: Math.round(innerWidth - r.right), width: Math.round(r.width) }; };
                  return [box("header"), box('nav[aria-label="Mục của lớp"]'), box('main [class*=list] > *')].filter(Boolean);
                });
                rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "margin-measurements", status: "measured", image: "—", reason: JSON.stringify(measures) });
              }
            if (status === "captured" && (label.includes("students") || label.includes("sessions") || label.includes("guardian"))) {
              const target = await page.evaluate(async () => {
                const candidates = [...document.querySelectorAll("*")].filter((el) => {
                  const style = getComputedStyle(el), rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0 && el.scrollHeight > el.clientHeight + 4 && ["auto", "scroll"].includes(style.overflowY);
                }).sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
                const scroller = candidates[0];
                if (scroller) scroller.scrollTop = scroller.scrollHeight;
                else window.scrollTo(0, document.documentElement.scrollHeight);
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }; };
                  const fab = [...document.querySelectorAll("button,[role=button]")].find((el) => { const r = el.getBoundingClientRect(); return r.width >= 40 && r.width <= 72 && r.height >= 40 && r.height <= 72 && /\+|thêm|tạo/i.test(el.innerText || el.getAttribute("aria-label") || ""); });
                  const nav = [...document.querySelectorAll("nav")].map((el) => ({ el, rect: el.getBoundingClientRect() })).filter(({ rect }) => rect.height > 0 && rect.bottom <= innerHeight + 1 && rect.top > innerHeight / 2).sort((a, b) => b.rect.bottom - a.rect.bottom)[0]?.el;
                  const lastMenu = [...document.querySelectorAll('button[aria-label^="Tuỳ chọn Học sinh"]')].at(-1);
                  const fabRect = fab?.getBoundingClientRect(), navRect = nav?.getBoundingClientRect(), menuRect = lastMenu?.getBoundingClientRect();
                  const overlaps = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
                  return { scroller: scroller ? { selector: scroller.className?.baseVal ?? scroller.className ?? scroller.tagName, scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight } : { selector: "window", scrollTop: window.scrollY, scrollHeight: document.documentElement.scrollHeight, clientHeight: innerHeight }, elements: { fab: box(fab), bottomTabs: box(nav), lastStudentMenu: box(lastMenu) }, overlap: { fabWithBottomTabs: overlaps(fabRect, navRect), lastStudentMenuWithBottomTabs: overlaps(menuRect, navRect), fabWithLastStudentMenu: overlaps(fabRect, menuRect) } };
                }).catch(() => null);
                const shot = await screenshot(page, name, vp, label, "scrolled-bottom", false);
                rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "cuộn đáy", status, image: shot, reason: JSON.stringify(target) });
                if (label === "class-students" && vp.mobile) rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "bottom-overlap-measurements", status: "measured", image: "—", reason: JSON.stringify(target?.elements ?? null) + ` overlap=${JSON.stringify(target?.overlap ?? null)}` });
              await page.evaluate(() => { document.querySelectorAll("*").forEach((el) => { if (el.scrollTop) el.scrollTop = 0; }); window.scrollTo(0, 0); });
            }
            if (status === "captured" && label === "class-students") {
              const add = page.getByRole("button", { name: /thêm học sinh/i }).first();
              if (await add.count()) { await add.click(); await page.getByRole("heading", { name: "Thêm học sinh" }).waitFor({ state: "visible" }); await captureInteraction("add-student-sheet-open");
                const input = page.locator('input[name="name"]'); await input.focus(); await captureInteraction("keyboard-focus");
              }
              const close = page.getByRole("button", { name: /đóng|close/i }).last(); if (await close.count()) await close.click().catch(() => {});
              const menu = page.locator('button[aria-label^="Tuỳ chọn Học sinh"]').first();
                if (await menu.count()) { await menu.click(); await page.getByRole("heading", { name: "Tuỳ chọn học sinh" }).waitFor({ state: "visible" }); await captureInteraction("student-menu-open"); await page.getByRole("button", { name: "Đánh dấu nghỉ" }).click(); await page.getByRole("heading", { name: "Đánh dấu học sinh đã nghỉ?" }).waitFor({ state: "visible" }); await captureInteraction("student-confirm-dialog-open"); }
            }
            if (status === "captured" && (label === "class-sessions" || label === "shell-class-tabs")) {
              const menu = page.getByRole("button", { name: "Tuỳ chọn lớp" });
              if (await menu.count()) { await menu.click(); await page.getByRole("menu").waitFor({ state: "visible" }); await captureInteraction("class-menu-open"); await page.keyboard.press("Escape"); }
              if (label === "class-sessions") {
                const addSession = page.getByRole("button", { name: "Thêm buổi lẻ" });
                  if (await addSession.count()) { await addSession.click(); await page.getByRole("heading", { name: "Thêm buổi lẻ" }).waitFor({ state: "visible" }); await captureInteraction("add-session-sheet-open"); const note = page.locator("#extra-session-note"); if (await note.count()) { await note.focus(); await captureInteraction("keyboard-focus"); } await page.getByRole("button", { name: "Đóng" }).click().catch(() => {}); }
                  const cancel = page.getByRole("button", { name: "Hủy buổi" }).first();
                  if (vp.mobile && await cancel.count()) { await cancel.click(); await page.getByText(/Xác nhận huỷ buổi học/i).waitFor({ state: "visible" }).catch(() => {}); await captureInteraction("cancel-session-confirm-open"); }
                if (vp.mobile) {
                  await page.evaluate(() => { Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }); window.dispatchEvent(new Event("offline")); });
                  await page.getByText("Ngoại tuyến · dữ liệu trên thiết bị").waitFor({ state: "visible" }).catch(() => {});
                  if (await page.getByText("Ngoại tuyến · dữ liệu trên thiết bị").count()) await captureInteraction("offline");
                  await page.evaluate(() => { Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true }); window.dispatchEvent(new Event("online")); });
                }
              }
            }
            if (status === "captured" && label === "session-detail") {
              for (const [tab, state] of [["Điểm danh", "tab-attendance"], ["Nhận xét", "tab-comments"], ["Bài tập về nhà", "tab-homework"]]) {
                const button = page.getByRole("tab", { name: tab }).first(); if (await button.count()) { await button.click(); await captureInteraction(state); }
              }
            }
            if (status === "captured" && ["create-class", "login", "register", "change-password"].includes(label)) {
              const submit = page.locator('button[type="submit"]').first();
              if (await submit.count()) { await submit.click(); await captureInteraction("form-validation-error"); const input = page.locator("input:visible").first(); if (vp.mobile && await input.count()) { await input.focus(); await captureInteraction("keyboard-focus"); } }
            }
              if (status === "captured" && label === "guardian-home") {
              const switcher = page.locator('button[aria-haspopup="dialog"]').first();
              if (await switcher.count()) { await switcher.click(); await page.getByRole("heading", { name: "Chọn con" }).waitFor({ state: "visible" }); await captureInteraction("child-picker-open"); }
                if (vp.mobile) {
                const measures = await page.evaluate(() => {
                  const box = (selector) => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return { selector, left: Math.round(r.left), right: Math.round(innerWidth - r.right), width: Math.round(r.width) }; };
                  return [box("header"), box("nav"), box("main > section"), box("main [class*=card],main [class*=Card]")].filter(Boolean);
                });
                rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "margin-measurements", status: "measured", image: "—", reason: JSON.stringify(measures) });
              }
                const unlinkedSession = sessionFor("guardian");
                unlinkedSession.me.memberships[0].students = [];
                await page.evaluate((value) => localStorage.setItem("qlh.session.v1", JSON.stringify(value)), unlinkedSession);
                guardianUnlinkedMode = true;
                await page.goto(new URL("/ph", base).href, { waitUntil: "domcontentloaded" });
                await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 6000 }).catch(() => {});
                await captureInteraction("unlinked-guardian-empty");
                guardianUnlinkedMode = false;
            }
                if (status === "captured" && vp.mobile) {
                const measure = await page.evaluate(() => {
                  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }; };
                  const buttons = [...document.querySelectorAll("button,[role=button]")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
                  const fab = buttons.find((el) => { const r = el.getBoundingClientRect(); return r.width >= 40 && r.width <= 72 && r.height >= 40 && r.height <= 72 && /\+|thêm|tạo/i.test(el.innerText || el.getAttribute("aria-label") || ""); });
                  const tabs = [...document.querySelectorAll("nav")].map((el) => ({ el, rect: el.getBoundingClientRect() })).filter(({ rect }) => rect.height > 0 && rect.bottom <= innerHeight + 1).sort((a, b) => b.rect.bottom - a.rect.bottom)[0]?.el;
                  const tabRect = tabs?.getBoundingClientRect();
                  const inFixedRegion = (el) => { for (let node = el; node; node = node.parentElement) if (["fixed", "sticky"].includes(getComputedStyle(node).position)) return true; return false; };
                  const action = buttons.filter((el) => { const r = el.getBoundingClientRect(); return el !== fab && !tabs?.contains(el) && inFixedRegion(el) && r.width >= innerWidth * 0.55 && r.bottom > innerHeight - 180 && r.bottom <= innerHeight + 1; }).sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
                  const overlaps = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
                  const fabRect = fab?.getBoundingClientRect(), actionRect = action?.getBoundingClientRect();
                  return { fab: box(fab), bottomAction: action ? { ...box(action), text: (action.innerText || action.getAttribute("aria-label") || "").trim().slice(0, 40) } : null, bottomTabs: box(tabs), overlap: { fabWithBottomTabs: overlaps(fabRect, tabRect), bottomActionWithBottomTabs: overlaps(actionRect, tabRect) } };
                }).catch(() => null);
                if (measure) {
                  overlap.push({ team: name, route, viewport: vp.name, ...measure });
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "viewport-overlap-measurements", status: "measured", image: "—", reason: JSON.stringify(measure) });
                  }
                }
              if (scenario === "save-states" && status === "captured" && label === "class-students") {
                const openAdd = page.getByRole("button", { name: /thêm học sinh/i }).first();
                if (await openAdd.count()) {
                  await openAdd.click();
                  const nameField = page.getByLabel("Họ và tên học sinh");
                  await nameField.fill("Học sinh kiểm tra lưu");
                  const submit = page.getByRole("button", { name: "Lưu học sinh", exact: true });
                  const validImage = await screenshot(page, name, vp, label, "add-student-edited-valid", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "add-student-edited-valid", status: "captured", image: validImage, reason: `disabled=${await submit.isDisabled()}` });
                  await captureSaveFlow(page, name, vp, route, label, "add-student", submit);
                }
                await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
                const menu = page.locator('button[aria-label^="Tuỳ chọn Học sinh"]').first();
                if (await menu.count()) {
                  await menu.click(); await page.getByRole("button", { name: "Đánh dấu nghỉ" }).click();
                  const confirm = page.getByRole("button", { name: "Xác nhận nghỉ học" });
                  const confirmImage = await screenshot(page, name, vp, label, "mark-left-confirm-valid", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "mark-left-confirm-valid", status: "captured", image: confirmImage, reason: "Hộp xác nhận trước ghi." });
                  await captureSaveFlow(page, name, vp, route, label, "mark-left", confirm);
                }
              }
              if (scenario === "save-states" && status === "captured" && label === "session-detail") {
                await page.getByRole("tab", { name: "Điểm danh" }).click();
                const allPresent = page.getByRole("button", { name: "Tất cả có mặt" });
                if (await allPresent.count()) await allPresent.click();
                const attendanceSave = page.getByRole("button", { name: "Lưu điểm danh" });
                const attendanceImage = await screenshot(page, name, vp, label, "attendance-edited-valid", false);
                rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "attendance-edited-valid", status: "captured", image: attendanceImage, reason: `disabled=${await attendanceSave.isDisabled()}` });
                await captureSaveFlow(page, name, vp, route, label, "attendance", attendanceSave);
                await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
                await page.getByRole("tab", { name: "Nhận xét" }).click();
                const commentField = page.locator("textarea:visible").first();
                if (await commentField.count()) await commentField.fill("Nhận xét kiểm tra lưu hai lần.");
                const commentButton = page.getByRole("button", { name: /lưu nhận xét|gửi nhận xét|lưu phiếu/i }).first();
                if (await commentButton.count()) {
                  const commentImage = await screenshot(page, name, vp, label, "comments-edited-valid", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "comments-edited-valid", status: "captured", image: commentImage, reason: `button=${(await commentButton.innerText()).trim()}` });
                  await captureSaveFlow(page, name, vp, route, label, "comments", commentButton);
                }
                await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
                await page.getByRole("tab", { name: "Bài tập về nhà" }).click();
                const addHomework = page.getByRole("button", { name: /thêm phần/i }).first();
                if (await addHomework.count()) {
                  await addHomework.click();
                  const title = page.locator("#hw-title"); if (await title.count()) await title.fill("BTVN kiểm tra lưu");
                  const description = page.locator("#hw-description"); if (await description.count()) await description.fill("Nội dung kiểm tra trạng thái lưu.");
                  const homeworkSave = page.getByRole("button", { name: "Lưu phần", exact: true });
                  const homeworkImage = await screenshot(page, name, vp, label, "homework-edited-valid", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "homework-edited-valid", status: "captured", image: homeworkImage, reason: `disabled=${await homeworkSave.isDisabled()}` });
                  await captureSaveFlow(page, name, vp, route, label, "homework", homeworkSave);
                }
              }
              if (scenario === "save-states" && status === "captured" && label === "class-sessions") {
                const addSession = page.getByRole("button", { name: "Thêm buổi lẻ" });
                if (await addSession.count()) {
                  await addSession.click();
                  const note = page.locator("#extra-session-note"); if (await note.count()) await note.fill("Buổi thêm kiểm tra lưu.");
                  const submit = page.getByRole("button", { name: /lưu buổi|thêm buổi/i }).last();
                  const validImage = await screenshot(page, name, vp, label, "add-session-edited-valid", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "add-session-edited-valid", status: "captured", image: validImage, reason: `disabled=${await submit.isDisabled()}` });
                  await captureSaveFlow(page, name, vp, route, label, "add-session", submit);
                }
              }
              if (scenario === "save-states" && status === "captured" && label === "reports") {
                const publish = page.getByRole("button", { name: /Phát hành/ }).first();
                if (await publish.count() && !(await publish.isDisabled())) {
                  const validImage = await screenshot(page, name, vp, label, "publish-report-edited-valid", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "publish-report-edited-valid", status: "captured", image: validImage, reason: `disabled=${await publish.isDisabled()}` });
                  await captureSaveFlow(page, name, vp, route, label, "publish-report", publish);
                }
              }
              if (scenario === "save-states" && status === "captured" && ["login", "register", "change-password"].includes(label)) {
                const inputs = page.locator("input:visible");
                for (let i = 0; i < await inputs.count(); i++) {
                  const input = inputs.nth(i), type = await input.getAttribute("type"), nameAttr = (await input.getAttribute("name")) ?? "";
                  if (type === "password") await input.fill("Demo-Pass-2026!");
                  else if (type === "tel" || /phone/i.test(nameAttr)) await input.fill("09000000001");
                  else if (type === "email") await input.fill("demo@example.test");
                  else await input.fill(label === "register" ? "Không gian Demo" : "Người dùng Demo");
                }
                const submit = page.locator('button[type="submit"]:visible').first();
                if (await submit.count()) {
                  const validImage = await screenshot(page, name, vp, label, `${label}-edited-valid`, false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: `${label}-edited-valid`, status: "captured", image: validImage, reason: `disabled=${await submit.isDisabled()}` });
                  await captureSaveFlow(page, name, vp, route, label, label, submit, "form/API result is mocked locally");
                }
              }
              if (scenario === "save-states" && status === "captured" && ["create-class", "test-scores"].includes(label)) {
                await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
                await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 6000 }).catch(() => {});
                const actionButton = label === "create-class" ? page.getByRole("button", { name: "Tạo lớp", exact: true }) : page.getByRole("button", { name: "Lưu điểm", exact: true });
                if (label === "create-class") {
                  await actionButton.click();
                  const invalidImage = await screenshot(page, name, vp, label, "invalid-empty", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "invalid-empty", status: "captured", image: invalidImage, reason: "Submit với trường bắt buộc để trống; kiểm tra validation DOM/native." });
                  const nameInput = page.getByLabel("Tên lớp");
                  await nameInput.fill("Lớp kiểm tra lưu");
                  const weekday = page.getByRole("button", { name: /^T[2-7]$/ }).first();
                  if (await weekday.count()) await weekday.click();
                  await page.waitForTimeout(100);
                  const validImage = await screenshot(page, name, vp, label, "edited-valid", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "edited-valid", status: "captured", image: validImage, reason: `Nút tạo disabled=${await actionButton.isDisabled()}; push chưa gửi.` });
                  const requestStart = pushRequestCount, commandStart = pushCommandCount, outboxStart = await readOutboxCount(page);
                  const clickResults = await actionButton.evaluate((el) => { el.click(); el.click(); return true; });
                  void clickResults;
                  await page.waitForTimeout(150);
                  const savingImage = await screenshot(page, name, vp, label, "saving-double-tap", false);
                  const targetUrl = page.url();
                  await page.waitForTimeout(3200);
                  const successImage = await screenshot(page, name, vp, label, "after-save", false);
                  rows.push({ team: name, viewport: vp.name, route, url: targetUrl, label, state: "saving-double-tap", status: "captured", image: savingImage, reason: `pushRequests=${pushRequestCount - requestStart}; pushCommands=${pushCommandCount - commandStart}; outbox before=${outboxStart};` });
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "after-save", status: "captured", image: successImage, reason: `pushRequests=${pushRequestCount - requestStart}; pushCommands=${pushCommandCount - commandStart}; outbox after=${await readOutboxCount(page)};` });
                } else {
                  const score = page.locator('input[aria-label^="Điểm "]').first();
                  await score.fill("10.3");
                  await page.waitForTimeout(100);
                  const invalidImage = await screenshot(page, name, vp, label, "invalid-step", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "invalid-step", status: "captured", image: invalidImage, reason: `Nút lưu disabled=${await actionButton.isDisabled()}; giá trị ngoài bước 0,5.` });
                  await score.fill("10.5");
                  await page.waitForTimeout(100);
                  const validImage = await screenshot(page, name, vp, label, "edited-valid", false);
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "edited-valid", status: "captured", image: validImage, reason: `Nút lưu disabled=${await actionButton.isDisabled()}.` });
                  const requestStart = pushRequestCount, commandStart = pushCommandCount, outboxStart = await readOutboxCount(page);
                  const leaveLink = page.locator('a[href="/lop/demo-6a/bai-kiem-tra"]').first();
                  if (await leaveLink.count()) {
                    await leaveLink.click().catch(() => {});
                    await page.waitForTimeout(100);
                    const guard = await page.getByRole("alertdialog").count();
                    const leaveImage = await screenshot(page, name, vp, label, "leave-unsaved", false);
                    rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "leave-unsaved", status: "captured", image: leaveImage, reason: guard ? "Cảnh báo rời màn đang mở." : "Không thấy cảnh báo rời màn sau click link nội bộ." });
                  } else rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "leave-unsaved", status: "unavailable", image: "—", reason: "Không tìm thấy link điều hướng nội bộ trong trang." });
                  await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
                  await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 6000 }).catch(() => {});
                  await page.locator('input[aria-label^="Điểm "]').first().fill("10.5");
                  await page.waitForTimeout(100);
                  await actionButton.evaluate((el) => { el.click(); el.click(); });
                  await page.waitForTimeout(150);
                  const savingImage = await screenshot(page, name, vp, label, "saving-double-tap", false);
                  await page.waitForTimeout(3200);
                  const successImage = await screenshot(page, name, vp, label, "after-save", false);
                  const reason = `pushRequests=${pushRequestCount - requestStart}; pushCommands=${pushCommandCount - commandStart}; outbox before=${outboxStart}; outbox after=${await readOutboxCount(page)};`;
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "saving-double-tap", status: "captured", image: savingImage, reason });
                  rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "after-save", status: "captured", image: successImage, reason });
                }
              }
          } catch (error) {
            status = "unavailable"; reason = error instanceof Error ? `${scenario !== "default" ? `${scenarioStep}:` : ""}${error.name}` : "capture error";
            const mainSaved = rows.some((row) => row.team === name && row.viewport === vp.name && row.route === route && row.label === label && row.state === "màn chính" && row.image !== "—");
            rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: mainSaved ? "interaction-unavailable" : "màn chính", status, image: "—", reason });
        }
      }
      await context.close();
    }
  }
  for (const width of [375, 390, 1440]) {
    const height = width > 500 ? 900 : width === 375 ? 667 : 844;
    for (const role of ["staff", "guardian"].filter((candidate) => selected.includes(candidate === "staff" ? "A" : "C"))) {
      const overflowContext = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width <= 430 ? 2 : 1, isMobile: width <= 430, hasTouch: width <= 430 });
      const overflowPage = await overflowContext.newPage();
      overflowPage.setDefaultTimeout(7000);
      await overflowPage.route("**/v1/**", (route) => {
        if (new URL(route.request().url()).pathname.endsWith("/me")) return route.fulfill({ json: sessionFor(role).me });
        return route.fulfill({ status: 200, json: {} });
      });
      try {
        await seed(overflowPage, role, base);
        const route = role === "staff" ? "/lop" : "/ph";
        await overflowPage.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
        await overflowPage.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 6000 }).catch(() => {});
        const measure = await overflowPage.evaluate(() => ({ viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, rootWidth: document.querySelector("#root")?.scrollWidth ?? null, horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, document.querySelector("#root")?.scrollWidth ?? 0) > innerWidth }));
        const name = role === "staff" ? "A" : "C";
        rows.push({ team: name, viewport: `${width}x${height}`, route, url: overflowPage.url(), label: role === "staff" ? "classes" : "guardian-home", state: "horizontal-overflow-check", status: "measured", image: "—", reason: JSON.stringify(measure) });
      } catch (error) {
        const name = role === "staff" ? "A" : "C";
        rows.push({ team: name, viewport: `${width}x${height}`, route: role === "staff" ? "/lop" : "/ph", url: overflowPage.url(), label: role === "staff" ? "classes" : "guardian-home", state: "horizontal-overflow-check", status: "unavailable", image: "—", reason: error instanceof Error ? error.name : "capture error" });
      }
      await overflowContext.close();
    }
  }
  await browser.close();
} finally { server?.kill(); }

const inventoryDir = path.resolve("/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit");
const currentHead = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const inventory = path.join(inventoryDir, phase === "after" ? "inventory-after.md" : "inventory.md");
await mkdir(path.dirname(inventory), { recursive: true });
const existing = await readFile(inventory, "utf8").catch(async () => phase === "after" ? readFile(path.join(inventoryDir, "inventory.md"), "utf8").catch(() => "") : "");
const tableStart = existing.indexOf("## Màn và ảnh");
const tableText = tableStart < 0 ? "" : existing.slice(existing.indexOf("\n", tableStart) + 1).split("\n## ")[0];
const inheritedRows = tableText.split("\n").filter((line) => {
  if (!line.startsWith("| ") || line.startsWith("| Team |") || line.startsWith("|---")) return false;
  const teamRow = line.split("|")[1]?.trim();
  if (scenario === "default") return !selected.includes(teamRow);
  const cells = line.split("|").map((cell) => cell.trim());
  const routeRow = cells[2], labelRow = cells[4], viewportRow = cells[5], stateRow = cells[6];
  const scenarioMain = scenarioRoutes.some(([route, label]) => routeRow === route && labelRow === label && ["390x844", "1440x900"].includes(viewportRow) && stateRow === "màn chính");
  return !(teamRow === team && (stateRow.startsWith(`${scenario}-`) || scenarioMain || (stateRow === "interaction-unavailable" && line.includes(scenario))));
});
const phaseInheritedRows = phase === "after" ? inheritedRows.map((line) => line.replace(/`((?:T|A|B|C)\/[^`]+\.png)`/g, "`before/$1`")) : inheritedRows;
const rawRows = [...phaseInheritedRows, ...rows.map((r) => `| ${r.team} | ${r.route} | ${r.url ?? "—"} | ${r.label} | ${r.viewport} | ${r.state} | ${r.status} | \`${r.image}\` | ${r.reason || "—"} |`)];
const seenRowKeys = new Set();
const allRows = rawRows.filter((line) => { const cells = line.split("|").map((cell) => cell.trim()); const key = [cells[1], cells[2], cells[4], cells[5], cells[6]].join("|"); if (seenRowKeys.has(key)) return false; seenRowKeys.add(key); return true; });
const mergedData = allRows.map((line) => line.split("|").map((cell) => cell.trim()));
const mergedCaptured = mergedData.filter((cells) => cells[7] === "captured").length;
const mergedMainUnavailable = mergedData.filter((cells) => cells[6] === "màn chính" && cells[7] === "unavailable");
const mergedInteractionUnavailable = mergedData.filter((cells) => cells[6] === "interaction-unavailable").length;
const timestamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
const marginRows = rows.filter((r) => r.state === "margin-measurements");
const counts = rows.reduce((acc, r) => (acc[r.status] = (acc[r.status] ?? 0) + 1, acc), {});
  const mainUnavailable = rows.filter((r) => r.status === "unavailable" && r.state === "màn chính");
const inventoryText = `# UI audit inventory — ${phase}\n\nLệnh: \`node scripts/ui-audit-capture.mjs --phase ${phase} --team ${team}${scenario === "default" ? "" : ` --scenario ${scenario}`}\`  \nThời gian kết thúc: ${timestamp} (Asia/Ho_Chi_Minh)  \nNguồn: local Vite ${base}, fixture giả; ${scenario === "save-error" ? "push bị giả lập trả HTTP 503" : scenario === "offline" ? "context bị ngắt mạng sau khi tải màn" : "push/pull/snapshot trả thành công"}; không dùng staging credential.  \nCapture v2: ${mergedCaptured} trạng thái chụp được, ${mergedMainUnavailable.length} màn chính không khả dụng; lỗi tương tác: ${mergedInteractionUnavailable}.\n\n## Thay bộ ảnh\n\nẢnh mới nằm trong \`${phase}/<team>/<viewport>/v2/\`; inventory này là bộ ${phase}. Ảnh cũ được giữ nguyên vì audit đang đọc chúng. Ảnh mới được chụp sau commit \`0c06a7c\` (sửa FAB trong \`src/shared/**\`). Ảnh lỗi FAB gốc do người dùng cung cấp: \`ui-audit/user-report-students-fab.png\`.\n\n## Màn và ảnh\n\n| Team | Route | URL thật | Màn | Viewport | Trạng thái | Kết quả | Ảnh | Lý do nếu thiếu |\n|---|---|---|---|---|---|---|---|---|\n${allRows.join("\n")}\n\n## Màn chưa chụp được\n\n${mergedMainUnavailable.map((cells) => `- ${cells[1]} \`${cells[2]}\` (${cells[5]}): ${cells[9]}`).join("\n") || "Không ghi nhận màn chính bị thiếu trong bộ inventory."}\n\n## Đo chồng lấn FAB và nút đáy\n\nTọa độ FAB, nút đáy, tab dưới và phép giao nhau đầy đủ được ghi ở các hàng \`viewport-overlap-measurements\` / \`bottom-overlap-measurements\` trong bảng trên; tọa độ theo CSS pixel. Ảnh lỗi gốc: \`ui-audit/user-report-students-fab.png\`.\n\n| Team | Route | FAB x,y,w,h | Phần tử tại tâm FAB (x,y,w,h) | Trùng phần tử |\n|---|---|---|---|---|\n${overlap.map((m) => `| ${m.team} | ${m.route} | ${m.fab ? [m.fab.x,m.fab.y,m.fab.width,m.fab.height].join(",") : "—"} | ${m.nearest?.tag ?? "—"} ${m.nearest?.x ?? "—"},${m.nearest?.y ?? "—"},${m.nearest?.width ?? "—"},${m.nearest?.height ?? "—"} | ${m.nearest?.sameElement ?? "—"} |`).join("\n") || "| — | — | FAB chưa tìm thấy trên các màn đã chụp | — | — |"}\n\n## Lề trái tại 375/390/430px\n\nĐo \`getBoundingClientRect()\`; selector cụ thể và lề trái/phải/rộng ghi bên dưới.\n\n${marginRows.map((r) => `- ${r.team} \`${r.route}\`: ${r.reason}`).join("\n") || "Không có số đo trong lượt này."}\n`;
  await writeFile(inventory, inventoryText);
  if (scenario === "save-states" && phase === "before") {
    const actionInventory = path.join(inventoryDir, "save-actions-inventory.md");
    const actionRows = saveActions.filter((item) => !/^(Học sinh \d+ Đã phát hành|Học sinh \d+ Chưa phát hành)/.test(item.label)).map((item, index) => `| S${String(index + 1).padStart(3, "0")} | ${item.team} | ${item.screen} · ${item.route} · ${item.viewport} | ${item.label} | See source map below | ${/đăng nhập|đăng ký|đổi mật khẩu|gửi nhận xét|phát hành/i.test(item.label) ? "Có mạng" : "Local/offline hoặc cần xác minh"} | Mở route: disabled=${item.disabled}; aria-busy=${item.ariaBusy || "false"}; title=${item.title || "—"}; leave/save-after-edit chưa đo cho hành động này |`);
    const actionText = `# Save action inventory — before\n\nẢnh bổ sung được chụp tại HEAD ${currentHead}, fixture local giả, Vite :5181; không dùng staging. HEAD này chỉ thêm shared save-action hook (màn A/B/C chưa dùng hook). Ảnh baseline trước đó tại f79d640 vẫn được giữ; tên số mới tiếp nối để tránh ghi đè.\n\nĐã quan sát browser ở 390×844/1440×900. Bảng ghi trạng thái disabled/aria-busy lúc mở route; các workflow còn lại liệt kê dưới mục coverage. Tổng mock push trong lượt mới: ${pushRequestCount}; tổng commands: ${pushCommandCount}.\n\n| ID | Team | Màn/route | Hành động (nhãn nút) | File:dòng | Cần mạng? | Hiện trạng đo trong browser |\n|---|---|---|---|---|---|---|\n${actionRows.join("\n")}\n\n## Source map (HEAD ${currentHead})\n\n| Action family | File:dòng |\n|---|---|\n| Tạo lớp | \`src/features/classes/NewClassPage.tsx:19-100\` |\n| Thêm học sinh, đánh dấu nghỉ/xác nhận | \`src/features/students/StudentsPage.tsx:48-161\` |\n| Lưu lịch lớp | \`src/features/classes/EditClassSchedule.tsx:43-263\` |\n| Thêm/sửa/hủy buổi lẻ | \`src/features/class-space/SessionsTab.tsx:98-105,153-210\` |\n| Điểm danh | \`src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474\`; \`AttendanceDesktop.tsx:149-154\` |\n| Gửi nhận xét | \`src/features/comments/CommentsPanel.tsx:245-260\`; \`SendTicketsDialog.tsx:90-105\` |\n| Bài tập về nhà | \`src/features/homework/HomeworkPanel.tsx:768-840\` |\n| Tạo bài kiểm tra | \`src/features/scores/NewTestPage.tsx:29-53,107-120\` |\n| Sửa/xóa bài, lưu điểm | \`src/features/scores/TestScoresPage.tsx:224-251,316-375\` |\n| Phát hành báo cáo | \`src/features/reports/ReportsPage.tsx:334-358,463-485,568-589\` |\n| Đăng nhập/đăng ký | \`src/features/auth/LoginPage.tsx\`; \`RegisterPage.tsx\` |\n| Đổi mật khẩu | \`src/features/settings/ChangePasswordPage.tsx\` |\n| Hành động phụ huynh | \`src/roles/guardian/GuardianReportPage.tsx\`; \`GuardianCommentsPage.tsx\` |\n\n## Chưa đo/không khả dụng\n\nLịch lớp (route edit chưa có trong sweep), tạo bài kiểm tra, sửa thông tin học sinh, sửa nhận xét, xác nhận thử rời màn cho các form mới, và các trạng thái invalid riêng ngoài tạo lớp/điểm: chưa có bằng chứng browser đầy đủ; xem các hàng unavailable trong inventory route. Số request/outbox chỉ ghi theo từng double-tap capture, không ngoại suy.\n\nẢnh route/state nằm trong \`shots/ui-audit/save-states/before/<team>/<viewport>/\`; URL thật và trạng thái route ở \`inventory.md\`.\n`;
    await writeFile(actionInventory, actionText);
  }
  console.log(`Captured ${rows.length} states (${counts.captured ?? 0} captured, ${counts.unavailable ?? 0} unavailable); inventory: ${inventory}`);
