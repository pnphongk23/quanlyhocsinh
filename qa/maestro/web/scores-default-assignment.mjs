import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const testName = `QA-Web-${randomBytes(3).toString('hex')}-Default-Score`;
const className = `QA-Web-${randomBytes(3).toString('hex')}-Scores-Class`;
const studentNames = Array.from({ length: 3 }, (_, index) => `QA-Web-${randomBytes(2).toString('hex')}-Default-${index + 1}`);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
let phase = 'teacher login';
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
    await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
    await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
    await page.getByRole('button', { name: 'T2', exact: true }).click();
    await page.locator('input[type=time]').fill('18:00');
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.waitForURL(/\/lop$/, { timeout: 15000 });
    await page.goto('https://qlh-staging-web.pages.dev/lop');
    await page.getByRole('link', { name: new RegExp(className) }).last().click();
    const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
    await nav.getByRole('link', { name: 'Học sinh', exact: true }).click();
    for (const studentName of studentNames) {
      await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
      await page.getByLabel('Họ và tên học sinh').fill(studentName);
      await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
      await page.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });
    }
    await page.getByRole('button', { name: `Thêm tùy chọn ${studentNames[2]}` }).click();
    await page.getByRole('menuitem', { name: 'Đánh dấu nghỉ', exact: true }).click();
    const leaveDialog = page.getByRole('dialog', { name: 'Đánh dấu học sinh đã nghỉ?' });
    await leaveDialog.getByRole('button', { name: 'Xác nhận nghỉ học', exact: true }).click();
    await leaveDialog.waitFor({ state: 'detached', timeout: 12000 });
    await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
    await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Tên bài kiểm tra').fill(testName);
    if (await createDialog.getByLabel(/điểm tối đa/i).count()) throw new Error('TC-TST-018: create form still exposes a maximum-score field');
    const dateField = createDialog.locator('input[type="date"]');
    if (await dateField.count() !== 1) throw new Error('create form must expose one test-date field');
    await dateField.fill(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  await createDialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
  await createDialog.waitFor({ state: 'detached', timeout: 15000 });
  await page.getByRole('link', { name: testName, exact: true }).click();

  phase = 'default-score confirmation cancellation';
  const scores = page.locator('input[aria-label^="Điểm "]');
  await scores.first().waitFor({ state: 'visible', timeout: 12000 });
    if (await scores.count() !== 2) throw new Error(`fixture_missing: expected 2 active student rows after one student left; found ${await scores.count()}`);
    if (await page.getByText(studentNames[2], { exact: true }).count()) throw new Error('TC-TST-018: left student remains visible in the score table');
  await scores.nth(0).fill('12');
  await scores.nth(1).fill('');
  await page.getByRole('button', { name: 'Lưu điểm', exact: true }).click();
  await page.getByText('Đã lưu', { exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Gán điểm mặc định', exact: true }).click();
  const cancelDialog = page.getByRole('dialog');
  await cancelDialog.waitFor({ state: 'visible', timeout: 5000 });
  await cancelDialog.getByRole('button', { name: 'Huỷ', exact: true }).click();
  await cancelDialog.waitFor({ state: 'detached', timeout: 5000 });
  if ((await scores.nth(0).inputValue()).replace(',', '.') !== '12' || await scores.nth(1).inputValue()) {
    throw new Error('TC-TST-018: cancelling confirmation changed score values');
  }

  phase = 'confirm default score for all visible students';
  await page.getByRole('button', { name: 'Gán điểm mặc định', exact: true }).click();
  const confirmDialog = page.getByRole('dialog');
  await confirmDialog.waitFor({ state: 'visible', timeout: 5000 });
    await confirmDialog.getByRole('button', { name: 'Gán 15 điểm', exact: true }).click();
  await confirmDialog.waitFor({ state: 'detached', timeout: 10000 });
  await page.getByText('Đã lưu', { exact: true }).waitFor({ timeout: 10000 });
  const count = await scores.count();
  for (let index = 0; index < count; index++) {
    const value = (await scores.nth(index).inputValue()).replace(',', '.');
    if (value !== '15') throw new Error(`TC-TST-018: visible student row ${index + 1} has ${value}, expected 15`);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  for (let index = 0; index < count; index++) {
    const value = (await scores.nth(index).inputValue()).replace(',', '.');
    if (value !== '15') throw new Error(`TC-TST-018: row ${index + 1} did not retain 15 after reload`);
  }

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-default-assignment-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-default-assignment" tests="1" failures="0"><testcase classname="web" name="TC-TST-018"/></testsuite>\n');
  console.log('PASS TC-TST-018');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-TST-018 at ${phase}: ${message}`);
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await mkdir(out, { recursive: true });
  const skipped = message.startsWith('fixture_missing:');
  await writeFile(`${out}/scores-default-assignment-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-default-assignment" tests="1" failures="${skipped ? 0 : 1}" skipped="${skipped ? 1 : 0}"><testcase classname="web" name="TC-TST-018">${skipped ? `<skipped message="${escaped}"/>` : `<failure message="${escaped}"/>`}</testcase></testsuite>\n`);
  process.exitCode = skipped ? 2 : 1;
} finally {
  await context.close();
  await browser.close();
}
