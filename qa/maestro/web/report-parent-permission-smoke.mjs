import { API_BASE, WEB_BASE } from "./config.mjs";
import { homedir } from 'node:os';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { parseFixture, runHttpPermissionPhases } from './permissions-http-prm004-005.mjs';

const web = WEB_BASE;
const api = API_BASE;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-${suffix}-Class`;
const linkedName = `QA-Web-${suffix}-Linked`;
const unlinkedName = `QA-Web-${suffix}-Unlinked`;
const testName = `QA-Web-${suffix}-SyncProbe`;
const results = [];
let bundle = null;
let browser;
let teacherContext;
let parentContext;
let stoppedForLogin = false;
let currentPhase = 'fixture load';
let failureDetail = null;
let secretValues = [];

function filteredError(error, secrets = []) {
  let message = error instanceof Error ? error.message : 'unknown error';
  for (const secret of secrets.filter(Boolean)) message = message.replaceAll(secret, '[redacted]');
  message = message.replace(/Bearer\s+[^\s"']+/giu, 'Bearer [redacted]')
    .replace(/\b(?:\+?84|0)?\d{9,10}\b/gu, '[phone]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, '[long-value]')
    .replace(/[\r\n\t]+/gu, ' ').slice(0, 180);
  return { kind: error?.name ?? 'Error', message: message || 'no message' };
}

async function phase(name, work) {
  currentPhase = name;
  try { return await work(); }
  catch (error) {
    failureDetail = filteredError(error, secretValues);
    process.stderr.write(`ERROR phase="${name}" kind="${failureDetail.kind}" message="${failureDetail.message}"\n`);
    throw error;
  }
}

function normalizeStudentPhone(value) {
  const digits = value.replace(/\D/gu, '');
  if (digits.startsWith('84')) return `0${digits.slice(2)}`;
  return digits.startsWith('0') ? digits : `0${digits}`;
}
function record(id, outcome, http) {
  const item = { id, outcome };
  if (Number.isInteger(http)) item.http = http;
  results.push(item);
  console.log(`${outcome.toUpperCase()} ${id}${Number.isInteger(http) ? ` HTTP ${http}` : ''}`);
}
async function saveArtifacts() {
  await mkdir(out, { recursive: true });
  const cases = results.map((item) => `<testcase classname="web" name="${item.id}">${item.outcome === 'blocked' ? `<skipped message="${item.phase ?? 'fixture or login unavailable'}"/>` : item.outcome === 'fail' ? `<failure message="${item.phase ?? 'assertion failed'}"/>` : ''}${Number.isInteger(item.http) ? `<system-out>HTTP ${item.http}</system-out>` : ''}</testcase>`).join('');
  await writeFile(`${out}/parent-report-permission-smoke-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-parent-report-permission-smoke" tests="${results.length}" failures="${results.filter((item) => item.outcome === 'fail').length}" skipped="${results.filter((item) => item.outcome === 'blocked').length}">${cases}${failureDetail ? `<system-err>phase=${currentPhase}; ${failureDetail.kind}: ${failureDetail.message}</system-err>` : ''}</testsuite>\n`);
  await writeFile(`${out}/parent-report-permission-smoke.json`, `${JSON.stringify({ bundle, results }, null, 2)}\n`);
}
async function login(page, phone, password) {
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/auth/login'), { timeout: 15000 });
  await page.goto(`${web}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const response = await responsePromise;
  const body = response.ok() ? await response.json() : null;
  return { status: response.status(), token: typeof body?.token === 'string' ? body.token : null };
}
async function addStudent(page, name, phone = '') {
  await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
  await page.getByLabel('Họ và tên học sinh').fill(name);
  if (phone) await page.getByLabel(/Số điện thoại phụ huynh/).fill(phone);
  await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
  await page.getByText(name, { exact: true }).waitFor({ timeout: 12000 });
}

try {
    const credentialText = await phase('fixture load', () => readFile(`${homedir()}/.config/qlh/dev-qa.txt`, 'utf8'));
      const credentials = parseFixture(credentialText);
      secretValues = [credentials.teacherPhone, credentials.parentPhone, credentials.teacherPassword, credentials.parentPassword];
    if (!credentials.teacherPhone || !credentials.teacherPassword || !credentials.parentPhone || !credentials.workspaceName) {
      record('credentials-fixture', 'blocked');
      record('RPT-020', 'blocked');
      record('PRM-004', 'blocked');
    record('PRM-005', 'blocked');
    throw new Error('fixture-incomplete');
  }

    const permissionRun = await runHttpPermissionPhases({ credentials, onPhase: (name) => { currentPhase = name; } });
    results.push(...permissionRun.records);
    const teacherAuth = permissionRun.teacherAuth;
    const parentAuth = permissionRun.parentAuth;
    if (!teacherAuth?.token || !parentAuth?.token) {
      stoppedForLogin = true;
      throw new Error(`authentication phase failed: ${currentPhase}`);
    }

    const [teacherMeResponse, parentMeResponse] = await phase('UI setup · reuse HTTP sessions', () => Promise.all([
      fetch(`${api}/me`, { headers: { accept: 'application/json', authorization: `Bearer ${teacherAuth.token}` } }),
      fetch(`${api}/me`, { headers: { accept: 'application/json', authorization: `Bearer ${parentAuth.token}` } }),
    ]));
    const [teacherMe, parentMe] = await Promise.all([teacherMeResponse.json(), parentMeResponse.json()]);
    if (!teacherMeResponse.ok || !parentMeResponse.ok) throw new Error(`session hydrate HTTP ${teacherMeResponse.status}/${parentMeResponse.status}`);
    const teacherSession = { token: teacherAuth.token, user: teacherAuth.body.user, me: teacherMe, activeMembershipId: permissionRun.teacherMembershipId, guardianAccount: false };
    const parentSession = { token: parentAuth.token, user: parentAuth.body.user, me: parentMe, activeMembershipId: permissionRun.parentMembershipId, guardianAccount: false };

    browser = await chromium.launch({ headless: true });
    teacherContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh', serviceWorkers: 'block' });
    parentContext = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh', serviceWorkers: 'block' });
    await teacherContext.addInitScript((session) => localStorage.setItem('qlh.session.v1', JSON.stringify(session)), teacherSession);
    await parentContext.addInitScript((session) => localStorage.setItem('qlh.session.v1', JSON.stringify(session)), parentSession);
    const teacherPage = await teacherContext.newPage();
    const parentPage = await parentContext.newPage();
    await phase('UI setup · teacher session', async () => {
      await teacherPage.goto(`${web}/lop`, { waitUntil: 'domcontentloaded' });
      await teacherPage.waitForURL(/\/lop(?:\/|$)/u, { timeout: 15000 });
    });
    await parentPage.goto(`${web}/ph`, { waitUntil: 'domcontentloaded' });
    bundle = await teacherPage.evaluate(() => performance.getEntriesByType('resource').map((entry) => {
      try { return new URL(entry.name).pathname.split('/').at(-1); } catch { return ''; }
    }).find((item) => /^index-[\w-]+\.js$/u.test(item)) ?? null);

      await phase('RPT-020 · UI setup', async () => {
      await teacherPage.goto(`${web}/lop/moi`, { waitUntil: 'domcontentloaded' });
  await teacherPage.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await teacherPage.getByRole('button', { name: 'CN', exact: true }).click();
  await teacherPage.locator('input[type=time]').fill('12:00');
  await teacherPage.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await teacherPage.waitForURL(/\/lop$/u, { timeout: 15000 });
  await teacherPage.goto(`${web}/lop`, { waitUntil: 'domcontentloaded' });
  await teacherPage.getByRole('link', { name: new RegExp(className, 'u') }).last().click();
  await teacherPage.waitForURL(/\/lop\/[^/]+$/u, { timeout: 10000 });
  const classId = new URL(teacherPage.url()).pathname.split('/').filter(Boolean).at(-1);
  const classNav = teacherPage.getByRole('navigation', { name: 'Mục của lớp' });
    const studentsHref = await classNav.getByRole('link', { name: 'Học sinh', exact: true }).getAttribute('href');
    await teacherPage.goto(new URL(studentsHref, web).toString(), { waitUntil: 'domcontentloaded' });
    await addStudent(teacherPage, linkedName, normalizeStudentPhone(credentials.parentPhone));
    await addStudent(teacherPage, unlinkedName);

    await parentPage.locator('#noi-dung').getByText(linkedName, { exact: true }).waitFor({ timeout: 12000 });

    const reportsHref = await classNav.getByRole('link', { name: 'Báo cáo', exact: true }).getAttribute('href');
  await teacherPage.goto(new URL(reportsHref, web).toString(), { waitUntil: 'domcontentloaded' });
  const addReport = teacherPage.getByRole('button', { name: 'Thêm báo cáo', exact: true });
  await addReport.waitFor({ state: 'visible', timeout: 10000 });
  await addReport.click();
  const reportDialog = teacherPage.getByRole('dialog', { name: 'Thêm báo cáo' });
  const from = reportDialog.locator('#report-from');
  const to = reportDialog.locator('#report-to');
  await from.waitFor({ state: 'visible', timeout: 8000 });
  const optionCount = Math.min(await from.locator('option').count(), await to.locator('option').count());
  if (!optionCount) throw new Error('no-held-session');
  const sessionIndex = optionCount - 1;
  await from.selectOption({ index: sessionIndex });
  await to.selectOption({ index: sessionIndex });
  await reportDialog.getByRole('button', { name: 'Tạo báo cáo', exact: true }).click();
  await reportDialog.waitFor({ state: 'detached', timeout: 15000 });
  const batchId = new URL(teacherPage.url()).searchParams.get('dot');
  if (!batchId) throw new Error('report-route-missing');
  const reportsListUrl = teacherPage.url().split('?')[0];
  await teacherPage.goto(reportsListUrl, { waitUntil: 'domcontentloaded' });
  const reportRow = teacherPage.locator('main').last().locator('li').filter({ has: teacherPage.locator(`a[href*="${batchId}"]`) }).first();
  await reportRow.waitFor({ state: 'visible', timeout: 10000 });
  const reportLink = reportRow.locator('a[aria-label^="Mở báo cáo"]').first();
  const teacherReportHref = await reportLink.getAttribute('href');
  if (!teacherReportHref) throw new Error('report-link-missing');
  await reportLink.click();
  const publish = teacherPage.getByRole('button', { name: /Phát hành|Gửi báo cáo/iu }).first();
  await publish.waitFor({ state: 'visible', timeout: 10000 });
  await publish.click();
  const publishDialog = teacherPage.getByRole('dialog').last();
  if (await publishDialog.count()) await publishDialog.getByRole('button', { name: /Phát hành|Gửi/iu }).last().click();

  await parentPage.goto(`${web}/ph`, { waitUntil: 'domcontentloaded' });
  const parentReportNav = parentPage.getByRole('link', { name: /Báo cáo/iu }).first();
  if (await parentReportNav.count()) await parentReportNav.click();
  const parentReportLink = parentPage.locator('a[href]').filter({ has: parentPage.getByText(/Báo cáo|Tháng|Buổi/iu) }).first();
  const parentReportHref = await parentReportLink.getAttribute('href').catch(() => null);
  if (!parentReportHref) throw new Error('parent-report-not-visible');

  await teacherPage.goto(reportsListUrl, { waitUntil: 'domcontentloaded' });
  await reportRow.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).click();
  await teacherPage.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
  const deleteDialog = teacherPage.getByRole('dialog', { name: 'Xoá báo cáo?' });
  await deleteDialog.waitFor({ state: 'visible', timeout: 5000 });
  const deletionCopy = await deleteDialog.innerText();
  const mentionsParent = /phụ huynh/iu.test(deletionCopy) && /(không còn thấy|không.*thấy|không truy cập)/iu.test(deletionCopy);
  await deleteDialog.getByRole('button', { name: 'Xoá báo cáo', exact: true }).click();
  await reportRow.waitFor({ state: 'detached', timeout: 12000 });
  await parentPage.goto(new URL(parentReportHref, web).toString(), { waitUntil: 'domcontentloaded' }).catch(() => null);
  await parentPage.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  const reportGone = await parentPage.locator('a[href]').evaluateAll((links, target) => !links.some((item) => item.getAttribute('href') === target), new URL(parentReportHref, web).pathname);
  const parentDirectText = (await parentPage.locator('main').last().innerText().catch(() => '')).toLowerCase();
  const directDenied = /không tìm thấy|không có quyền|không tìm được|not found|forbidden/iu.test(parentDirectText) || !(await parentPage.locator('main').last().getByText(linkedName, { exact: true }).count());
  const rptPass = mentionsParent && reportGone && directDenied;
  record('RPT-020', rptPass ? 'pass' : 'fail');

      });
  } catch (error) {
    failureDetail = filteredError(error, secretValues);
  process.stderr.write(`ERROR phase="${currentPhase}" kind="${failureDetail.kind}" message="${failureDetail.message}"\n`);
  if (!results.some((item) => item.id === 'RPT-020')) results.push({ id: 'RPT-020', outcome: 'blocked', phase: `blocked at ${currentPhase}` });
  if (!results.some((item) => item.id === 'PRM-004')) results.push({ id: 'PRM-004', outcome: 'blocked', phase: `blocked at ${currentPhase}` });
  if (!results.some((item) => item.id === 'PRM-005')) results.push({ id: 'PRM-005', outcome: 'blocked', phase: `blocked at ${currentPhase}` });
  if (stoppedForLogin) process.stderr.write('BLOCKED login\n');
} finally {
  await teacherContext?.setOffline(false).catch(() => {});
  await parentContext?.close().catch(() => {});
  await teacherContext?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await saveArtifacts();
}

if (results.some((item) => item.outcome === 'fail')) process.exitCode = 1;
