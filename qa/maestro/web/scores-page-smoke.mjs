import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();
let pageError = false;
let phase = 'teacher login';
page.on('pageerror', () => { pageError = true; });

try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  phase = 'open test page without exercising score flows';
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  let tests = page.getByRole('link', { name: /Score-Step/ });
  if (!(await tests.count())) {
    const testName = `QA-Web-${randomBytes(3).toString('hex')}-Open-Smoke`;
    await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Tên bài kiểm tra').fill(testName);
    await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15000 });
    tests = page.getByRole('link', { name: testName, exact: true });
    await tests.waitFor({ timeout: 12000 });
  }
  await tests.last().click();
  await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });
  const bodyText = (await page.locator('body').innerText()).trim();
  const path = new URL(page.url()).pathname;
  const blank = bodyText.length === 0 || pageError;
  await mkdir(out, { recursive: true });
  const message = blank ? `blank/crash on test page at ${path}` : `test page rendered at ${path}; no page crash`;
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/scores-page-smoke-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-page-smoke" tests="1" failures="${blank ? 1 : 0}"><testcase classname="web" name="SMOKE-score-page">${blank ? `<failure message="${escaped}"/>` : ''}</testcase></testsuite>\n`);
  console.log(`SMOKE_SCORE_PAGE ${blank ? 'BLANK_OR_CRASH' : 'RENDERED'} path=${path}`);
  if (blank) await page.screenshot({ path: `${out}/scores-page-smoke-failure.png` }).catch(() => {});
  if (blank) process.exitCode = 1;
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  const skipped = message.startsWith('fixture_missing:');
  console.log(`${skipped ? 'BLOCKED' : 'FAIL'} score page smoke at ${phase}: ${message}`);
  await mkdir(out, { recursive: true });
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/scores-page-smoke-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-page-smoke" tests="1" failures="${skipped ? 0 : 1}" skipped="${skipped ? 1 : 0}"><testcase classname="web" name="SMOKE-score-page">${skipped ? `<skipped message="${escaped}"/>` : `<failure message="${escaped}"/>`}</testcase></testsuite>\n`);
  if (!skipped) await page.screenshot({ path: `${out}/scores-page-smoke-failure.png` }).catch(() => {});
  if (!skipped) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
