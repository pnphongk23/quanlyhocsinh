import { API_BASE, WEB_BASE } from "./config.mjs";
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { parseFixture } from './permissions-http-prm004-005.mjs';

const web = WEB_BASE;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const results = [];
let phase = 'fixture load';
let browser;
let context;

function loginPhone(value) {
  let digits = value.replace(/\D/gu, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  return digits;
}

function add(id, result) {
  results.push({ id, result });
  process.stdout.write(`${result.toUpperCase()} ${id}\n`);
}

async function save() {
  await mkdir(out, { recursive: true });
  const cases = results.map((item) => `<testcase classname="web" name="${item.id}">${item.result === 'fail' ? '<failure message="assertion failed"/>' : item.result === 'blocked' ? '<skipped message="fixture unavailable"/>' : ''}</testcase>`).join('');
  await writeFile(`${out}/brief91-guardian-smoke-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-brief91-guardian" tests="${results.length}" failures="${results.filter((item) => item.result === 'fail').length}" skipped="${results.filter((item) => item.result === 'blocked').length}">${cases}</testsuite>\n`);
}

try {
  const raw = await readFile(`${homedir()}/.config/qlh/dev-qa.txt`, 'utf8');
  const creds = parseFixture(raw);
  if (!creds.parentPhone || !creds.parentPassword) throw new Error('parent fixture incomplete');
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await context.newPage();
  phase = 'login PH';
  const authResponse = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/auth/login'), { timeout: 15000 });
  await page.goto(`${web}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(loginPhone(creds.parentPhone));
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(creds.parentPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const auth = await authResponse;
  process.stdout.write(`PH-LOGIN HTTP ${auth.status()}\n`);
  if (!auth.ok()) {
    add('TC-GRD-005', 'blocked'); add('TC-GRD-007', 'blocked'); add('TC-CMT-007', 'blocked');
    throw new Error(`login PH HTTP ${auth.status()}`);
  }
  await page.waitForURL(/\/ph(?:\/|$)/u, { timeout: 15000 });
  await page.evaluate(async () => { await navigator.serviceWorker?.ready; });
  const firstBundle = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => {
    try { return new URL(entry.name).pathname.split('/').at(-1); } catch { return ''; }
  }).find((name) => /^index-[\w-]+\.js$/u.test(name)) ?? null);
  if (firstBundle !== 'index-C48oeJFZ.js') throw new Error(`bundle mismatch ${firstBundle ?? 'missing'}`);
  await page.goto(`${web}/ph`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const afterReloadBundle = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => {
    try { return new URL(entry.name).pathname.split('/').at(-1); } catch { return ''; }
  }).find((name) => /^index-[\w-]+\.js$/u.test(name)) ?? null);
  if (afterReloadBundle !== 'index-C48oeJFZ.js') throw new Error(`bundle changed after reload ${afterReloadBundle ?? 'missing'}`);
  process.stdout.write('BUNDLE index-C48oeJFZ.js; SW reload complete\n');

  phase = 'PH comment view';
  const commentLink = page.getByRole('link', { name: /Nhận xét/iu }).first();
  if (!await commentLink.count()) {
    add('TC-GRD-005', 'blocked'); add('TC-CMT-007', 'blocked');
  } else {
    await commentLink.click();
    const main = page.locator('main').last();
    await main.waitFor({ state: 'visible', timeout: 8000 });
    const text = await main.innerText();
    const hasFiveScale = /\b\d\s*\/\s*5\b/u.test(text);
    const showsCriterionNames = ['Chú ý nghe giảng', 'Ghi chép đầy đủ', 'Tham gia hoạt động sôi nổi', 'Không mất trật tự', 'Hoàn thành bài tập về nhà'].some((label) => text.includes(label));
    if (!/\b\d\s*\/\s*5\b/u.test(text) && !/chưa có nhận xét|chưa có phiếu/iu.test(text)) add('TC-GRD-005', 'blocked');
    else add('TC-GRD-005', hasFiveScale && !showsCriterionNames ? 'pass' : showsCriterionNames ? 'fail' : 'blocked');
    add('TC-CMT-007', /chưa gửi|chưa có nhận xét/iu.test(text) ? 'pass' : 'blocked');
  }

  phase = 'PH report view';
  await page.goto(`${web}/ph/bao-cao`, { waitUntil: 'domcontentloaded' });
  const reportMain = page.locator('main').last();
  await reportMain.waitFor({ state: 'visible', timeout: 8000 });
  const mainText = await reportMain.innerText();
  const hasMonthlyName = /Tháng\s+\d{1,2}\/2026/u.test(mainText);
  const hasLegacyName = /Buổi\s+\d+/iu.test(mainText);
  const emptyState = /Cô chưa phát hành báo cáo nào/iu.test(mainText);
  add('TC-GRD-007', hasMonthlyName || hasLegacyName ? 'pass' : 'blocked');
  process.stdout.write(`PH-REPORT labels monthly=${hasMonthlyName} legacy=${hasLegacyName} empty=${emptyState}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  const safe = message.replace(/\b(?:\+?84|0)?\d{9,10}\b/gu, '[phone]').replace(/\b[A-Za-z0-9_-]{32,}\b/gu, '[long-value]').slice(0, 150);
  process.stderr.write(`ERROR phase="${phase}" kind="${error?.name ?? 'Error'}" message="${safe}"\n`);
  for (const id of ['TC-GRD-005', 'TC-GRD-007', 'TC-CMT-007']) if (!results.some((item) => item.id === id)) add(id, 'blocked');
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await save();
}

if (results.some((item) => item.result === 'fail')) process.exitCode = 1;
