import { mkdir, readFile } from 'node:fs/promises';
import { chromium, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

// argv: label (before|after), base URL. Xoá display_name khỏi phản hồi đăng nhập và /me để mô phỏng nhân sự chưa có tên.
const label = process.argv[2] ?? 'after';
const base = process.argv[3] ?? 'http://localhost:4173';
const out = new URL('../../20261021-mvp/web/staff-name-edit/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8'))
  .split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
page.setDefaultTimeout(8000);
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 1500 }).catch(() => {});
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 20000 });
  await page.goto(`${base}/cai-dat/nhan-su`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const self = page.locator('main button').filter({ hasText: '(bạn)' }).first();
  const original = (await self.innerText()).split('\n')[0].replace(' (bạn)', '').trim();
  const log = [];
  page.on('response', (r) => { if (r.request().method() === 'PATCH' && r.url().includes('/staff/')) log.push(r.status()); });
  for (const value of [`${original} 2`, original]) {
    await page.locator('main button').filter({ hasText: '(bạn)' }).first().click();
    await page.getByLabel('Tên hiển thị').fill(value);
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await page.waitForTimeout(2000);
  }
  await page.goto(`${base}/cai-dat`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const text = (await page.locator('main').first().innerText()).replace(/\s+/g, ' ');
  console.log(JSON.stringify({ patchStatuses: log, namePreserved: text.includes(original) }));
} finally {
  await browser.close();
}
