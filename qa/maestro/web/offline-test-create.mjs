import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const testName = `QA-Web-${randomBytes(3).toString('hex')}-Offline-Create`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();
let phase = 'teacher login';
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'open test creation form';
  await page.goto('https://qlh-staging-web.pages.dev/lop');
    await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
    await page.waitForURL(/\/lop\/[^/]+/);
    const classNav = page.getByRole('navigation', { name: 'Mục của lớp' });
    await classNav.getByRole('link', { name: 'Bài kiểm tra' }).click();
      await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Tên bài kiểm tra').waitFor({ state: 'visible', timeout: 10000 });
      await dialog.getByLabel('Tên bài kiểm tra').fill(testName);

  phase = 'save test while offline';
  await context.setOffline(true);
  if (await page.evaluate(() => navigator.onLine)) throw new Error('browser context did not go offline');
    await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
    await dialog.waitFor({ state: 'detached', timeout: 20000 });
    await page.getByRole('link', { name: testName, exact: true }).waitFor({ timeout: 15000 });

  phase = 'verify automatic sync';
  const pushed = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/sync/push') && response.request().method() === 'POST' && response.ok();
  }, { timeout: 20000 });
  await context.setOffline(false);
  if (!(await page.evaluate(() => navigator.onLine))) throw new Error('browser context did not reconnect');
  await pushed;
    await page.getByRole('link', { name: testName, exact: true }).waitFor({ timeout: 15000 });

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/offline-test-create-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-offline-test-create" tests="1" failures="0"><testcase classname="web" name="TC-OFF-003"/></testsuite>\n');
  console.log('PASS TC-OFF-003');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-OFF-003 at ${phase}: ${message}`);
  await mkdir(out, { recursive: true });
  if (!message.startsWith('fixture_missing:')) await page.screenshot({ path: `${out}/offline-test-create-failure.png` }).catch(() => {});
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/offline-test-create-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-offline-test-create" tests="1" failures="1"><testcase classname="web" name="TC-OFF-003"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = message.startsWith('fixture_missing:') ? 2 : 1;
} finally {
  await context.setOffline(false).catch(() => {});
  await context.close();
  await browser.close();
}
