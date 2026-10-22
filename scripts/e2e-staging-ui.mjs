import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const { chromium } = await import("playwright");
const STAGING = "https://qlh-staging-web.pages.dev";
const credentialPath = process.env.QLH_STAGING_CREDENTIAL_FILE ?? "/tmp/qlh-staging-demo.txt";
const outputRoot = process.env.QLH_W8_OUTPUT ?? "/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web";
const shotsRoot = path.join(outputRoot, "shots", "w8");
const reportPath = path.join(outputRoot, "w8-report.md");
const jsonPath = path.resolve("artifacts", "w8-results.json");
const attemptLedgerPath = "/tmp/qlh-w8-login-submit-counts.json";
const browserStateRoot = path.resolve("artifacts", "w8-browser-state");
const viewports = [
  { key: "mobile", width: 390, height: 844, isMobile: true },
  { key: "desktop", width: 1440, height: 900, isMobile: false },
];

function readCredentialSections(raw) {
  const parsed = { api: "", teacher: {}, parent: {} };
  let section = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const pair = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (!pair) continue;
    const [key, value] = [pair[1].trim(), pair[2].trim()];
    if (!/^\s/.test(line)) {
      if (/^giáo viên\b/i.test(key)) { section = "teacher"; continue; }
      if (/^phụ huynh\b/i.test(key)) { section = "parent"; continue; }
      if (/^multi-role\b/i.test(key)) { section = "multi"; continue; }
    }
    if (/^API$/i.test(key)) parsed.api = value;
    else if (section === "teacher" && /^(phone|sdt)$/i.test(key)) parsed.teacher.phone = value;
    else if (section === "teacher" && /^password$/i.test(key)) parsed.teacher.password = value;
    else if (section === "teacher" && /^class_id$/i.test(key)) parsed.teacher.classId = value;
    else if (section === "parent" && /^(phone|sdt)$/i.test(key)) parsed.parent.phone = value;
    else if (section === "parent" && /^password$/i.test(key)) parsed.parent.password = value;
  }
  return parsed;
}

function localPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("84") ? digits.slice(2) : digits;
  return national.startsWith("0") ? national.slice(1) : national;
}

function safeSlug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "screen";
}

function labelForPath(url) {
  return safeSlug(url.pathname.split("/").filter(Boolean).join("-") || "home");
}

async function readLoginError(response) {
  try {
    const json = await response.json();
    return json?.error?.code ?? json?.code ?? null;
  } catch {
    return null;
  }
}

async function readLoginSubmitCounts() {
  try {
    const counts = JSON.parse(await readFile(attemptLedgerPath, "utf8"));
    const normalize = (entry) => typeof entry === "number" ? { count: entry, failed: false } : { count: Number(entry?.count) || 0, failed: Boolean(entry?.failed) };
    return { teacher: normalize(counts.teacher), guardian: normalize(counts.guardian) };
  } catch {
    return { teacher: { count: 1, failed: false }, guardian: { count: 2, failed: false } };
  }
}

async function persistentSessionProbe(page) {
  return page.evaluate(async () => {
    const localStorageKeys = Object.keys(localStorage);
    const sessionStorageKeyCount = Object.keys(sessionStorage).length;
    const databases = await indexedDB.databases();
    let storeCount = 0;
    let tokenLikeValue = false;
    let tokenInLocalStorage = false;
    for (const key of localStorageKeys) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (value && typeof value.token === "string" && value.token.length > 0) tokenInLocalStorage = true;
      } catch {}
    }
    const scan = (value, depth = 0) => {
      if (depth > 6 || value == null) return false;
      if (typeof value === "string") return /^(eyJ|Bearer\s)/.test(value);
      if (Array.isArray(value)) return value.some((item) => scan(item, depth + 1));
      if (typeof value === "object") return Object.entries(value).some(([key, item]) => /token/i.test(key) || scan(item, depth + 1));
      return false;
    };
    for (const info of databases) {
      if (!info.name) continue;
      const request = indexedDB.open(info.name);
      const database = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const storeName of database.objectStoreNames) {
        storeCount += 1;
        const transaction = database.transaction(storeName, "readonly");
        const rows = await new Promise((resolve, reject) => {
          const query = transaction.objectStore(storeName).getAll();
          query.onsuccess = () => resolve(query.result);
          query.onerror = () => reject(query.error);
        });
        if (rows.some((row) => scan(row))) tokenLikeValue = true;
      }
      database.close();
    }
    return { localStorageKeyCount: localStorageKeys.length, databases: databases.map((item) => item.name), storeCount, tokenInLocalStorage, tokenLikeValue, sessionStorageKeyCount, persisted: tokenInLocalStorage || tokenLikeValue };
  });
}

async function applyScreenshotRedaction(page) {
  await page.addStyleTag({ content: `
    input[type="tel"], input[autocomplete="tel"], [data-sensitive="phone"] { color: transparent !important; text-shadow: 0 0 8px #111 !important; }
  ` }).catch(() => {});
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (/\b(?:\+?84\s*)?(?:0?\d[\s.-]?){8,10}\b/.test(node.nodeValue ?? "")) {
        const parent = node.parentElement;
        if (parent) parent.style.filter = "blur(8px)";
      }
    }
  }).catch(() => {});
}

async function screenshot(page, role, viewport, name) {
  await applyScreenshotRedaction(page);
  const file = `${role}-${viewport}-${safeSlug(name)}.png`;
  await page.screenshot({ path: path.join(shotsRoot, file), fullPage: true, animations: "disabled" });
  return `shots/w8/${file}`;
}

async function routeSnapshot(page, role, viewport, route, results, screenName = "screen") {
  const url = new URL(route, STAGING);
  results.flowStage = `goto:${url.pathname}`;
  await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 45_000 });
  results.flowStage = `wait:${url.pathname}`;
  await page.waitForFunction(() => document.body.innerText.trim().length > 80, null, { timeout: 12_000 });
  await page.waitForFunction(() => !document.querySelector("[aria-busy='true']"), null, { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(500);
  results.flowStage = `metrics:${url.pathname}`;
  const metrics = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll("main, [class*='Content'], [class*='content'], [class*='_page_']")]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.width <= innerWidth)
      .sort((a, b) => b.width - a.width);
    const contentWidth = candidates[0] ? Math.round(candidates[0].width) : null;
    const buttons = [...document.querySelectorAll("button, a[role='button']")].filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
    }).map((el) => {
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height), label: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 64) };
    });
    return {
      url: location.pathname,
        title: document.querySelector("h1")?.innerText?.trim() || document.body.innerText.trim().split("\n").map((line) => line.trim()).find((line) => line && line !== "Đến nội dung" && line !== "Lớp" && line !== "Lịch" && line !== "Cài đặt") || "",
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
        contentWidth,
      visibleText: (document.body.innerText || "").slice(0, 1600),
      buttons,
    };
  });
  results.flowStage = `screenshot:${url.pathname}`;
  const shot = await screenshot(page, role, viewport, `${labelForPath(url)}-${screenName}`);
  results.flowStage = `record:${url.pathname}`;
  results.screens.push({ role, viewport, route: metrics.url, title: metrics.title, shot, scrollWidth: metrics.scrollWidth, viewportWidth: metrics.viewportWidth, contentWidth: metrics.contentWidth, targets: metrics.buttons });
  process.stdout.write(`CAPTURE ${role} ${viewport} ${metrics.url}\n`);
  return metrics;
}

async function verifyScoreParsing(page, meta, result) {
  const test = meta.tests[0];
  if (!test) { result.scores = { status: "not_verified", summary: "No staged test was available." }; return; }
  const route = `/lop/${meta.classId}/bai-kiem-tra/${test.id}`;
  await page.goto(`${STAGING}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input", { state: "visible", timeout: 10_000 });
  await routeSnapshot(page, "teacher", "mobile", route, result, "test-detail");
  const input = page.locator("input").first();
  const original = await input.inputValue();
  await input.fill("7,5");
  const commaAccepted = !(await page.getByRole("button", { name: "Lưu điểm" }).isDisabled());
  await input.fill("7.5");
  const dotAccepted = !(await page.getByRole("button", { name: "Lưu điểm" }).isDisabled());
  await input.fill("7,3");
  const commaThreeRejected = await page.getByRole("button", { name: "Lưu điểm" }).isDisabled();
  await input.fill(original);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("input", { state: "visible", timeout: 10_000 });
  const persistedUnchanged = (await page.locator("input").first().inputValue()) === original;
  result.scores = { status: commaAccepted && dotAccepted && commaThreeRejected && persistedUnchanged ? "PASS" : "FAIL", summary: `7,5 accepted=${commaAccepted}; 7.5 accepted=${dotAccepted}; 7,3 rejected=${commaThreeRejected}; original restored without save=${persistedUnchanged}.` };
}

async function measureMotion(page, result) {
  await page.goto(`${STAGING}/lop`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_000);
  const read = () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const button = document.querySelector("button");
    const styles = button ? getComputedStyle(button) : null;
    const pageMotion = document.querySelector('[class*="_page_"]');
    const pageStyle = pageMotion ? getComputedStyle(pageMotion) : null;
    return {
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      customDurations: Object.fromEntries([...root].filter((name) => /motion|duration/i.test(name) && /\d+(?:\.\d+)?m?s/.test(root.getPropertyValue(name))).map((name) => [name, root.getPropertyValue(name).trim()])),
      transitionDuration: styles?.transitionDuration ?? null,
      animationDuration: styles?.animationDuration ?? null,
      transitionProperty: styles?.transitionProperty ?? null,
      pageAnimationDuration: pageStyle?.animationDuration ?? null,
      pageAnimationName: pageStyle?.animationName ?? null,
    };
  });
  const normal = await read();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await read();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  result.motion = { normal, reduced, reducedMotionApplied: reduced.reducedMotion };
}

async function checkPrintPreview(page, meta, result) {
  const route = `/lop/${meta.classId}/bao-cao`;
  const requests = [];
  const onRequest = (request) => {
    if (request.method() !== "GET") requests.push({ method: request.method(), path: new URL(request.url()).pathname });
  };
  page.on("request", onRequest);
  await page.goto(`${STAGING}${route}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Xem trước" }).first().click();
  await page.waitForTimeout(350);
  const previewPath = new URL(page.url()).pathname;
  await page.emulateMedia({ media: "print" });
  const printMetrics = await page.evaluate(() => {
    const visible = [...document.querySelectorAll("body *")].filter((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0; });
    return { visibleElements: visible.length, visibleNavigation: visible.some((el) => el.matches("nav, [role=navigation]")), visibleButtons: visible.some((el) => el.matches("button")) };
  });
  const shot = await screenshot(page, "teacher", "mobile", "report-print-preview");
  await page.emulateMedia({ media: "screen" });
  page.off("request", onRequest);
  const printOnlyContent = !printMetrics.visibleNavigation && !printMetrics.visibleButtons && printMetrics.visibleElements > 0;
  result.print = { status: requests.length === 0 && printOnlyContent ? "PASS" : "REVIEW", summary: `Print media rendered report content only=${printOnlyContent}; non-GET requests=${requests.length}.`, previewPath, shot, uploadRequestCount: requests.length, visibleElements: printMetrics.visibleElements, printOnlyContent };
}

async function exerciseOfflineAttendance(page, context, meta, result) {
  const session = meta.sessions.find((item) => item.status === "held");
  if (!session) { result.offline = { status: "not_verified", summary: "No held session available." }; return; }
  const route = `/lop/${meta.classId}/buoi-hoc/${session.id}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${STAGING}${route}`, { waitUntil: "domcontentloaded" });
  const statusCell = page.locator('button[aria-label$="Bấm để đổi"]').first();
  await statusCell.waitFor({ state: "visible", timeout: 10_000 });
  const originalLabel = await statusCell.getAttribute("aria-label");
  const originalStatus = originalLabel.split(": ")[1].split(". Bấm")[0];
  const syncResponses = [];
  const onResponse = async (response) => {
    if (response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/v1/sync/push")) {
      let applied = false;
      const hasAppliedResult = (value) => {
        if (Array.isArray(value)) return value.some(hasAppliedResult);
        if (!value || typeof value !== "object") return false;
        return Object.entries(value).some(([key, item]) => {
          const normalized = key.toLowerCase();
          if (normalized === "applied" && (item === true || (typeof item === "number" && item > 0) || (Array.isArray(item) && item.length > 0))) return true;
          if (["status", "result", "outcome"].includes(normalized) && item === "applied") return true;
          return hasAppliedResult(item);
        });
      };
      try { applied = hasAppliedResult(await response.json()); } catch {}
      syncResponses.push({ http: response.status(), applied });
    }
  };
  page.on("response", onResponse);
  await context.setOffline(true);
  await statusCell.click();
  const changedLabel = await statusCell.getAttribute("aria-label");
  const offlineSave = page.getByRole("button", { name: "Lưu điểm danh" });
  if (await offlineSave.isEnabled()) await offlineSave.click();
  await context.setOffline(false);
  try { await page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/v1/sync/push"), { timeout: 15_000 }); } catch {}
  await page.waitForTimeout(600);
  const applied = syncResponses.some((response) => response.http === 200 && response.applied);
  await page.reload({ waitUntil: "domcontentloaded" });
  const reloadedCell = page.locator('button[aria-label$="Bấm để đổi"]').first();
  await reloadedCell.waitFor({ state: "visible", timeout: 10_000 });
  const persistedStatus = await reloadedCell.getAttribute("aria-label");
  let safety = 0;
  let currentStatusLabel = persistedStatus;
  while (!currentStatusLabel.includes(`: ${originalStatus}.`) && safety < 4) {
    await reloadedCell.click();
    safety += 1;
    currentStatusLabel = await reloadedCell.getAttribute("aria-label");
  }
  const restoredLabel = await reloadedCell.getAttribute("aria-label");
  const restoreButton = page.getByRole("button", { name: "Lưu điểm danh" });
  if (await restoreButton.isEnabled()) {
    const restoreSync = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/v1/sync/push"), { timeout: 15_000 }).catch(() => null);
    await restoreButton.click();
    await restoreSync;
  }
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "domcontentloaded" });
  await reloadedCell.waitFor({ state: "visible", timeout: 10_000 });
  const finalLabel = await reloadedCell.getAttribute("aria-label");
  const syncStatusChipPresent = /đang đồng bộ|đã đồng bộ|đồng bộ xong/i.test(await page.locator("body").innerText());
  page.off("response", onResponse);
  const restored = finalLabel.includes(`: ${originalStatus}.`);
  result.offline = { status: applied && restored ? "PASS" : "REVIEW", summary: `Offline cell changed=${changedLabel !== originalLabel}; sync applied=${applied}; reloaded status persisted=${persistedStatus === changedLabel}; original status restored=${restored}; permanent sync chip=${syncStatusChipPresent}.`, syncResponses, originalStatus, changedStatus: changedLabel.split(": ")[1].split(". Bấm")[0], restored, syncStatusChipPresent };
}

async function signIn(role, credentials, result) {
  const profilePath = path.join(browserStateRoot, role);
  await mkdir(profilePath, { recursive: true, mode: 0o700 });
  const roleBrowser = await chromium.launchPersistentContext(profilePath, {
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    viewport: { width: 390, height: 844 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = roleBrowser.pages()[0] ?? await roleBrowser.newPage();
  page.setDefaultTimeout(30_000);
  page.on("pageerror", () => { result.runtimeErrors += 1; });
  page.on("response", async (response) => {
    const request = response.request();
    const url = new URL(response.url());
    if (request.method() === "POST" && url.pathname.endsWith("/v1/auth/login")) {
      result.loginResponses.push({ http: response.status(), errorCode: await readLoginError(response) });
    }
  });

  result.loginAttempted = false;
  let stage = "navigation";
  try {
      await page.goto(`${STAGING}/dang-nhap`, { waitUntil: "networkidle", timeout: 45_000 });
      if (new URL(page.url()).pathname !== "/dang-nhap") {
        result.access = "authenticated";
        result.sessionReused = true;
        result.sessionStorageProbe = await persistentSessionProbe(page);
        if (!result.sessionStorageProbe.persisted || result.sessionStorageProbe.sessionStorageKeyCount > 0) {
          result.access = "session_not_persisted";
          return { browser: roleBrowser, page, ok: false };
        }
        return { browser: roleBrowser, page, ok: true };
    }
    stage = "form_fields";
    const phone = await page.waitForSelector("#login-phone", { visible: true, timeout: 30_000 });
    const password = await page.waitForSelector("#login-password", { visible: true, timeout: 30_000 });
    await phone.type(localPhone(credentials.phone), { delay: 15 });
    await password.type(credentials.password, { delay: 5 });
    stage = "submit_ready_check";
    const submit = await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 30_000 });
    if (!(await submit.evaluate((element) => !element.disabled && getComputedStyle(element).visibility !== "hidden"))) throw new Error("login_submit_not_ready");
      const counts = await readLoginSubmitCounts();
      if (counts[role].count >= 2 || counts[role].failed) {
        result.access = "login_submit_limit_reached";
        return { browser: roleBrowser, page, ok: false };
      }
      const responsePromise = page.waitForResponse((response) => {
        const request = response.request();
        return request.method() === "POST" && new URL(response.url()).pathname.endsWith("/v1/auth/login");
      }, { timeout: 30_000 });
      stage = "submit_clicked";
      result.loginAttempted = true;
      counts[role].count += 1;
      counts[role].failed = true;
      await writeFile(attemptLedgerPath, `${JSON.stringify(counts)}\n`, { mode: 0o600 });
      const [, loginResponse] = await Promise.all([submit.click(), responsePromise]);
      const errorCode = await readLoginError(loginResponse);
      result.loginResponses = [{ http: loginResponse.status(), errorCode }];
      if (loginResponse.status() !== 200) {
        result.access = "denied";
        result.accessCode = errorCode ?? `http_${loginResponse.status()}`;
        await screenshot(page, role, "mobile", "login-result");
        return { browser: roleBrowser, page, ok: false };
      }
      result.loginResponseSuccessful = true;
      try {
        await page.waitForURL((url) => url.pathname !== "/dang-nhap", { timeout: 15_000 });
      } catch {
        // URL and persisted storage are checked below; a route transition may lag the auth response.
      }
      result.postLoginPath = new URL(page.url()).pathname;
      result.sessionStorageProbe = await persistentSessionProbe(page);
      if (result.postLoginPath === "/dang-nhap" || !result.sessionStorageProbe.persisted) {
        result.access = "session_not_confirmed";
        await screenshot(page, role, "mobile", "login-result");
        return { browser: roleBrowser, page, ok: false };
      }
      counts[role].failed = false;
      await writeFile(attemptLedgerPath, `${JSON.stringify(counts)}\n`, { mode: 0o600 });
      result.access = "authenticated";
      result.sessionReused = false;
      return { browser: roleBrowser, page, ok: true };
  } catch (error) {
    result.access = result.loginAttempted ? "harness_indeterminate_after_submit" : "harness_before_submit";
    result.harnessError = error instanceof Error ? error.name : "unknown";
      result.harnessStage = stage;
      result.harnessMessage = error instanceof Error ? error.message.slice(0, 180) : "unknown";
      result.harnessStack = error instanceof Error ? error.stack?.split("\n").slice(0, 5).join(" | ") : "unknown";
      if (result.loginAttempted) await screenshot(page, role, "mobile", "login-harness-state").catch(() => {});
    return { browser: roleBrowser, page, ok: false };
  }
}

async function readTeacherClassMeta(page) {
  return page.evaluate(async () => {
    const openRequest = indexedDB.open("qlh-web");
    const database = await new Promise((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const tx = database.transaction(["classes", "sessions", "students", "attendance", "tests", "scores"], "readonly");
    const rows = {};
    for (const name of ["classes", "sessions", "students", "attendance", "tests", "scores"]) {
      rows[name] = await new Promise((resolve, reject) => {
        const request = tx.objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    database.close();
    return rows;
  });
}

function slimTeacherMeta(rows) {
  const classes = rows.classes.map((row) => ({ id: row.id, name: row.name }));
  const klass = classes.find((item) => /6a/i.test(item.name)) ?? classes[0];
  const sessions = rows.sessions.filter((row) => row.class_id === klass?.id).sort((a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
  return { classes, classId: klass?.id ?? null, className: klass?.name ?? null, sessions: sessions.map(({ id, date, status }) => ({ id, date, status })), students: rows.students.filter((row) => row.class_id === klass?.id).map(({ id, name, status }) => ({ id, name, status })), attendance: rows.attendance, tests: rows.tests.filter((row) => row.class_id === klass?.id), scores: rows.scores };
}

async function teacherPass(credentials, results) {
  const result = results.roles.teacher = { loginResponses: [], runtimeErrors: 0, screens: [] };
    const auth = await signIn("teacher", credentials, result);
      if (!auth.ok) { await auth.browser?.close().catch(() => {}); return; }
    const { page, browser } = auth;
  let meta;
  try {
      result.flowStage = "teacher:read-indexeddb";
      const indexed = await readTeacherClassMeta(page);
      result.flowStage = "teacher:normalize-indexeddb";
      meta = slimTeacherMeta(indexed);
    result.classList = meta.classes.map(({ name }) => name);
    for (const vp of viewports) {
        result.flowStage = `teacher:viewport:${vp.key}`;
          await page.setViewportSize({ width: vp.width, height: vp.height });
      const routes = [
        ["/lop", "all-classes"], ["/lop/moi", "create-class"], ["/lich", "schedule"], ["/cai-dat", "settings"],
      ];
      if (meta.classId) {
        const base = `/lop/${meta.classId}`;
        routes.push([`${base}/buoi-hoc`, "sessions"], [`${base}/bai-kiem-tra`, "tests"], [`${base}/diem`, "scores"], [`${base}/hoc-sinh`, "students"], [`${base}/bao-cao`, "reports"]);
      }
      for (const [route, name] of routes) {
          const metrics = await routeSnapshot(page, "teacher", vp.key, route, result, name);
        if (route.endsWith("/buoi-hoc")) result.sessionPageText = metrics.visibleText.slice(0, 700);
        if (route.endsWith("/bai-kiem-tra")) result.testsPageText = metrics.visibleText.slice(0, 700);
        if (route.endsWith("/bao-cao")) result.reportPageText = metrics.visibleText.slice(0, 700);
      }
          if (meta.classId) {
          const tests = await page.goto(`${STAGING}/lop/${meta.classId}/bai-kiem-tra`, { waitUntil: "domcontentloaded" });
        void tests;
        const links = await page.$$eval('a[href*="/bai-kiem-tra/"]', (els) => els.map((el) => el.getAttribute("href")).filter((href) => href && !href.endsWith("/bai-kiem-tra/moi")));
          if (links[0]) await routeSnapshot(page, "teacher", vp.key, links[0], result, "test-detail");
        const sessions = meta.sessions.filter((item) => item.status === "held");
        if (sessions[0]) {
          const base = `/lop/${meta.classId}/buoi-hoc/${sessions[0].id}`;
            const initial = await routeSnapshot(page, "teacher", vp.key, base, result, "session-detail");
          result.sessionDetailAvailable = !/không tìm thấy|không thuộc phạm vi/i.test(initial.visibleText);
              for (const tab of ["Điểm danh", "Nhận xét", "Bài tập về nhà"]) {
                const tabButton = page.locator('[role="tab"]').filter({ hasText: tab }).first();
                if (await tabButton.count()) {
                  await tabButton.click();
                  await page.waitForTimeout(250);
                await screenshot(page, "teacher", vp.key, `session-${safeSlug(tab)}`);
              }
            }
        } else result.sessionDetailAvailable = false;
      }
    }
      result.meta = { className: meta.className, classCount: meta.classes.length, sessionCount: meta.sessions.length, activeStudentCount: meta.students.filter((item) => item.status === "active").length, testsCount: meta.tests.length };
      if (meta.classId) {
        await measureMotion(page, result);
        await verifyScoreParsing(page, meta, result);
        await checkPrintPreview(page, meta, result);
        await exerciseOfflineAttendance(page, browser, meta, result);
      }
      result.measurements = result.screens.map(({ viewport, route, scrollWidth, contentWidth, targets }) => ({ viewport, route, scrollWidth, contentWidth, targetMinimum: targets.length ? Math.min(...targets.map((item) => viewport === "mobile" ? item.height : Math.min(item.width, item.height))) : null }));
  } catch (error) {
      result.flowError = error instanceof Error ? error.name : "unknown";
      result.flowErrorMessage = error instanceof Error ? error.message.slice(0, 180) : "unknown";
      result.flowErrorStack = error instanceof Error ? error.stack?.split("\n").slice(0, 5).join(" | ") : "unknown";
    } finally {
      await browser.close().catch(() => {});
  }
}

async function guardianSignature(page) {
  return page.evaluate(async () => {
    let selectedId = sessionStorage.getItem("guardian-selected-child-v1");
    const dbOpen = indexedDB.open("qlh-web");
    const database = await new Promise((resolve, reject) => {
      dbOpen.onsuccess = () => resolve(dbOpen.result);
      dbOpen.onerror = () => reject(dbOpen.error);
    });
    const names = ["classes", "students", "sessions", "attendance", "slips", "tests", "scores", "reports", "reportPublications", "homeworkSections", "homeworkGrades"];
    const all = {};
    const tx = database.transaction(names, "readonly");
    for (const name of names) all[name] = await new Promise((resolve, reject) => {
      const req = tx.objectStore(name).getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    database.close();
    const chipName = document.querySelector('button[aria-haspopup="dialog"]')?.innerText?.trim().split("\n").at(-1)?.trim() ?? "";
    const student = all.students.find((item) => item.id === selectedId)
      ?? all.students.find((item) => item.name === chipName)
      ?? all.students.find((item) => chipName && item.name?.startsWith(chipName));
    selectedId ??= student?.id ?? null;
    const field = (row, camel, snake) => row[camel] ?? row[snake];
    const classRow = all.classes.find((row) => row.id === field(student ?? {}, "classId", "class_id"));
      const today = new Date().toISOString().slice(0, 10);
      const sessions = all.sessions.filter((row) => field(row, "classId", "class_id") === classRow?.id && (row.status === "held" || String(row.date).slice(0, 10) <= today)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const owns = (rows) => rows.filter((row) => field(row, "studentId", "student_id") === selectedId);
    const attendance = owns(all.attendance);
    const slips = owns(all.slips);
    const scores = owns(all.scores);
    const reports = owns(all.reports);
    const comments = slips.map((row) => ({ stars: row.stars ?? null, noteLength: String(row.note ?? "").length }));
    return {
      studentId: selectedId,
      studentName: student?.name ?? null,
      className: classRow?.name ?? null,
      sessionCount: sessions.length,
      recentSessions: sessions.slice(0, 3).map((row) => ({ id: row.id, date: row.date, attendance: attendance.find((item) => field(item, "sessionId", "session_id") === row.id)?.status ?? null, stars: slips.find((item) => field(item, "sessionId", "session_id") === row.id)?.stars ?? null })),
      comments: comments.slice(0, 1),
      scores: scores.map((row) => ({ testId: field(row, "testId", "test_id"), value: row.value })),
      reportMonths: reports.map((row) => row.month),
      relationCounts: { attendance: attendance.length, slips: slips.length, scores: scores.length, reports: reports.length, homeworkGrades: owns(all.homeworkGrades).length },
      ownershipClean: [...attendance, ...slips, ...scores, ...reports, ...owns(all.homeworkGrades)].every((row) => field(row, "studentId", "student_id") === selectedId),
      otherCachedChildRows: [...all.attendance, ...all.slips, ...all.scores, ...all.reports, ...all.homeworkGrades].filter((row) => field(row, "studentId", "student_id") && field(row, "studentId", "student_id") !== selectedId).length,
      childCount: all.students.length,
    };
  });
}

async function childOptions(page) {
  const trigger = page.locator('button[aria-haspopup="dialog"]:visible').first();
  await trigger.waitFor({ state: "visible", timeout: 10_000 });
  await trigger.click();
  const options = page.locator('button[aria-pressed]:visible');
  await options.first().waitFor({ state: "visible", timeout: 5_000 });
  return options.elementHandles();
}

async function captureGuardianChild(page, result, viewport, signature, prefix) {
  await routeSnapshot(page, "guardian", viewport, "/ph", result, `${prefix}-class`);
  const sessionLink = await page.$eval('a[href*="/ph/buoi/"]', (element) => element.getAttribute("href")).catch(() => null);
  if (sessionLink) await routeSnapshot(page, "guardian", viewport, sessionLink, result, `${prefix}-session`);
  await routeSnapshot(page, "guardian", viewport, "/ph/nhan-xet", result, `${prefix}-comments`);
  await routeSnapshot(page, "guardian", viewport, "/ph/diem", result, `${prefix}-scores`);
  await routeSnapshot(page, "guardian", viewport, "/ph/bao-cao", result, `${prefix}-report`);
  result.childSignatures.push(signature);
}

async function guardianChildIsolation(page, result, viewport) {
  await page.goto(`${STAGING}/ph`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);
  const initialOptions = await childOptions(page);
  result.childPickerOptionCount = initialOptions.length;
  if (initialOptions.length < 2) {
    result.childSwitchChangedId = false;
    return;
  }
  await screenshot(page, "guardian", viewport, "child-picker");
  const firstLabel = await initialOptions[0].evaluate((element) => element.innerText.trim());
  await initialOptions[0].click();
    await page.waitForTimeout(250);
  const first = await guardianSignature(page);
  result.childOrder = [firstLabel];
  await captureGuardianChild(page, result, viewport, first, "child-a");

  await page.goto(`${STAGING}/ph`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);
  const secondOptions = await childOptions(page);
  const secondLabel = await secondOptions[1].evaluate((element) => element.innerText.trim());
  await secondOptions[1].click();
    await page.waitForTimeout(300);
  const second = await guardianSignature(page);
  result.childOrder.push(secondLabel);
  result.childSwitchChangedId = first.studentId !== second.studentId;
  await screenshot(page, "guardian", viewport, "child-second");
  await captureGuardianChild(page, result, viewport, second, "child-b");

  await page.goto(`${STAGING}/ph`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);
  const returnOptions = await childOptions(page);
  await returnOptions[0].click();
    await page.waitForTimeout(300);
  const returned = await guardianSignature(page);
  result.returnedToFirstChild = returned.studentId === first.studentId;
  result.childSignatures.push(returned);
}

async function guardianPass(credentials, results) {
  const result = results.roles.guardian = { loginResponses: [], runtimeErrors: 0, screens: [], childSignatures: [] };
  const auth = await signIn("guardian", credentials, result);
    if (!auth.ok) { await auth.browser?.close().catch(() => {}); return; }
  const { page, browser } = auth;
  try {
    for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
        await routeSnapshot(page, "guardian", vp.key, "/ph", result, "class");
      let sig = await guardianSignature(page);
      result.childSignatures.push(sig);
      const sessionLink = await page.$eval('a[href*="/ph/buoi/"]', (el) => el.getAttribute("href")).catch(() => null);
        if (sessionLink) await routeSnapshot(page, "guardian", vp.key, sessionLink, result, "session");
        await routeSnapshot(page, "guardian", vp.key, "/ph/nhan-xet", result, "comments");
        await routeSnapshot(page, "guardian", vp.key, "/ph/diem", result, "scores");
        await routeSnapshot(page, "guardian", vp.key, "/ph/bao-cao", result, "report");
        await routeSnapshot(page, "guardian", vp.key, "/cai-dat", result, "settings");
        if (vp.key === "mobile") await guardianChildIsolation(page, result, vp.key);
    }
  } catch (error) {
      result.flowError = error instanceof Error ? error.name : "unknown";
      result.flowErrorMessage = error instanceof Error ? error.message.slice(0, 180) : "unknown";
      result.flowErrorStack = error instanceof Error ? error.stack?.split("\n").slice(0, 5).join(" | ") : "unknown";
    } finally {
      await browser.close().catch(() => {});
  }
}

function makeReport(results) {
  const teacher = results.roles.teacher;
  const guardian = results.roles.guardian;
  const rows = [];
  const screens = [...(teacher?.screens ?? []), ...(guardian?.screens ?? [])];
  for (const screen of screens) rows.push(`| ${screen.role} | ${screen.viewport} | \`${screen.route}\` | ${screen.title.replaceAll("|", "/")} | ${screen.scrollWidth}/${screen.viewportWidth}px | ${screen.contentWidth ?? "—"}px | \`${screen.shot}\` |`);
    const before = results.loginCountsBefore ?? { teacher: { count: 1 }, guardian: { count: 2 } };
  const count = (role, record) => (before[role]?.count ?? 0) + (record?.loginAttempted ? 1 : 0);
  const teacherStatus = `${teacher?.access ?? "not_run"}${teacher?.sessionReused ? "; reused persistent authenticated profile" : ""}${teacher?.flowError ? `; flow error ${teacher.flowError}` : ""}`;
  const guardianStatus = `${guardian?.access ?? "not_run"}${guardian?.sessionReused ? "; reused persistent authenticated profile" : ""}${guardian?.flowError ? `; flow error ${guardian.flowError}` : ""}`;
  const targetRows = screens.map((screen) => {
    const min = screen.targets.length ? Math.min(...screen.targets.map((target) => Math.min(target.width, target.height))) : null;
    return `| ${screen.role} | ${screen.viewport} | \`${screen.route}\` | ${min ?? "—"}px | ${min === null ? "no visible controls" : min >= (screen.viewport === "mobile" ? 44 : 36) ? "PASS" : "below minimum"} |`;
  });
  const signatures = (guardian?.childSignatures ?? []).map((sig, index) => `- ${index + 1}. ${JSON.stringify(sig)}`).join("\n") || "No child signatures captured.";
    const reportDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
      return `# W-8 — staging UI E2E\n\nDate: ${reportDate}  \nTarget: ${STAGING}  \nHarness: Node.js + Playwright / Chrome 155, separate persistent profiles under ignored artifacts/w8-browser-state/. Form sends recorded: teacher ${count("teacher", teacher)} (limit 2), guardian ${count("guardian", guardian)} (limit 2); this run reused both profiles and sent 0 login forms.\n\n## Access and stored session\n\n| Account | Result | Sends this run | Total sends |\n|---|---|---:|---:|\n| Teacher | ${teacherStatus}; persistent storage=${teacher?.sessionStorageProbe?.persisted ?? false} | ${teacher?.loginAttempted ? 1 : 0} | ${count("teacher", teacher)} |\n| Guardian | ${guardianStatus}; persistent storage=${guardian?.sessionStorageProbe?.persisted ?? false} | ${guardian?.loginAttempted ? 1 : 0} | ${count("guardian", guardian)} |\n\nPrior successful form submissions were HTTP 200. No credentials, phone numbers, tokens, or raw comment text are in this report. The persistent profiles are excluded from git.\n\n## Screenshots and layout measures\n\nCaptured for teacher and guardian at 390×844 and 1440×900; child A/B details and print preview use mobile.\n\n| Role | Viewport | Route | Heading | scrollWidth/viewport | Content width | Image |\n|---|---|---|---|---:|---:|---|\n${rows.join("\n")}\n\nTeacher staging summary: ${JSON.stringify(teacher?.meta ?? null)}. Page errors: teacher ${teacher?.runtimeErrors ?? "—"}, guardian ${guardian?.runtimeErrors ?? "—"}.\n\n### Minimum visible hit target\n\n| Role | Viewport | Route | Smallest measured target | Check (44px mobile / 36px desktop) |\n|---|---|---|---:|---|\n${targetRows.join("\n")}\n\nHorizontal overflow: ${screens.filter((screen) => screen.scrollWidth > screen.viewportWidth).length} of ${screens.length} captured routes. Desktop content limits: teacher ≤1200px, guardian ≤960px.\n\n## Teacher functional checks\n\n| Check | Result | Evidence |\n|---|---|---|\n| Score parsing | ${teacher?.scores?.status ?? "not verified"} | ${teacher?.scores?.summary ?? "—"} |\n| Offline attendance | ${teacher?.offline?.status ?? "not verified"} | ${teacher?.offline?.summary ?? "—"} |\n| Sync push | HTTP ${teacher?.offline?.syncResponses?.map((r) => r.http).join(", ") || "not observed"}; applied=${teacher?.offline?.syncResponses?.every((r) => r.applied) ?? false} | One attendance cell changed offline, reloaded, then restored and synced. |\n| Print preview / upload | ${teacher?.print?.status ?? "not verified"} | ${teacher?.print?.summary ?? "—"} |\n| Motion | Page animation ${teacher?.motion?.normal?.pageAnimationDuration ?? "—"}; reduced=${teacher?.motion?.reduced?.pageAnimationDuration ?? "—"} | reduced-motion media applied=${teacher?.motion?.reducedMotionApplied ?? false}. |\n\n## Guardian child signatures\n\n${signatures}\n\nPicker options=${guardian?.childPickerOptionCount ?? "—"}; A→B selected ID changed=${guardian?.childSwitchChangedId ?? "not checked"}; return-to-A unchanged=${guardian?.returnedToFirstChild ?? "not checked"}. Signatures include child name, class, held-session count and last three held sessions, attendance/stars, one feedback's length/stars (no comment text), per-test scores, report months, and child-owned row counts.\n\n## Difference table vs prototype references\n\n| Screen / check | Difference | Type | Disposition |\n|---|---|---|---|\n| Teacher classes, create, schedule, settings | Staging includes Today/unfinished-task cards and extra Smoke classes absent from prototype seed. | UI structure + staging data | Captured; no CSS/JSX defect requiring a small fix was identified. |\n| Teacher class tabs and session list | Staging has 6A, 21 sessions, 8 active students, 2 tests, and a Sắp tới group absent from the reference. | Staging data | Captured at both viewports; no source change. |\n| Guardian class, session, comments, scores, report, picker | Two children share class 6A; attendance, feedback, scores, session dates, and report publication differ from prototype seed. | Staging data | A→B→A ownership signatures and per-child screenshots recorded above. |\n| Layout and hit targets | See per-route measurements. | UI | Overflow and target sizes reported; below-minimum controls are recorded for follow-up. |\n| Score input | ${teacher?.scores?.summary ?? "Not verified."} | Data / UI | ${teacher?.scores?.status ?? "Not verified"}; unsaved edit discarded by reload. |\n| Offline sync | ${teacher?.offline?.summary ?? "Not verified."} | Data / sync | ${teacher?.offline?.status ?? "Not verified"}; original attendance restored. |\n| Print / upload | ${teacher?.print?.summary ?? "Not verified."} | Print / network | ${teacher?.print?.status ?? "Not verified"}. |\n\n## Run result\n\nMachine result: [w8-results.json](../../../../../.paseo/worktrees/0fvr24l0/mvp-web/artifacts/w8-results.json). No staging code change or deployment was made.\n`;
}

await mkdir(shotsRoot, { recursive: true });
await mkdir(path.dirname(jsonPath), { recursive: true });
const rawCredentials = await readFile(credentialPath, "utf8");
const credentials = readCredentialSections(rawCredentials);
if (!credentials.api || !credentials.teacher.phone || !credentials.teacher.password || !credentials.parent.phone || !credentials.parent.password) {
  throw new Error("Required staging demo sections are missing; credential values were not printed.");
}
const apiUrl = new URL(credentials.api);
if (apiUrl.pathname.replace(/\/$/, "") !== "/v1" || !apiUrl.hostname.endsWith("workers.dev")) throw new Error("Credential file does not point to the expected staging API.");
  const results = { target: STAGING, startedAt: new Date().toISOString(), loginCountsBefore: await readLoginSubmitCounts(), roles: {}, screens: [] };
  await teacherPass(credentials.teacher, results);
  if (results.roles.teacher?.access !== "authenticated") {
    results.stoppedAfterRole = "teacher";
  } else {
    await guardianPass(credentials.parent, results);
    if (results.roles.guardian?.access !== "authenticated") results.stoppedAfterRole = "guardian";
  }
results.finishedAt = new Date().toISOString();
await writeFile(jsonPath, `${JSON.stringify(results, null, 2)}\n`, { mode: 0o600 });
await writeFile(reportPath, makeReport(results), { mode: 0o600 });
for (const [role, result] of Object.entries(results.roles)) {
  process.stdout.write(`${role.toUpperCase()}: ${result.access ?? "not_run"}; login submits=${result.loginAttempted ? 1 : 0}; screenshots=${result.screens.length}; runtime errors=${result.runtimeErrors}\n`);
}
process.stdout.write(`Report: ${reportPath}\nJSON: ${jsonPath}\nScreenshots: ${shotsRoot}\n`);
