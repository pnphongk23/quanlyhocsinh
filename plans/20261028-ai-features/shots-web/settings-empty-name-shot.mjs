import { mkdir, readFile } from 'node:fs/promises';
import { chromium, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

// argv: label (before|after), base URL. Xoá display_name khỏi phản hồi đăng nhập và /me để mô phỏng nhân sự chưa có tên.
const label = process.argv[2] ?? 'after';
const base = process.argv[3] ?? 'http://localhost:4173';
const out = new URL('../../20261021-mvp/web/settings-empty-name/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8'))
  .split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
page.setDefaultTimeout(8000);
await page.route(/\/v1\/(me|auth\/login)(\?.*)?$/, async (route) => {
  const response = await route.fetch();
  let body;
  try { body = await response.json(); } catch { return route.fulfill({ response }); }
  if (body?.user) body.user.display_name = '';
  await route.fulfill({ response, json: body });
});
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 1500 }).catch(() => {});
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 20000 });
  await page.goto(`${base}/cai-dat`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const text = (await page.locator('main').first().innerText()).replace(/\s+/g, ' ');
  await page.evaluate(() => {
    const phone = /(?:\+?84|0)[\d .()-]{8,}/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) node.nodeValue = node.nodeValue.replace(phone, '*** ***');
  });
  await page.screenshot({ path: `${out}settings-${label}-390.png`, animations: 'disabled' });
  console.log(JSON.stringify({ label, hasChuaDangNhap: text.includes('Chưa đăng nhập'), hasChuaDatTen: text.includes('Chưa đặt tên'), hasGV: /\bGV\b/.test(text) }));
} finally {
  await browser.close();
}
