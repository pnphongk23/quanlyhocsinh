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
  const rows = page.locator('main button').filter({ hasText: /Giáo viên|Trợ giảng|Admin/ });
  const results = [];
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  for (const [name, pick] of [['self', rows.filter({ hasText: '(bạn)' }).first()], ['other', rows.filter({ hasNotText: '(bạn)' }).first()]]) {
    if (!(await pick.count())) continue;
    await pick.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/dbg-${name}.png` });
    results.push({ name, disabled: await page.getByLabel('Tên hiển thị').isDisabled() });
    await page.evaluate(() => {
      const phone = /(?:\+?84|0)[\d .()-]{8,}/g;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) node.nodeValue = node.nodeValue.replace(phone, '*** ***');
    });
    await page.screenshot({ path: `${out}staff-edit-${name}-${label}-390.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Đóng' }).first().click();
    await page.waitForTimeout(500);
  }
  console.log(JSON.stringify({ label, results }));
} finally {
  await browser.close();
}
