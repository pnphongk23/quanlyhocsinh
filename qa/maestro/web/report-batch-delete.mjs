import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const discovered = JSON.parse(await readFile(`${out}/report-fixture-discovery.json`, 'utf8'));
const fixture = discovered.results.find((item) => item.reportAddEnabled && !item.hasBatch && item.className?.startsWith('QA-'));
if (!fixture) throw new Error('No QA smoke class with an enabled report action was found in the UI discovery');
const className = fixture.className;
const fixtureStudentCount = fixture.studentCount;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
const results = [];
const diagnostics = [];
let phase = 'teacher login';
let reportsUrl = '';
let reportUi = 'unknown';
let selectRangeCount = 0;

function safeText(value) {
  return String(value ?? '')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/((?:token|authorization|password|phone|email|body)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi, '$1[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b\+?\d[\d ()-]{8,}\d\b/g, '[number]')
    .slice(0, 900);
}
function pathOnly(raw) { try { return new URL(raw).pathname; } catch { return '[invalid-url]'; } }

page.on('console', (message) => {
  if (message.type() === 'error') diagnostics.push({ phase, kind: 'console-error', text: safeText(message.text()) });
});
page.on('pageerror', (error) => diagnostics.push({ phase, kind: 'page-error', text: safeText(error.stack ?? error.message) }));
page.on('response', (response) => {
  if (response.status() >= 400) diagnostics.push({ phase, kind: 'http-error', status: response.status(), path: pathOnly(response.url()) });
});
page.on('requestfailed', (request) => diagnostics.push({ phase, kind: 'request-failed', path: pathOnly(request.url()), error: safeText(request.failure()?.errorText) }));

function batchRow(id) {
  return page.locator('main').last().locator('li').filter({ has: page.locator(`a[href*="${id}"]`) }).first();
}
async function getBatchIdFromLocation() {
  const id = new URL(page.url()).searchParams.get('dot');
  if (!id) throw new Error('fixture_missing: created report batch id not present in UI route');
  return id;
}
async function createBatch(sessionIndex = 0) {
  const add = page.getByRole('button', { name: 'Thêm báo cáo', exact: true });
  await add.waitFor({ state: 'visible', timeout: 10000 });
  if (!(await add.isEnabled())) throw new Error(`fixture_missing: report add action disabled (${await add.getAttribute('title') ?? 'no reason exposed'})`);
  await add.click();
  const dialog = page.getByRole('dialog', { name: 'Thêm báo cáo' });
  await dialog.waitFor({ timeout: 10000 });
  const month = dialog.locator('input[type="month"]');
  if (await month.count()) {
    reportUi = 'monthly';
    await month.fill('2026-10');
  } else {
    reportUi = 'session-range';
    const from = dialog.locator('#report-from');
    const to = dialog.locator('#report-to');
    if (!(await from.count()) || !(await to.count())) throw new Error('report form has neither month input nor session range selectors');
    const count = Math.min(await from.locator('option').count(), await to.locator('option').count());
    selectRangeCount = Math.max(selectRangeCount, count);
    const index = Math.min(sessionIndex, count - 1);
    if (count < 1) throw new Error('fixture_missing: no held session choices in report range form');
    await from.selectOption({ index });
    await to.selectOption({ index });
  }
  const submit = dialog.getByRole('button', { name: 'Tạo báo cáo', exact: true });
  if (!(await submit.isEnabled())) throw new Error(`report submit disabled: ${safeText(await dialog.innerText())}`);
  await submit.click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  const id = await getBatchIdFromLocation();
  reportsUrl = page.url().split('?')[0];
  await page.goto(reportsUrl, { waitUntil: 'domcontentloaded' });
  await batchRow(id).waitFor({ state: 'visible', timeout: 12000 });
  return id;
}
async function deleteBatch(id, cancelFirst = false) {
  const row = batchRow(id);
  await row.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).click();
  await page.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Xoá báo cáo?' });
  await dialog.waitFor({ timeout: 5000 });
  const copy = safeText(await dialog.innerText());
  if (cancelFirst) {
    await dialog.getByRole('button', { name: 'Huỷ', exact: true }).click();
    await dialog.waitFor({ state: 'detached', timeout: 8000 });
    await row.waitFor({ state: 'visible', timeout: 8000 });
  }
  return { row, copy };
}
async function record(id, run) {
  phase = id;
  try {
    const details = await run();
    results.push({ id, passed: true, ...details });
    console.log(`PASS ${id}`);
    return details;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    results.push({ id, passed: false, error: safeText(message) });
    console.log(`FAIL ${id}: ${safeText(message)}`);
    await page.screenshot({ path: `${out}/${id}-failure.png`, fullPage: true }).catch(() => {});
    return null;
  }
}

try {
  await mkdir(out, { recursive: true });
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  phase = 'open discovered QA report class';
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByPlaceholder('Tìm lớp hoặc học sinh').fill(className);
  await page.getByRole('link', { name: new RegExp(className) }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  const firstReportsLink = await nav.getByRole('link', { name: 'Báo cáo', exact: true }).getAttribute('href');
  if (!firstReportsLink) throw new Error('fixture_missing: report link not found in class navigation');
  await page.goto(new URL(firstReportsLink, 'https://qlh-staging-web.pages.dev').toString(), { waitUntil: 'domcontentloaded' });
  await page.getByRole('main').last().waitFor({ state: 'visible', timeout: 10000 });
  reportsUrl = page.url().split('?')[0];

  let batchA;
  const existingMenu = page.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).first();
  if (await existingMenu.count()) {
    const row = page.locator('main').last().locator('li').filter({ has: existingMenu }).first();
    const href = await row.locator('a[aria-label^="Mở báo cáo"]').getAttribute('href');
    batchA = href ? new URL(href, reportsUrl).searchParams.get('dot') : null;
  }
  if (!batchA) batchA = await createBatch(0);
  await record('TC-RPT-019', async () => {
    const row = batchRow(batchA);
    const beforeText = safeText(await row.innerText());
    if (!beforeText.includes(`${fixtureStudentCount} nháp`)) throw new Error(`expected ${fixtureStudentCount} draft reports in this QA fixture: ${beforeText}`);
    const { copy } = await deleteBatch(batchA, true);
    if (!/Bản nháp của tất cả học sinh.*ẩn/.test(copy)) throw new Error(`unexpected draft delete confirmation: ${copy}`);
    await row.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).click();
    await page.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Xoá báo cáo?' });
    await dialog.waitFor({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Xoá báo cáo', exact: true }).click();
    await row.waitFor({ state: 'detached', timeout: 12000 });
    return { ui: reportUi, batchDraftSummary: beforeText, confirmation: copy, batchId: batchA };
  });

  const batchB = await createBatch(1);
  await record('TC-RPT-021', async () => {
    const row = batchRow(batchB);
    await context.setOffline(true);
    await row.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).click();
    const menuItem = page.getByRole('menuitem', { name: 'Xoá báo cáo', exact: true });
    const disabled = await menuItem.isDisabled();
    const hint = await row.getByRole('status').filter({ hasText: 'Cần mạng' }).count();
    const remainedBeforeReconnect = await row.isVisible();
    await context.setOffline(false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await batchRow(batchB).waitFor({ state: 'visible', timeout: 12000 });
    const remainedAfterReconnect = await batchRow(batchB).isVisible();
    if (!disabled && !hint) throw new Error('offline delete was neither disabled nor accompanied by network hint');
    if (!remainedBeforeReconnect || !remainedAfterReconnect) throw new Error('report batch disappeared offline or after reconnect');
    return { ui: reportUi, disabled, hint, remainedBeforeReconnect, remainedAfterReconnect, batchId: batchB };
  });

  const batchA2 = await createBatch(0);
  await record('TC-RPT-022', async () => {
    const bExistsBefore = await batchRow(batchB).isVisible();
    const bTextBefore = safeText(await batchRow(batchB).innerText());
    const { row } = await deleteBatch(batchA2, false);
    const confirm = page.getByRole('dialog', { name: 'Xoá báo cáo?' });
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Xoá báo cáo', exact: true }).click();
    await row.waitFor({ state: 'detached', timeout: 12000 });
    const batchC = await createBatch(0);
    const bExistsAfter = await batchRow(batchB).isVisible();
    const bTextAfter = safeText(await batchRow(batchB).innerText());
    const cExists = await batchRow(batchC).isVisible();
    const aExists = await batchRow(batchA2).count();
    if (!bExistsBefore || !bExistsAfter || !cExists || aExists || bTextBefore !== bTextAfter) throw new Error('soft-delete isolation failed: B changed, A remained, or C was missing');
    return { ui: reportUi, batchB: bExistsAfter, batchBTextStable: bTextBefore === bTextAfter, batchC: cExists, deletedAVisibleCount: aExists, batchA: batchA2, batchCId: batchC };
  });
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  results.push({ id: phase, passed: false, error: safeText(message) });
  console.log(`FAIL ${phase}: ${safeText(message)}`);
  if (!new URL(page.url()).pathname.endsWith('/dang-nhap')) {
    await page.screenshot({ path: `${out}/report-batch-delete-setup-failure.png`, fullPage: true }).catch(() => {});
  }
} finally {
  const report = { bundle: 'index-BhzpF4oY.js', className, fixtureStudentCount, reportUi, selectRangeCount, reportsUrl: reportsUrl ? pathOnly(reportsUrl) : '', results, diagnostics };
  const failures = results.filter((item) => !item.passed);
  const cases = results.map((item) => `<testcase classname="web" name="${item.id}">${item.passed ? '' : `<failure message="${JSON.stringify(item.error ?? item).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"/>`}</testcase>`).join('');
  await writeFile(`${out}/report-batch-delete-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-report-batch-delete" tests="${results.length}" failures="${failures.length}">${cases}</testsuite>\n`);
  await writeFile(`${out}/report-batch-delete.json`, `${JSON.stringify(report, null, 2)}\n`);
  await context.close();
  await browser.close();
}

if (results.some((item) => !item.passed)) process.exitCode = 1;
