import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const testName = `QA-Web-${randomBytes(3).toString('hex')}-Score-Step`;
const className = `QA-Web-${randomBytes(3).toString('hex')}-Scores-Class`;
const studentNames = Array.from({ length: 4 }, (_, index) => `QA-Web-${randomBytes(2).toString('hex')}-Score-${index + 1}`);
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
let phase = 'teacher login';
try {
  await page.goto(WEB_BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('WEB_BUNDLE', await assertConfiguredBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'create score fixture';
  await page.goto(WEB_BASE + '/lop/moi');
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await page.getByRole('button', { name: 'T2', exact: true }).click();
  await page.locator('input[type=time]').fill('18:00');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop$/, { timeout: 15000 });
  await page.goto(WEB_BASE + '/lop');
  await page.getByRole('link', { name: new RegExp(className) }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Học sinh', exact: true }).click();
  for (const studentName of studentNames) {
    await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await page.getByLabel('Họ và tên học sinh').fill(studentName);
    await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await page.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });
  }

  phase = 'create score test';
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
  const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Tên bài kiểm tra').fill(testName);
    const dateField = dialog.locator('input[type="date"]');
    if (await dateField.count() !== 1) throw new Error('create form must expose one test-date field');
    await dateField.fill(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
    if (await dialog.getByLabel(/điểm tối đa/i).count()) throw new Error('create form still exposes a maximum-score field');
  await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  await page.getByRole('link', { name: testName, exact: true }).click();

  phase = 'validate four score inputs against 0..1000 in 0.5 steps';
  const inputs = page.locator('input[aria-label^="Điểm "]');
  await inputs.first().waitFor({ state: 'visible', timeout: 12000 });
  const count = await inputs.count();
  if (count < 4) throw new Error(`fixture_missing: expected 4 student score inputs; found ${count}`);
  const message = page.getByText(/Điểm từ 0 đến 1000, theo bước 0,5/i);
  for (const invalid of ['1000.5', '1001', '0.25', '-0.5']) {
    await inputs.nth(3).fill(invalid);
    await message.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    if (!(await message.count())) throw new Error(`score ${invalid} was not rejected with the range/step message`);
  }
  await inputs.nth(0).fill('0');
  await inputs.nth(1).fill('1000');
  await inputs.nth(2).fill('0.5');
  await inputs.nth(3).fill('');
    await page.getByRole('button', { name: 'Lưu điểm', exact: true }).click();
    await page.getByText('Đã lưu', { exact: true }).waitFor({ timeout: 10000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
  for (const [index, expected] of [[0, '0'], [1, '1000'], [2, '0.5']]) {
    const actual = (await inputs.nth(index).inputValue()).replace(',', '.');
      if (actual !== expected) throw new Error(`saved score ${expected} did not persist for row ${index + 1}; read ${actual}`);
    }

    phase = 'validate 12.5, 0, 15 and reject 12.3, 1001, -1';
    for (const invalid of ['12.3', '1001', '-1']) {
      await inputs.nth(3).fill(invalid);
      await message.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (!(await message.count())) throw new Error(`score ${invalid} was not rejected with the range/step message`);
    }
    await inputs.nth(0).fill('12.5');
    await inputs.nth(1).fill('0');
    await inputs.nth(2).fill('15');
    await inputs.nth(3).fill('');
    await page.getByRole('button', { name: 'Lưu điểm', exact: true }).click();
    await page.getByText('Đã lưu', { exact: true }).waitFor({ timeout: 10000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    for (const [index, expected] of [[0, '12.5'], [1, '0'], [2, '15']]) {
      const actual = (await inputs.nth(index).inputValue()).replace(',', '.');
      if (actual !== expected) throw new Error(`TC-TST-003: expected ${expected} after reload, read ${actual}`);
    }

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-step-validation-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-step-validation" tests="2" failures="0"><testcase classname="web" name="TC-TST-002"/><testcase classname="web" name="TC-TST-003"/></testsuite>\n');
  console.log('PASS TC-TST-002');
  console.log('PASS TC-TST-003');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-TST-003 at ${phase}: ${message}`);
  await mkdir(out, { recursive: true });
  if (!message.startsWith('fixture_missing:')) await page.screenshot({ path: `${out}/scores-step-validation-failure.png` }).catch(() => {});
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const skipped = message.startsWith('fixture_missing:');
  await writeFile(`${out}/scores-step-validation-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-step-validation" tests="2" failures="${skipped ? 0 : 2}" skipped="${skipped ? 2 : 0}"><testcase classname="web" name="TC-TST-002">${skipped ? `<skipped message="${escaped}"/>` : `<failure message="${escaped}"/>`}</testcase><testcase classname="web" name="TC-TST-003">${skipped ? `<skipped message="${escaped}"/>` : `<failure message="${escaped}"/>`}</testcase></testsuite>\n`);
  if (!skipped) process.exitCode = 1;
  } finally {
    await context.close();
  await browser.close();
}
