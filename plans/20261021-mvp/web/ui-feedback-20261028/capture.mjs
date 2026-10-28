// node capture.mjs <baseUrl> <outDir>; creds from ~/.config/qlh/staging-smoke.txt (never printed)
import { readFile, mkdir } from 'node:fs/promises';
import { chromium, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
const [base, out] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const c = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await ctx.newPage();
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 5000 }).catch(() => {});
await page.locator('#login-phone').fill(c.phone);
await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
await page.locator('#login-password').fill(c.password);
await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
await page.waitForURL((u) => !u.pathname.includes('dang-nhap'), { timeout: 20000 });
await page.goto(`${base}/lop/${c.class_id}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await shot('00-class');
console.log('buttons:', (await page.getByRole('button').allInnerTexts()).map((t) => t.trim()).filter(Boolean).slice(0, 12).join(' | '));
console.log('aria:', (await page.locator('button[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).join(' | '));
await page.getByRole('button', { name: /tuỳ chọn|menu|thêm|more/i }).first().click().catch((e) => console.log('menu fail', e.message.slice(0, 80)));
await page.waitForTimeout(400); await shot('01-menu');
await page.getByText('Sửa lớp', { exact: true }).first().click();
await page.waitForTimeout(600); await shot('02-sua-lop-sheet');
const d = await page.evaluate(() => {
  const el = document.querySelector('dialog[open]'); const r = el.getBoundingClientRect();
  const fab = document.querySelector('[class*=fab]'); let covered = null;
  if (fab) { const fr = fab.getBoundingClientRect(); const top = document.elementFromPoint(fr.x + fr.width / 2, fr.y + fr.height / 2); covered = top !== fab && !fab.contains(top); }
  const a = document.activeElement;
  return { dialogBottomGap: innerHeight - r.bottom, active: a.tagName + ':' + (a.getAttribute('aria-label') ?? ''), activeFocusVisible: a.matches(':focus-visible'), fabHitTestCovered: covered };
});
console.log(JSON.stringify(d));
await page.getByRole('button', { name: 'Sửa lịch học' }).click();
await page.waitForTimeout(800); await shot('03-sua-lich-hoc');
const e = await page.evaluate(() => {
  const i = document.querySelector('input[type=time]'); const r = i.getBoundingClientRect(); const a = document.activeElement; const dl = document.querySelector('dialog[open]');
  return { inputRight: r.right, vw: innerWidth, active: a.tagName + ':' + (a.getAttribute('aria-label') ?? ''), activeFocusVisible: a.matches(':focus-visible'), scrollW: dl.scrollWidth, clientW: dl.clientWidth };
});
console.log(JSON.stringify(e));
await browser.close();
