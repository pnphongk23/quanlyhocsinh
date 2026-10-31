import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = "https://eb6ba846.qlh-staging-web.pages.dev";
const credentialPathInput = process.env.QLH_STAGING_CREDENTIAL_FILE ?? "~/.config/qlh/staging-demo.txt";
const credentialPath = credentialPathInput.startsWith("~/") ? path.join(process.env.HOME ?? "", credentialPathInput.slice(2)) : credentialPathInput;
const output = "/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit/after/staging";
const accountLines = (await readFile(credentialPath, "utf8")).split(/\r?\n/);
const accounts = [];
let pendingPhone = "";
for (const line of accountLines) {
  const match = line.match(/^\s*(phone|password)\s*:\s*(.*?)\s*$/i);
  if (!match) continue;
  if (match[1].toLowerCase() === "phone") pendingPhone = match[2];
  else if (pendingPhone) { accounts.push({ phone: pendingPhone, password: match[2] }); pendingPhone = ""; }
}
if (accounts.length < 3) throw new Error("Staging credential file must contain three phone/password pairs. Values are never printed.");

const plans = {
  A: { account: accounts[0], staff: true },
  B: { account: accounts[1], staff: true },
  C: { account: accounts[2], staff: false },
};
const phoneMask = `
(() => {
  const phonePattern = /(?<!\\d)(?:\\+?84|0)(?:[\\s().-]*\\d){8,10}(?!\\d)/g;
  const scrub = () => {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) { const original = node.nodeValue; const masked = original.replace(phonePattern, "•••"); if (masked !== original) node.nodeValue = masked; }
    for (const el of document.querySelectorAll("input,textarea,[aria-label],[title],[placeholder],[alt]")) {
      if ("value" in el && typeof el.value === "string") { const masked = el.value.replace(phonePattern, "•••"); if (masked !== el.value) el.value = masked; }
      for (const attr of ["aria-label","title","placeholder","alt"]) if (el.hasAttribute(attr)) { const original = el.getAttribute(attr); const masked = original.replace(phonePattern, "•••"); if (masked !== original) el.setAttribute(attr, masked); }
    }
  };
  Object.defineProperty(window, "__qlhScrubPhone", { value: scrub });
  new MutationObserver(scrub).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["value","aria-label","title","placeholder","alt"] });
})();`;
const phonePattern = /(?<!\d)(?:\+?84|0)(?:[\s().-]*\d){8,10}(?!\d)/g;
const viewports = [{ name: "390x844", width: 390, height: 844 }, { name: "1440x900", width: 1440, height: 900 }];
const extraRoutes = [
  ["/lop", "classes"], ["/lop/moi", "create-class"], ["/lich", "schedule"],
  ["/ph", "guardian-home"], ["/ph/nhan-xet", "guardian-comments"],
  ["/ph/diem", "guardian-scores"], ["/ph/bao-cao", "guardian-reports"], ["/cai-dat", "settings"],
];
const rows = [];
let stopReason = "";
let sequence = 0;
const launchOptions = { headless: true };
try { await access("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"); launchOptions.executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; } catch {}
const browser = await chromium.launch(launchOptions);

async function capture(page, team, viewport, route, label) {
  await page.evaluate(() => window.__qlhScrubPhone?.());
  const residue = await page.evaluate((pattern) => {
    const re = new RegExp(pattern, "g");
    const values = [document.body.innerText, ...[...document.querySelectorAll("input,textarea,[aria-label],[title],[placeholder],[alt]")].flatMap((el) => [el.value ?? "", el.getAttribute("aria-label") ?? "", el.getAttribute("title") ?? "", el.getAttribute("placeholder") ?? "", el.getAttribute("alt") ?? ""])];
    return values.reduce((count, value) => count + [...String(value).matchAll(re)].length, 0);
  }, phonePattern.source);
  if (residue) throw new Error(`Phone-redaction verification failed for team ${team} (${viewport.name}).`);
  const dir = path.join(output, team, viewport.name);
  await mkdir(dir, { recursive: true });
  const file = `${String(++sequence).padStart(3, "0")}-${label}.png`;
  const image = path.join(dir, file);
  await page.screenshot({ path: image, fullPage: false, animations: "disabled" });
  rows.push({ team, viewport: viewport.name, route, url: page.url(), label, image: `after/staging/${team}/${viewport.name}/${file}`, phoneResidueCount: residue });
}

async function navTo(page, href) {
  await page.goto(new URL(href, base).href, { waitUntil: "commit", timeout: 25000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 15, null, { timeout: 8000 }).catch(() => {});
  if (new URL(page.url()).pathname === "/dang-nhap") throw new Error("Staging session redirected to login; stopping without retry.");
}

async function discoverStaffRoutes(page) {
  await navTo(page, "/lop");
  const hrefs = await page.locator('a[href^="/lop/"]').evaluateAll((els) => els.map((el) => el.getAttribute("href")).filter(Boolean));
  const classHref = hrefs.find((href) => /^\/lop\/[^/]+$/.test(href) && !["/lop/moi", "/lop/archived"].includes(href));
  if (!classHref) return [];
  const id = classHref.split("/")[2];
  const baseClass = `/lop/${id}`;
  const routeRows = [["/lop", "classes"], ["/lop/moi", "create-class"], ["/lich", "schedule"],
    [`${baseClass}/buoi-hoc`, "class-sessions"], [`${baseClass}/hoc-sinh`, "class-students"],
    [`${baseClass}/bai-kiem-tra`, "tests"], [`${baseClass}/diem`, "score-grid"], [`${baseClass}/bao-cao`, "reports"]];
  await navTo(page, `${baseClass}/bai-kiem-tra`);
  const testHrefs = await page.locator(`a[href^="${baseClass}/bai-kiem-tra/"]`).evaluateAll((els) => els.map((el) => el.getAttribute("href")).filter(Boolean));
  const testHref = testHrefs.find((href) => new RegExp(`^${baseClass}/bai-kiem-tra/[^/]+$`).test(href));
  if (testHref) routeRows.push([testHref, "test-scores"]);
  await navTo(page, `${baseClass}/buoi-hoc`);
  const sessionHrefs = await page.locator(`a[href^="${baseClass}/buoi-hoc/"]`).evaluateAll((els) => els.map((el) => el.getAttribute("href")).filter(Boolean));
  const sessionHref = sessionHrefs.find((href) => new RegExp(`^${baseClass}/buoi-hoc/[^/]+$`).test(href));
  if (sessionHref) routeRows.push([sessionHref, "session-detail"]);
  return routeRows;
}

try {
  for (const team of ["A", "B", "C"]) {
    const { account, staff } = plans[team];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(phoneMask);
    const page = await context.newPage();
    page.setDefaultTimeout(9000);
    await page.goto(new URL("/dang-nhap", base).href, { waitUntil: "commit", timeout: 25000 });
    await page.locator("#login-phone").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#login-phone").fill(account.phone);
    await page.locator("#login-password").fill(account.password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForFunction(() => location.pathname !== "/dang-nhap" || /sai|không đúng|thất bại|không thể đăng nhập/i.test(document.body.innerText), null, { timeout: 12000 }).catch(() => {});
    const loginResult = await page.evaluate(() => ({ pathname: location.pathname, loginVisible: !!document.querySelector("#login-phone"), errorVisible: /sai|không đúng|thất bại|không thể đăng nhập/i.test(document.body.innerText) }));
    if (loginResult.loginVisible || loginResult.errorVisible || loginResult.pathname === "/dang-nhap") {
      throw new Error(`Staging login failed at team ${team}, attempt 1; stopped immediately without retry.`);
    }
    let routes = staff ? await discoverStaffRoutes(page) : extraRoutes.filter(([href]) => href.startsWith("/ph") || href === "/cai-dat");
    if (!staff) routes = extraRoutes.filter(([href]) => href.startsWith("/ph"));
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const [href, label] of routes) {
        await navTo(page, href);
        await capture(page, team, viewport, href, label);
      }
      if (viewport.width === 390 && staff) {
        for (const label of ["class-students", "create-class", "test-scores"]) {
          const row = routes.find((item) => item[1] === label);
          if (!row) continue;
          await page.setViewportSize({ width: 375, height: 667 });
          await navTo(page, row[0]);
          await capture(page, team, { name: "375x667", width: 375, height: 667 }, row[0], label);
          await page.setViewportSize({ width: 390, height: 844 });
        }
      }
    }
    await context.close();
  }
} catch (error) {
  stopReason = error instanceof Error ? error.message : "Staging capture stopped.";
}
await browser.close();

const report = `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/compare.md`;
const summary = `\n## Staging\n\nNguồn: ${base}. Đăng nhập từng tài khoản tối đa một lần trong context riêng; chỉ điều hướng GET và chụp, không lưu/tạo/xoá dữ liệu. Số điện thoại được thay bằng ••• trong DOM trước mỗi ảnh; kiểm tra regex sau khi che: 0 kết quả cho mọi ảnh. ${stopReason ? `Kết quả: ${stopReason}` : `Đã chụp ${rows.length} ảnh.`}\n\n| Team | Viewport | Route thật | Màn | Ảnh | Phone residue |\n|---|---|---|---|---|---:|\n${rows.map((row) => `| ${row.team} | ${row.viewport} | \`${row.route}\` | ${row.label} | [ảnh](../shots/ui-audit/${row.image}) | ${row.phoneResidueCount} |`).join("\n") || "| — | — | — | — | — | — |"}\n`;
const oldReport = await readFile(report, "utf8").catch(() => "# UI audit compare\n");
await writeFile(report, `${oldReport.replace(/\n## Staging\n[\s\S]*$/, "").trimEnd()}\n${summary}`);
console.log(`Staging captures: ${rows.length}; phone residue checks passed; compare updated.`);
