import { mkdir, readFile } from 'node:fs/promises';
import { chromium, devices, webkit } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

// argv: engine (chromium|webkit), base URL (default local preview)
const engineName = process.argv[2] ?? 'chromium';
const base = process.argv[3] ?? 'http://localhost:4173';
const out = new URL('../../20261021-mvp/web/guardian-schedule/', import.meta.url).pathname;
await mkdir(out, { recursive: true });

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-qa-ios-guardian.txt`, 'utf8'))
  .split(/\r?\n/)
  .map((line) => { const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', '']; })
  .filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('QA credentials are incomplete.');

const browser = engineName === 'webkit'
  ? await webkit.launch({ headless: true })
  : await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
  timezoneId: 'Asia/Ho_Chi_Minh',
});
const page = await context.newPage();
page.setDefaultTimeout(8000);
let consoleErrorCount = 0;
const network = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrorCount++; });
page.on('pageerror', () => { consoleErrorCount++; });
const pathOf = (url) => { try { return new URL(url).pathname; } catch { return 'invalid'; } };
page.on('requestfailed', (r) => network.push({ kind: 'failed', method: r.method(), path: pathOf(r.url()), error: r.failure()?.errorText ?? null }));
page.on('response', (r) => { if (r.status() >= 400) network.push({ kind: 'status', path: pathOf(r.url()), status: r.status() }); });

async function settle() { await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1200); }
async function view(w) { await page.setViewportSize({ width: w, height: w === 390 ? 844 : 1000 }); await page.waitForTimeout(300); }
async function shot(name, w) {
  await page.evaluate(() => {
    const phone = /(?:\+?84|0)[\d .()-]{8,}/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) node.nodeValue = node.nodeValue.replace(phone, '*** ***');
  });
  const file = `${name}-${w}-${engineName}.png`;
  await page.screenshot({ path: `${out}${file}`, fullPage: true, animations: 'disabled' });
  return file;
}

const shots = [];
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 1500 }).catch(() => {});
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 20000 });
  await page.goto(`${base}/ph`, { waitUntil: 'domcontentloaded' });
  await settle();
  for (const w of [390, 1440]) {
    await view(w);
    await page.goto(`${base}/ph`, { waitUntil: 'domcontentloaded' });
    await settle();
    shots.push(await shot('home-upcoming', w));
    await page.goto(`${base}/ph/lich`, { waitUntil: 'domcontentloaded' });
    await settle();
    shots.push(await shot('schedule-month', w));
    await page.getByRole('tab', { name: 'Ngày' }).click();
    await settle();
    shots.push(await shot('schedule-day', w));
    // Tháng ngoài cửa sổ snapshot: đi lùi 5 tháng để buộc gọi GET /calendar.
    await page.getByRole('tab', { name: 'Tháng' }).click();
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Tháng trước' }).click();
    await settle();
    shots.push(await shot('schedule-month-outside-window', w));
  }
  console.log(JSON.stringify({ engine: engineName, shots, consoleErrorCount, network }));
} finally {
  await browser.close();
}
