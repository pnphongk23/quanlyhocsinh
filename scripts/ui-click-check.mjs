import { access, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { entities, identity, sessionFor } from "./ui-audit-fixtures/demo.mjs";
import { mockWriteResponse } from "./ui-audit-fixtures/mock-write-responses.mjs";

const base = "http://127.0.0.1:5191";
const root = process.cwd();
const failureShots = "/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-feedback-20261024/shots/after";
const results = [];
let server;

async function seed(page, role) {
  const session = sessionFor(role);
  await page.addInitScript((value) => localStorage.setItem("qlh.session.v1", JSON.stringify(value)), session);
  await page.goto(base + "/dang-nhap", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ role, identity, entities }) => {
    const req = indexedDB.open("qlh-web");
    const db = await new Promise((resolve, reject) => {
      req.onupgradeneeded = () => {
        const indexes = { classes: ["key", "identity", "id"], students: ["key", "identity", "class_id", "id"], sessions: ["key", "identity", "class_id", "date", "id"], attendance: ["key", "identity", "session_id", "student_id"], tests: ["key", "identity", "class_id", "date", "id"], scores: ["key", "identity", "test_id", "student_id"], slips: ["key", "identity", "session_id", "student_id"], homeworkSections: ["key", "identity", "session_id", "id"], homeworkGrades: ["key", "identity", "section_id", "student_id"], reports: ["key", "identity", "class_id", "student_id", "month"], reportPublications: ["key", "identity", "report_id", "publication_no"], outbox: ["id", "identity", "status", "created_at"], meta: ["key", "identity"] };
        for (const [table, fields] of Object.entries(indexes)) if (!req.result.objectStoreNames.contains(table)) {
          const store = req.result.createObjectStore(table, { keyPath: fields[0] });
          for (const field of fields.slice(1)) store.createIndex(field, field);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const active = role === "guardian" ? "demo-parent:" + identity.workspaceId + ":demo-guardian" : identity.userId + ":" + identity.workspaceId + ":" + identity.membershipId;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(Object.keys(entities), "readwrite");
      for (const [table, rows] of Object.entries(entities)) {
        const entity = table === "homeworkSections" ? "homework_section" : table === "homeworkGrades" ? "homework_grade" : table === "reportPublications" ? "report_publication" : table === "sessions" ? "class_session" : table.replace(/s$/, "");
        for (const row of rows) tx.objectStore(table).put({ ...row, identity: active, key: active + "|" + entity + "|" + (row.id ?? row.session_id + "|" + row.student_id + "|" + (row.test_id ?? "")), entity });
      }
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { role, identity, entities });
}

async function setup(page, role) {
  page.setDefaultTimeout(6000);
    await page.route("**/v1/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.endsWith("/me")) return route.fulfill({ json: sessionFor(role).me });
      const writeResponse = mockWriteResponse(request, entities);
      if (writeResponse) return route.fulfill({ json: writeResponse });
      if (url.pathname === "/v1/sync/snapshot") return route.fulfill({ json: { cursor: 0, epoch: 1, entities: ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report", "report_publication"] } });
    const entity = url.pathname.match(/\/v1\/sync\/snapshot\/([^/]+)$/)?.[1];
    if (entity) {
      const table = ({ class: "classes", student: "students", class_session: "sessions", attendance: "attendance", test: "tests", score: "scores", slip: "slips", homework_section: "homeworkSections", homework_grade: "homeworkGrades", report: "reports", report_publication: "reportPublications" })[entity] ?? entity + "s";
      return route.fulfill({ json: { items: entities[table] ?? [], next_after: null } });
    }
    if (url.pathname === "/v1/sync/pull") return route.fulfill({ json: { cursor: 0, epoch: 1, has_more: false, upserts: {}, deleted: [] } });
    if (url.pathname === "/v1/sync/push" && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      return route.fulfill({ json: { cursor: 0, epoch: 1, results: (body.commands ?? []).map((command) => ({ id: command.id, status: "applied", version: 1 })) } });
    }
    return route.fulfill({ status: 200, json: {} });
  });
  await seed(page, role);
}

async function topAtCenter(locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((el) => {
    let parent = el.parentElement;
    while (parent) {
      if (parent.scrollHeight > parent.clientHeight + 2) {
        const target = el.getBoundingClientRect();
        const area = parent.getBoundingClientRect();
        if (target.bottom > area.bottom) parent.scrollTop += target.bottom - area.bottom + 12;
        else if (target.top < area.top) parent.scrollTop -= area.top - target.top + 12;
        break;
      }
      parent = parent.parentElement;
    }
    el.scrollIntoView({ block: "center", inline: "nearest" });
  });
  // Sheet/dialog trượt vào: chờ vị trí đứng yên (3 khung hình liền) rồi mới đo.
  await locator.evaluate((el) => new Promise((resolve) => {
    let last = "";
    let still = 0;
    const deadline = performance.now() + 3000;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const now = [r.x, r.y, r.width, r.height].map((n) => n.toFixed(1)).join(",");
      still = now === last ? still + 1 : 0;
      last = now;
      if (still >= 3 || performance.now() > deadline) resolve(undefined);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await locator.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
  const box = await locator.boundingBox();
  if (!box) throw new Error("target has no bounding box");
  const pt = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hit = await locator.page().evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return { tag: el?.tagName ?? "none", text: (el?.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60), className: typeof el?.className === "string" ? el.className : "" };
  }, pt);
  const isTarget = await locator.evaluate((el, p) => { const top = document.elementFromPoint(p.x, p.y); return top === el || el.contains(top); }, pt);
  if (!isTarget) {
    const viewport = await locator.page().evaluate(() => ({ width: innerWidth, height: innerHeight, scrollX, scrollY }));
    throw new Error("elementFromPoint blocked click at " + JSON.stringify({ hit, pt, box, viewport }));
  }
  return hit;
}

async function click(locator, label) {
  const hit = await topAtCenter(locator);
  await locator.click({ timeout: 6000 }); // Playwright mouse input; no force or dispatchEvent
  return label + " hit " + hit.tag + "." + hit.className;
}

async function test(title, viewport, role, route, action) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width <= 430 ? 2 : 1, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
  const page = await context.newPage();
  try {
    await setup(page, role);
    await page.goto(base + route, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.trim().length > 10, null, { timeout: 10000 });
    const detail = await action(page);
    results.push({ title, viewport: viewport.width + "x" + viewport.height, result: "PASS", detail });
    } catch (error) {
      const shot = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${viewport.width}.png`;
      await mkdir(failureShots, { recursive: true });
      await page.screenshot({ path: failureShots + "/click-failure-" + shot, fullPage: false }).catch(() => {});
      results.push({ title, viewport: viewport.width + "x" + viewport.height, result: "FAIL", detail: `${error instanceof Error ? error.message : String(error)}; screenshot=${failureShots}/click-failure-${shot}` });
  } finally { await context.close(); }
}

const mobile = { width: 390, height: 844 };
const desktop = { width: 1440, height: 900 };
let browser;
try {
  let executablePath;
  try { await access("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"); executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; } catch {}
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5191", "--strictPort"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Vite did not start on 5191")), 45000);
    const ready = (chunk) => { if (/127\.0\.0\.1:5191/.test(String(chunk))) { clearTimeout(timer); resolve(); } };
    server.stdout.on("data", ready); server.stderr.on("data", ready);
    server.once("exit", () => { clearTimeout(timer); reject(new Error("Vite exited before ready")); });
  });
  for (const viewport of [mobile, desktop]) {
    for (const item of ["Sửa lớp", "Sửa lịch học", "Lưu trữ lớp"]) await test("class menu / " + item, viewport, "staff", "/lop/demo-6a/buoi-hoc", async (page) => {
      const trigger = viewport.width <= 430 ? "Tuỳ chọn lớp" : "Thêm tùy chọn";
      await click(page.getByRole("button", { name: trigger }).first(), "open class menu");
      const hit = await click(page.getByRole("menuitem", { name: item, exact: true }), item);
      if (item === "Sửa lớp") await page.getByRole("dialog").filter({ hasText: "Sửa lớp" }).waitFor({ state: "visible" });
      else if (item === "Sửa lịch học") await page.getByRole("dialog").filter({ hasText: "Sửa lịch học" }).waitFor({ state: "visible" });
      else await page.getByRole("menu").waitFor({ state: "detached" });
      return hit + "; expected UI opened";
      });
      await test("student row menu / mark left", viewport, "staff", "/lop/demo-6a/hoc-sinh", async (page) => {
        const trigger = viewport.width <= 430 ? page.locator('button[aria-label^="Tuỳ chọn Học sinh"]').first() : page.locator('button[aria-label^="Thêm tùy chọn Học sinh"]').first();
        await click(trigger, "open row menu");
      const item = viewport.width <= 430
        ? page.getByRole("button", { name: "Đánh dấu nghỉ", exact: true })
        : page.getByRole("menuitem", { name: "Đánh dấu nghỉ", exact: true });
      if (viewport.width <= 430) await page.waitForTimeout(350);
      const hit = await click(item, "mark left");
      await page.getByText("Đánh dấu học sinh đã nghỉ?", { exact: true }).waitFor({ state: "visible" });
      return hit + "; confirmation opened";
    });
    if (viewport.width > 430) await test("student row menu / edit phone", viewport, "staff", "/lop/demo-6a/hoc-sinh", async (page) => {
      await click(page.locator('button[aria-label^="Thêm tùy chọn Học sinh"]').first(), "open row menu");
      const hit = await click(page.getByRole("menuitem", { name: "Sửa số điện thoại", exact: true }), "edit student phone");
      await page.getByRole("dialog").filter({ hasText: "Sửa số điện thoại" }).waitFor({ state: "visible" });
      return hit + "; phone editor opened";
    });
    if (viewport.width > 430) await test("session row menu / cancel", viewport, "staff", "/lop/demo-6a/buoi-hoc", async (page) => {
        const triggers = page.locator('button[aria-label^="Thêm tùy chọn"]');
        await click(triggers.nth(1), "open session row menu");
        const hit = await click(page.getByRole("menuitem", { name: "Hủy buổi", exact: true }), "cancel session");
        await page.locator('[role="dialog"]').filter({ hasText: "Huỷ buổi học" }).waitFor({ state: "visible" });
        return hit + "; cancel confirmation opened";
      });
      else await test("session menu / cancel", viewport, "staff", "/lop/demo-6a/buoi-hoc/demo-future", async (page) => {
      await click(page.getByRole("button", { name: "Tuỳ chọn buổi học" }), "open session menu");
      const hit = await click(page.getByRole("button", { name: "Huỷ buổi", exact: true }), "cancel session");
        await page.locator('[role="dialog"]').waitFor({ state: "visible" });
      return hit + "; confirmation opened";
      });
      await test("test scores / assign default score", viewport, "staff", "/lop/demo-6a/bai-kiem-tra/demo-test", async (page) => {
        await click(page.getByRole("button", { name: "Gán điểm mặc định", exact: true }), "assign default score");
        const dialog = page.getByRole("dialog", { name: "Gán điểm mặc định?" });
        await dialog.waitFor({ state: "visible" });
        if (!(await dialog.innerText()).includes("ghi đè cả điểm đã nhập")) throw new Error("confirmation does not explain overwrite");
        await click(dialog.getByRole("button", { name: "Huỷ", exact: true }), "cancel default score");
        await dialog.waitFor({ state: "detached" });
        if (await page.getByRole("textbox", { name: "Điểm Học sinh 1" }).inputValue() !== "0") throw new Error("cancel changed a score");
        await click(page.getByRole("button", { name: "Gán điểm mặc định", exact: true }), "reopen default score");
        await dialog.waitFor({ state: "visible" });
        const pushRequest = page.waitForRequest((request) => request.url().endsWith("/sync/push") && request.method() === "POST" && request.postDataJSON().commands.some((command) => command.type === "score.set"));
        const hit = await click(dialog.getByRole("button", { name: "Gán 15 điểm", exact: true }), "confirm default score");
        const request = await pushRequest;
        const commands = request.postDataJSON().commands.filter((command) => command.type === "score.set");
        if (commands.length !== 8 || commands.some((command) => command.payload.value !== 15 || command.payload.test_id !== "demo-test" || !command.payload.student_id || command.base_version !== 1)) throw new Error("score.set payload does not contain the expected test, students, value, or base version");
        await page.waitForResponse((response) => response.request() === request && response.ok());
        await page.getByRole("dialog", { name: "Gán điểm mặc định?" }).waitFor({ state: "detached" });
        await page.getByRole("textbox", { name: "Điểm Học sinh 1" }).waitFor({ state: "visible" });
        if (await page.getByRole("textbox", { name: /Điểm Học sinh/ }).evaluateAll((inputs) => inputs.some((input) => input.value !== "15"))) throw new Error("not every visible score became 15");
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => [...document.querySelectorAll('input[aria-label^="Điểm Học sinh"]')].length === 8 && [...document.querySelectorAll('input[aria-label^="Điểm Học sinh"]')].every((input) => input.value === "15"));
        return hit + "; confirmation accepted and visible scores set to 15";
      });
    }
  for (const item of ["Sửa", "Xoá"]) await test("desktop test row menu / " + item, desktop, "staff", "/lop/demo-6a/bai-kiem-tra", async (page) => {
    await click(page.locator('button[aria-label="Thêm tùy chọn Kiểm tra giữa kỳ"]'), "open test row menu");
    const hit = await click(page.getByRole("menuitem", { name: item, exact: true }), item);
    await page.getByRole("dialog").waitFor({ state: "visible" });
    return hit + "; edit/delete dialog opened";
  });
  await test("desktop test row menu / outside click and Esc", desktop, "staff", "/lop/demo-6a/bai-kiem-tra", async (page) => {
    const trigger = page.locator('button[aria-label="Thêm tùy chọn Kiểm tra giữa kỳ"]');
    await click(trigger, "open test row menu");
    await page.getByRole("menu").waitFor({ state: "visible" });
    await page.mouse.click(2, 2);
    await page.getByRole("menu").waitFor({ state: "detached" });
    await click(trigger, "reopen test row menu");
    await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "detached" });
    if (!(await trigger.evaluate((el) => el === document.activeElement))) throw new Error("focus not returned to trigger");
    return "outside click and Esc close, focus returned";
  });
  for (const viewport of [mobile, desktop]) await test("class menu / outside click and Esc", viewport, "staff", "/lop/demo-6a/buoi-hoc", async (page) => {
    const trigger = viewport.width <= 430 ? page.getByRole("button", { name: "Tuỳ chọn lớp" }) : page.getByRole("button", { name: "Thêm tùy chọn", exact: true });
    await click(trigger, "open class menu");
    await page.mouse.click(2, 2);
    await page.getByRole("menu").waitFor({ state: "detached" });
    await click(trigger, "reopen class menu");
    await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "detached" });
    return "outside click and Esc close";
  });
  await test("desktop class picker / outside click and Esc", desktop, "staff", "/lop/demo-6a/buoi-hoc", async (page) => {
    const picker = page.getByRole("button", { name: /Đang xem lớp/ });
    await click(picker, "open class picker");
    await page.getByRole("listbox").waitFor({ state: "visible" });
    await page.mouse.click(700, 500);
    await page.getByRole("listbox").waitFor({ state: "detached" });
    await click(picker, "reopen class picker");
    await page.keyboard.press("Escape");
    await page.getByRole("listbox").waitFor({ state: "detached" });
    return "outside click and Esc close";
  });
  for (const viewport of [mobile, desktop]) {
    await test("class edit dialog / inner and backdrop", viewport, "staff", "/lop/demo-6a/buoi-hoc", async (page) => {
        const trigger = viewport.width <= 430 ? page.getByRole("button", { name: "Tuỳ chọn lớp" }) : page.getByRole("button", { name: "Thêm tùy chọn", exact: true });
        await click(trigger, "open class menu");
      await click(page.getByRole("menuitem", { name: "Sửa lớp", exact: true }), "edit class");
      const dialog = page.getByRole("dialog").filter({ hasText: "Sửa lớp" });
      await dialog.waitFor({ state: "visible" });
      const button = dialog.getByRole("button", { name: "Huỷ", exact: true });
      const hit = await click(button, "dialog cancel");
      await dialog.waitFor({ state: "hidden" });
      await click(trigger, "reopen class menu");
      await click(page.getByRole("menuitem", { name: "Sửa lớp", exact: true }), "reopen edit class");
      await dialog.waitFor({ state: "visible" });
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: "hidden" });
      return hit + "; backdrop closed on second open";
    });
    await test("student sheet / inner and backdrop", viewport, "staff", "/lop/demo-6a/hoc-sinh", async (page) => {
      await click(page.getByRole("button", { name: /thêm học sinh/i }).first(), "open add sheet");
      const dialog = page.getByRole("dialog").filter({ hasText: "Thêm học sinh" });
      await dialog.waitFor({ state: "visible" });
      const button = dialog.getByRole("button", { name: "Đóng", exact: true });
      const hit = await click(button, "sheet close button");
      await dialog.waitFor({ state: "hidden" });
      await click(page.getByRole("button", { name: /thêm học sinh/i }).first(), "reopen add sheet");
      await dialog.waitFor({ state: "visible" });
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: "hidden" });
      return hit + "; backdrop closed on second open";
    });
    await test("guardian child picker / option and backdrop", viewport, "guardian", "/ph", async (page) => {
      await click(page.locator('button[aria-haspopup="dialog"]').first(), "open child picker");
      const dialog = page.getByRole("dialog").filter({ hasText: "Chọn con" });
      await dialog.waitFor({ state: "visible" });
      await page.waitForTimeout(350);
        const option = dialog.getByRole("button").filter({ hasText: "Học sinh" }).first();
      const hit = await click(option, "select child");
      await dialog.waitFor({ state: "hidden" });
      await click(page.locator('button[aria-haspopup="dialog"]').first(), "reopen child picker");
      await dialog.waitFor({ state: "visible" });
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: "hidden" });
      return hit + "; option selected and backdrop closed on second open";
    });
  }
  await test("desktop sidebar class selector popover", desktop, "staff", "/lop", async (page) => {
    const trigger = page.locator('[aria-haspopup="listbox"],[aria-haspopup="dialog"]').first();
    await click(trigger, "open class selector");
    const option = page.getByRole("option").first();
    const hit = await click(option, "select class");
    return hit + "; class option selected";
  });
  await test("confirm dialog button", mobile, "staff", "/lop/demo-6a/hoc-sinh", async (page) => {
      const trigger = page.locator('button[aria-label^="Tuỳ chọn Học sinh"]').first();
    await click(trigger, "open student menu");
    await click(page.getByRole("button", { name: "Đánh dấu nghỉ", exact: true }), "open confirmation");
    const dialog = page.getByRole("dialog");
    await page.waitForTimeout(350);
    const button = dialog.getByRole("button", { name: "Xác nhận nghỉ học", exact: true });
    const hit = await click(button, "confirm mark left");
    await dialog.waitFor({ state: "hidden" });
    return hit + "; confirmation action completed";
  });
} finally {
  if (browser) await browser.close();
  server?.kill();
}

for (const result of results) console.log("[" + result.result + "] " + result.viewport + " " + result.title + ": " + result.detail);
const failures = results.filter((result) => result.result !== "PASS");
console.log("SUMMARY: " + (results.length - failures.length) + " passed, " + failures.length + " failed");
if (failures.length) process.exitCode = 1;
