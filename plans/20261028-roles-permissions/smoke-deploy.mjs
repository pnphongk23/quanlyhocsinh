// node smoke-deploy.mjs <outDir>; creds from ~/.config/qlh/staging-smoke.txt (never printed); read-only, no register, no staff changes
import { readFile, mkdir } from 'node:fs/promises';
import { chromium, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
const base = 'https://qlh-staging-web.pages.dev';
const out = process.argv[2];
await mkdir(out, { recursive: true });
const c = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await ctx.newPage();
await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 3000 }).catch(() => {});
await page.locator('#login-phone').fill(c.phone);
await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
await page.locator('#login-password').fill(c.password);
await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
await page.waitForURL((u) => !u.pathname.includes('dang-nhap'), { timeout: 20000 });
console.log('after login path:', new URL(page.url()).pathname);
if (page.url().includes('chon-vai-tro')) {
  console.log('role picker:', (await page.getByRole('button').allInnerTexts()).map((t) => t.replace(/\+?\d[\d ]{7,}/g, '***').trim()).filter(Boolean).join(' | '));
  await page.getByText('Quản trị viên').first().click(); await page.waitForTimeout(1500);
}
const mask = () => page.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) n.nodeValue = n.nodeValue.replace(/(\+?84|0)[\d ]{8,}/g, '*** ***'); });
await page.goto(`${base}/cai-dat`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000);
console.log('settings has Nhân sự:', await page.getByText('Nhân sự').first().isVisible().catch(() => false));
await page.getByText('Nhân sự').first().click(); await page.waitForTimeout(2500);
console.log('path:', new URL(page.url()).pathname);
await mask();
console.log('has Thêm nhân sự:', await page.getByRole('button', { name: 'Thêm nhân sự' }).first().isVisible().catch(() => false));
console.log('has matrix text Trợ giảng/Không/Đọc/Sửa:', await page.getByText('Trợ giảng').first().isVisible().catch(() => false), await page.getByText('Đọc').first().isVisible().catch(() => false));
await page.screenshot({ path: `${out}/deploy-smoke-nhan-su-390.png`, fullPage: true });
await browser.close();
