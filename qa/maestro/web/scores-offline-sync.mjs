import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const studentName = `QA-Web-${suffix}-Offline-Student`;
const testName = `QA-Web-${suffix}-Offline-Score`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
let phase = 'teacher login';

try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'open smoke class';
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Học sinh', exact: true }).click();
  phase = 'add a smoke student';
  await page.locator('header').getByRole('button', { name: /Thêm học sinh/ }).click();
  const studentDialog = page.getByRole('dialog');
  await studentDialog.getByLabel('Họ và tên học sinh').fill(studentName);
  await studentDialog.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
  await studentDialog.waitFor({ state: 'detached', timeout: 20000 });
  await page.getByRole('row').filter({ hasText: studentName }).waitFor({ timeout: 15000 });
  await page.getByRole('navigation', { name: 'Mục của lớp' }).getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();

  phase = 'create score test';
  const createButton = page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true });
  await createButton.waitFor({ timeout: 10000 });
  await createButton.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên bài kiểm tra').fill(testName);
  await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 20000 });
  await page.getByRole('link', { name: testName, exact: true }).click();

  phase = 'save score offline';
  const scoreInputs = page.locator('input[aria-label^="Điểm "]');
  if (!(await scoreInputs.count())) throw new Error('fixture_missing: smoke class has no students to score');
  const scoreInput = scoreInputs.first();
  const scoreLabel = await scoreInput.getAttribute('aria-label');
  await context.setOffline(true);
  if (await page.evaluate(() => navigator.onLine)) throw new Error('browser context did not go offline');
  await scoreInput.fill('0');
  await page.getByRole('button', { name: 'Lưu điểm', exact: true }).click();
  await page.getByText('Đã lưu trên máy · sẽ đồng bộ khi có mạng', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  phase = 'verify sync after reconnect';
  const pushed = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/sync/push') && response.request().method() === 'POST' && response.ok();
  }, { timeout: 20000 });
  await context.setOffline(false);
  if (!(await page.evaluate(() => navigator.onLine))) throw new Error('browser context did not reconnect');
  await pushed;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByLabel(scoreLabel, { exact: true }).waitFor({ timeout: 15000 });
  if (await page.getByLabel(scoreLabel, { exact: true }).inputValue() !== '0') throw new Error('score 0 did not persist after online sync and reload');

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-offline-sync-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-offline-sync" tests="1" failures="0"><testcase classname="web" name="TC-TST-015"/></testsuite>\n');
  console.log('PASS TC-TST-015');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-TST-015 at ${phase}: ${message}`);
  await mkdir(out, { recursive: true });
  if (!message.startsWith('fixture_missing:')) await page.screenshot({ path: `${out}/scores-offline-sync-failure.png` }).catch(() => {});
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/scores-offline-sync-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-offline-sync" tests="1" failures="1"><testcase classname="web" name="TC-TST-015"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = message.startsWith('fixture_missing:') ? 2 : 1;
} finally {
  await context.close();
  await browser.close();
}
