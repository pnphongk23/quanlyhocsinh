import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-${suffix}-Slip-HW-Class`;
const students = ['Sent', 'Draft'].map((part) => `QA-Web-${suffix}-${part}`);
const title = `QA-Web-${suffix}-Reading`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-26/web';
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
const base = WEB_BASE;
const pressed = async (id) => (await page.getByTestId(id).getAttribute('aria-pressed')) === 'true';
async function openSlip(student) {
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(student) }).first().click();
  // Editor của em trước vẫn hiện cho tới khi chọn xong: chờ đúng tên em rồi mới đọc.
  await page.getByRole('heading', { level: 2, name: new RegExp(student) }).waitFor({ state: 'visible', timeout: 8000 });
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
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  console.log('WEB_BUNDLE', await assertConfiguredBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'fixture: class, students';
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
  async function addStudent(student) {
    await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await page.getByLabel('Họ và tên học sinh').fill(student);
    await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await page.getByText(student, { exact: true }).waitFor({ timeout: 12000 });
  }
  await addStudent(students[0]);

  phase = 'fixture: sessions N (yesterday) and N+1 (today)';
  await nav.getByRole('link', { name: 'Buổi học' }).click();
  const listUrl = page.url();
  const sessionN = new Date();
  const sessionN1 = new Date();
  // N is today's recurring session (class is T2, 18:00): already present as the current session.
  await createOneOff(sessionN1, '21:00');

  phase = 'assign homework on N';
  await openSessionFor(sessionN, listUrl);
  await page.getByRole('tab', { name: 'Bài tập về nhà', exact: true }).click();
  await page.getByRole('tab', { name: 'Bài tập hôm nay', exact: true }).click();
  await page.getByRole('button', { name: /Luyện đọc/ }).first().click();
  await page.getByRole('button', { name: 'Luyện đọc', exact: true }).click();
  await page.locator('#hw-desktop-title').fill(title);
  await page.getByRole('button', { name: 'Lưu phần', exact: true }).click();
  await page.getByText(title, { exact: true }).waitFor({ timeout: 12000 });

  phase = 'open N+1 (today 21:00, after N at 18:00)';
  await page.goto(listUrl);
  await openSessionFor(sessionN1, listUrl, '21:00');
  await page.getByRole('tab', { name: 'Điểm danh', exact: true }).click().catch(() => {});
  await page.getByRole('group', { name: `Trạng thái của ${students[0]}` }).getByRole('button', { name: 'Có mặt', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
  await page.waitForTimeout(2000);
  const sessionUrl = page.url();
  console.log('N1_HEADING', (await page.getByRole('main').last().innerText()).split('\n')[0]);

  phase = 'before grading: homework criterion defaults on';
  await openSlip(students[0]);
  const before = await homeworkState();
  rec('CMT-014-default-ungraded', before.on && before.stars === '5' ? 'PASS' : 'FAIL', `on=${before.on} stars=${before.stars}`);

  phase = 'send class slips (only the Sent student is enrolled)';
  await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).click();
  const dialog = page.getByRole('dialog', { name: /^Gửi phiếu .+\?$/ });
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  await dialog.getByRole('button', { name: /^Gửi \d+ phiếu$/ }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  await page.getByTestId('slip-ticket-status').first().waitFor({ timeout: 10000 }).catch(() => {});
  await page.getByText('Đã gửi', { exact: true }).first().waitFor({ timeout: 15000 });

  console.log('AFTER_SEND_HEADING', (await page.getByRole('main').last().innerText()).split('\n')[0]);
  phase = 'add Draft student after the send so only that slip stays unsent';
  await nav.getByRole('link', { name: 'Học sinh' }).click();
  await addStudent(students[1]);
  await page.goto(sessionUrl, { waitUntil: 'domcontentloaded' });
  phase = 'grade previous homework: not completed for both students';
  await page.getByRole('tab', { name: 'Bài tập về nhà', exact: true }).click();
  await page.getByRole('tab', { name: 'Bài tập buổi trước', exact: true }).click();
  await page.getByText('Luyện đọc · cả lớp').waitFor({ timeout: 12000 });
  // Buttons: index 0 is the bulk 'Đánh dấu cả lớp' action; 1 and 2 are the per-student rows.
  const notDone = page.getByRole('button', { name: 'Chưa hoàn thành', exact: true });
  await notDone.nth(1).click();
  await notDone.nth(2).click();
  await page.getByRole('button', { name: 'Lưu kết quả chấm', exact: true }).click();
  await page.getByText('Đã lưu', { exact: true }).first().waitFor({ timeout: 10000 });

  console.log('GRADED', (await page.getByText(/\d\/\d đã chấm/).first().innerText().catch(() => 'n/a')));
  phase = 'sent slip unchanged (CMT-013), draft slip auto-untick (CMT-014)';
  await page.goto(sessionUrl, { waitUntil: 'domcontentloaded' });
  await openSlip(students[0]);
  const sent = await homeworkState();
  const sentStatus = (await page.getByTestId('slip-ticket-status').innerText()).trim();
  rec('CMT-013-sent-unchanged', sentStatus === 'Đã gửi' && sent.on && sent.stars === '5' ? 'PASS' : 'FAIL', `status=${sentStatus} on=${sent.on} stars=${sent.stars}`);
  await openSlip(students[1]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/slip-homework-draft-after-regrade.png`, fullPage: true });
  const draft = await homeworkState();
  const sentence = (await page.getByTestId('slip-generated-comment').evaluate((e) => e.value ?? e.innerText)).trim();
  rec('CMT-014-draft-auto-untick', !draft.on && draft.stars === '4' && /chưa hoàn thành bài tập về nhà/.test(sentence) && draft.auto === 1 ? 'PASS' : 'FAIL', `on=${draft.on} stars=${draft.stars} auto=${draft.auto} sentenceHasHw=${/chưa hoàn thành bài tập về nhà/.test(sentence)}`);

  phase = 'manual tick is kept (CMT-014)';
  await (await hwButton()).click();
  const manual = await homeworkState();
  await page.getByTestId('slip-save-button').click().catch(() => {});
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openSlip(students[1]);
  const kept = await homeworkState();
  rec('CMT-014-manual-kept', manual.on && kept.on && kept.auto === 0 ? 'PASS' : 'FAIL', `afterTick=${manual.on} afterReload=${kept.on} autoLabel=${kept.auto}`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: `${out}/slip-homework-regrade-failure.png`, fullPage: true }).catch(() => {});
  console.log(`${message.startsWith('fixture_missing:') ? 'BLOCKED' : 'FAIL'} CMT-013/014 at ${phase}: ${message.slice(0, 300)}`);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
