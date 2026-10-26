import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const sticky = JSON.parse(await readFile(`${out}/scores-save-sticky-recheck.json`, 'utf8'));
const reportFixture = JSON.parse(await readFile(`${out}/report-batch-delete.json`, 'utf8'));
const className = sticky.className;
const testName = sticky.testName;
const reportClassName = reportFixture.className;
const hwSuffix = randomBytes(3).toString('hex');
const homeworkClassName = `QA-Web-${hwSuffix}-Brief90-Homework`;
const homeworkTitle = `QA-Web-${hwSuffix}-Vocabulary`;
const results = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
let page = await context.newPage();
let phase = 'bundle and service worker';
let reportMode = 'not checked';
let reportNumericLabels = null;

function record(id, passed, details = {}) {
  results.push({ id, passed, ...details });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${id}`);
}
async function openClass(name) {
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByPlaceholder('Tìm lớp hoặc học sinh').fill(name);
  await page.getByRole('link', { name: new RegExp(name) }).last().click();
  return page.getByRole('navigation', { name: 'Mục của lớp' });
}
async function noNumberedSession(id, main) {
  const text = await main.innerText();
  const matches = text.match(/\bBuổi\s+\d+\b/gu) ?? [];
  record(id, matches.length === 0, { numberedSessionLabels: matches.length });
}

try {
  await mkdir(out, { recursive: true });
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  const bundle = await assertStagingBundle(page);
  await page.evaluate(async () => {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('service worker install timeout')), 12000)),
    ]);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 12000 });
  record('bundle-sw-update', bundle === 'index-C8aXCZci.js');

  phase = 'teacher login';
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  async function measureStickySave() {
  phase = 'WEB-006 sticky save at scroll end';
  const nav = await openClass(className);
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  await page.getByRole('link', { name: testName, exact: true }).click();
  for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    if (label === 'mobile') {
      page = await context.newPage();
      await page.goto('https://qlh-staging-web.pages.dev/lop', { waitUntil: 'domcontentloaded' });
      if (new URL(page.url()).pathname === '/dang-nhap') {
        await page.locator('#login-phone').fill(credentials.phone);
        await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
        await page.locator('#login-password').fill(credentials.password);
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
      }
      const mobileNav = await openClass(className);
      await mobileNav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
      await page.getByRole('link', { name: testName, exact: true }).click();
    }
    await page.setViewportSize({ width, height });
    const inputs = page.locator('input[aria-label^="Điểm "]');
    await inputs.first().waitFor({ state: 'visible', timeout: 12000 });
    if (await inputs.count() < 10) throw new Error(`${label}: score fixture has fewer than 10 students`);
    await inputs.first().fill('23');
    await inputs.last().scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const input = document.querySelector('input[aria-label^="Điểm "]');
      let scroller = null;
      for (let node = input?.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (node.scrollHeight > node.clientHeight + 1 && /(auto|scroll|overlay)/.test(style.overflowY)) {
          scroller = node;
          break;
        }
      }
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
      else window.scrollTo(0, document.documentElement.scrollHeight);
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const geometry = await page.evaluate(() => {
      const lastInput = Array.from(document.querySelectorAll('input[aria-label^="Điểm "]')).at(-1);
      const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Lưu điểm');
      if (!lastInput || !button) return null;
      let row = lastInput;
      while (row && !(typeof row.className === 'string' && row.className.includes('studentRow'))) row = row.parentElement;
      const b = button.getBoundingClientRect();
      const r = row?.getBoundingClientRect();
      let scroller = null;
      for (let node = lastInput.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (node.scrollHeight > node.clientHeight + 1 && /(auto|scroll|overlay)/.test(style.overflowY)) { scroller = node; break; }
      }
      return { viewport: { width: innerWidth, height: innerHeight }, button: { top: b.top, bottom: b.bottom, enabled: !button.disabled }, lastRow: r ? { top: r.top, bottom: r.bottom } : null, pageScrollY: scrollY, containerScrollTop: scroller?.scrollTop ?? null };
    });
    const visible = Boolean(geometry && geometry.button.top >= 0 && geometry.button.bottom <= height);
    const unobscured = Boolean(geometry?.lastRow && geometry.lastRow.bottom <= geometry.button.top + 2);
    const enabled = await page.getByRole('button', { name: 'Lưu điểm', exact: true }).isEnabled();
    record(`WEB-006-${label}-scrolled-bottom`, visible && unobscured && enabled, { geometry, enabled });
  }

  }

  phase = 'session and homework labels';
  await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(homeworkClassName);
  await page.getByRole('button', { name: 'CN', exact: true }).click();
  await page.locator('input[type=time]').fill('20:00');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop$/, { timeout: 15000 });
  const hwNav = await openClass(homeworkClassName);
  const sessionsHref = await hwNav.getByRole('link', { name: 'Buổi học', exact: true }).getAttribute('href');
  if (!sessionsHref) throw new Error('Buổi học navigation link missing');
  await page.goto(new URL(sessionsHref, 'https://qlh-staging-web.pages.dev').toString());
  await noNumberedSession('session-list-labels', page.locator('main').last());
  const viewSession = page.getByRole('link', { name: 'Xem buổi', exact: true }).first();
  await viewSession.waitFor({ timeout: 12000 });
  await viewSession.click();
  await page.getByRole('tab', { name: 'Bài tập về nhà', exact: true }).click();
  await page.getByRole('tab', { name: 'Bài tập hôm nay', exact: true }).click();
  await page.getByRole('button', { name: /Luyện từ vựng/ }).first().click();
  await page.getByRole('button', { name: 'Luyện từ vựng', exact: true }).click();
  await page.locator('#hw-desktop-title').fill(homeworkTitle);
  await page.getByRole('button', { name: 'Lưu phần', exact: true }).click();
  await page.getByText(homeworkTitle, { exact: true }).waitFor({ timeout: 12000 });
  await noNumberedSession('homework-labels', page.locator('main').last());

  phase = 'report labels';
  const reportNav = await openClass(reportClassName);
  const reportsHref = await reportNav.getByRole('link', { name: 'Báo cáo', exact: true }).getAttribute('href');
  if (!reportsHref) throw new Error('Báo cáo navigation link missing');
  await page.goto(new URL(reportsHref, 'https://qlh-staging-web.pages.dev').toString(), { waitUntil: 'domcontentloaded' });
  const addReport = page.getByRole('button', { name: 'Thêm báo cáo', exact: true });
  if (await addReport.count()) {
    await addReport.click();
    const dialog = page.getByRole('dialog', { name: 'Thêm báo cáo' });
    await dialog.waitFor({ timeout: 8000 });
    const month = dialog.locator('input[type="month"]');
    if (await month.count()) {
      reportMode = 'monthly';
      await month.fill('2026-10');
      const create = dialog.getByRole('button', { name: 'Tạo báo cáo', exact: true });
      if (await create.isEnabled()) {
        await create.click();
        await dialog.waitFor({ state: 'detached', timeout: 12000 });
        const id = new URL(page.url()).searchParams.get('dot');
        if (id) {
          const listUrl = page.url().split('?')[0];
          await page.goto(listUrl, { waitUntil: 'domcontentloaded' });
          const row = page.locator('main').last().locator('li').filter({ has: page.locator(`a[href*="${id}"]`) }).first();
          await row.waitFor({ state: 'visible', timeout: 12000 });
          const rowText = await row.innerText();
          reportNumericLabels = (rowText.match(/\bBuổi\s+\d+\b/gu) ?? []).length;
          record('new-report-labels', reportNumericLabels === 0, { numberedSessionLabels: reportNumericLabels, reportMode });
          await row.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).click();
          await page.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
          const deleteDialog = page.getByRole('dialog', { name: 'Xoá báo cáo?' });
          await deleteDialog.getByRole('button', { name: 'Xoá báo cáo', exact: true }).click();
          await row.waitFor({ state: 'detached', timeout: 12000 });
        } else {
          record('new-report-labels', false, { reason: 'new report detail route has no batch identifier', reportMode });
        }
      } else {
        reportMode = 'monthly-create-disabled';
        record('new-report-labels', false, { reason: 'monthly report submit disabled', reportMode });
      }
      } else {
        reportMode = 'session-range-brief-91-not-deployed';
        await dialog.getByRole('button', { name: 'Huỷ', exact: true }).click().catch(() => {});
        results.push({ id: 'new-report-labels', passed: false, skipped: true, reason: reportMode });
        console.log('BLOCKED new-report-labels');
    }
  } else {
    reportMode = 'report-add-not-available';
    record('new-report-labels', false, { reason: reportMode });
  }
  await measureStickySave();
  } catch (error) {
  const message = error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]') : 'unknown error';
  results.push({ id: `setup-${phase}`, passed: false, error: message.slice(0, 400) });
  console.log(`FAIL setup-${phase}`);
} finally {
  const failures = results.filter((item) => !item.passed && !item.skipped);
  const skipped = results.filter((item) => item.skipped);
  const cases = results.map((item) => `<testcase classname="web" name="${item.id}">${item.skipped ? `<skipped message="${item.reason}"/>` : item.passed ? '' : `<failure message="${JSON.stringify(item.error ?? item.geometry ?? item).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"/>`}</testcase>`).join('');
  await writeFile(`${out}/brief90-regression-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-brief90-regression" tests="${results.length}" failures="${failures.length}" skipped="${skipped.length}">${cases}</testsuite>\n`);
  await writeFile(`${out}/brief90-regression.json`, `${JSON.stringify({ bundle: 'index-C8aXCZci.js', stickyClass: className, stickyTest: testName, homeworkClass: homeworkClassName, reportClass: reportClassName, reportMode, reportNumericLabels, results }, null, 2)}\n`);
  await context.close();
  await browser.close();
}

if (results.some((item) => !item.passed && !item.skipped)) process.exitCode = 1;
