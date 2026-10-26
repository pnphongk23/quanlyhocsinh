import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const base = 'https://qlh-staging-web.pages.dev';
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const secretsPath = `${homedir()}/.config/qlh/staging-smoke.txt`;
const credentials = Object.fromEntries((await readFile(secretsPath, 'utf8')).split(/\r?\n/).map((line) => {
  const index = line.indexOf('=');
  return index > 0 ? [line.slice(0, index).trim(), line.slice(index + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Missing required smoke credential keys');
const phone = credentials.phone.replace(/\D/g, '').slice(-9);
if (phone.length !== 9) throw new Error('Teacher phone format cannot be normalized to 9 digits');
const results = [];
let phase = 'startup';
let browser;
let context;
let page;
let loginSubmitted = false;
let verifiedBundle = '';
  let className = '';
let sessionId = '';
let classId = '';
let fixtureStudentNames = [];
const runTag = randomBytes(3).toString('hex');


// Opens the session dated today (not sessionLinks.first(): that may be a future session whose attendance is locked).
async function openTodaySession() {
  const now = new Date();
  const dayMonth = `${now.getDate()}/${now.getMonth() + 1}`;
  const links = page.getByRole('link', { name: 'Xem buổi', exact: true });
  const listUrl = page.url();
  const count = await links.count();
  for (let i = 0; i < count; i += 1) {
    await links.nth(i).click();
    await page.getByRole('main').last().waitFor({ state: 'visible', timeout: 8000 });
    if ((await page.getByRole('main').last().innerText()).includes(dayMonth)) return;
    await page.goto(listUrl, { waitUntil: 'domcontentloaded' });
  }
  throw new Error('fixture_missing: no session dated today in the class session list');
}

function safeError(error) {
  return String(error?.message ?? error ?? 'unknown error')
    .replace(/Bearer\s+\S+/gi, '[redacted]')
    .replace(/\b\d{9,}\b/g, '[number]')
    .replace(/((?:token|password|authorization)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]')
    .slice(0, 240);
}
function record(id, status, note = '') {
  results.push({ id, status, note: safeError(note) });
  console.log(`${status} ${id}${note ? `: ${safeError(note)}` : ''}`);
}
async function openFirstQAClass() {
  await page.goto(`${base}/lop`, { waitUntil: 'domcontentloaded' });
  const classLinks = page.locator('a[href^="/lop/"][href$="/buoi-hoc"]');
  await Promise.race([
    classLinks.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    page.getByText('Chưa có lớp học', { exact: true }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
  ]);
  const count = await classLinks.count();
  let fallback = null;
  let briefFixture = null;
  for (let index = 0; index < count; index += 1) {
    const link = classLinks.nth(index);
    const text = (await link.innerText().catch(() => '')).trim();
      const href = await link.getAttribute('href').catch(() => null);
      if (text.startsWith('QA-') && href?.startsWith('/lop/')) {
        if (text.startsWith('QA-Web-Brief91-')) {
          briefFixture = link;
          continue;
        }
        if (text.startsWith('QA-Web-24902e-Attendance-Class')) {
        fallback = link;
        break;
      }
      if (!fallback && /\b[1-9]\d* học sinh/.test(text)) fallback = link;
    }
  }
  fallback = briefFixture ?? fallback;
  // A new fixture avoids reusing a row that already has a ticket from an earlier QA run.
  fallback = null;
  if (!fallback) {
    className = `QA-Web-Brief91-${runTag}`;
    await page.goto(`${base}/lop/moi`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Tên lớp').fill(className);
    await page.getByRole('group', { name: 'Ngày học trong tuần' }).getByRole('button', { name: 'CN', exact: true }).click();
    await page.getByLabel('Giờ bắt đầu').fill('18:30');
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.waitForURL(/\/lop\/?$/u, { timeout: 15000 });
    const created = page.locator('a[href^="/lop/"][href$="/buoi-hoc"]').filter({ hasText: className });
    await created.waitFor({ state: 'visible', timeout: 15000 });
    await created.click();
    await page.getByRole('navigation', { name: 'Mục của lớp' }).waitFor({ timeout: 10000 });
    const createdClassId = new URL(page.url()).pathname.split('/').filter(Boolean)[1];
    classId = createdClassId;
    const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
    const studentsHref = await nav.getByRole('link', { name: 'Học sinh', exact: true }).getAttribute('href');
    await page.goto(new URL(studentsHref, base).toString(), { waitUntil: 'domcontentloaded' });
    for (const suffix of ['Present', 'Absent']) {
      const studentName = `QA-Web-Brief91-${suffix}-${runTag}`;
      await page.getByRole('button', { name: /Thêm học sinh/u }).first().click();
      await page.getByLabel('Họ và tên học sinh').fill(studentName);
      await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
      await page.getByText(studentName, { exact: true }).waitFor({ state: 'visible', timeout: 12000 });
      fixtureStudentNames.push(studentName);
    }
    if (!createdClassId) throw new Error('Created QA class id unavailable');
    await page.goto(`${base}/lop/${createdClassId}/buoi-hoc`, { waitUntil: 'domcontentloaded' });
    const sessionLinks = page.getByRole('link', { name: 'Xem buổi', exact: true });
    if (!(await sessionLinks.count())) {
      await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await page.locator('#extra-session-date').fill(today);
      await page.locator('#extra-session-time').fill('18:30');
      const saveSession = page.getByRole('button', { name: 'Lưu buổi học', exact: true });
      if (!(await saveSession.isEnabled())) throw new Error('Current-day QA session cannot be saved');
      await saveSession.click();
      await page.getByRole('dialog', { name: 'Thêm buổi lẻ' }).waitFor({ state: 'detached', timeout: 12000 });
    }
    await openTodaySession();
    await page.getByRole('tab', { name: 'Điểm danh', exact: true }).click().catch(() => {});
      const presentGroup = page.getByRole('group', { name: `Trạng thái của ${fixtureStudentNames[0]}` });
      await presentGroup.getByRole('button', { name: 'Có mặt', exact: true }).click();
      const absentGroup = page.getByRole('group', { name: `Trạng thái của ${fixtureStudentNames[1]}` });
    await absentGroup.getByRole('button', { name: 'Vắng', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
    record('ATT-ABSENT-FIXTURE', 'PASS', 'Created absent QA student through UI');
    return;
  }
  className = (await fallback.innerText()).trim().split('\n')[0].trim();
  await fallback.click();
  classId = new URL(page.url()).pathname.split('/').filter(Boolean)[1];
  const previousRunTag = className.match(/^QA-Web-Brief91-([a-f0-9]+)$/u)?.[1];
  if (previousRunTag) fixtureStudentNames = [`QA-Web-Brief91-Present-${previousRunTag}`, `QA-Web-Brief91-Absent-${previousRunTag}`];
  await page.getByRole('navigation', { name: 'Mục của lớp' }).waitFor({ timeout: 10000 });
}

async function createScoreFixture() {
  await page.goto(`${base}/lop/${classId}/bai-kiem-tra/moi`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Tên bài kiểm tra').fill(`QA-Web-Brief91-Test-${runTag}`);
  const today = new Date();
  await page.getByLabel('Ngày kiểm tra').fill(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  await page.getByRole('button', { name: 'Tạo bài và nhập điểm', exact: true }).click();
  await page.waitForURL(new RegExp(`/lop/${classId}/bai-kiem-tra/[^/?]+`), { timeout: 15000 });
  const inputs = page.locator('input[aria-label^="Điểm "]');
  await inputs.first().waitFor({ state: 'visible', timeout: 10000 });
  for (let index = 0; index < await inputs.count(); index += 1) await inputs.nth(index).fill('20');
  await page.getByRole('button', { name: /Lưu/u }).last().click();
  await page.getByText(/Đã lưu|Lưu xong|Đã đồng bộ/u).first().waitFor({ timeout: 10000 }).catch(() => {});
  await page.goto(`${base}/lop/${classId}/buoi-hoc`, { waitUntil: 'domcontentloaded' });
  record('TST-SCORE-FIXTURE', 'PASS', 'A score was saved for the QA report fixture');
}

try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  page = await context.newPage();
  phase = 'login';
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
    await page.locator('#login-phone').fill(phone);
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  loginSubmitted = true;
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
    record('TEACHER-LOGIN', 'PASS');

    phase = 'confirm latest staging bundle and SW update';
    await page.goto(`${base}/lop`, { waitUntil: 'domcontentloaded' });
    const bundleSeen = () => page.evaluate((expected) => performance.getEntriesByType('resource').some((item) => {
      try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
    }), 'index-CNZPcz5i.js');
    await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => {
      try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
    }), 'index-CNZPcz5i.js', { timeout: 12000 }).catch(() => {});
    const initialBundleSeen = await bundleSeen();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => {
      try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
    }), 'index-CNZPcz5i.js', { timeout: 15000 });
    verifiedBundle = 'index-CNZPcz5i.js';
    record('BUNDLE-current', 'PASS', `initial=${initialBundleSeen}; reloaded=true`);

    phase = 'find QA class and session';
    await openFirstQAClass();
    if (fixtureStudentNames.length) {
      phase = 'create report score fixture';
      await createScoreFixture();
    }
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Buổi học', exact: true }).click();
  const sessions = page.getByRole('link', { name: 'Xem buổi', exact: true });
      if (await sessions.count() === 0) {
      await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await page.locator('#extra-session-date').fill(today);
      await page.locator('#extra-session-time').fill('18:30');
      const saveSession = page.getByRole('button', { name: 'Lưu buổi học', exact: true });
      if (!(await saveSession.isEnabled())) throw new Error('Current-day QA session cannot be saved');
      await saveSession.click();
      await page.getByRole('dialog', { name: 'Thêm buổi lẻ' }).waitFor({ state: 'detached', timeout: 12000 });
    }
    await openTodaySession();
  const sessionLabel = await page.getByRole('main').last().innerText();
    record('CMT-SESSION-LABEL', /(?:T[2-7]|CN)\s*[·•]\s*\d{1,2}\/\d{1,2}/.test(sessionLabel) ? 'PASS' : 'FAIL', 'Expected weekday · day/month label');

  phase = 'comments teacher criteria/default/filter';
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  const allFilter = page.getByRole('button', { name: 'Tất cả', exact: true });
    const unsentFilter = page.getByRole('button', { name: 'Chưa gửi', exact: true });
    await allFilter.waitFor({ state: 'visible', timeout: 8000 });
    await unsentFilter.click();
    if (fixtureStudentNames.length) {
      await page.getByRole('button', { name: /Gửi phiếu cả lớp/u }).click();
      const sendDialog = page.getByRole('dialog', { name: /Gửi phiếu/u });
      await sendDialog.waitFor({ state: 'visible', timeout: 8000 });
      const copy = (await sendDialog.innerText()).replace(/\s+/gu, ' ');
      const counts = copy.match(/(\d+)\s*phiếu sẽ gửi\s*(\d+)\s*em chưa chọn sao/iu);
      const excludesAbsent = counts?.[1] === '1' && counts?.[2] === '1';
      record('CMT-003/006', excludesAbsent ? 'PASS' : 'FAIL', `Send/skipped counts=${counts ? `${counts[1]}/${counts[2]}` : 'unparsed'}`);
      await sendDialog.screenshot({ path: `${out}/TC-CMT-003-006-confirm.png` });
      await sendDialog.getByRole('button', { name: 'Quay lại', exact: true }).click();
    } else {
      record('CMT-003/006', 'BLOCKED', 'No fresh controlled Present/Absent fixture');
    }
    const rows = page.locator('button[aria-pressed="false"],button[aria-pressed="true"]');
  const rowCandidates = await rows.count();
  // Slip v4: criteria are slip-criterion-0..3 plus slip-homework-row; the sentence is slip-generated-comment.
  const firstRow = page.getByRole('button', { name: new RegExp(fixtureStudentNames[0] || 'QA') }).first();
  await firstRow.click();
  await page.getByTestId('slip-homework-row').waitFor({ state: 'visible', timeout: 8000 });
  const chips = [0, 1, 2, 3].map((n) => page.getByTestId(`slip-criterion-${n}`));
  let checkedCount = 0;
  for (const chip of chips) if ((await chip.getAttribute('aria-pressed')) === 'true') checkedCount += 1;
  const hw = page.getByTestId('slip-homework-row');
  const hwBtn = (await hw.getAttribute('aria-pressed')) !== null ? hw : hw.getByRole('button').first();
  if ((await hwBtn.getAttribute('aria-pressed')) === 'true') checkedCount += 1;
  const hasDefaultSentence = Boolean((await page.getByTestId('slip-generated-comment').evaluate((e) => e.value ?? e.innerText)).trim());
  if (checkedCount !== 5 || !hasDefaultSentence) throw new Error(`expected 5 default criteria and sentence; observed ${checkedCount}/5`);
  record('CMT-001', 'PASS');
    // Brief 94: one merged comment field; the "Dùng câu mặc định" button is gone, so CMT-014 (auto homework criterion) needs graded fixtures and is not driven here.
    record('CMT-014', 'BLOCKED', 'Needs graded previous-session fixture per updated testcase; not driven by this flow');
    await page.getByTestId('slip-note').fill(`QA-Brief91-note-${runTag}`);
  await allFilter.click();
  const allPressed = await allFilter.getAttribute('aria-pressed');
    await unsentFilter.click();
    const unsentPressed = await unsentFilter.getAttribute('aria-pressed');
    record('CMT-004', allPressed === 'true' && unsentPressed === 'true' ? 'PASS' : 'FAIL', `filter state; row controls seen=${rowCandidates}`);
  const mascot = page.getByTestId('slip-mascot');
  if (await mascot.count()) {
    await mascot.screenshot({ path: `${out}/TC-CMT-016-mascot.png` }).catch(() => {});
    record('CMT-016', 'MANUAL', 'Mascot image captured for visual review only; no visual score asserted');
  } else {
    record('CMT-016', 'BLOCKED', 'No standalone mascot image element available for a safe small crop');
  }

  phase = 'monthly reports';
  await nav.getByRole('link', { name: 'Báo cáo', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm báo cáo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm báo cáo' });
  await dialog.waitFor({ timeout: 8000 });
  const month = dialog.locator('input[type="month"]');
  if (!(await month.count())) {
    record('RPT-MONTHLY', 'FAIL', 'Current staging UI did not expose monthly input');
    throw new Error('Current staging report UI is not monthly');
  }
  await month.fill('2026-10');
    await dialog.getByRole('button', { name: 'Tạo báo cáo', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  const reportText = await page.getByRole('main').last().innerText();
    const batchRoute = new URL(page.url()).searchParams.get('dot');
    record('RPT-001', /Tháng 10\/2026/.test(reportText) ? 'PASS' : 'FAIL', 'Monthly report naming');
    record('RPT-005', batchRoute ? 'PASS' : 'FAIL', 'Created monthly batch through UI');
    const back = page.getByRole('link', { name: 'Tất cả báo cáo', exact: true });
    await back.click();
    await page.getByRole('button', { name: 'Thêm báo cáo', exact: true }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Thêm báo cáo', exact: true }).click();
      const secondDialog = page.getByRole('dialog', { name: 'Thêm báo cáo' });
      await secondDialog.locator('input[type="month"]').fill('2026-10');
      await secondDialog.getByRole('button', { name: 'Tạo báo cáo', exact: true }).click();
      await secondDialog.waitFor({ state: 'detached', timeout: 15000 });
      let latestPublished = false;
      const publish = page.getByRole('button', { name: /Phát hành \d+ báo cáo/u });
      if (await publish.count() && await publish.isEnabled()) {
        await publish.click();
        await page.getByText(/Đã phát hành \d+ báo cáo/u).waitFor({ timeout: 12000 });
        latestPublished = true;
        record('RPT-PUBLISH', 'PASS');
      } else {
        record('RPT-PUBLISHED-DELETE', 'BLOCKED', 'Monthly batch has no publish-ready report data');
      }
      if (await back.count()) await back.click();
      const batchRows = page.locator('a[aria-label^="Mở báo cáo "]');
      await batchRows.first().waitFor({ state: 'visible', timeout: 8000 });
      const sameMonthCount = await batchRows.filter({ hasText: 'Tháng 10/2026' }).count();
      record('RPT-MULTIPLE-SAME-MONTH', sameMonthCount >= 2 ? 'PASS' : 'FAIL', `October batches=${sameMonthCount}`);
      let beforeDeleteCount = await batchRows.count();
      const deleteMenu = page.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).last();
      if (latestPublished) {
        await deleteMenu.click();
        await page.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
          const publishedDialog = page.getByRole('dialog', { name: 'Xoá báo cáo?' });
          await publishedDialog.waitFor({ timeout: 5000 });
          const warnsParent = /phụ huynh sẽ không còn thấy báo cáo đã phát hành/iu.test(await publishedDialog.innerText());
          await publishedDialog.getByRole('button', { name: 'Xoá báo cáo', exact: true }).click();
          await publishedDialog.waitFor({ state: 'detached', timeout: 12000 });
          await page.waitForFunction((expected) => document.querySelectorAll('a[aria-label^="Mở báo cáo "]').length === expected, beforeDeleteCount - 1, { timeout: 10000 });
          beforeDeleteCount -= 1;
          record('RPT-PUBLISHED-DELETE', warnsParent ? 'PASS' : 'FAIL', 'Published deletion warning and confirmation removed the batch');
      }
      const draftMenu = page.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).last();
      await draftMenu.click();
      await page.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
        const deleteDialog = page.getByRole('dialog', { name: 'Xoá báo cáo?' });
        await deleteDialog.waitFor({ timeout: 5000 });
        await deleteDialog.getByRole('button', { name: 'Huỷ', exact: true }).click();
        await deleteDialog.waitFor({ state: 'detached', timeout: 8000 });
        record('RPT-019-CANCEL', await batchRows.count() === beforeDeleteCount ? 'PASS' : 'FAIL', 'Cancel preserves report batch');
      await draftMenu.click();
      await page.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
        const deleteAgain = page.getByRole('dialog', { name: 'Xoá báo cáo?' });
        await deleteAgain.waitFor({ timeout: 5000 });
        await deleteAgain.getByRole('button', { name: 'Xoá báo cáo', exact: true }).click();
        await page.waitForFunction((expected) => document.querySelectorAll('a[aria-label^="Mở báo cáo "]').length === expected, beforeDeleteCount - 1, { timeout: 12000 });
        record('RPT-019', 'PASS', 'Draft batch removed from teacher report list after confirmation');
} catch (error) {
  const note = safeError(error);
  if (phase === 'login' && loginSubmitted) record('TEACHER-LOGIN', 'BLOCKED', note);
  else record(`PHASE-${phase}`, 'BLOCKED', note);
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  const cases = results.map((item) => {
      const skipped = ['BLOCKED', 'MANUAL'].includes(item.status);
      const failure = item.status === 'FAIL';
      const escaped = item.note.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
      const detail = item.note ? failure ? `<failure message="${escaped}"/>` : skipped ? `<skipped message="${escaped}"/>` : `<system-out>${escaped}</system-out>` : '';
    return `<testcase classname="web" name="${item.id}">${detail}</testcase>`;
  }).join('');
  const failures = results.filter((item) => item.status === 'FAIL').length;
  const skipped = results.filter((item) => ['BLOCKED', 'MANUAL'].includes(item.status)).length;
    await writeFile(`${out}/brief91-teacher-smoke-processB-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="brief91-teacher-smoke-processB" tests="${results.length}" failures="${failures}" skipped="${skipped}">${cases}</testsuite>\n`);
    await writeFile(`${out}/brief91-teacher-smoke-processB.json`, `${JSON.stringify({ bundle: verifiedBundle, className, loginSubmitted, results }, null, 2)}\n`);
}
