import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `AAA-QA-${suffix}-HW`;
const students = ['HS1', 'HS2', 'HS3'].map((part) => `AAA-QA-${suffix}-${part}`);
const title = `AAA-QA-${suffix}-Reading`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-26/web';
// Fixture only: S1 18:00 (no homework), S2 21:00 (homework assigned, drafts), S3 22:00 (one sent slip, drafts, gradeable previous homework).
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
let phase = 'teacher login';
const diagnostics = [];

function safeUrl(raw) {
  try {
    const url = new URL(raw);
    const path = url.pathname
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
      .replace(/\b\d{9,16}\b/g, ':redacted');
    return `${url.origin}${path}`;
  } catch {
    return '[invalid-url]';
  }
}

function safeConsoleText(raw) {
  return raw
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/(["']?(?:token|authorization|password|phone|email|body)["']?\s*[:=]\s*)(["'][^"']*["']|[^\s,;}]+)/gi, '$1[redacted]')
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[email]')
    .replace(/\b(?:\+?\d[\d ()-]{8,}\d)\b/g, '[number]')
    .slice(0, 500);
}

page.on('console', (message) => diagnostics.push({ kind: 'console', level: message.type(), text: safeConsoleText(message.text()) }));
page.on('pageerror', (error) => diagnostics.push({ kind: 'pageerror', text: safeConsoleText(error.message) }));
page.on('request', (request) => diagnostics.push({ kind: 'request', method: request.method(), resource: request.resourceType(), url: safeUrl(request.url()) }));
page.on('requestfailed', (request) => diagnostics.push({ kind: 'requestfailed', method: request.method(), resource: request.resourceType(), url: safeUrl(request.url()), error: safeConsoleText(request.failure()?.errorText ?? 'unknown') }));
page.on('response', (response) => {
  if (response.status() >= 400) diagnostics.push({ kind: 'http-error', status: response.status(), method: response.request().method(), resource: response.request().resourceType(), url: safeUrl(response.url()) });
});

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function label(date) {
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

async function createOneOff(date, time = '18:00') {
  await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
  await page.locator('#extra-session-date').fill(iso(date));
  await page.locator('#extra-session-time').fill(time);
  const save = page.getByRole('button', { name: 'Lưu buổi học', exact: true });
  if (!(await save.isEnabled())) throw new Error(`fixture_missing: could not create future session ${iso(date)}`);
  await save.click();
  await page.getByRole('dialog', { name: 'Thêm buổi lẻ' }).waitFor({ state: 'detached', timeout: 12000 });
}

async function openSessionFor(date, sessionListUrl, time = '18:00') {
  const expected = `${date.getDate()}/${date.getMonth() + 1} · ${time}`;
  await page.getByRole('link', { name: 'Xem buổi', exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1500);
  const count = await page.getByRole('link', { name: 'Xem buổi', exact: true }).count();
  for (let index = 0; index < count; index++) {
    await page.getByRole('link', { name: 'Xem buổi', exact: true }).nth(index).click();
    await page.waitForURL(/\/buoi-hoc\/[^/]+/, { timeout: 8000 });
    await page.getByRole('main').last().getByText(/· \d{1,2}\/\d{1,2} ·/).first().waitFor({ timeout: 8000 }).catch(() => {});
    const text = await page.getByRole('main').last().innerText();
    if (text.split('\n')[0].includes(`· ${expected}`)) return;
    await page.goto(sessionListUrl);
  }
  throw new Error(`fixture_missing: no session detail matched ${expected}`);
}

const rec = (id, status, note = '') => console.log(`${status} ${id}${note ? ': ' + note : ''}`);
const base = 'https://qlh-staging-web.pages.dev';
const pressed = async (id) => (await page.getByTestId(id).getAttribute('aria-pressed')) === 'true';
async function openSlip(student) {
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(student) }).first().click();
  await page.getByTestId('slip-homework-row').waitFor({ state: 'visible', timeout: 8000 });
}
async function hwButton() {
  const row = page.getByTestId('slip-homework-row');
  return (await row.getAttribute('aria-pressed')) !== null ? row : row.getByRole('button').first();
}
async function homeworkState() {
  const b = await hwButton();
  const stars = ((await page.getByTestId('slip-star-panel').innerText()).match(/(\d)\/5/) || [])[1];
  return { on: (await b.getAttribute('aria-pressed')) === 'true', stars, auto: await page.getByTestId('slip-homework-auto-label').count() };
}
async function markAttendance(names) {
  await page.getByRole('tab', { name: 'Điểm danh', exact: true }).click().catch(() => {});
  for (const n of names) await page.getByRole('group', { name: `Trạng thái của ${n}` }).getByRole('button', { name: 'Có mặt', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
  await page.waitForTimeout(2000);
}
async function addStudent(name) {
  await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
  await page.getByLabel('Họ và tên học sinh').fill(name);
  await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
  await page.getByText(name, { exact: true }).waitFor({ timeout: 12000 });
}
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'class and first student';
  await page.goto(`${base}/lop/moi`);
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await page.getByRole('button', { name: 'T2', exact: true }).click();
  await page.locator('input[type=time]').fill('18:00');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop\/?$/, { timeout: 15000 });
  await page.goto(`${base}/lop`);
  await page.getByRole('link', { name: new RegExp(className) }).last().click();
  await page.waitForURL(/\/lop\/[^/]+(?:\/buoi-hoc)?$/, { timeout: 15000 });
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Học sinh' }).click();
  await addStudent(students[0]);

  phase = 'sessions S2 (21:00) and S3 (22:00) today';
  await nav.getByRole('link', { name: 'Buổi học' }).click();
  const listUrl = page.url();
  const today = new Date();
  await createOneOff(today, '22:00');
  await openSessionFor(today, listUrl, '22:00');
  const s3Url = page.url();
  await page.goto(listUrl);
  await createOneOff(today, '21:00');
  await openSessionFor(today, listUrl, '21:00');
  const s2Url = page.url();

  phase = 'S2 homework and attendance';
  await page.goto(s2Url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Bài tập về nhà', exact: true }).click();
  await page.getByRole('tab', { name: 'Bài tập hôm nay', exact: true }).click();
  await page.getByRole('button', { name: /Luyện đọc/ }).first().click();
  await page.getByRole('button', { name: 'Luyện đọc', exact: true }).click();
  await page.locator('#hw-desktop-title').fill(title);
  await page.getByRole('button', { name: 'Lưu phần', exact: true }).click();
  await page.getByText(title, { exact: true }).waitFor({ timeout: 12000 });

  phase = 'S3 attendance and send the only enrolled student';
  await page.goto(s3Url, { waitUntil: 'domcontentloaded' });
  await markAttendance([students[0]]);
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).click();
  { const dialog = page.getByRole('dialog', { name: /^Gửi phiếu .+\?$/ });
    await dialog.waitFor({ state: 'visible', timeout: 8000 });
    await dialog.getByRole('button', { name: /^Gửi \d+ phiếu$/ }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15000 });
    await page.waitForFunction(() => /Đã gửi/.test(document.body.innerText), null, { timeout: 15000 }); }
  await page.waitForTimeout(2500);

  phase = 'add HS2 and HS3, attendance on S2 and S3';
  await page.goto(listUrl);
  await nav.getByRole('link', { name: 'Học sinh' }).click();
  await addStudent(students[1]);
  await addStudent(students[2]);
  for (const url of [s2Url, s3Url]) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await markAttendance(url === s2Url ? students : students.slice(1));
  }
  console.log('FIXTURE_READY class=' + className + ' students=' + students.join(',') + ' hw=' + title + ' S1=18:00(no hw) S2=21:00(hw) S3=22:00(HS1 sent)');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: `${out}/ios-fixture2-failure.png`, fullPage: true }).catch(() => {});
  console.log(`FAIL fixture at ${phase}: ${message.slice(0, 300)}`);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
