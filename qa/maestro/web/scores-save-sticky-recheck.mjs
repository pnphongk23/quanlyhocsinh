import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');
const prior = JSON.parse(await readFile('plans/20261021-mvp/qa/runs/2026-10-25/web/scores-save-sticky.json', 'utf8'));
const className = prior.classCreated;
const suffix = className.match(/^QA-(\w+)-Scores-Sticky$/)?.[1];
if (!suffix) throw new Error('No QA sticky-score fixture from the preceding run');
const testName = `QA-${suffix}-Scores-Sticky-Test`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
const results = [];

async function measure(label, width, height, scoreValue) {
  await page.setViewportSize({ width, height });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const inputs = page.locator('input[aria-label^="Điểm "]');
  await inputs.first().waitFor({ state: 'visible', timeout: 12000 });
  if (await inputs.count() < 10) throw new Error(`${label}: only ${await inputs.count()} score rows visible; expected at least 10`);
  await inputs.first().fill(scoreValue);
  const lastInput = inputs.last();
  await lastInput.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const geometry = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[aria-label^="Điểm "]'));
    const input = inputs.at(-1);
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Lưu điểm');
    if (!input || !button) return null;
    let row = input;
    while (row && !(typeof row.className === 'string' && row.className.includes('studentRow'))) row = row.parentElement;
    const b = button.getBoundingClientRect();
    const r = row?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      button: { top: b.top, bottom: b.bottom, height: b.height, enabled: !button.disabled },
      lastRow: r ? { top: r.top, bottom: r.bottom, height: r.height } : null,
      scrollY,
    };
  });
  if (!geometry) throw new Error(`${label}: button/last row geometry unavailable`);
  const visible = geometry.button.top >= 0 && geometry.button.bottom <= height;
  const unobscured = Boolean(geometry.lastRow) && geometry.lastRow.bottom <= geometry.button.top + 2;
  await page.screenshot({ path: `${out}/scores-save-sticky-${label}-recheck.png`, fullPage: false });
  const save = page.getByRole('button', { name: 'Lưu điểm', exact: true });
  if (!geometry.button.enabled || !(await save.isEnabled())) throw new Error(`${label}: Lưu điểm is not clickable after editing`);
  await save.click();
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Lưu điểm');
    return Boolean(button?.disabled);
  }, undefined, { timeout: 15000 });
  results.push({ id: `${label}-save-click`, passed: true, geometry });
  results.push({ id: `${label}-sticky-and-unobscured`, passed: visible && unobscured, geometry });
  console.log(`${label}: save-click=PASS sticky=${visible ? 'PASS' : 'FAIL'} last-row-clear=${unobscured ? 'PASS' : 'FAIL'}`);
}

try {
  await mkdir(out, { recursive: true });
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByPlaceholder('Tìm lớp hoặc học sinh').fill(className);
  await page.getByText(className, { exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  await page.getByRole('link', { name: testName, exact: true }).click();
  await page.getByLabel(/^Điểm /).first().waitFor({ state: 'visible', timeout: 12000 });
  await measure('desktop', 1440, 900, '21');
  await measure('mobile', 390, 844, '22');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  results.push({ id: 'setup', passed: false, error: message });
  console.log(`FAIL setup: ${message}`);
  await page.screenshot({ path: `${out}/scores-save-sticky-recheck-setup-failure.png`, fullPage: true }).catch(() => {});
} finally {
  const failures = results.filter((item) => !item.passed);
  const cases = results.map((item) => `<testcase classname="web" name="${item.id}">${item.passed ? '' : `<failure message="${JSON.stringify(item.geometry ?? item.error).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"/>`}</testcase>`).join('');
  await writeFile(`${out}/scores-save-sticky-recheck-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-save-sticky-recheck" tests="${results.length}" failures="${failures.length}">${cases}</testsuite>\n`);
  await writeFile(`${out}/scores-save-sticky-recheck.json`, `${JSON.stringify({ bundle: 'index-BhzpF4oY.js', className, testName, studentRowsExpected: 10, results }, null, 2)}\n`);
  await context.close();
  await browser.close();
}

if (results.some((item) => !item.passed)) process.exitCode = 1;
