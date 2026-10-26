import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const classId = 'ede75178-e774-41c1-a9c0-6e0c932e1ad0';
const tests = [
  { caseId: 'legacy-score-1', id: '051a66b2-6431-4928-a4af-8143f142d066' },
  { caseId: 'legacy-score-2', id: '7daf9942-c51a-41b6-94af-e84ee98755dc' },
];
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
const checks = [];
const diagnostics = [];
let phase = 'login';

function safeText(raw) {
  return String(raw ?? '')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/(token|authorization|password|phone|email|body)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/[+\d][\d .()\-]{7,}\d/g, '[redacted-number]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .slice(0, 900);
}
function safePath(raw) {
  try { return new URL(raw).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id'); }
  catch { return '[invalid-url]'; }
}

page.on('console', (message) => {
  if (message.type() === 'error') diagnostics.push({ kind: 'console-error', phase, text: safeText(message.text()) });
});
page.on('pageerror', (error) => diagnostics.push({ kind: 'page-error', phase, name: error.name, stack: safeText(error.stack) }));
page.on('response', (response) => {
  if (response.status() >= 400) diagnostics.push({ kind: 'http-error', phase, status: response.status(), path: safePath(response.url()) });
});
page.on('requestfailed', (request) => diagnostics.push({ kind: 'request-failed', phase, path: safePath(request.url()), error: safeText(request.failure()?.errorText) }));

async function saveFailureShot(name) {
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: `${out}/${name}-failure.png`, fullPage: true }).catch(() => {});
}

try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  const bundle = await assertStagingBundle(page);
  console.log('STAGING_BUNDLE', bundle);
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'open smoke-visible fixture class';
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  const classLink = page.locator(`a[href*="${classId}"]`).first();
  if (!(await classLink.count())) {
    for (const item of tests) checks.push({ caseId: item.caseId, outcome: 'not-visible-to-smoke' });
    console.log('legacy-score-fixtures: not-visible-to-smoke');
  } else {
    await classLink.click();
    const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
    await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
    for (const item of tests) {
      phase = item.caseId;
      const eventStart = diagnostics.length;
      const link = page.locator(`a[href*="${item.id}"]`).first();
      if (!(await link.count())) {
        checks.push({ caseId: item.caseId, outcome: 'not-visible-in-smoke-class' });
        console.log(`${item.caseId}: not-visible-in-smoke-class`);
        continue;
      }
      await link.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(1200);
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const mainText = await page.locator('#staff-content').innerText().catch(() => '');
      const scoreInputs = page.locator('input[aria-label^="Điểm "]:visible');
      const scoreCount = await scoreInputs.count();
      let scoreValuesValid = false;
      if (scoreCount) {
        const values = await scoreInputs.evaluateAll((inputs) => inputs.map((input) => input.value.trim()));
        scoreValuesValid = values.length > 0 && values.every((value) => value !== '' && /^\d+(?:[.,]\d+)?$/.test(value));
      }
      const noMaxSuffix = !/\/\s*(?:max|undefined|15)\b/i.test(mainText);
      const screenError = /Không thể mở màn hình/i.test(bodyText);
      const blank = mainText.trim().length < 20;
      const errors = diagnostics.slice(eventStart);
      const outcome = screenError ? 'screen-error' : blank ? 'blank' : !noMaxSuffix ? 'max-suffix' : scoreCount === 0 ? 'opened-no-score-input' : !scoreValuesValid ? 'invalid-score-display' : errors.length ? 'opened-with-console-or-network-errors' : 'opens-clean';
      checks.push({ caseId: item.caseId, outcome, scoreInputCount: scoreCount, scoreValuesValid, noMaxSuffix, errorCount: errors.length, path: safePath(page.url()) });
      console.log(`${item.caseId}: ${outcome}; scoreInputs=${scoreCount}; noMaxSuffix=${noMaxSuffix}; errors=${errors.length}`);
      if (outcome !== 'opens-clean') await saveFailureShot(`legacy-score-${item.caseId}`);
      if (item !== tests.at(-1)) {
        const switchLink = page.getByRole('link', { name: 'Đổi bài' });
        if (await switchLink.count()) await switchLink.click();
        else await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
      }
    }
  }

  // Search only smoke-visible classes and report links for the two supplied legacy prefixes.
  phase = 'smoke-visible legacy reports';
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  const reportClasses = [
    { classPrefix: '1041f806', reportPrefix: '6bff7dd2', caseId: 'legacy-report-1' },
    { classPrefix: '9938349b', reportPrefix: '9c235366', caseId: 'legacy-report-2' },
  ];
  for (const item of reportClasses) {
    await page.goto('https://qlh-staging-web.pages.dev/lop');
    const visibleClass = page.locator(`a[href*="${item.classPrefix}"]`).first();
    if (!(await visibleClass.count())) {
      checks.push({ caseId: item.caseId, outcome: 'not-visible-to-smoke-workspace' });
      console.log(`${item.caseId}: not-visible-to-smoke-workspace`);
      continue;
    }
    await visibleClass.click();
    const reportNav = page.getByRole('navigation', { name: 'Mục của lớp' }).getByRole('link', { name: 'Báo cáo', exact: true });
    await reportNav.click();
    const reportLink = page.locator(`a[href*="${item.reportPrefix}"]`).first();
    if (!(await reportLink.count())) {
      checks.push({ caseId: item.caseId, outcome: 'class-visible-report-not-visible' });
      console.log(`${item.caseId}: class-visible-report-not-visible`);
      continue;
    }
    await reportLink.click();
    await page.waitForTimeout(1000);
    const reportBody = await page.locator('body').innerText().catch(() => '');
    const reportMain = await page.locator('main').last().innerText().catch(() => '');
    const invalidSuffix = /\/\s*(?:max|undefined|15)\b/i.test(reportMain);
    const reportError = /Không thể mở màn hình/i.test(reportBody);
    const blank = reportMain.trim().length < 20;
    const outcome = reportError ? 'screen-error' : blank ? 'blank' : invalidSuffix ? 'max-suffix' : 'opens-clean';
    checks.push({ caseId: item.caseId, outcome });
    console.log(`${item.caseId}: ${outcome}`);
    if (outcome !== 'opens-clean') await saveFailureShot(`legacy-${item.caseId}`);
  }
} catch (error) {
  const message = safeText(error instanceof Error ? error.message : error);
  console.log(`HARNESS_ERROR ${phase}: ${message}`);
  checks.push({ caseId: 'harness', outcome: 'error', phase, message });
  process.exitCode = 1;
} finally {
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/legacy-score-fixture-check.json`, JSON.stringify({ bundle: 'index-Cp4GJ8XB.js', serviceWorkers: 'blocked', checks, diagnostics }, null, 2));
  const skipped = new Set(['not-visible-to-smoke', 'not-visible-in-smoke-class', 'not-visible-to-smoke-workspace', 'class-visible-report-not-visible']);
  const failed = checks.filter(({ outcome }) => !skipped.has(outcome) && outcome !== 'opens-clean');
  const cases = checks.map(({ caseId, outcome }) => `<testcase classname="web" name="${caseId}">${outcome === 'opens-clean' ? '' : skipped.has(outcome) ? `<skipped message="${outcome}"/>` : `<failure message="${outcome}"/>`}</testcase>`).join('');
  await writeFile(`${out}/legacy-score-fixture-check-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="legacy-score-fixture-check" tests="${checks.length}" failures="${failed.length}" skipped="${checks.filter(({ outcome }) => skipped.has(outcome)).length}">${cases}</testsuite>\n`);
  await context.close();
  await browser.close();
}
