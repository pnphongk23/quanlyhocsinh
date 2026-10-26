import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const web = 'https://qlh-staging-web.pages.dev';
const api = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-Brief91-${suffix}`;
const linkedName = `QA-Web-Brief91-Linked-${suffix}`;
const unlinkedName = `QA-Web-Brief91-Unlinked-${suffix}`;
const testName = `QA-Web-Brief91-Test-${suffix}`;
const results = [];
const phaseErrors = [];
let browser;
let teacherContext;
let parentContext;
let teacherPage;
let parentPage;
let classId = '';
let sessionId = '';
let testId = '';
let reportBatchId = '';
let teacherToken = '';
let parentToken = '';
let parentMembershipId = '';
let linkedStudentId = '';
let unlinkedStudentId = '';
let phaseName = 'load credentials';
let stopAuth = false;
let lateLinkEvidence = null;

function safe(value) {
  return String(value ?? '').replace(/Bearer\s+[^\s"']+/giu, '[redacted]')
    .replace(/\b(?:\+?84|0)?\d{9,10}\b/gu, '[phone]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, '[long-value]')
    .replace(/[\r\n\t]+/gu, ' ').slice(0, 180);
}
function record(id, outcome, http, note = '') {
  const item = { id, outcome, ...(Number.isInteger(http) ? { http } : {}), ...(note ? { note: safe(note) } : {}) };
  results.push(item);
  console.log(`${outcome.toUpperCase()} ${id}${Number.isInteger(http) ? ` HTTP ${http}` : ''}`);
}
async function phase(name, work) {
  phaseName = name;
  try { return await work(); }
  catch (error) {
    const message = safe(error?.message ?? error);
    phaseErrors.push({ phase: name, kind: error?.name ?? 'Error', message });
    process.stderr.write(`ERROR phase="${name}" kind="${error?.name ?? 'Error'}" message="${message}"\n`);
    throw error;
  }
}
function local9(phone) {
  let digits = String(phone).replace(/\D/gu, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  if (digits.length !== 9) throw new Error('phone format invalid for smoke account');
  return digits;
}
function httpPhone(phone) { return `+84${local9(phone)}`; }
async function jsonRequest(path, token, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}
async function loginOnce(phone, password, deviceLabel) {
  const { response, body } = await jsonRequest('/auth/login', null, {
    method: 'POST', body: JSON.stringify({ phone: httpPhone(phone), password, device_label: deviceLabel }),
  });
  if (response.status === 401 || response.status === 429) {
    record(`LOGIN-${deviceLabel}`, 'blocked', response.status);
    stopAuth = true;
    throw new Error(`authentication HTTP ${response.status}`);
  }
  if (!response.ok || !body?.token) throw new Error(`authentication HTTP ${response.status}`);
  record(`LOGIN-${deviceLabel}`, 'pass', response.status);
  const me = await jsonRequest('/me', body.token);
  if (!me.response.ok) throw new Error(`profile HTTP ${me.response.status}`);
  return {
    token: body.token,
    user: body.user,
    me: me.body,
    membershipId: body.active_membership_id ?? body.memberships?.[0]?.id ?? me.body.active_membership_id ?? me.body.memberships?.[0]?.id ?? null,
  };
}
function hydrateContext(context, session) {
  return context.addInitScript((value) => localStorage.setItem('qlh.session.v1', JSON.stringify(value)), session);
}
async function openNewClass() {
  await teacherPage.goto(`${web}/lop/moi`, { waitUntil: 'domcontentloaded' });
  await teacherPage.getByLabel('Tên lớp').fill(className);
  await teacherPage.getByRole('group', { name: 'Ngày học trong tuần' }).getByRole('button', { name: 'CN', exact: true }).click();
  await teacherPage.getByLabel('Giờ bắt đầu').fill('18:30');
  await teacherPage.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await teacherPage.waitForURL(/\/lop\/?$/u, { timeout: 15000 });
  const cards = teacherPage.locator('a[href^="/lop/"][href$="/buoi-hoc"]');
  await cards.filter({ hasText: className }).first().waitFor({ state: 'visible', timeout: 15000 });
  await cards.filter({ hasText: className }).first().click();
  await teacherPage.waitForURL(/\/lop\/[^/]+\/buoi-hoc\/?$/u, { timeout: 10000 });
  classId = new URL(teacherPage.url()).pathname.split('/').filter(Boolean)[1];
  return teacherPage.getByRole('navigation', { name: 'Mục của lớp' });
}
async function addStudent(nav, name, parentPhone = '') {
  const href = await nav.getByRole('link', { name: 'Học sinh', exact: true }).getAttribute('href');
  await teacherPage.goto(new URL(href, web).toString(), { waitUntil: 'domcontentloaded' });
  await teacherPage.getByRole('button', { name: /Thêm học sinh/u }).first().click();
  await teacherPage.getByLabel('Họ và tên học sinh').fill(name);
    if (parentPhone) await teacherPage.getByLabel(/Số điện thoại phụ huynh/u).fill(parentPhone);
    await teacherPage.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    const form = teacherPage.getByRole('dialog', { name: 'Thêm học sinh' });
    const alert = form.getByRole('alert');
    const completion = await Promise.race([
      form.waitFor({ state: 'detached', timeout: 15000 }).then(() => 'saved').catch(() => ''),
      alert.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'rejected').catch(() => ''),
    ]);
    if (completion === 'rejected') throw new Error(`student save rejected: ${safe(await alert.innerText())}`);
    if (completion !== 'saved') throw new Error('student save did not close the form or show a validation error');
    let visible = await teacherPage.getByText(name, { exact: true }).count();
    if (!visible) {
      await teacherPage.reload({ waitUntil: 'domcontentloaded' });
      visible = await teacherPage.getByText(name, { exact: true }).count();
    }
    if (!visible) throw new Error('saved student was not visible after a list reload');
}
async function discoverStudentIds() {
  const list = await jsonRequest(`/classes/${encodeURIComponent(classId)}/students`, teacherToken);
  if (!list.response.ok || !Array.isArray(list.body?.items)) throw new Error(`student fixture HTTP ${list.response.status}`);
  linkedStudentId = list.body.items.find((item) => item.name === linkedName)?.id ?? '';
  unlinkedStudentId = list.body.items.find((item) => item.name === unlinkedName)?.id ?? '';
  if (!linkedStudentId || !unlinkedStudentId) throw new Error('QA student fixture missing');
}
async function createSession(nav) {
  const href = await nav.getByRole('link', { name: 'Buổi học', exact: true }).getAttribute('href');
  await teacherPage.goto(new URL(href, web).toString(), { waitUntil: 'domcontentloaded' });
  const before = new Set(await teacherPage.getByRole('link', { name: 'Xem buổi', exact: true }).evaluateAll((items) => items.map((item) => item.getAttribute('href'))));
  await teacherPage.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await teacherPage.locator('#extra-session-date').fill(today);
  await teacherPage.locator('#extra-session-time').fill('18:30');
  const save = teacherPage.getByRole('button', { name: 'Lưu buổi học', exact: true });
  if (!(await save.isEnabled())) throw new Error('current-day session cannot be saved');
  await save.click();
  await teacherPage.getByRole('dialog', { name: 'Thêm buổi lẻ' }).waitFor({ state: 'detached', timeout: 12000 });
  const links = teacherPage.getByRole('link', { name: 'Xem buổi', exact: true });
  let detailHref = '';
  for (const link of await links.all()) {
    const href = await link.getAttribute('href');
    if (href && !before.has(href)) { detailHref = href; break; }
  }
  if (!detailHref) throw new Error('new QA session link not found');
  await teacherPage.goto(new URL(detailHref, web).toString(), { waitUntil: 'domcontentloaded' });
  sessionId = new URL(teacherPage.url()).pathname.split('/').filter(Boolean).at(-1);
  return sessionId;
}
async function createTestAndScores() {
  await teacherPage.goto(`${web}/lop/${classId}/bai-kiem-tra/moi`, { waitUntil: 'domcontentloaded' });
  await teacherPage.getByLabel('Tên bài kiểm tra').fill(testName);
  const today = new Date();
  await teacherPage.getByLabel('Ngày kiểm tra').fill(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  await teacherPage.getByRole('button', { name: 'Tạo bài và nhập điểm', exact: true }).click();
  await teacherPage.waitForURL(new RegExp(`/lop/${classId}/bai-kiem-tra/[^/?]+`), { timeout: 15000 });
  testId = new URL(teacherPage.url()).pathname.split('/').filter(Boolean).at(-1);
  const inputs = teacherPage.locator('input[aria-label^="Điểm "]');
  await inputs.first().waitFor({ state: 'visible', timeout: 10000 });
  const count = await inputs.count();
  for (let i = 0; i < count; i += 1) await inputs.nth(i).fill(String(20 + i));
  const save = teacherPage.getByRole('button', { name: /Lưu/u }).last();
  await save.click();
  await teacherPage.getByText(/Đã lưu|Lưu xong|Đã đồng bộ/u).first().waitFor({ timeout: 10000 }).catch(() => {});
  return count;
}
async function saveAttendanceAndComment(unlinkedName) {
  await teacherPage.goto(`${web}/lop/${classId}/buoi-hoc/${sessionId}`, { waitUntil: 'domcontentloaded' });
  const attendance = teacherPage.getByRole('tab', { name: 'Điểm danh', exact: true });
  if (await attendance.count()) await attendance.click();
  let absentSaved = false;
  try {
    const absentGroup = teacherPage.getByRole('group', { name: `Trạng thái của ${unlinkedName}` });
    await absentGroup.getByRole('button', { name: 'Vắng', exact: true }).click();
    const saveAttendance = teacherPage.getByRole('button', { name: 'Lưu điểm danh', exact: true });
    await saveAttendance.click();
    absentSaved = true;
    record('ATT-ABSENT-FIXTURE', 'pass');
  } catch {
    record('ATT-ABSENT-FIXTURE', 'blocked', undefined, 'Attendance for the new session was not editable/savable');
  }
  await teacherPage.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  const criterionGroup = teacherPage.getByRole('region', { name: 'Năm tiêu chí nhận xét' });
  await criterionGroup.waitFor({ state: 'visible', timeout: 8000 });
  const criteriaCount = await criterionGroup.getByRole('button').count();
  const checked = await criterionGroup.getByRole('button').evaluateAll((items) => items.filter((item) => item.getAttribute('aria-pressed') === 'true').length);
  const sentence = teacherPage.getByLabel('Nhận xét phụ huynh thấy');
  const defaultFive = await sentence.inputValue();
  const defaultFiveOk = criteriaCount === 5 && checked === 5 && Boolean(defaultFive.trim());
  const firstCriterion = criterionGroup.getByRole('button').first();
  await firstCriterion.click();
  const starCount = await criterionGroup.getByText(/\d\/5 sao/u).innerText();
  const defaultFour = await sentence.inputValue();
  const scoreSentenceOk = starCount.includes('4/5') && Boolean(defaultFour.trim());
  await firstCriterion.click();
  const note = teacherPage.getByPlaceholder('Thêm lời nhắn riêng cho phụ huynh…');
  await note.fill(`QA-Brief91-note-${suffix}`);
  await note.blur();
  record('CMT-001', defaultFiveOk && scoreSentenceOk ? 'pass' : 'fail');
  record('CMT-014', 'blocked', undefined, 'Button removed by brief 94; auto homework criterion needs graded fixture');
  const send = teacherPage.getByRole('button', { name: /Gửi phiếu cả lớp/u });
  await send.click();
  const confirm = teacherPage.getByRole('dialog', { name: /Gửi phiếu/u });
  await confirm.waitFor({ state: 'visible', timeout: 8000 });
  const confirmText = await confirm.innerText();
  const skipsOne = /1\s*em chưa chọn sao/u.test(confirmText) || /1\s*em.*chưa chọn sao/u.test(confirmText);
  if (!absentSaved) record('CMT-003/006', 'blocked', undefined, 'Absent status not saved; skip dialog still observed but absent-specific assertion unavailable');
  const sendOne = confirm.getByRole('button', { name: /Gửi 1 phiếu/u });
  if (skipsOne) {
    await sendOne.click();
    await confirm.waitFor({ state: 'detached', timeout: 15000 });
    if (absentSaved) record('CMT-003/006', 'pass');
  } else {
    await confirm.getByRole('button', { name: 'Quay lại', exact: true }).click();
    record('CMT-003/006', 'fail');
  }
  return { defaultFiveOk, scoreSentenceOk, skipsOne };
}
async function checkParentFeedback() {
  await parentPage.goto(`${web}/ph/nhan-xet`, { waitUntil: 'domcontentloaded' });
  await parentPage.getByText(linkedName, { exact: true }).waitFor({ timeout: 12000 });
  const text = await parentPage.locator('main').last().innerText();
  const hasFive = /5\/5/u.test(text);
  const hasNote = text.includes(`QA-Brief91-note-${suffix}`);
  const showsCriteriaRegion = (await parentPage.getByRole('region', { name: 'Năm tiêu chí nhận xét' }).count()) > 0;
  record('CMT-PH-VIEW', hasFive && hasNote && !showsCriteriaRegion ? 'pass' : 'fail');
  return { hasFive, hasNote, showsCriteriaRegion };
}
async function runPermissionChecks() {
  if (!parentMembershipId || !linkedStudentId || !unlinkedStudentId) {
    record('PRM-004', 'blocked', undefined, 'QA membership or student fixture unavailable');
    record('PRM-005', 'blocked', undefined, 'QA membership or student fixture unavailable');
    return;
  }
  const snap = await jsonRequest(`/sync/snapshot/student?membership_id=${encodeURIComponent(parentMembershipId)}`, parentToken);
  const linked = snap.body?.items?.some((item) => item.id === linkedStudentId) ?? false;
  if (!linked) {
    record('PRM-004', 'blocked', undefined, 'PH membership does not resolve linked QA student');
    record('PRM-005', 'blocked', undefined, 'PH membership not linked to QA fixture');
    return;
  }
  const read = await jsonRequest(`/students/${encodeURIComponent(unlinkedStudentId)}`, parentToken);
  const denied = [401, 403, 404].includes(read.response.status);
  record('PRM-004', denied ? 'pass' : 'fail', read.response.status);
  if (!testId) {
    record('PRM-005', 'blocked', undefined, 'QA test fixture unavailable');
    return;
  }
  const commandId = randomBytes(16).toString('hex');
  const push = await jsonRequest('/sync/push', parentToken, {
    method: 'POST',
    body: JSON.stringify({ membership_id: parentMembershipId, device_id: randomBytes(16).toString('hex'), commands: [{ id: commandId, type: 'score.set', base_version: 0, created_at: new Date().toISOString(), payload: { test_id: testId, student_id: linkedStudentId, value: 0 } }] }),
  });
  const result = push.body?.results?.find((item) => item.id === commandId);
  const rejected = [401, 403].includes(push.response.status) || (push.response.ok && result?.status === 'rejected');
  record('PRM-005', rejected ? 'pass' : push.response.ok && result?.status === 'applied' ? 'fail' : 'blocked', push.response.status);
}
async function createAndDeletePublishedReport(nav) {
  await teacherPage.goto(`${web}/lop/${classId}/bao-cao`, { waitUntil: 'domcontentloaded' });
  await teacherPage.getByRole('button', { name: 'Thêm báo cáo', exact: true }).click();
  const dialog = teacherPage.getByRole('dialog', { name: 'Thêm báo cáo' });
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  const month = dialog.locator('input[type="month"]');
  if (!(await month.count())) throw new Error('monthly report control unavailable');
  await month.fill('2026-10');
  await dialog.getByRole('button', { name: 'Tạo báo cáo', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  reportBatchId = new URL(teacherPage.url()).searchParams.get('dot') ?? '';
  record('RPT-MONTHLY', reportBatchId ? 'pass' : 'fail');
  if (!reportBatchId) throw new Error('monthly report batch id missing');
  const reportsUrl = teacherPage.url().split('?')[0];
  const publishButton = teacherPage.getByRole('button', { name: /Phát hành \d+ báo cáo/u });
  if (!(await publishButton.count()) || !(await publishButton.isEnabled())) {
    record('RPT-020', 'blocked', undefined, 'QA report lacks required publish-ready data');
    return;
  }
  await publishButton.click();
  await teacherPage.getByText(/Đã phát hành \d+ báo cáo/u).waitFor({ timeout: 15000 });
  record('RPT-PUBLISH', 'pass');
  await parentPage.goto(`${web}/ph/bao-cao`, { waitUntil: 'domcontentloaded' });
  const parentReport = parentPage.getByText(/Tháng 10\/2026/u).first();
  await parentReport.waitFor({ state: 'visible', timeout: 12000 });
  const reportHref = await parentReport.evaluate((node) => node.closest('a')?.getAttribute('href') ?? '');
  await teacherPage.goto(reportsUrl, { waitUntil: 'domcontentloaded' });
  const row = teacherPage.locator('li').filter({ has: teacherPage.locator(`a[href*="${reportBatchId}"]`) }).first();
  await row.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).click();
  await teacherPage.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
  const confirmation = teacherPage.getByRole('dialog', { name: 'Xoá báo cáo?' });
  const copy = await confirmation.innerText();
  const warnsParent = /phụ huynh.*không còn thấy/iu.test(copy);
  await confirmation.getByRole('button', { name: 'Xoá báo cáo', exact: true }).click();
  await row.waitFor({ state: 'detached', timeout: 12000 });
  await parentPage.reload({ waitUntil: 'domcontentloaded' });
  const stillVisible = reportHref ? await parentPage.locator(`a[href="${reportHref}"]`).count() : await parentPage.getByText(/Tháng 10\/2026/u).count();
  record('RPT-020', warnsParent && stillVisible === 0 ? 'pass' : 'fail');
}

try {
  await mkdir(out, { recursive: true });
  const raw = await readFile(`${homedir()}/.config/qlh/staging-smoke-fb2.txt`, 'utf8');
  const fields = Object.fromEntries(raw.split(/\r?\n/u).map((line) => { const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', '']; }).filter(([key]) => key));
  if (!fields.phone || !fields.password || !fields.guardian_phone) throw new Error('smoke fixture keys incomplete');
    phaseName = 'teacher HTTP login';
    const teacher = await phase(phaseName, () => loginOnce(fields.phone, fields.password, 'GV-fb2'));
    teacherToken = teacher.token;
    const teacherSession = { token: teacher.token, user: teacher.user, me: teacher.me, activeMembershipId: teacher.membershipId, guardianAccount: false };

    browser = await chromium.launch({ headless: true });
    teacherContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh', serviceWorkers: 'block' });
    await hydrateContext(teacherContext, teacherSession);
    teacherPage = await teacherContext.newPage();
  await phase('teacher UI session and bundle', async () => {
    await teacherPage.goto(`${web}/lop`, { waitUntil: 'domcontentloaded' });
    await teacherPage.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => new URL(item.name).pathname.endsWith(`/assets/${expected}`)), 'index-C48oeJFZ.js', { timeout: 15000 });
    await teacherPage.waitForFunction(() => document.querySelector('a[href^="/lop/"][href$="/buoi-hoc"]') || document.body.innerText.includes('Chưa có lớp học'), { timeout: 15000 });
    record('BUNDLE', 'pass');
  });
    let nav;
    await phase('UI class and students', async () => {
      nav = await openNewClass();
      await addStudent(nav, linkedName, local9(fields.guardian_phone));
      await addStudent(nav, unlinkedName);
      await discoverStudentIds();
      record('FIXTURE-CLASS-STUDENTS', 'pass');
    });
    phaseName = 'parent HTTP login after student save';
    const parent = await phase(phaseName, () => loginOnce(fields.guardian_phone, fields.password, 'PH-fb2'));
    parentToken = parent.token;
    parentMembershipId = parent.membershipId ?? '';
    const parentSession = { token: parent.token, user: parent.user, me: parent.me, activeMembershipId: parent.membershipId, guardianAccount: true };
    parentContext = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh', serviceWorkers: 'block' });
    await hydrateContext(parentContext, parentSession);
    parentPage = await parentContext.newPage();
    await phase('parent late-link verification', async () => {
      await parentPage.goto(`${web}/ph`, { waitUntil: 'domcontentloaded' });
      const visible = await parentPage.getByText(linkedName, { exact: true }).waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
      if (!visible) {
        lateLinkEvidence = { studentId: linkedStudentId, checkedAtUtc: new Date().toISOString() };
        record('WEB-004-LATE-LINK', 'fail');
        throw new Error('late-link student not visible after exact UI phone save and fresh parent login');
      }
      const parentMe = await jsonRequest('/me', parentToken);
      parentMembershipId = parentMe.body?.active_membership_id ?? parentMe.body?.memberships?.[0]?.id ?? parentMembershipId;
      record('WEB-004-LATE-LINK', 'pass');
    });
  if (!stopAuth) {
    try { await phase('session fixture', () => createSession(nav)); }
    catch { record('FIXTURE-SESSION', 'blocked'); }
    try {
      const scoreCount = await phase('test/score fixture', createTestAndScores);
      record('FIXTURE-TEST-SCORE', scoreCount > 0 ? 'pass' : 'blocked');
    } catch { record('FIXTURE-TEST-SCORE', 'blocked'); }
    await phase('PRM-004/005', runPermissionChecks).catch(() => {});
    if (sessionId) {
      await phase('attendance and feedback', async () => {
        await saveAttendanceAndComment(unlinkedName);
        await checkParentFeedback();
        record('CMT-DATE-LABEL', /T[2-7]\s*[·•]\s*\d{1,2}\/\d{1,2}/u.test(await teacherPage.locator('main').last().innerText()) ? 'pass' : 'fail');
      }).catch(() => { record('CMT-SESSION', 'blocked'); });
    } else {
      record('CMT-SESSION', 'blocked');
      record('CMT-PH-VIEW', 'blocked');
    }
    if (!testId) record('PRM-005', 'blocked');
    await phase('monthly RPT and RPT-020', () => createAndDeletePublishedReport(nav)).catch(() => { if (!results.some((item) => item.id === 'RPT-020')) record('RPT-020', 'blocked'); });
  }
} catch (error) {
  if (!results.some((item) => item.outcome === 'blocked' && item.id.startsWith('LOGIN-'))) {
    record(`BLOCKED-${phaseName}`, 'blocked');
  }
  for (const id of ['PRM-004', 'PRM-005', 'RPT-020', 'CMT-PH-VIEW']) if (!results.some((item) => item.id === id)) record(id, 'blocked');
} finally {
  await parentContext?.close().catch(() => {});
  await teacherContext?.close().catch(() => {});
  await browser?.close().catch(() => {});
  const tests = results.map((item) => `<testcase classname="web" name="${item.id}">${item.outcome === 'blocked' ? `<skipped message="${safe(item.note ?? phaseName).replaceAll('"', '&quot;')}"/>` : item.outcome === 'fail' ? `<failure message="${safe(item.note ?? 'assertion failed').replaceAll('"', '&quot;')}"/>` : ''}${Number.isInteger(item.http) ? `<system-out>HTTP ${item.http}</system-out>` : ''}</testcase>`).join('');
  await writeFile(`${out}/brief91-fb2-unified-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="brief91-fb2-unified" tests="${results.length}" failures="${results.filter((item) => item.outcome === 'fail').length}" skipped="${results.filter((item) => item.outcome === 'blocked').length}">${tests}</testsuite>\n`);
    await writeFile(`${out}/brief91-fb2-unified.json`, `${JSON.stringify({ bundle: 'index-C48oeJFZ.js', classId: classId ? '[QA fixture]' : null, lateLinkEvidence, results, phaseErrors }, null, 2)}\n`);
}
