import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import('file:///Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs');

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  const testLink = page.getByRole('link', { name: /Score-Step/ }).last();
  await testLink.waitFor({ timeout: 10000 });
  const testName = (await testLink.innerText()).trim();
  await testLink.click();
  await page.getByRole('button', { name: 'Tuỳ chọn bài kiểm tra' }).click();
  await page.getByRole('button', { name: 'Xoá bài', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Lưu trữ bài kiểm tra?' });
  await dialog.waitFor({ timeout: 10000 });
  if (!(await dialog.getByText(/Bài đã có điểm nên sẽ được lưu trữ/).count())) throw new Error('TC-TST-010: archive explanation missing for graded test');
  await dialog.getByRole('button', { name: 'Lưu trữ bài', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  await page.getByRole('link', { name: 'Bài kiểm tra', exact: true }).waitFor();
  if (await page.getByRole('link', { name: testName, exact: true }).count()) throw new Error('TC-TST-010: archived test remains in the active test list');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-archive-graded-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-archive-graded" tests="1" failures="0" skipped="1"><testcase classname="web" name="TC-TST-010"><skipped message="Archive dialog and active list verified; report/parent fixture unavailable."/></testcase></testsuite>\n');
  console.log('PARTIAL TC-TST-010: archive and active list verified; report/parent portions blocked');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-TST-010: ${message}`);
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-archive-graded-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-archive-graded" tests="1" failures="1"><testcase classname="web" name="TC-TST-010"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await page.context().close();
  await browser.close();
}
