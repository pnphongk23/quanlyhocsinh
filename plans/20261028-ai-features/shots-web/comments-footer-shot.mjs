import { mkdir, readFile } from 'node:fs/promises';
import { chromium, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

// argv: label (before|after), base URL
const label = process.argv[2] ?? 'after';
const base = process.argv[3] ?? 'http://localhost:4173';
const out = new URL('../../20261021-mvp/web/notes-import-hidden/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8'))
  .split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const results = [];
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 1500 }).catch(() => {});
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 20000 });
  await page.goto(`${base}/lop`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/lop/"][href$="/buoi-hoc"]').length > 0, { timeout: 8000 }).catch(() => {});
  const links = page.locator('a[href^="/lop/"][href$="/buoi-hoc"]');
  let classLink = links.first();
  for (let i = 0; i < await links.count(); i++) {
    if (/\b[1-9]\d* học sinh/.test(await links.nth(i).innerText())) { classLink = links.nth(i); break; }
  }
  const classPath = await classLink.getAttribute('href');
  await page.goto(`${base}${classPath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const pastLink = page.locator('section[aria-labelledby="past-sessions-heading"] a[href*="/buoi-hoc/"]').first();
  const sessionLink = await pastLink.count()
    ? await pastLink.getAttribute('href')
    : await page.locator(`a[href^="${classPath.replace(/\/buoi-hoc$/, '')}/buoi-hoc/"]`).first().getAttribute('href');
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}${sessionLink}?tab=nhan-xet`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const metrics = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')].filter((b) => /Nhập từ ghi chú|Gán|Gửi/.test(b.textContent ?? ''));
      return {
        docOverflow: document.documentElement.scrollWidth > window.innerWidth,
        buttons: buttons.map((b) => {
          const r = b.getBoundingClientRect();
          return { label: (b.textContent ?? '').trim().slice(0, 24), left: Math.round(r.left), right: Math.round(r.right), clipped: r.right > window.innerWidth + 0.5 || b.scrollWidth > b.clientWidth + 1 };
        }),
      };
    });
    results.push({ width, ...metrics });
    await page.screenshot({ path: `${out}comments-${label}-${width}.png`, animations: 'disabled' });
  }
  console.log(JSON.stringify({ label, results }));
} finally {
  await browser.close();
}
