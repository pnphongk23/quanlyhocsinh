import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { entities, identity, rolePickerSession, sessionFor } from "./ui-audit-fixtures/demo.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((all, arg, i, list) => arg.startsWith("--") ? [...all, [arg.slice(2), list[i + 1]?.startsWith("--") ? "true" : list[i + 1]]] : all, []));
const team = args.team ?? "all";
const phase = args.phase ?? "before";
const base = args.base ?? "http://127.0.0.1:5181";
const out = path.resolve(args.out ?? "/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit");
const phaseOut = ["before", "after"].includes(path.basename(out)) ? out : path.join(out, phase);
if (!/^(T|A|B|C|all)$/.test(team) || !/^(before|after)$/.test(phase)) throw new Error("Usage: --team T|A|B|C|all --phase before|after [--base URL] [--out DIR]");
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
  { name: "1440x900", width: 1440, height: 900, mobile: false },
];
const plans = {
  A: { viewports: viewports.slice(0, 3), role: "staff", routes: [["/lop", "classes"], ["/lop/moi", "create-class"], ["/lich", "schedule"], ["/lop/demo-6a/buoi-hoc", "class-sessions"], ["/lop/demo-6a/hoc-sinh", "class-students"], ["/lop/demo-empty/hoc-sinh", "empty-students"], ["/lop/demo-6a/bai-kiem-tra", "tests"], ["/lop/demo-6a/bai-kiem-tra/demo-test", "test-scores"], ["/lop/demo-6a/diem", "score-grid"], ["/lop/demo-6a/bao-cao", "reports"], ["/lop/demo-6a/buoi-hoc/demo-past", "session-detail"]] },
  B: { viewports: viewports.slice(3), role: "staff", routes: [["/lop", "classes"], ["/lop/demo-6a/buoi-hoc", "class-sessions"], ["/lop/demo-6a/hoc-sinh", "class-students"], ["/lop/demo-6a/bai-kiem-tra", "tests"], ["/lop/demo-6a/diem", "score-grid"], ["/lop/demo-6a/bao-cao", "reports"], ["/lop/demo-6a/buoi-hoc/demo-past", "session-detail"]] },
  C: { viewports: [viewports[0], viewports[1], viewports[2], viewports[3]], role: "guardian", routes: [["/ph", "guardian-home"], ["/ph/nhan-xet", "guardian-comments"], ["/ph/buoi/demo-past", "guardian-session"], ["/ph/diem", "guardian-scores"], ["/ph/bao-cao", "guardian-reports"], ["/dang-nhap", "login"], ["/dang-ky", "register"], ["/quen-mat-khau", "forgot-password"], ["/chon-vai-tro", "role-picker"], ["/cai-dat", "settings"], ["/cai-dat/doi-mat-khau", "change-password"], ["/dang-nhap", "pwa-guide"]] },
  T: { viewports, role: "staff", routes: [["/lop", "shell-tabs"], ["/lop/demo-6a/buoi-hoc", "shell-class-tabs"], ["/lop/demo-6a/buoi-hoc/demo-past", "session-sheet-menu"]] },
};
const selected = team === "all" ? ["T", "A", "B", "C"] : [team];
const rows = [];
const overlap = [];
async function maxSequence(directory) {
  let max = 0;
  const visit = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else { const n = Number(entry.name.match(/^(\d+)-/)?.[1] ?? 0); if (n > max) max = n; }
    }
  };
    for (const name of selected) for (const vp of plans[name].viewports) await visit(path.join(phaseOut, name, vp.name, "v2"));
  return max;
}
let sequence = await maxSequence(out);
async function screenshot(page, teamName, viewport, label, state, fullPage = !viewport.mobile) {
  const file = `${String(++sequence).padStart(3, "0")}-${label}-${state}.png`;
    const dir = path.join(phaseOut, teamName, viewport.name, "v2");
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, file), fullPage, animations: "disabled" });
    return `${phase}/${teamName}/${viewport.name}/v2/${file}`;
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
try {
  let executablePath;
  try { await access("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"); executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; } catch {}
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  for (const name of selected) {
    const spec = plans[name];
    for (const vp of spec.viewports) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile });
          const page = await context.newPage();
          page.setDefaultTimeout(7000);
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
          const body = route.request().postDataJSON();
          return route.fulfill({ json: { cursor: 0, epoch: 1, results: (body.commands ?? []).map((command) => ({ id: command.id, status: "applied", version: 1 })) } });
        }
        return route.fulfill({ status: 200, json: {} });
      });
        await seed(page, spec.role, base);
          for (const [route, label] of spec.routes) {
            let status = "captured", reason = "";
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
                  const fields = passwordPage.locator('input[type="password"]');
                  if (await fields.count() >= 3) {
                    await fields.nth(0).fill("demo-current"); await fields.nth(1).fill("demo-current"); await fields.nth(2).fill("demo-current");
                    await passwordPage.locator('button[type="submit"]').click();
                    const errorImage = await screenshot(passwordPage, name, vp, label, "form-validation-error");
                    rows.push({ team: name, viewport: vp.name, route, url: passwordPage.url(), label, state: "form-validation-error", status: "captured", image: errorImage, reason: "Mật khẩu mới trùng mật khẩu hiện tại." });
                    const input = fields.first(); await input.focus(); const focusImage = await screenshot(passwordPage, name, vp, label, "keyboard-focus");
                    rows.push({ team: name, viewport: vp.name, route, url: passwordPage.url(), label, state: "keyboard-focus", status: "captured", image: focusImage, reason: "" });
                  }
                } else {
                  status = "unavailable";
                  reason = "ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã).";
                  rows.push({ team: name, viewport: vp.name, route, url: passwordPage.url(), label, state: "màn chính", status, image: "—", reason });
                }
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
              if (label !== "role-picker") {
                const submit = authPage.locator('button[type="submit"]').first();
                if (await submit.count()) { await submit.click(); const errorImage = await screenshot(authPage, name, vp, label, "form-validation-error"); rows.push({ team: name, viewport: vp.name, route, url: authPage.url(), label, state: "form-validation-error", status: "captured", image: errorImage, reason: "" }); }
                const input = authPage.locator("input:visible").first();
                if (vp.mobile && await input.count()) { await input.focus(); const focusImage = await screenshot(authPage, name, vp, label, "keyboard-focus"); rows.push({ team: name, viewport: vp.name, route, url: authPage.url(), label, state: "keyboard-focus", status: "captured", image: focusImage, reason: "" }); }
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
            const image = await screenshot(page, name, vp, label, "main");
            rows.push({ team: name, viewport: vp.name, route: label === "pwa-guide" ? "/dang-nhap (PwaGuideGate, Instagram UA)" : route, url: page.url(), label, state: "màn chính", status, image, reason });
              const captureInteraction = async (state) => {
              const shot = await screenshot(page, name, vp, label, state);
              rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state, status: "captured", image: shot, reason: "" });
              };
              if (status === "captured" && label === "class-students" && vp.name === "390x844") {
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
                return scroller ? { selector: scroller.className?.baseVal ?? scroller.className ?? scroller.tagName, scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight } : { selector: "window", scrollTop: window.scrollY, scrollHeight: document.documentElement.scrollHeight, clientHeight: innerHeight };
              }).catch(() => null);
              const shot = await screenshot(page, name, vp, label, "scrolled-bottom", false);
              rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: "cuộn đáy", status, image: shot, reason: JSON.stringify(target) });
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
              if (vp.name === "390x844") {
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
            if (status === "captured" && vp.name === "390x844") {
            const measure = await page.evaluate(() => {
              const fab = [...document.querySelectorAll("button,[role=button]")].find((el) => /\+|thêm|tạo/i.test(el.innerText || el.getAttribute("aria-label") || ""));
              if (!fab) return null;
              const r = fab.getBoundingClientRect();
              const x = r.left + r.width / 2, y = r.top + r.height / 2;
              const at = document.elementFromPoint(x, y);
              const a = at?.getBoundingClientRect();
              return { fab: { x: r.x, y: r.y, width: r.width, height: r.height }, nearest: at ? { tag: at.tagName, text: (at.innerText || "").slice(0, 60), x: a.x, y: a.y, width: a.width, height: a.height, sameElement: at === fab } : null };
            }).catch(() => null);
            if (measure) overlap.push({ team: name, route, ...measure });
          }
        } catch (error) {
          status = "unavailable"; reason = error instanceof Error ? error.name : "capture error";
            const mainSaved = rows.some((row) => row.team === name && row.viewport === vp.name && row.route === route && row.label === label && row.state === "màn chính" && row.image !== "—");
            rows.push({ team: name, viewport: vp.name, route, url: page.url(), label, state: mainSaved ? "interaction-unavailable" : "màn chính", status, image: "—", reason });
        }
      }
      await context.close();
    }
  }
  await browser.close();
} finally { server?.kill(); }

const inventoryDir = path.resolve("/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit");
const inventory = path.join(inventoryDir, phase === "after" ? "inventory-after.md" : "inventory.md");
await mkdir(path.dirname(inventory), { recursive: true });
const existing = await readFile(inventory, "utf8").catch(async () => phase === "after" ? readFile(path.join(inventoryDir, "inventory.md"), "utf8").catch(() => "") : "");
const tableStart = existing.indexOf("## Màn và ảnh");
const tableText = tableStart < 0 ? "" : existing.slice(existing.indexOf("\n", tableStart) + 1).split("\n## ")[0];
const inheritedRows = tableText.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| Team |") && !line.startsWith("|---") && !selected.some((name) => line.startsWith(`| ${name} |`)));
const phaseInheritedRows = phase === "after" ? inheritedRows.map((line) => line.replace(/`((?:T|A|B|C)\/[^`]+\.png)`/g, "`before/$1`")) : inheritedRows;
const allRows = [...phaseInheritedRows, ...rows.map((r) => `| ${r.team} | ${r.route} | ${r.url ?? "—"} | ${r.label} | ${r.viewport} | ${r.state} | ${r.status} | \`${r.image}\` | ${r.reason || "—"} |`)];
const timestamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
const marginRows = rows.filter((r) => r.state === "margin-measurements");
const counts = rows.reduce((acc, r) => (acc[r.status] = (acc[r.status] ?? 0) + 1, acc), {});
  const mainUnavailable = rows.filter((r) => r.status === "unavailable" && r.state === "màn chính");
  const inventoryText = `# UI audit inventory — ${phase}\n\nLệnh: \`node scripts/ui-audit-capture.mjs --phase ${phase} --team ${team}\`  \nThời gian kết thúc: ${timestamp} (Asia/Ho_Chi_Minh)  \nNguồn: local Vite ${base}, fake server + fixture; push/pull/snapshot trả thành công, không dùng staging credential.  \nCapture v2: ${counts.captured ?? 0} trạng thái chụp được, ${mainUnavailable.length} màn chính không khả dụng; lỗi tương tác: ${rows.filter((r) => r.state === "interaction-unavailable").length}.\n\n## Thay bộ ảnh\n\nẢnh mới nằm trong \`${phase}/<team>/<viewport>/v2/\`; inventory này là bộ ${phase}. Ảnh cũ được giữ nguyên vì audit đang đọc chúng. Ảnh mới được chụp sau commit \`0c06a7c\` (sửa FAB trong \`src/shared/**\`). Ảnh lỗi FAB gốc do người dùng cung cấp: \`ui-audit/user-report-students-fab.png\`.\n\n## Màn và ảnh\n\n| Team | Route | URL thật | Màn | Viewport | Trạng thái | Kết quả | Ảnh | Lý do nếu thiếu |\n|---|---|---|---|---|---|---|---|---|\n${allRows.join("\n")}\n\n## Màn chưa chụp được\n\n${mainUnavailable.map((r) => `- ${r.team} \`${r.route}\` (${r.viewport}): ${r.reason}`).join("\n") || "Không ghi nhận màn chính bị thiếu trong lượt này."}\n\n## Đo chồng lấn FAB\n\nTọa độ theo CSS pixel; lấy phần tử tại tâm FAB bằng \`elementFromPoint\`. Ảnh lỗi gốc: \`ui-audit/user-report-students-fab.png\`.\n\n| Team | Route | FAB x,y,w,h | Phần tử tại tâm FAB (x,y,w,h) | Trùng phần tử |\n|---|---|---|---|---|\n${overlap.map((m) => `| ${m.team} | ${m.route} | ${m.fab.x},${m.fab.y},${m.fab.width},${m.fab.height} | ${m.nearest?.tag ?? "—"} ${m.nearest?.x ?? "—"},${m.nearest?.y ?? "—"},${m.nearest?.width ?? "—"},${m.nearest?.height ?? "—"} | ${m.nearest?.sameElement ?? "—"} |`).join("\n") || "| — | — | FAB chưa tìm thấy trên các màn đã chụp | — | — |"}\n\n## Lề trái tại 390px\n\nĐo \`getBoundingClientRect()\`; selector cụ thể và lề trái/phải/rộng ghi bên dưới.\n\n${marginRows.map((r) => `- ${r.team} \`${r.route}\`: ${r.reason}`).join("\n") || "Không có số đo trong lượt này."}\n`;
  await writeFile(inventory, inventoryText);
console.log(`Captured ${rows.length} states (${counts.captured ?? 0} captured, ${counts.unavailable ?? 0} unavailable); inventory: ${inventory}`);
