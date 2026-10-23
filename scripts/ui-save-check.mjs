import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { entities, identity, sessionFor } from "./ui-audit-fixtures/demo.mjs";
import { mockWriteResponse } from "./ui-audit-fixtures/mock-write-responses.mjs";

const BASE = "http://127.0.0.1:5192";
const RESULT = "/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/ui-save-check-results.md";
const root = process.cwd();
const results = [];
const counts = { pushRequests: 0, pushCommands: 0, directWrites: [] };
let server;
let browser;

class AppFailure extends Error {}
function check(label, condition, detail = "") {
  results.push({ label, result: condition ? "PASS" : "FAIL", kind: condition ? "—" : "app", detail: detail || (condition ? "assertion true" : "condition was false") });
  if (!condition) throw new AppFailure(label + ": " + (detail || "condition was false"));
}
function note(label, detail) { results.push({ label, result: "INFO", kind: "—", detail }); }

async function setupMock(page, role = "staff", cleanAuth = false, draftComment = false) {
  page.setDefaultTimeout(5000);
  const mockEntities = structuredClone(entities);
  if (draftComment && mockEntities.slips?.length) mockEntities.slips[0].status = "draft";
  await page.route("**/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
      const method = request.method();
      if (method !== "GET" && method !== "HEAD" && !url.pathname.startsWith("/v1/sync/")) counts.directWrites.push(`${method} ${url.pathname}`);
      if (url.pathname.endsWith("/me")) return route.fulfill({ json: sessionFor(role).me });
      const writeResponse = mockWriteResponse(request, mockEntities);
      if (writeResponse) return route.fulfill({ json: writeResponse });
      if (url.pathname === "/v1/sync/snapshot") return route.fulfill({ json: { cursor: 0, epoch: 1, entities: ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report", "report_publication"] } });
    const entity = url.pathname.match(/\/v1\/sync\/snapshot\/([^/]+)$/)?.[1];
    if (entity) {
      const table = ({ class: "classes", student: "students", class_session: "sessions", attendance: "attendance", test: "tests", score: "scores", slip: "slips", homework_section: "homeworkSections", homework_grade: "homeworkGrades", report: "reports", report_publication: "reportPublications" })[entity] ?? entity + "s";
      return route.fulfill({ json: { items: mockEntities[table] ?? [], next_after: null } });
    }
    if (url.pathname === "/v1/sync/pull") return route.fulfill({ json: { cursor: 0, epoch: 1, has_more: false, upserts: {}, deleted: [] } });
    if (url.pathname === "/v1/sync/push" && method === "POST") {
      const body = request.postDataJSON();
      counts.pushRequests++;
      counts.pushCommands += body.commands?.length ?? 0;
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return route.fulfill({ json: { cursor: 0, epoch: 1, results: (body.commands ?? []).map((command) => ({ id: command.id, status: "applied", version: 1 })) } });
    }
    if (url.pathname === "/v1/auth/login" || url.pathname === "/v1/auth/register") return route.fulfill({ json: { token: "local-demo-token", expires_at: "2099-01-01T00:00:00Z", user: sessionFor("staff").user, memberships: sessionFor("staff").me.memberships, active_membership_id: identity.membershipId } });
    return route.fulfill({ status: 200, json: {} });
  });

  if (cleanAuth) return;
  const session = sessionFor(role);
  await page.addInitScript((value) => localStorage.setItem("qlh.session.v1", JSON.stringify(value)), session);
  await page.goto(BASE + "/dang-nhap", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ role, identity, entities, draftComment }) => {
    const req = indexedDB.open("qlh-web", 10);
    const db = await new Promise((resolve, reject) => {
      req.onupgradeneeded = () => {
        const indexes = { classes: ["key", "identity", "id"], students: ["key", "identity", "class_id", "id"], sessions: ["key", "identity", "class_id", "date", "id"], attendance: ["key", "identity", "session_id", "student_id"], tests: ["key", "identity", "class_id", "date", "id"], scores: ["key", "identity", "test_id", "student_id"], slips: ["key", "identity", "session_id", "student_id"], homeworkSections: ["key", "identity", "session_id", "id"], homeworkGrades: ["key", "identity", "section_id", "student_id"], reports: ["key", "identity", "class_id", "student_id", "month"], reportPublications: ["key", "identity", "report_id", "publication_no"], outbox: ["id", "identity", "status", "created_at"], meta: ["key", "identity"] };
        for (const [table, fields] of Object.entries(indexes)) if (!req.result.objectStoreNames.contains(table)) {
          const store = req.result.createObjectStore(table, { keyPath: fields[0] });
          for (const field of fields.slice(1)) store.createIndex(field, field);
        }
      };
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    const active = role === "guardian" ? "demo-parent:" + identity.workspaceId + ":demo-guardian" : identity.userId + ":" + identity.workspaceId + ":" + identity.membershipId;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(Object.keys(entities), "readwrite");
      for (const [table, rows] of Object.entries(entities)) {
        const entity = table === "homeworkSections" ? "homework_section" : table === "homeworkGrades" ? "homework_grade" : table === "reportPublications" ? "report_publication" : table === "sessions" ? "class_session" : table.replace(/s$/, "");
        for (const [index, row] of rows.entries()) tx.objectStore(table).put({ ...row, ...(draftComment && table === "slips" && index === 0 ? { status: "draft" } : {}), identity: active, key: active + "|" + entity + "|" + (row.id ?? row.session_id + "|" + row.student_id + "|" + (row.test_id ?? "")), entity });
      }
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { role, identity, entities: mockEntities, draftComment });
}

async function outboxCount(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open("qlh-web"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    if (!db.objectStoreNames.contains("outbox")) { db.close(); return 0; }
    const n = await new Promise((resolve, reject) => { const r = db.transaction("outbox", "readonly").objectStore("outbox").count(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    db.close(); return n;
  }).catch(() => null);
}
async function type(locator, value) {
  await locator.click();
  await locator.press("ControlOrMeta+A");
  await locator.pressSequentially(value);
}
async function openPage(viewport, route, options = {}) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.width <= 430 ? 2 : 1, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
  const page = await context.newPage();
  await setupMock(page, options.role ?? "staff", options.cleanAuth ?? false, options.draftComment ?? false);
  await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.trim().length > 10, null, { timeout: 8000 });
  return { context, page };
}
async function caseRun(label, viewport, route, run, options = {}) {
  let context;
  try {
    ({ context, page: globalThis.__saveCheckPage } = await openPage(viewport, route, options));
    await run(globalThis.__saveCheckPage, viewport);
  } catch (error) {
    if (!(error instanceof AppFailure)) results.push({ label: `${label} · setup/flow`, result: "FAIL", kind: "script", detail: error instanceof Error ? error.message : String(error) });
  } finally {
    await context?.close();
    delete globalThis.__saveCheckPage;
  }
}
async function waitDialog(page, title = /chưa lưu/i) {
  const dialog = page.getByRole("dialog").filter({ hasText: title });
  await dialog.waitFor({ state: "visible", timeout: 1800 });
  return dialog;
}
async function dirtyNavigation(page, link) {
  const before = page.url();
  await link.click();
  const dialog = await waitDialog(page);
  check("Dirty navigation shows confirmation", await dialog.isVisible(), "expected dialog 'Chưa lưu thay đổi'");
  await dialog.getByRole("button", { name: "Ở lại", exact: true }).click();
  check("Stay keeps URL", page.url() === before, "URL must remain unchanged after 'Ở lại'");
}
async function dirtyModalClose(page, dialog, method = "button") {
  if (method === "escape") await page.keyboard.press("Escape");
  else await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  let guard;
  try { guard = await waitDialog(page); }
  catch { check("Dirty modal close asks for confirmation", false, "no unsaved-changes confirmation appeared after close attempt"); }
  check("Dirty modal close asks for confirmation", await guard.isVisible(), "expected unsaved close dialog");
  await guard.getByRole("button", { name: "Ở lại", exact: true }).click();
}
async function doubleClickAndMeasure(page, button, label, options = {}) {
  const buttonIndex = await button.evaluate((el) => [...document.querySelectorAll("button")].indexOf(el));
  const buttonHandle = await button.elementHandle();
  const initialName = await button.evaluate((el) => el.getAttribute("aria-label") || el.innerText.trim());
  await page.evaluate((index) => {
    const target = [...document.querySelectorAll("button")][index];
    window.__saveBusyMeasure = { painted: false, start: null, end: null };
    const sample = () => {
      const measure = window.__saveBusyMeasure;
      if (!measure) return;
      const busy = target?.getAttribute("aria-busy") === "true";
      if (busy) { measure.painted = true; if (measure.start === null) measure.start = performance.now(); }
      else if (measure.start !== null && measure.end === null) measure.end = performance.now();
      if (measure.end === null) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, buttonIndex);
  const outboxBefore = await outboxCount(page);
  const pushBefore = counts.pushRequests, commandBefore = counts.pushCommands, directBefore = counts.directWrites.length;
  try { await button.dblclick(); }
  catch (error) { check(`${label} · save remains clickable`, false, error instanceof Error ? error.message : String(error)); }
  await page.waitForTimeout(250);
  const outboxDuring = await outboxCount(page);
  let successLabelVisible = false;
  let accessibleNameReturned = true;
  if (options.inPlace) {
    const done = page.getByRole("button", { name: /Đã lưu/ }).filter({ visible: true });
    successLabelVisible = await done.first().waitFor({ state: "visible", timeout: 1800 }).then(() => done.first().isVisible()).catch(() => false);
    check(`${label} · accessible success label`, successLabelVisible, "expected primary button accessible name to change to 'Đã lưu' during the success hold");
    if (options.returnName) {
      accessibleNameReturned = await page.getByRole("button", { name: options.returnName, exact: true }).waitFor({ state: "visible", timeout: 6000 }).then(() => true).catch(() => false);
      check(`${label} · success hold ends and original name returns`, accessibleNameReturned, `expected button name to return to '${options.returnName}' after the 1.6 s hold`);
    } else await page.waitForTimeout(1350);
  } else await page.waitForTimeout(1350);
  const outboxAfter = await outboxCount(page);
  const pushDelta = counts.pushRequests - pushBefore, commandDelta = counts.pushCommands - commandBefore;
  const direct = counts.directWrites.slice(directBefore);
  note(`${label} · double click counts`, `push=${pushDelta}; commands=${commandDelta}; outbox=${outboxBefore}→${outboxDuring}→${outboxAfter}; direct writes=${direct.length ? direct.join(", ") : "0"}`);
  if (options.direct) check(`${label} · single direct request`, direct.length === 1, `expected 1 endpoint request; observed ${direct.length}`);
  else {
    const outboxDelta = (outboxDuring ?? 0) - (outboxBefore ?? 0);
    const expectedOutbox = options.expectedOutbox ?? 1;
    check(`${label} · one write request`, pushDelta === 1 || outboxDelta === expectedOutbox, `expected one push request or ${expectedOutbox} outbox command(s) for one logical write; push=${pushDelta}, commands=${commandDelta}, outbox delta=${outboxDelta}`);
  }
  await page.waitForFunction(() => window.__saveBusyMeasure?.end !== null, null, { timeout: 2500 }).catch(() => {});
  const busy = await page.evaluate(() => { const m=window.__saveBusyMeasure; return { painted:m?.painted ?? false, duration:m?.start === null || m?.start === undefined ? 0 : (m.end ?? performance.now())-m.start }; });
  check(`${label} · aria-busy painted ≥350 ms`, busy.painted && busy.duration >= 350, `painted=${busy.painted}; duration=${busy.duration.toFixed(1)} ms`);
  if (options.closes) {
    const stillAttached = await buttonHandle.evaluate((el) => el.isConnected).catch(() => false);
    check(`${label} · modal/form closes`, !stillAttached, "expected original save button to detach after save");
  } else {
    const settledButton = page.getByRole("button", { name: options.returnName ?? initialName, exact: true });
    const buttonVisible = await settledButton.waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false);
    const disabled = buttonVisible ? await settledButton.isDisabled() : false;
    if (!disabled && (label.startsWith("Score entry") || label === "Score grid")) {
      const safe = label.toLowerCase().replaceAll(" ", "-");
      await mkdir("/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-feedback-20261024/shots/after", { recursive: true });
      await page.screenshot({ path: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-feedback-20261024/shots/after/F8-${safe}-button-enabled.png`, fullPage: false });
    }
    check(`${label} · save button returns disabled`, buttonVisible && disabled, buttonVisible ? `expected save button disabled after success hold ended; enabled=${!disabled}` : `no accessible button named '${options.returnName ?? initialName}' after success hold`);
  }
}
async function checkButtonState(label, button, wantDisabled) {
  const disabled = await button.isDisabled();
  check(label, disabled === wantDisabled, `disabled=${disabled}, expected ${wantDisabled}; DOM=${JSON.stringify(await button.evaluate((el) => ({ tag: el.tagName, text: el.textContent?.trim(), disabled: el.disabled, ariaDisabled: el.getAttribute("aria-disabled"), ariaBusy: el.getAttribute("aria-busy"), parent: el.parentElement?.outerHTML.slice(0, 250) })))}`);
}

const M = { width: 390, height: 844 }, D = { width: 1440, height: 900 };
try {
  let executablePath;
  try { await access("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"); executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; } catch {}
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  server = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5192", "--strictPort"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Vite did not start on :5192")), 45000);
    const ready = (chunk) => { if (/127\.0\.0\.1:5192/.test(String(chunk))) { clearTimeout(timer); resolve(); } };
    server.stdout.on("data", ready); server.stderr.on("data", ready);
    server.once("exit", () => { clearTimeout(timer); reject(new Error("Vite exited before ready")); });
  });

  for (const vp of [M, D]) await caseRun(`attendance ${vp.width}`, vp, "/lop/demo-6a/buoi-hoc/demo-past", async (page) => {
    const tab = page.getByRole("tab", { name: "Điểm danh" }); if (await tab.count()) await tab.click();
    const group = page.getByRole("group", { name: "Trạng thái của Học sinh 1" });
    const chip = vp.width === 390 ? page.getByRole("button", { name: /Học sinh 1: .*Bấm để đổi/ }) : group.getByRole("button", { name: "Muộn", exact: true });
    const save = page.getByRole("button", { name: "Lưu điểm danh", exact: true });
    await checkButtonState("Attendance opens disabled", save, true);
    await chip.click();
    await checkButtonState("Attendance change enables save", save, false);
    await doubleClickAndMeasure(page, save, `Attendance ${vp.width}`, { expectedOutbox: 8, inPlace: true });
    const groupAfter = page.getByRole("group", { name: "Trạng thái của Học sinh 1" });
    check("Attendance UI changed", vp.width === 390 ? (await page.locator("body").innerText()).includes("Vắng") : await groupAfter.getByRole("button", { name: "Muộn", exact: true }).getAttribute("aria-pressed") === "true", "changed status should remain visible after save");
    if (vp.width === 390) {
      await page.getByRole("button", { name: /Học sinh 1: .*Bấm để đổi/ }).click();
      const before = page.url(); const back = page.getByRole("link", { name: "Quay lại" }).first();
      if (await back.count()) await dirtyNavigation(page, back);
      check("Attendance leave URL unchanged", page.url() === before, "expected stay on session after confirmation");
    }
  });

  for (const vp of [M, D]) await caseRun(`score entry ${vp.width}`, vp, "/lop/demo-6a/bai-kiem-tra/demo-test", async (page) => {
    const input = page.getByRole("textbox", { name: "Điểm Học sinh 1" });
    const save = page.getByRole("button", { name: "Lưu điểm", exact: true });
    await checkButtonState("Score entry opens disabled", save, true);
    await type(input, "10.3");
    await checkButtonState("Invalid half-point keeps save disabled", save, true);
    check("Invalid score guidance visible", (await page.locator("body").innerText()).includes("bước 0,5"), "expected half-step validation message");
    await type(input, "10.5");
    await checkButtonState("Valid score enables save", save, false);
    if (vp.width === 390) await dirtyNavigation(page, page.getByRole("link", { name: "Quay lại" }).first());
    else await dirtyNavigation(page, page.getByRole("link", { name: "Quay lại" }).first());
    await type(input, "10.5");
    await doubleClickAndMeasure(page, save, `Score entry ${vp.width}`, { inPlace: true, returnName: "Lưu điểm" });
  });

  await caseRun("score grid desktop", D, "/lop/demo-6a/diem", async (page) => {
    const input = page.getByRole("textbox", { name: "Điểm Kiểm tra giữa kỳ của Học sinh 1" });
    const save = page.getByRole("button", { name: "Lưu điểm", exact: true });
    await checkButtonState("Score grid opens disabled", save, true);
    await type(input, "10.5"); await checkButtonState("Score grid valid enables save", save, false);
    await doubleClickAndMeasure(page, save, "Score grid", { inPlace: true, returnName: "Lưu điểm" });
  });

  for (const vp of [M, D]) await caseRun(`create class ${vp.width}`, vp, "/lop/moi", async (page) => {
    const save = page.getByRole("button", { name: "Tạo lớp", exact: true });
    await checkButtonState("Create class opens disabled", save, true);
    const name = page.getByRole("textbox", { name: "Tên lớp" }); await type(name, "Lớp kiểm tra save");
    const day = page.getByRole("button", { name: "T2", exact: true }); await day.click();
    await checkButtonState("Create class valid enables save", save, false);
    await type(name, " ");
    await checkButtonState("Create class invalid disables save", save, true);
    check("Create class invalid guidance visible", await page.getByText(/Nhập tên lớp.*chọn ngày học/s).count() > 0, "missing invalid helper");
    await type(name, "Lớp kiểm tra save");
    await doubleClickAndMeasure(page, save, `Create class ${vp.width}`, { closes: true, direct: true, inPlace: true });
  });

  for (const vp of [M, D]) await caseRun(`edit class modal ${vp.width}`, vp, "/lop/demo-6a/buoi-hoc", async (page) => {
    const trigger = page.getByRole("button", { name: vp.width === 390 ? "Tuỳ chọn lớp" : "Thêm tùy chọn", exact: true }).first(); await trigger.click();
    await page.getByRole("menuitem", { name: "Sửa lớp", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Sửa lớp" });
    const save = modal.getByRole("button", { name: "Lưu thay đổi", exact: true });
    await checkButtonState("Edit class opens disabled", save, true);
    await modal.getByRole("button", { name: "Huỷ", exact: true }).click();
    check("Clean edit modal closes immediately", !(await modal.isVisible()), "clean modal should close without a confirmation");
    await trigger.click();
    await page.getByRole("menuitem", { name: "Sửa lớp", exact: true }).click();
    const name = modal.getByRole("textbox", { name: "Tên lớp" }); await type(name, "Lớp 6A sửa");
    await checkButtonState("Edit class change enables save", save, false);
    await dirtyModalClose(page, modal);
    await doubleClickAndMeasure(page, save, `Edit class ${vp.width}`, { closes: true, direct: true, inPlace: true });
  });

  for (const vp of [M, D]) await caseRun(`add student modal ${vp.width}`, vp, "/lop/demo-6a/hoc-sinh", async (page) => {
    await page.getByRole("button", { name: /thêm học sinh/i }).first().click();
    const modal = page.getByRole("dialog", { name: "Thêm học sinh" });
    const save = modal.getByRole("button", { name: "Lưu học sinh", exact: true });
    await checkButtonState("Add student opens disabled", save, true);
    const name = modal.getByRole("textbox", { name: "Họ và tên học sinh" }); await type(name, "Học sinh kiểm tra");
    await checkButtonState("Add student valid enables save", save, false);
    await dirtyModalClose(page, modal, vp.width === 390 ? "escape" : "button");
    await doubleClickAndMeasure(page, save, `Add student ${vp.width}`, { closes: true, direct: true, inPlace: true });
  });

  for (const vp of [M, D]) await caseRun(`comments ticket ${vp.width}`, vp, "/lop/demo-6a/buoi-hoc/demo-past?tab=nhan-xet", async (page) => {
    await page.getByRole("tab", { name: "Nhận xét", exact: true }).click();
    if (vp.width === 390) {
      const row = page.locator("button").filter({ hasText: "Học sinh 1" }).first();
      await row.click();
      const modal = page.getByRole("dialog", { name: /Nhận xét/ });
      await modal.getByRole("group", { name: "Chọn mức sao" }).getByRole("button").nth(2).click();
      await type(modal.locator("textarea#ticket-note"), "Ghi chú kiểm tra.");
      await dirtyModalClose(page, modal, "escape");
      note("Comments ticket dirty-close tested", `viewport=${vp.width}`);
      await doubleClickAndMeasure(page, modal.getByRole("button", { name: "Lưu", exact: true }), `Comments ${vp.width}`, { inPlace: true, closes: true });
    } else {
      // Desktop renders an inline TicketEditor, not the mobile sheet/dialog.
      const editor = page.locator("#desktop-ticket-note");
      await page.getByRole("group", { name: "Chọn mức sao" }).getByRole("button").first().click();
      await type(editor, "Ghi chú kiểm tra desktop.");
      const send = page.getByRole("button", { name: /^Gửi .*phiếu/ }).first();
      await send.click(); // blur saves the edited note, then opens send confirmation
      const confirm = page.getByRole("dialog", { name: /Gửi phiếu buổi/ }).getByRole("button", { name: /^Gửi .*phiếu/ });
      await doubleClickAndMeasure(page, confirm, `Comments ${vp.width} send`, { closes: true });
    }
  }, { draftComment: vp.width === 1440 });

  for (const vp of [M, D]) await caseRun(`homework ${vp.width}`, vp, "/lop/demo-6a/buoi-hoc/demo-past?tab=btvn", async (page) => {
    await page.getByRole("tab", { name: "Bài tập về nhà", exact: true }).click();
    await page.getByRole("tab", { name: "Bài tập hôm nay", exact: true }).click();
    if (vp.width === 390) {
      await page.getByRole("button", { name: /Thêm phần/ }).click();
      const modal = page.getByRole("dialog", { name: "Thêm phần BTVN" });
      const save = modal.getByRole("button", { name: "Lưu phần", exact: true });
      await checkButtonState("Homework opens disabled", save, true);
      await type(modal.getByRole("textbox", { name: "Tiêu đề" }), "Bài tập kiểm tra");
      await checkButtonState("Homework valid enables save", save, false);
      await dirtyModalClose(page, modal, "escape");
      check("Homework sheet stays open after choosing stay", await modal.isVisible(), "sheet should remain available after unsaved-close confirmation");
      await doubleClickAndMeasure(page, save, `Homework ${vp.width}`, { closes: true, inPlace: true });
    } else {
      await page.getByRole("button", { name: /^\+ / }).first().click();
      const form = page.locator("#homework-desktop-form");
      const save = form.getByRole("button", { name: "Lưu phần", exact: true });
      await checkButtonState("Homework desktop opens disabled", save, true);
      await type(form.locator("#hw-desktop-title"), "Bài tập desktop kiểm tra");
      await checkButtonState("Homework desktop valid enables save", save, false);
      await form.getByRole("button", { name: "Hủy", exact: true }).click();
      const guard = await waitDialog(page, /Bài tập chưa lưu/i);
      await guard.getByRole("button", { name: "Ở lại", exact: true }).click();
      check("Homework desktop editor stays open after choosing stay", await form.isVisible(), "editor should remain after unsaved-close confirmation");
      await doubleClickAndMeasure(page, save, `Homework ${vp.width}`, { closes: true, inPlace: true });
    }
  });

  for (const vp of [M, D]) await caseRun(`create test ${vp.width}`, vp, "/lop/demo-6a/bai-kiem-tra/moi", async (page) => {
    const save = page.getByRole("button", { name: "Tạo bài và nhập điểm", exact: true });
    await checkButtonState("New test opens disabled", save, true);
    await type(page.getByRole("textbox", { name: "Tên bài kiểm tra" }), "Bài kiểm tra kiểm thử");
    await checkButtonState("New test valid enables save", save, false);
    await doubleClickAndMeasure(page, save, `New test ${vp.width}`, { closes: true, inPlace: true });
  });

  for (const vp of [M, D]) await caseRun(`archive class ${vp.width}`, vp, "/lop/demo-6a/buoi-hoc", async (page) => {
    const trigger = page.getByRole("button", { name: vp.width === 390 ? "Tuỳ chọn lớp" : "Thêm tùy chọn", exact: true }).first(); await trigger.click();
    await page.getByRole("menuitem", { name: "Lưu trữ lớp", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Lưu trữ lớp Lớp 6A?" });
    check("Archive confirmation visible", await dialog.isVisible(), "expected class archive confirmation");
    const confirm = dialog.getByRole("button", { name: "Lưu trữ", exact: true });
    await doubleClickAndMeasure(page, confirm, `Archive ${vp.width}`, { closes: true, direct: true });
  });

  for (const vp of [M, D]) await caseRun(`change password ${vp.width}`, vp, vp.width === 390 ? "/cai-dat/doi-mat-khau" : "/cai-dat", async (page) => {
    const save = page.getByRole("button", { name: /Lưu mật khẩu mới/ }).first();
    await checkButtonState("Change password opens disabled", save, true);
    const current = page.getByRole("textbox", { name: "Mật khẩu hiện tại" });
    const next = page.getByRole("textbox", { name: "Mật khẩu mới", exact: true }); const confirm = page.getByRole("textbox", { name: "Nhập lại mật khẩu mới", exact: true });
    await type(current, "Demo-Old-Pass!1"); await type(next, "Demo-New-Pass!2"); await type(confirm, "Demo-New-Pass!2");
    await checkButtonState("Change password valid enables save", save, false);
    await doubleClickAndMeasure(page, save, `Change password ${vp.width}`, { direct: true, closes: vp.width === 390, inPlace: true });
  });

  for (const vp of [M, D]) await caseRun(`register ${vp.width}`, vp, "/dang-ky", async (page) => {
    const save = page.getByRole("button", { name: "Tạo không gian làm việc", exact: true });
    await checkButtonState("Register opens disabled", save, true);
    await type(page.getByRole("textbox", { name: "Tên hiển thị" }), "Tài khoản Demo");
    await type(page.getByRole("textbox", { name: "Tên không gian làm việc" }), "Không gian Demo");
    await type(page.getByRole("textbox", { name: "Số điện thoại" }), "900000001");
    await type(page.getByRole("textbox", { name: "Mật khẩu", exact: true }), "Demo-Register!2026");
    await type(page.getByLabel("Nhập lại mật khẩu"), "Demo-Register!2026");
    await checkButtonState("Register valid enables submit", save, false);
    await doubleClickAndMeasure(page, save, `Register ${vp.width}`, { closes: true, direct: true });
  }, { cleanAuth: true });

  // beforeunload uses the platform dialog event, verified while an unsaved score remains.
  await caseRun("beforeunload reload", M, "/lop/demo-6a/bai-kiem-tra/demo-test", async (page) => {
    await type(page.getByRole("textbox", { name: "Điểm Học sinh 1" }), "11");
    let seen = null;
    page.once("dialog", (dialog) => { seen = dialog; void dialog.accept(); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    check("Reload raises beforeunload dialog", Boolean(seen && seen.type() === "beforeunload"), `dialog=${seen?.type?.() ?? "none"}`);
  });
} finally {
  await browser?.close();
  server?.kill();
}

const passed = results.filter((r) => r.result === "PASS").length;
const failed = results.filter((r) => r.result === "FAIL");
const info = results.filter((r) => r.result === "INFO");
const lines = [
  "# UI save behavior check", "",
  `Capture: local mock API at :5192; viewport 390×844 and 1440×900; base HEAD ${process.env.GIT_HEAD ?? "cc493a5"}. Verification included concurrent unstaged A-fix changes in src/features/classes/EditClassModal.tsx and src/features/homework/HomeworkPanel.tsx (not edited by this task). No staging credentials or production data used.`, "",
  `**${passed} pass · ${failed.length} fail · ${info.length} info**`, "",
  "| Result | Type | Assertion / measurement | Evidence |", "|---|---|---|---|",
  ...results.map((r) => `| ${r.result} | ${r.kind} | ${r.label.replaceAll("|", "\\|")} | ${r.detail.replaceAll("|", "\\|").replaceAll("\n", " ")} |`),
  "", "## Failed assertions", "",
  ...(failed.length ? failed.map((r) => `- **${r.kind}** — ${r.label}: ${r.detail}`) : ["No failures."]),
  "", "## Notes", "",
  "Success-label flows: attendance, score entry, score grid, homework, mobile comments-ticket save, create/edit class, add student, create test, and change password; close-after-save flows wait for accessible 'Đã lưu' before asserting closure. Exceptions without that label: ticket send confirmation, archive class, and registration.", "Request totals aggregate across isolated scenarios; per-action request/outbox evidence is recorded in the measurements above. A network batch is counted as one `/sync/push` request and its individual commands are reported separately. Passwords and phone values are fake test inputs and are never printed.", "",
];
await writeFile(RESULT, lines.join("\n"));
console.log(`PASS ${passed}; FAIL ${failed.length}; INFO ${info.length}; results: ${RESULT}`);
for (const r of failed) console.log(`[FAIL:${r.kind}] ${r.label}: ${r.detail}`);
if (failed.length) process.exitCode = 1;
