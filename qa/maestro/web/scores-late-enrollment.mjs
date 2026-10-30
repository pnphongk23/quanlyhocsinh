import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const { chromium } = await import('file:///Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs');

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const suffix = randomBytes(3).toString('hex');
const testName = `QA-Web-${suffix}-Before-Enrollment`;
const studentName = `QA-Web-${suffix}-Late-Student`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let phase = 'teacher login';
try {
  await page.goto(WEB_BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await page.goto(WEB_BASE + '/lop');
  await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });

  phase = 'create test dated before enrollment';
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên bài kiểm tra').fill(testName);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  await dialog.locator('input[type=date]').fill(date);
  await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });

  phase = 'add student today';
  await page.goto(new URL(await nav.getByRole('link', { name: 'Học sinh', exact: true }).getAttribute('href'), WEB_BASE).toString());
  await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
  await page.getByLabel('Họ và tên học sinh').fill(studentName);
  await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
  await page.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });

  phase = 'verify student appears in earlier test';
  await page.goto(WEB_BASE + '/lop');
  await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const scoreNav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await scoreNav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  await page.getByRole('link', { name: testName, exact: true }).click();
  await page.locator('main').getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });
  const studentLabel = page.locator('main').getByText(studentName, { exact: true });
  const row = studentLabel.locator('xpath=../../..');
  if (!(await row.locator('input[aria-label^="Điểm "]').count())) throw new Error('TC-TST-012: late student has no score cell for earlier test');
  if (!(await row.getByText('Chưa có điểm', { exact: true }).count())) throw new Error('TC-TST-012: late student blank score is not labelled');
  const lateScore = row.locator('input[aria-label^="Điểm "]');
  await lateScore.fill('10');
  await page.getByRole('button', { name: 'Lưu điểm', exact: true }).click();
  await page.getByText('Đã lưu', { exact: true }).waitFor({ timeout: 10000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const savedRow = page.locator('main').getByText(studentName, { exact: true }).locator('xpath=../../..');
  if ((await savedRow.locator('input[aria-label^="Điểm "]').inputValue()).replace(',', '.') !== '10') throw new Error('TC-TST-012: score for late student did not persist');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-late-enrollment-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-late-enrollment" tests="1" failures="0" skipped="1"><testcase classname="web" name="TC-TST-012"><skipped message="Teacher score cell and save verified; report/parent fixture unavailable because no past sessions or linked guardian."/></testcase></testsuite>\n');
  console.log('PARTIAL TC-TST-012: teacher score saved; report/parent portions blocked by fixture');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-TST-012 at ${phase}: ${message}`);
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-late-enrollment-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-late-enrollment" tests="1" failures="1"><testcase classname="web" name="TC-TST-012"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await page.context().close();
  await browser.close();
}
