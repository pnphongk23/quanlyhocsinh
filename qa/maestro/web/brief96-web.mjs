import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-${suffix}-B96-Class`;
const students = ['S1-Sent', 'S2-Auto', 'S3-Manual', 'S4-Cold', 'S5-Absent'].map((part) => `QA-Web-${suffix}-${part}`);
const guardianPhone = '+84' + String(7 + Math.floor(Math.random() * 3)) + String(Math.floor(10000000 + Math.random() * 89999999));
const title = `QA-Web-${suffix}-Reading`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-26/web';
const NOTE = `QA-note-${suffix}`;
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

const failures = [];
async function check(id, fn) {
  try { await fn(); } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    rec(id, 'FAIL', `exception at ${phase}: ${message.slice(0, 200)}`);
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: `${out}/brief96-${id}-failure.png`, fullPage: true }).catch(() => {});
  }
}
const sentenceBox = () => page.getByTestId('slip-generated-comment');
const sentence = async () => (await sentenceBox().evaluate((e) => e.value ?? e.innerText)).trim();
const CRIT = [
  ['chú ý nghe giảng', 'chưa chú ý nghe giảng'],
  ['ghi bài đầy đủ', 'chưa ghi bài đầy đủ'],
  ['tích cực tham gia các hoạt động trong lớp', 'chưa tích cực tham gia hoạt động'],
  ['ngồi học ngoan ngoãn, không mất trật tự', 'còn mất trật tự'],
  ['hoàn thành tốt bài tập về nhà', 'chưa hoàn thành bài tập về nhà'],
];
function join(items) { return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} và ${items.at(-1)}`; }
function expectedSentence(mask) {
  const good = CRIT.filter((_, i) => mask[i]).map(([g]) => g);
  const bad = CRIT.filter((_, i) => !mask[i]).map(([, b]) => b);
  let s = 'Con ';
  if (good.length && bad.length) s += `${join(good)}, nhưng ${join(bad)}`;
  else s += join(good.length ? good : bad);
  return `${s}.`;
}
async function critOn(i) {
  const el = page.getByTestId(i === 4 ? 'slip-homework-row' : `slip-criterion-${i}`);
  const target = (await el.getAttribute('aria-pressed')) !== null ? el : el.getByRole('button').first();
  return { target, on: (await target.getAttribute('aria-pressed')) === 'true' };
}
async function setMask(mask) {
  for (let i = 0; i < 5; i += 1) { const c = await critOn(i); if (c.on !== Boolean(mask[i])) await c.target.click(); }
}
async function settle() {
  const btn = page.getByTestId('slip-save-button');
  if (await btn.count() && await btn.isEnabled().catch(() => false)) await btn.click().catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-testid="slip-save-status"]')?.getAttribute('data-save-state') === 'saved', null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);
}
async function slipState() {
  const stars = ((await page.getByTestId('slip-star-panel').innerText()).match(/(\d)\/5/) || [])[1];
  const hw = await critOn(4);
  return { stars, hw: hw.on, auto: await page.getByTestId('slip-homework-auto-label').count(), autoText: (await page.getByTestId('slip-homework-auto-label').first().innerText().catch(() => '')).trim(), status: (await page.getByTestId('slip-ticket-status').first().innerText().catch(() => '')).trim(), sentence: await sentence(), note: await page.getByTestId('slip-note').inputValue() };
}
async function gradeAll(buttonName, count) {
  await page.getByRole('tab', { name: 'Bài tập về nhà', exact: true }).click();
  await page.getByRole('tab', { name: 'Bài tập buổi trước', exact: true }).click();
  await page.getByText(/Luyện đọc · cả lớp/).waitFor({ timeout: 12000 });
  const b = page.getByRole('button', { name: buttonName, exact: true });
  for (let i = 1; i <= count; i += 1) await b.nth(i).click();
  await page.getByRole('button', { name: 'Lưu kết quả chấm', exact: true }).click();
  await page.getByText('Đã lưu', { exact: true }).first().waitFor({ timeout: 10000 });
}
async function markAttendance(names, statusFor) {
  await page.getByRole('tab', { name: 'Điểm danh', exact: true }).click().catch(() => {});
  for (const n of names) await page.getByRole('group', { name: `Trạng thái của ${n}` }).getByRole('button', { name: statusFor(n), exact: true }).click();
  await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
  await page.waitForTimeout(2000);
}
async function addStudent(name, parent) {
  await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
  await page.getByLabel('Họ và tên học sinh').fill(name);
  if (parent) await page.getByLabel(/Số điện thoại phụ huynh/).fill(parent);
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

  phase = 'fixture: class + S1';
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
  await nav.getByRole('link', { name: 'Buổi học' }).click();
  const listUrl = page.url();
  const today = new Date();
  await createOneOff(today, '21:00');
  await createOneOff(today, '22:00');

  phase = 'N: attendance, label without previous homework (CMT-023), homework';
  await openSessionFor(today, listUrl);
  const nUrl = page.url();
  // TC-ATT-001/015 on N with a single student first (only S1 exists).
  await check('ATT-015', async () => {
    const g = page.getByRole('group', { name: `Trạng thái của ${students[0]}` });
    const names = await g.getByRole('button').allInnerTexts();
    const noExtra = (await page.getByLabel(/giờ đến|Ghi chú điểm danh/i).count()) === 0 && (await page.getByText(/Có phép/).count()) === 0;
    await g.getByRole('button', { name: 'Muộn', exact: true }).click();
    const lateNoFields = (await page.locator('input[type=time]').count()) === 0 && (await page.getByPlaceholder(/ghi chú/i).count()) === 0;
    await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Điểm danh', exact: true }).click().catch(() => {});
    const kept = (await page.getByRole('group', { name: `Trạng thái của ${students[0]}` }).getByRole('button', { name: 'Muộn', exact: true }).getAttribute('aria-pressed')) === 'true';
    rec('ATT-001/015-web', names.join('|') === 'Có mặt|Muộn|Vắng' && noExtra && lateNoFields && kept ? 'PASS' : 'FAIL', `buttons=${names.join('|')} noCoPhep=${noExtra} lateNoFields=${lateNoFields} keptAfterReload=${kept}`);
  });
  await check('CMT-023-N', async () => {
    const tabs = await page.getByRole('tab').allInnerTexts();
    const order = tabs.filter((t) => ['Điểm danh', 'Bài tập về nhà', 'Nhận xét'].includes(t.trim())).map((t) => t.trim());
    rec('ATT-010-tab-order', order.join('>') === 'Điểm danh>Bài tập về nhà>Nhận xét' ? 'PASS' : 'FAIL', order.join('>'));
    await openSlip(students[0]);
    const st = await slipState();
    rec('CMT-023-no-previous', /Buổi trước chưa có BTVN/.test(st.autoText) && st.hw && st.stars === '5' ? 'PASS' : 'FAIL', `label=${st.autoText} on=${st.hw} stars=${st.stars}`);
    const generated = (await page.getByText('Tự sinh theo tiêu chí').count()) === 0;
    rec('CMT-005-no-auto-label', generated ? 'PASS' : 'FAIL', `autoLabelText=${!generated}`);
  });
  phase = 'assign homework on N';
  await page.goto(nUrl);
  await page.getByRole('tab', { name: 'Bài tập về nhà', exact: true }).click();
  await page.getByRole('tab', { name: 'Bài tập hôm nay', exact: true }).click();
  await page.getByRole('button', { name: /Luyện đọc/ }).first().click();
  await page.getByRole('button', { name: 'Luyện đọc', exact: true }).click();
  await page.locator('#hw-desktop-title').fill(title);
  await page.getByRole('button', { name: 'Lưu phần', exact: true }).click();
  await page.getByText(title, { exact: true }).waitFor({ timeout: 12000 });

  phase = 'N+1: S1 present, send (only S1 enrolled)';
  await page.goto(listUrl);
  await openSessionFor(today, listUrl, '21:00');
  const n1Url = page.url();
  await markAttendance([students[0]], () => 'Có mặt');
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).click();
  { const dialog = page.getByRole('dialog', { name: /^Gửi phiếu .+\?$/ });
    await dialog.waitFor({ state: 'visible', timeout: 8000 });
    await dialog.getByRole('button', { name: /^Gửi \d+ phiếu$/ }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15000 });
    await page.waitForFunction(() => /Đã gửi/.test(document.body.innerText), null, { timeout: 15000 }); }
  await page.waitForTimeout(2500);

  phase = 'add S2..S5 (S4 declared parent phone), attendance N+1 and N+2';
  await nav.getByRole('link', { name: 'Học sinh' }).click();
  for (const [i, name] of students.slice(1).entries()) await addStudent(name, i === 2 ? guardianPhone : undefined);
  await writeFile('/tmp/b96-guardian-phone.txt', guardianPhone);
  for (const t of ['21:00', '22:00']) {
    await page.goto(listUrl);
    await openSessionFor(today, listUrl, t);
    if (t === '21:00') { /* url re-read below */ }
    await markAttendance(students.filter((n) => t === '22:00' || n !== students[0]), (n) => (n === students[4] ? 'Vắng' : 'Có mặt'));
    if (t === '21:00') console.log('N1_URL_OK');
  }

  phase = 'S3 manual tick + note, S2 note-free; then regrade (CMT-020)';
  await page.goto(n1Url, { waitUntil: 'domcontentloaded' });
  await openSlip(students[2]);
  { const hw = await critOn(4); await hw.target.click(); await hw.target.click(); }
  await page.getByTestId('slip-note').fill(NOTE);
  await settle();
  const manualBefore = await slipState();
  rec('CMT-020-setup-manual', manualBefore.hw && manualBefore.auto === 0 && manualBefore.note === NOTE ? 'PASS' : 'FAIL', `hw=${manualBefore.hw} auto=${manualBefore.auto}`);
  await gradeAll('Chưa hoàn thành', 3);
  await page.goto(n1Url, { waitUntil: 'domcontentloaded' });
  const snap = {};
  for (const [k, n] of [['S1', students[0]], ['S2', students[1]], ['S3', students[2]]]) { await openSlip(n); await page.waitForTimeout(2500); snap[k] = await slipState(); }
  await check('CMT-020', async () => {
    const okAuto = !snap.S2.hw && snap.S2.stars === '4' && /chưa hoàn thành bài tập về nhà/.test(snap.S2.sentence) && snap.S2.auto === 1;
    const okManual = snap.S3.hw && snap.S3.stars === '5' && snap.S3.auto === 0 && snap.S3.note === NOTE;
    const okSent = snap.S1.status === 'Đã gửi' && snap.S1.hw && snap.S1.stars === '5';
    rec('CMT-020-draft-auto', okAuto ? 'PASS' : 'FAIL', JSON.stringify({ hw: snap.S2.hw, stars: snap.S2.stars, auto: snap.S2.auto }));
    rec('CMT-020-manual-kept', okManual ? 'PASS' : 'FAIL', JSON.stringify({ hw: snap.S3.hw, stars: snap.S3.stars, auto: snap.S3.auto }));
    rec('CMT-020-sent-unchanged', okSent ? 'PASS' : 'FAIL', JSON.stringify({ status: snap.S1.status, hw: snap.S1.hw, stars: snap.S1.stars }));
  });
  await check('CMT-020-next-only', async () => {
    await page.goto(listUrl);
    await openSessionFor(today, listUrl, '22:00');
    await openSlip(students[1]);
    const st = await slipState();
    rec('CMT-020-N+2-untouched', st.hw && st.stars === '5' ? 'PASS' : 'FAIL', JSON.stringify({ hw: st.hw, stars: st.stars }));
  });
  await check('CMT-020-regrade-back', async () => {
    await page.goto(n1Url, { waitUntil: 'domcontentloaded' });
    await gradeAll('Hoàn thành', 3);
    await page.goto(n1Url, { waitUntil: 'domcontentloaded' });
    await openSlip(students[1]);
    await page.waitForTimeout(2500);
    const st = await slipState();
    rec('CMT-020-regrade-back', st.hw && st.stars === '5' ? 'PASS' : 'FAIL', JSON.stringify({ hw: st.hw, stars: st.stars }));
    await gradeAll('Chưa hoàn thành', 3);
  });

  phase = 'CMT-018 hand-edit sentence, overwrite on toggle, note kept';
  await check('CMT-018', async () => {
    await page.goto(n1Url, { waitUntil: 'domcontentloaded' });
    await openSlip(students[1]);
    await page.waitForTimeout(2500);
    const hand = `QA-câu sửa tay ${suffix}`;
    await sentenceBox().fill(hand);
    await page.getByTestId('slip-note').fill(NOTE);
    await sentenceBox().blur();
    await settle();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openSlip(students[1]);
    const kept = await slipState();
    const crit0 = await critOn(0);
    await crit0.target.click();
    const after1 = await sentence();
    await settle();
    await crit0.target.click();
    const after2 = await sentence();
    await settle();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openSlip(students[1]);
    const final = await slipState();
    const st = await slipState();
    rec('CMT-018-hand-edit-saved', kept.sentence === hand && kept.note === NOTE ? 'PASS' : 'FAIL', `sentenceKept=${kept.sentence === hand} noteKept=${kept.note === NOTE}`);
    rec('CMT-018-overwrite-on-toggle', !after1.includes('QA-câu') && !after2.includes('QA-câu') && after1 !== after2 && final.note === NOTE ? 'PASS' : 'FAIL', `afterUntick=${!after1.includes('QA-câu')} afterRetick=${!after2.includes('QA-câu')} noteKept=${final.note === NOTE} persisted=${final.sentence === after2}`);
    void st;
  });

  phase = 'CMT-019 sentence matrix on web';
  await check('CMT-019', async () => {
    const masks = [[1,1,1,1,1],[1,1,1,0,1],[0,0,0,0,0],[1,1,0,0,0],[0,0,0,0,1],[1,0,1,0,1],[0,1,1,1,0],[1,1,1,1,0]];
    const bad = [];
    for (const m of masks) { await setMask(m); const got = await sentence(); const want = expectedSentence(m); if (got !== want) bad.push(`${m.join('')}: got=${got} want=${want}`); }
    rec('CMT-019-web-matrix', bad.length === 0 ? 'PASS' : 'FAIL', bad.length ? bad.slice(0, 2).join(' || ') : `${masks.length} masks match spec`);
    rec('CMT-019-cross-platform', 'NOT-RUN', 'iOS chưa có bản brief 96; chuỗi chuẩn đã khớp spec trên web');
    await setMask([1,1,1,1,1]);
  });

  phase = 'CMT-022 assign defaults';
  await check('CMT-022', async () => {
    await page.goto(n1Url, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
    // pre-state: S2 hand-edited? S3 manual BTVN on (graded not-done) with NOTE
    await openSlip(students[2]);
    await page.waitForTimeout(2000);
    const pre3 = await slipState();
    await openSlip(students[0]);
    const pre1 = await slipState();
    await page.getByTestId('slip-assign-defaults').click();
    const dlg = page.getByRole('dialog', { name: /^Gán mặc định .+\?$/ });
    await dlg.waitFor({ timeout: 8000 });
    await dlg.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await dlg.waitFor({ state: 'detached', timeout: 5000 });
    await openSlip(students[2]);
    const cancelled = await slipState();
    await page.getByTestId('slip-assign-defaults').click();
    await dlg.waitFor({ timeout: 8000 });
    await dlg.getByRole('button', { name: 'Gán mặc định', exact: true }).click();
    await dlg.waitFor({ state: 'detached', timeout: 15000 });
    await page.waitForTimeout(3000);
    await openSlip(students[2]);
    const post3 = await slipState();
    await openSlip(students[0]);
    const post1 = await slipState();
    rec('CMT-022-cancel-no-change', cancelled.hw === pre3.hw && cancelled.stars === pre3.stars && cancelled.sentence === pre3.sentence ? 'PASS' : 'FAIL', '');
    rec('CMT-022-defaults-applied', !post3.hw && post3.stars === '4' && post3.auto === 1 && post3.note === NOTE && /chưa hoàn thành bài tập về nhà/.test(post3.sentence) ? 'PASS' : 'FAIL', JSON.stringify({ hw: post3.hw, stars: post3.stars, auto: post3.auto, noteKept: post3.note === NOTE }));
    rec('CMT-022-sent-unchanged', post1.status === 'Đã gửi' && post1.stars === pre1.stars && post1.sentence === pre1.sentence ? 'PASS' : 'FAIL', JSON.stringify({ status: post1.status, same: post1.sentence === pre1.sentence }));
  });

  phase = 'CMT-021 send class with defaults';
  await check('CMT-021', async () => {
    await page.goto(n1Url, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
    await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).click();
    const dialog = page.getByRole('dialog', { name: /^Gửi phiếu .+\?$/ });
    await dialog.waitFor({ state: 'visible', timeout: 8000 });
    const dialogText = (await dialog.innerText()).replace(/\s+/g, ' ');
    const send = dialog.getByRole('button', { name: /^Gửi \d+ phiếu$/ });
    const label = await send.innerText();
    await send.click();
    await dialog.waitFor({ state: 'detached', timeout: 15000 });
    await page.waitForTimeout(4000);
    await openSlip(students[3]);
    const s4 = await slipState();
    const absentRow = page.getByRole('button', { name: new RegExp(students[4]) }).first();
    const absentText = (await absentRow.innerText()).replace(/\s+/g, ' ');
    rec('CMT-021-confirm-wording', !/câu mẫu/.test(dialogText) ? 'PASS' : 'FAIL', `sendLabel=${label} mentionsCauMau=${/câu mẫu/.test(dialogText)}`);
    rec('CMT-021-cold-student-sent', s4.status === 'Đã gửi' && s4.sentence.startsWith('Con ') && s4.stars !== undefined ? 'PASS' : 'FAIL', `status=${s4.status} stars=${s4.stars} hw=${s4.hw} sentenceOk=${s4.sentence.startsWith('Con ')}`);
    rec('CMT-021-absent-skipped', !/Đã gửi/.test(absentText) ? 'PASS' : 'FAIL', absentText.slice(0, 80));
  });
  console.log('DONE_B96');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: `${out}/brief96-web-failure.png`, fullPage: true }).catch(() => {});
  console.log(`${message.startsWith('fixture_missing:') ? 'BLOCKED' : 'FAIL'} brief96-web at ${phase}: ${message.slice(0, 300)}`);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
