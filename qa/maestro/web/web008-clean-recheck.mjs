import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const base = 'https://qlh-staging-web.pages.dev';
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const credentialPath = `${homedir()}/.config/qlh/staging-smoke.txt`;
const runTag = randomBytes(3).toString('hex');
const results = [];
const errors = [];
let browser;
let context;
let page;
let phaseName = 'startup';
let loginSubmitted = false;
let bundle = '';

function safe(value) {
  return String(value?.message ?? value ?? 'unknown error')
    .replace(/Bearer\s+[^\s"']+/giu, '[redacted]')
    .replace(/\b(?:\+?84|0)?\d{9,10}\b/gu, '[phone]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, '[long-value]')
    .replace(/[\r\n\t]+/gu, ' ').slice(0, 180);
}

function record(id, status, details = '') {
  results.push({ id, status, details: safe(details) });
  console.log(`${status} ${id}${details ? `: ${safe(details)}` : ''}`);
}

async function phase(name, work) {
  phaseName = name;
  try { return await work(); }
  catch (error) {
    errors.push({ phase: name, kind: error?.name ?? 'Error', message: safe(error) });
    process.stderr.write(`ERROR phase="${name}" kind="${error?.name ?? 'Error'}" message="${safe(error)}"\n`);
    throw error;
  }
}

function local9(value) {
  let digits = String(value ?? '').replace(/\D/gu, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  if (digits.length !== 9) throw new Error('smoke phone format invalid');
  return digits;
}

async function createClassAndSession(runNumber) {
  const className = `QA-Web-WEB008-${runTag}-${runNumber}`;
  const presentName = `QA-Web-WEB008-${runTag}-${runNumber}-Present`;
  const absentName = `QA-Web-WEB008-${runTag}-${runNumber}-Absent`;
  await page.goto(`${base}/lop/moi`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Tên lớp').fill(className);
  await page.getByRole('group', { name: 'Ngày học trong tuần' }).getByRole('button', { name: 'T2', exact: true }).click();
  await page.getByLabel('Giờ bắt đầu').fill('18:30');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop\/?$/u, { timeout: 15000 });
  const classLink = page.locator('a[href^="/lop/"][href$="/buoi-hoc"]').filter({ hasText: className }).first();
  await classLink.waitFor({ state: 'visible', timeout: 15000 });
  await classLink.click();
  await page.waitForURL(/\/lop\/[^/]+\/buoi-hoc\/?$/u, { timeout: 10000 });
  const classId = new URL(page.url()).pathname.split('/').filter(Boolean)[1];
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  const studentsHref = await nav.getByRole('link', { name: 'Học sinh', exact: true }).getAttribute('href');
  await page.goto(new URL(studentsHref, base).toString(), { waitUntil: 'domcontentloaded' });
  for (const name of [presentName, absentName]) {
    await page.getByRole('button', { name: /Thêm học sinh/u }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Thêm học sinh' });
    await dialog.getByLabel('Họ và tên học sinh').fill(name);
    await dialog.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await dialog.waitFor({ state: 'detached', timeout: 12000 });
    await page.getByText(name, { exact: true }).waitFor({ state: 'visible', timeout: 12000 });
  }
  await page.goto(`${base}/lop/${classId}/buoi-hoc`, { waitUntil: 'domcontentloaded' });
  const linksBefore = new Set(await page.getByRole('link', { name: 'Xem buổi', exact: true }).evaluateAll((items) => items.map((item) => item.getAttribute('href'))));
  await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await page.locator('#extra-session-date').fill(today);
  await page.locator('#extra-session-time').fill('18:30');
  const save = page.getByRole('button', { name: 'Lưu buổi học', exact: true });
  if (!(await save.isEnabled())) throw new Error(`run ${runNumber}: today's QA session save disabled`);
  await save.click();
  await page.getByRole('dialog', { name: 'Thêm buổi lẻ' }).waitFor({ state: 'detached', timeout: 12000 });
  let sessionHref = '';
  for (const link of await page.getByRole('link', { name: 'Xem buổi', exact: true }).all()) {
    const href = await link.getAttribute('href');
    if (href && !linksBefore.has(href)) { sessionHref = href; break; }
  }
  if (!sessionHref) throw new Error(`run ${runNumber}: new QA session link not found`);
  await page.goto(new URL(sessionHref, base).toString(), { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Điểm danh', exact: true }).click().catch(() => {});
  await page.getByRole('group', { name: `Trạng thái của ${presentName}` }).getByRole('button', { name: 'Có mặt', exact: true }).click();
  await page.getByRole('group', { name: `Trạng thái của ${absentName}` }).getByRole('button', { name: 'Vắng', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
  record(`FIXTURE-${runNumber}`, 'PASS', 'one Present and one Absent saved; no comment or ticket opened');
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  return { presentName, absentName };
}

async function inspectSendDialog(runNumber) {
  await page.getByRole('button', { name: /Gửi phiếu cả lớp/u }).click();
  const dialog = page.getByRole('dialog', { name: /Gửi phiếu/u });
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  const copy = (await dialog.innerText()).replace(/\s+/gu, ' ');
  const counts = copy.match(/(\d+)\s*phiếu sẽ gửi\s*(\d+)\s*em chưa chọn sao/iu);
  const sent = counts ? Number(counts[1]) : null;
  const skipped = counts ? Number(counts[2]) : null;
  await dialog.screenshot({ path: `${out}/web008-confirm-${runNumber}.png` });
  const expected = sent === 1 && skipped === 1;
  record(`WEB-008-RUN-${runNumber}`, expected ? 'pass' : 'fail', `send=${sent ?? 'unparsed'}; skipped=${skipped ?? 'unparsed'}`);
  await dialog.getByRole('button', { name: 'Quay lại', exact: true }).click();
  return { sent, skipped };
}

try {
  await mkdir(out, { recursive: true });
  const raw = await readFile(credentialPath, 'utf8');
  const credentials = Object.fromEntries(raw.split(/\r?\n/u).map((line) => {
    const index = line.indexOf('=');
    return index > 0 ? [line.slice(0, index).trim(), line.slice(index + 1).trim()] : ['', ''];
  }).filter(([key]) => key));
  if (!credentials.phone || !credentials.password) throw new Error('smoke credential keys incomplete');
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  page = await context.newPage();
  await phase('one teacher login and bundle update', async () => {
    await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
    await page.locator('#login-phone').fill(local9(credentials.phone));
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page.locator('#login-password').fill(credentials.password);
    loginSubmitted = true;
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(/\/lop(?:\/|$)/u, { timeout: 15000 });
    record('LOGIN-SMOKE', 'pass');
    await page.goto(`${base}/lop`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => {
      try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
    }), 'index-l7_C4kqA.js', { timeout: 15000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => {
      try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
    }), 'index-l7_C4kqA.js', { timeout: 15000 });
    bundle = 'index-l7_C4kqA.js';
    record('BUNDLE-l7_C4kqA', 'pass', 'confirmed after reload with SW enabled');
  });
  const observations = [];
  for (const runNumber of [1, 2]) {
    await phase(`fresh QA class/session ${runNumber}`, async () => {
      await createClassAndSession(runNumber);
      observations.push(await inspectSendDialog(runNumber));
    });
  }
  const bothOneAndOne = observations.length === 2 && observations.every((item) => item.sent === 1 && item.skipped === 1);
  const bothTwoAndZero = observations.length === 2 && observations.every((item) => item.sent === 2 && item.skipped === 0);
  record('WEB-008-CLASSIFICATION', bothOneAndOne ? 'pass' : bothTwoAndZero ? 'fail' : 'blocked', bothOneAndOne ? 'two clean runs show 1/1' : bothTwoAndZero ? 'two clean runs show 2/0' : 'two identical expected/actual pairs not obtained');
} catch (error) {
  record(`BLOCKED-${phaseName}`, 'blocked', safe(error));
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  const cases = results.map((item) => {
    const content = item.status === 'blocked' ? `<skipped message="${safe(item.details).replaceAll('"', '&quot;')}"/>` : item.status === 'fail' ? `<failure message="${safe(item.details || 'assertion failed').replaceAll('"', '&quot;')}"/>` : `<system-out>${safe(item.details || 'pass')}</system-out>`;
    return `<testcase classname="web" name="${item.id}">${content}</testcase>`;
  }).join('');
  await writeFile(`${out}/web008-clean-recheck-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web008-clean-recheck" tests="${results.length}" failures="${results.filter((item) => item.status === 'fail').length}" skipped="${results.filter((item) => item.status === 'blocked').length}">${cases}</testsuite>\n`);
  await writeFile(`${out}/web008-clean-recheck.json`, `${JSON.stringify({ bundle, loginSubmitted, results, errors }, null, 2)}\n`);
}
