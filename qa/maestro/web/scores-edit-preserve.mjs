import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const testName = `QA-Web-${randomBytes(3).toString('hex')}-Edit-Preserve`;
const className = `QA-Web-${randomBytes(3).toString('hex')}-Scores-Class`;
const studentName = `QA-Web-${randomBytes(2).toString('hex')}-Edit-Student`;
const editedName = `${testName}-Edited`;
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
    await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await page.getByLabel('Họ và tên học sinh').fill(studentName);
    await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await page.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });
    await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();

  phase = 'create test and score a student';
  await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
  const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Tên bài kiểm tra').fill(testName);
    if (await createDialog.getByLabel(/điểm tối đa/i).count()) throw new Error('create form still exposes a maximum-score field');
  const createDate = createDialog.locator('input[type="date"]');
  if (await createDate.count() !== 1) throw new Error('fixture/selector: expected one test-date field in create form');
  await createDate.fill('2026-10-25');
  await createDialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
  await createDialog.waitFor({ state: 'detached', timeout: 15000 });
  await page.getByRole('link', { name: testName, exact: true }).click();
  const scores = page.locator('input[aria-label^="Điểm "]');
  await scores.first().waitFor({ state: 'visible', timeout: 12000 });
  await scores.first().fill('15');
  await page.getByRole('button', { name: 'Lưu điểm', exact: true }).click();
  await page.getByText('Đã lưu', { exact: true }).waitFor({ timeout: 10000 });

  phase = 'edit test metadata without maximum score';
  await page.getByRole('button', { name: 'Tuỳ chọn bài kiểm tra' }).click();
  await page.getByRole('button', { name: 'Sửa bài', exact: true }).click();
  const editDialog = page.getByRole('dialog');
  if (await editDialog.getByLabel(/điểm tối đa/i).count()) throw new Error('edit form still exposes a maximum-score field');
  await editDialog.getByLabel('Tên bài kiểm tra').fill(editedName);
  const editDate = editDialog.locator('input[type="date"]');
  if (await editDate.count() !== 1) throw new Error('TC-TST-007: edit form must contain one test-date field');
  await editDate.fill('2026-10-26');
  await editDialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await editDialog.waitFor({ state: 'detached', timeout: 15000 });
    await page.locator('main').getByText(editedName, { exact: true }).waitFor({ timeout: 12000 });
  const firstScore = page.locator('input[aria-label^="Điểm "]').first();
  if ((await firstScore.inputValue()).replace(',', '.') !== '15') throw new Error('TC-TST-007: saved score 15 changed after editing metadata');
  const mainText = await page.locator('main').innerText();
  if (/\/\s*(?:15|điểm tối đa)/i.test(mainText)) throw new Error('TC-TST-007: score table displays a maximum-score suffix');

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-edit-preserve-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-edit-preserve" tests="1" failures="0"><testcase classname="web" name="TC-TST-007"/></testsuite>\n');
  console.log('PASS TC-TST-007');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-TST-007 at ${phase}: ${message}`);
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-edit-preserve-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-edit-preserve" tests="1" failures="1"><testcase classname="web" name="TC-TST-007"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
