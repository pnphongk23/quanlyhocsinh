import { API_BASE, WEB_BASE } from "./config.mjs";
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const web = WEB_BASE;
const api = API_BASE;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const tag = randomBytes(3).toString('hex');
const className = `QA-Web-FB2-Final-${tag}`;
const studentName = `QA-Web-FB2-Final-Student-${tag}`;
const reportName = 'Tháng 10/2026';
const results = [];
const errors = [];
let browser;
let teacherContext;
let parentContext;
let teacherPage;
let parentPage;
let teacherToken = '';
let parentToken = '';
let classId = '';
let studentId = '';
let reportBatchId = '';
let reportsUrl = '';
let reportHref = '';
let bundleOk = false;
let childVisible = false;
let phaseName = 'startup';
let phoneDisplayFormat = 'not inspected';
let savedGuardianPhoneMatches = false;

function local9(value) {
  let digits = String(value ?? '').replace(/\D/gu, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  if (digits.length !== 9) throw new Error('invalid smoke phone format');
  return digits;
}
function normalized9(value) {
  let digits = String(value ?? '').replace(/\D/gu, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  return digits.length === 9 ? digits : '';
}
function phoneShape(value) {
  const text = String(value ?? '');
  const digits = text.replace(/\D/gu, '');
  if (/[x*•●]/u.test(text)) return 'masked';
  if (/^\s*\+84/u.test(text)) return 'explicit +84 prefix';
  if (digits.length === 9 && !/[\s().-]/u.test(text)) return '9 local digits';
  if (/\s/u.test(text)) return `${digits.length} digits with spacing`;
  if (digits.length === 11) return '11 digits; prefix formatting not retained by prior run';
  return `${digits.length} digits; unclassified formatting`;
}
function safe(value) {
  return String(value?.message ?? value ?? 'unknown error')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, '')
    .replace(/Bearer\s+[^\s"']+/giu, '[redacted]')
    .replace(/\b(?:\+?84|0)?\d{9,10}\b/gu, '[phone]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, '[long-value]')
    .replace(/[\r\n\t]+/gu, ' ').slice(0, 180);
}
function xml(value) {
  return safe(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
function record(id, status, note = '') {
  const item = { id, status, note: safe(note) };
  results.push(item);
  console.log(`${status} ${id}${note ? `: ${safe(note)}` : ''}`);
}
async function phase(name, work) {
  phaseName = name;
  try { return await work(); }
  catch (error) {
    const kind = error?.name ?? 'Error';
    const message = safe(error);
    errors.push({ phase: name, kind, message });
    process.stderr.write(`ERROR phase="${name}" kind="${kind}" message="${message}"\n`);
    const activePage = parentPage && name.startsWith('PH') ? parentPage : teacherPage;
    if ((error?.name === 'TimeoutError' || /Timeout(?:Error| \d+ms exceeded)/u.test(String(error?.message ?? ''))) && activePage && !activePage.isClosed()) {
      const masks = [activePage.locator('input'), activePage.locator('textarea'), activePage.locator('[contenteditable="true"]')];
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 40);
      await activePage.screenshot({
        path: `${out}/fb2-timeout-${slug}-${tag}.jpg`,
        type: 'jpeg', quality: 35, fullPage: false, mask: masks,
      }).catch(() => {});
    }
    throw error;
  }
}
async function request(path, token, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}
async function loginOnce(phone, password, label) {
  const { response, body } = await request('/auth/login', null, {
    method: 'POST', body: JSON.stringify({ phone: `+84${local9(phone)}`, password, device_label: label }),
  });
  record(`LOGIN-${label}`, response.ok && body?.token ? 'pass' : 'blocked', `HTTP ${response.status}`);
  if (response.status === 401 || response.status === 429 || !response.ok || !body?.token) throw new Error(`login HTTP ${response.status}`);
  const profile = await request('/me', body.token);
  if (!profile.response.ok) throw new Error(`profile HTTP ${profile.response.status}`);
  return {
    token: body.token,
    session: {
      token: body.token, user: body.user, me: profile.body,
      activeMembershipId: body.active_membership_id ?? body.memberships?.[0]?.id ?? profile.body?.active_membership_id ?? profile.body?.memberships?.[0]?.id ?? null,
      guardianAccount: label === 'PH-fb2',
    },
  };
}
function initSession(context, session) {
  return context.addInitScript((value) => localStorage.setItem('qlh.session.v1', JSON.stringify(value)), session);
}
async function checkBundleAndReload(page) {
  await page.goto(`${web}/lop`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => {
    try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
  }), 'index-l7_C4kqA.js', { timeout: 15000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => {
    try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
  }), 'index-l7_C4kqA.js', { timeout: 15000 });
  bundleOk = true;
  record('BUNDLE-l7_C4kqA', 'pass', 'confirmed before and after one reload; service worker enabled');
}
async function inspectPriorPhoneShape(guardianPhone) {
  const classLinks = await teacherPage.locator('a[href^="/lop/"][href$="/buoi-hoc"]').all();
  let found = null;
  for (const link of classLinks) {
    const href = await link.getAttribute('href');
    const id = href?.split('/').filter(Boolean)[1];
    if (!id) continue;
    const students = await request(`/classes/${encodeURIComponent(id)}/students`, teacherToken);
    if (!students.response.ok || !Array.isArray(students.body?.items)) continue;
    const qa = students.body.items.find((item) => typeof item.name === 'string' && item.name.startsWith('QA-Web-Brief91-Linked-'));
    if (qa) { found = { classId: id, student: qa, href }; break; }
  }
  if (!found) { record('PHONE-FORMAT-DIAG', 'blocked', 'no prior QA linked-student fixture to inspect'); return; }
  await teacherPage.goto(new URL(found.href, web).toString(), { waitUntil: 'domcontentloaded' });
  const nav = teacherPage.getByRole('navigation', { name: 'Mục của lớp' });
  const studentHref = await nav.getByRole('link', { name: 'Học sinh', exact: true }).getAttribute('href');
  await teacherPage.goto(new URL(studentHref, web).toString(), { waitUntil: 'domcontentloaded' });
  const row = teacherPage.getByText(found.student.name, { exact: true }).locator('xpath=ancestor::tr[1]');
  await row.getByRole('button', { name: `Thêm tùy chọn ${found.student.name}` }).click();
  const menu = teacherPage.getByRole('menu');
  await menu.getByRole('menuitem', { name: /Sửa.*số điện thoại phụ huynh|Sửa số điện thoại/u }).click();
  const dialog = teacherPage.getByRole('dialog', { name: 'Sửa số điện thoại phụ huynh' });
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  const rawValue = await dialog.getByLabel('Số điện thoại phụ huynh').inputValue();
  phoneDisplayFormat = phoneShape(rawValue);
  const matches = normalized9(rawValue) === local9(guardianPhone);
  await dialog.getByRole('button', { name: 'Huỷ', exact: true }).click().catch(() => {});
  record('PHONE-FORMAT-DIAG', matches ? 'pass' : 'blocked', `stored field is raw/unmasked; display=${phoneDisplayFormat}; normalized match=${matches}`);
}
async function createQaClassAndStudent(guardianPhone) {
  await teacherPage.goto(`${web}/lop/moi`, { waitUntil: 'domcontentloaded' });
  await teacherPage.getByLabel('Tên lớp').fill(className);
  await teacherPage.getByRole('group', { name: 'Ngày học trong tuần' }).getByRole('button', { name: 'T2', exact: true }).click();
  await teacherPage.getByLabel('Giờ bắt đầu').fill('18:30');
  await teacherPage.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await teacherPage.waitForURL(/\/lop\/?$/u, { timeout: 15000 });
  const card = teacherPage.locator('a[href^="/lop/"][href$="/buoi-hoc"]').filter({ hasText: className }).first();
  await card.waitFor({ state: 'visible', timeout: 12000 });
  await card.click();
  await teacherPage.waitForURL(/\/lop\/[^/]+\/buoi-hoc\/?$/u, { timeout: 10000 });
  classId = new URL(teacherPage.url()).pathname.split('/').filter(Boolean)[1];
  const nav = teacherPage.getByRole('navigation', { name: 'Mục của lớp' });
  const studentHref = await nav.getByRole('link', { name: 'Học sinh', exact: true }).getAttribute('href');
  await teacherPage.goto(new URL(studentHref, web).toString(), { waitUntil: 'domcontentloaded' });
  await teacherPage.getByRole('button', { name: /Thêm học sinh/u }).first().click();
  const dialog = teacherPage.getByRole('dialog', { name: 'Thêm học sinh' });
  await dialog.getByLabel('Họ và tên học sinh').fill(studentName);
  await dialog.getByLabel(/Số điện thoại phụ huynh/u).fill(local9(guardianPhone));
  await dialog.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
  try {
    await dialog.waitFor({ state: 'detached', timeout: 15000 });
    await teacherPage.getByText(studentName, { exact: true }).waitFor({ state: 'visible', timeout: 12000 });
  } catch (error) {
    await teacherPage.getByText(studentName, { exact: true }).screenshot({ path: `${out}/fb2-student-save-timeout-name.png` }).catch(() => {});
    throw new Error(`UI save dialog/name wait timeout: ${safe(error)}`);
  }
  const students = await request(`/classes/${encodeURIComponent(classId)}/students`, teacherToken);
  if (!students.response.ok || !Array.isArray(students.body?.items)) throw new Error(`saved student list HTTP ${students.response.status}`);
    const saved = students.body.items.find((item) => item.name === studentName);
    if (!saved?.id) throw new Error('QA student name not in teacher student list after dialog closed');
    studentId = saved.id;
    const savedPhone = String(saved.parent_phone ?? saved.parentPhone ?? '');
    savedGuardianPhoneMatches = normalized9(savedPhone) === local9(guardianPhone);
    record('QA-STUDENT-SAVED', savedGuardianPhoneMatches ? 'pass' : 'blocked', `dialog closed; QA name is in list; saved parent phone present=${Boolean(savedPhone)}, digits=${savedPhone.replace(/\D/gu, '').length}, normalized match=${savedGuardianPhoneMatches}`);
}
async function createSessionAndFeedback() {
  await teacherPage.goto(`${web}/lop/${classId}/buoi-hoc`, { waitUntil: 'domcontentloaded' });
  const before = new Set(await teacherPage.getByRole('link', { name: 'Xem buổi', exact: true }).evaluateAll((items) => items.map((item) => item.getAttribute('href'))));
  await teacherPage.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await teacherPage.locator('#extra-session-date').fill(today);
  await teacherPage.locator('#extra-session-time').fill('18:30');
  const save = teacherPage.getByRole('button', { name: 'Lưu buổi học', exact: true });
  if (!(await save.isEnabled())) throw new Error('QA session is not savable today');
  await save.click();
  await teacherPage.getByRole('dialog', { name: 'Thêm buổi lẻ' }).waitFor({ state: 'detached', timeout: 12000 });
  let href = '';
  for (const link of await teacherPage.getByRole('link', { name: 'Xem buổi', exact: true }).all()) {
    const candidate = await link.getAttribute('href');
    if (candidate && !before.has(candidate)) { href = candidate; break; }
  }
  if (!href) throw new Error('new QA session not found');
  await teacherPage.goto(new URL(href, web).toString(), { waitUntil: 'domcontentloaded' });
  await teacherPage.getByRole('tab', { name: 'Điểm danh', exact: true }).click().catch(() => {});
  const group = teacherPage.getByRole('group', { name: `Trạng thái của ${studentName}` });
  await group.getByRole('button', { name: 'Có mặt', exact: true }).click();
  await teacherPage.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
  await teacherPage.goto(`${web}/lop/${classId}/bai-kiem-tra/moi`, { waitUntil: 'domcontentloaded' });
  await teacherPage.getByLabel('Tên bài kiểm tra').fill(`QA-Web-FB2-Test-${tag}`);
  await teacherPage.getByLabel('Ngày kiểm tra').fill(today);
  await teacherPage.getByRole('button', { name: 'Tạo bài và nhập điểm', exact: true }).click();
  await teacherPage.waitForURL(new RegExp(`/lop/${classId}/bai-kiem-tra/[^/?]+`), { timeout: 15000 });
  const score = teacherPage.locator('input[aria-label^="Điểm "]').first();
  await score.waitFor({ state: 'visible', timeout: 10000 });
  await score.fill('20');
  await teacherPage.getByRole('button', { name: /Lưu/u }).last().click();
  await teacherPage.getByText(/Đã lưu|Lưu xong|Đã đồng bộ/u).first().waitFor({ timeout: 10000 }).catch(() => {});
  await teacherPage.goto(new URL(href, web).toString(), { waitUntil: 'domcontentloaded' });
  await teacherPage.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  const criteria = teacherPage.getByRole('region', { name: 'Năm tiêu chí nhận xét' });
  await criteria.waitFor({ state: 'visible', timeout: 10000 });
  const criterionCount = await criteria.getByRole('button').count();
  const note = `QA-Brief91-FB2-note-${tag}`;
  await teacherPage.getByPlaceholder('Thêm lời nhắn riêng cho phụ huynh…').fill(note);
  await teacherPage.getByPlaceholder('Thêm lời nhắn riêng cho phụ huynh…').blur();
  const send = teacherPage.getByRole('button', { name: /Gửi phiếu cả lớp/u });
  await send.click();
  const confirm = teacherPage.getByRole('dialog', { name: /Gửi phiếu/u });
  await confirm.waitFor({ state: 'visible', timeout: 8000 });
  const confirmCopy = (await confirm.innerText()).replace(/\s+/gu, ' ');
  const oneTicket = /1\s*phiếu sẽ gửi/u.test(confirmCopy);
  if (!oneTicket) {
    await confirm.getByRole('button', { name: 'Quay lại', exact: true }).click();
    throw new Error('QA comment send confirmation did not show one ticket');
  }
  await confirm.getByRole('button', { name: /Gửi 1 phiếu/u }).click();
  await confirm.waitFor({ state: 'detached', timeout: 12000 });
  record('QA-SESSION-SCORE-FEEDBACK', criterionCount === 5 ? 'pass' : 'fail', 'attendance, score, and one QA feedback ticket saved');
  return { note };
}
async function checkParentChildAndFeedback(note) {
  await parentPage.goto(`${web}/ph`, { waitUntil: 'domcontentloaded' });
  childVisible = await parentPage.getByText(studentName, { exact: true }).waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    record('PH-LATE-LINK', childVisible ? 'pass' : savedGuardianPhoneMatches ? 'fail' : 'blocked', childVisible ? 'exact QA student name visible in PH list' : savedGuardianPhoneMatches ? `studentId=${studentId}; checkedAtUtc=${new Date().toISOString()}` : 'exact QA student absent; stored guardian phone did not match entered account phone, so this is a fixture/flow block');
    if (!childVisible) {
      if (savedGuardianPhoneMatches) await writeLateLinkBug();
      return false;
  }
  await parentPage.getByText(studentName, { exact: true }).first().screenshot({ path: `${out}/fb2-child-visible-name.png` });
  await parentPage.goto(`${web}/ph/nhan-xet`, { waitUntil: 'domcontentloaded' });
  const commentVisible = await parentPage.getByText(studentName, { exact: true }).waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  if (commentVisible) {
    const mainText = await parentPage.locator('main').last().innerText();
    const hasFive = /5\/5/u.test(mainText);
    const hasNote = mainText.includes(note);
    const showsCriteria = (await parentPage.getByRole('region', { name: 'Năm tiêu chí nhận xét' }).count()) > 0;
    record('CMT-PH-VIEW', hasFive && hasNote && !showsCriteria ? 'pass' : 'fail');
  } else record('CMT-PH-VIEW', 'blocked', 'QA feedback not visible on PH comments page');
  return true;
}
async function createPublishDeleteReport() {
  await teacherPage.goto(`${web}/lop/${classId}/bao-cao`, { waitUntil: 'domcontentloaded' });
  await teacherPage.getByRole('button', { name: 'Thêm báo cáo', exact: true }).click();
  const dialog = teacherPage.getByRole('dialog', { name: 'Thêm báo cáo' });
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  await dialog.locator('input[type="month"]').fill('2026-10');
  await dialog.getByRole('button', { name: 'Tạo báo cáo', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  reportBatchId = new URL(teacherPage.url()).searchParams.get('dot') ?? '';
  reportsUrl = teacherPage.url().split('?')[0];
  if (!reportBatchId) throw new Error('monthly report batch id unavailable');
  const publish = teacherPage.getByRole('button', { name: /Phát hành \d+ báo cáo/u });
  if (!(await publish.count()) || !(await publish.isEnabled())) {
    record('RPT-020', 'blocked', 'monthly report exists but staging has no publish-ready rows');
    return false;
  }
  await publish.click();
  await teacherPage.getByText(/Đã phát hành \d+ báo cáo/u).waitFor({ timeout: 15000 });
  record('RPT-PUBLISH', 'pass');
  return true;
}
async function parentReportDeleteCheck() {
  await parentPage.goto(`${web}/ph/bao-cao`, { waitUntil: 'domcontentloaded' });
  const month = parentPage.getByText(reportName, { exact: false }).first();
  await month.waitFor({ state: 'visible', timeout: 12000 });
  reportHref = await month.evaluate((node) => node.closest('a')?.getAttribute('href') ?? '');
  if (!reportHref) throw new Error('parent report link not available');
  await parentPage.goto(new URL(reportHref, web).toString(), { waitUntil: 'domcontentloaded' });
  await parentPage.getByRole('main').last().waitFor({ state: 'visible', timeout: 10000 });
  record('PH-REPORT-OPEN', 'pass');
  await teacherPage.goto(reportsUrl, { waitUntil: 'domcontentloaded' });
  const row = teacherPage.locator('li').filter({ has: teacherPage.locator(`a[href*="${reportBatchId}"]`) }).first();
  await row.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).click();
  await teacherPage.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
  const confirm = teacherPage.getByRole('dialog', { name: 'Xoá báo cáo?' });
  await confirm.waitFor({ state: 'visible', timeout: 8000 });
  const warnsParent = /phụ huynh.*không còn thấy/iu.test(await confirm.innerText());
  await confirm.getByRole('button', { name: 'Xoá báo cáo', exact: true }).click();
  await row.waitFor({ state: 'detached', timeout: 12000 });
  await teacherPage.reload({ waitUntil: 'domcontentloaded' });
  const teacherStillHasBatch = await teacherPage.locator(`a[href*="${reportBatchId}"]`).count();
  record('GV-REPORT-DELETED-NOT-RESTORED', teacherStillHasBatch === 0 ? 'pass' : 'fail');
  await parentPage.goto(new URL(reportHref, web).toString(), { waitUntil: 'domcontentloaded' });
  const deletedMessage = await parentPage.getByText('Báo cáo này không còn', { exact: true }).waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  const hasReport = await parentPage.locator('main').last().getByText(reportName, { exact: false }).count().catch(() => 0);
  record('RPT-020', warnsParent && (deletedMessage || hasReport === 0) ? 'pass' : 'fail', `deletedMessage=${deletedMessage}; reportStillVisible=${hasReport > 0}`);
}
async function writeLateLinkBug() {
  const checkedAtUtc = new Date().toISOString();
  const path = 'qa/bugs.md';
  const current = await readFile(path, 'utf8');
  if (!current.includes('WEB-009')) {
    const entry = `\n### WEB-009 · PH fb2 không thấy HS mới sau khi lưu số phụ huynh — Còn lỗi trên staging\n- Tái hiện: bundle index-l7_C4kqA.js; GV fb2 tạo HS QA qua UI, nhập guardian_phone dạng 9 số, Lưu đóng hộp và tên HS QA xuất hiện trong danh sách; PH fb2 đăng nhập một lần và danh sách không có đúng HS QA này.\n- HS ID: \`${studentId}\`; thời điểm kiểm tra UTC: ${checkedAtUtc}. Mong đợi PH thấy HS sau khi GV lưu số khớp; kết quả thật: không thấy. Không lặp lại. JUnit: \`${out}/brief91-fb2-final-junit.xml\`.\n`;
    await writeFile(path, `${current.trimEnd()}\n${entry}`);
  }
}

try {
  await mkdir(out, { recursive: true });
  const raw = await readFile(`${homedir()}/.config/qlh/dev-qa.txt`, 'utf8');
  const credentials = Object.fromEntries(raw.split(/\r?\n/u).map((line) => {
    const index = line.indexOf('=');
    return index > 0 ? [line.slice(0, index).trim(), line.slice(index + 1).trim()] : ['', ''];
  }).filter(([key]) => key));
  if (!credentials.phone || !credentials.password || !credentials.guardian_phone) throw new Error('fb2 smoke keys incomplete');
  const gv = await phase('GV fb2 login', () => loginOnce(credentials.phone, credentials.password, 'GV-fb2'));
  teacherToken = gv.token;
  browser = await chromium.launch({ headless: true });
  teacherContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  await initSession(teacherContext, gv.session);
  teacherPage = await teacherContext.newPage();
  await phase('bundle l7 and single reload', () => checkBundleAndReload(teacherPage));
  await phase('diagnose previous UI phone format', () => inspectPriorPhoneShape(credentials.guardian_phone));
  await phase('create class and linked QA child through UI', () => createQaClassAndStudent(credentials.guardian_phone));
  const parent = await phase('PH fb2 login', () => loginOnce(credentials.guardian_phone, credentials.password, 'PH-fb2'));
  parentToken = parent.token;
  parentContext = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  await initSession(parentContext, parent.session);
  parentPage = await parentContext.newPage();
  const feedback = await phase('create session score and feedback fixture', createSessionAndFeedback);
  const linked = await phase('verify exact QA child and parent feedback', () => checkParentChildAndFeedback(feedback.note));
  if (!linked) {
    for (const id of ['RPT-020', 'PH-REPORT-OPEN']) record(id, 'blocked', 'stopped after verified late-link failure');
  } else {
    const published = await phase('create and publish monthly report', createPublishDeleteReport);
    if (published) await phase('parent open delete and stale-route check', parentReportDeleteCheck);
  }
} catch (error) {
  record(`BLOCKED-${phaseName}`, 'blocked', safe(error));
} finally {
  await parentContext?.close().catch(() => {});
  await teacherContext?.close().catch(() => {});
  await browser?.close().catch(() => {});
  const cases = results.map((item) => {
      const caseResult = item.status === 'blocked' ? `<skipped message="${xml(item.note)}"/>` : item.status === 'fail' ? `<failure message="${xml(item.note || 'assertion failed')}"/>` : `<system-out>${xml(item.note || 'pass')}</system-out>`;
      return `<testcase classname="web" name="${xml(item.id)}">${caseResult}</testcase>`;
  }).join('');
  const failedLateLink = results.some((item) => item.id === 'PH-LATE-LINK' && item.status === 'fail');
  await writeFile(`${out}/brief91-fb2-final-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="brief91-fb2-final" tests="${results.length}" failures="${results.filter((item) => item.status === 'fail').length}" skipped="${results.filter((item) => item.status === 'blocked').length}">${cases}</testsuite>\n`);
  await writeFile(`${out}/brief91-fb2-final.json`, `${JSON.stringify({ bundle: bundleOk ? 'index-l7_C4kqA.js' : null, phoneDisplayFormat, className, studentId: studentId || null, parentSeesExactStudent: childVisible, parentLoginSubmitted: Boolean(parentToken), checkedAtUtc: failedLateLink ? new Date().toISOString() : null, results, errors }, null, 2)}\n`);
}
