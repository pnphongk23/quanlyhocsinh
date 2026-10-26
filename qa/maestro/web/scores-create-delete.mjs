import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const credentials = Object.fromEntries((await readFile(credentialPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-${suffix}-Scores-Class`;
const studentName = `QA-Web-${suffix}-Scores-Student`;
const defaultTestName = `QA-Web-${suffix}-No-Max`;
const deleteTestName = `QA-Web-${suffix}-Delete-Unscored`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
const results = [];
let phase = 'teacher login';

async function check(id, run) {
  try {
    await run();
    results.push({ id, failure: '' });
    console.log(`PASS ${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    results.push({ id, failure: message });
    console.log(`FAIL ${id} at ${phase}: ${message}`);
    throw error;
  }
}

try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'create class';
  await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await page.getByRole('button', { name: 'T2', exact: true }).click();
  await page.locator('input[type=time]').fill('18:00');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop$/, { timeout: 15000 });
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: new RegExp(className) }).last().click();

  phase = 'create student fixture';
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Học sinh' }).click();
  await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
  await page.getByLabel('Họ và tên học sinh').fill(studentName);
  await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
  await page.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });

  phase = 'open tests';
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).waitFor({ timeout: 10000 });

  phase = 'create default score test';
    await check('TC-TST-001', async () => {
      await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
      const dialog = page.getByRole('dialog');
      if (await dialog.getByLabel(/điểm tối đa/i).count()) throw new Error('create form still exposes a maximum-score field');
      await dialog.getByLabel('Tên bài kiểm tra').fill(defaultTestName);
      const dateField = dialog.locator('input[type="date"]');
      if (await dateField.count() !== 1) throw new Error('create form must expose one test date field');
      await dateField.fill(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
      await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
      await dialog.waitFor({ state: 'detached', timeout: 20000 });
      await page.getByRole('link', { name: defaultTestName, exact: true }).waitFor({ timeout: 15000 });
      const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: defaultTestName, exact: true }) });
      const rowText = await row.innerText();
      if (/\/\s*(?:15|điểm tối đa)/i.test(rowText)) throw new Error('created test row still displays a score maximum');
      if (!/Chưa có điểm/i.test(rowText)) throw new Error('new test does not show the no-scores state');
    if (await page.getByRole('row').filter({ hasText: defaultTestName }).getByText(/hệ số/i).count()) {
      throw new Error('unexpected coefficient field in test row');
    }
  });

  phase = 'delete unscored test';
  await check('TC-TST-009', async () => {
    await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
    const dialog = page.getByRole('dialog');
      if (await dialog.getByLabel(/điểm tối đa/i).count()) throw new Error('create form still exposes a maximum-score field');
    await dialog.getByLabel('Tên bài kiểm tra').fill(deleteTestName);
    await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
    await dialog.waitFor({ state: 'detached', timeout: 20000 });
    const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: deleteTestName, exact: true }) });
    await row.waitFor({ timeout: 15000 });
    await row.getByRole('button', { name: `Thêm tùy chọn ${deleteTestName}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá', exact: true }).click();
    const confirm = page.getByRole('dialog');
    await confirm.getByText('Chưa em nào có điểm ở bài này, nên bài sẽ bị xoá hẳn và không khôi phục được.', { exact: true }).waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Xoá hẳn', exact: true }).click();
    await page.getByRole('link', { name: deleteTestName, exact: true }).waitFor({ state: 'detached', timeout: 15000 });
  });
} catch (error) {
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: `${out}/scores-create-delete-failure.png` }).catch(() => {});
  if (!results.length) results.push({ id: 'TC-TST-001', failure: error instanceof Error ? error.message : 'unknown error' });
  process.exitCode = 1;
} finally {
  await mkdir(out, { recursive: true });
  const failures = results.filter((result) => result.failure);
  const cases = results.map(({ id, failure }) => `<testcase classname="web" name="${id}">${failure ? `<failure message="${failure.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"/>` : ''}</testcase>`).join('');
  await writeFile(`${out}/scores-create-delete-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-create-delete" tests="${results.length}" failures="${failures.length}">${cases}</testsuite>\n`);
  await context.close();
  await browser.close();
}
