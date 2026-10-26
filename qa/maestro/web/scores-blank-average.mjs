import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const testName = `QA-Web-${randomBytes(3).toString('hex')}-Blank-Score`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let phase = 'login';
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();

  phase = 'create blank-score test';
  await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên bài kiểm tra').fill(testName);
  await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  await page.getByRole('link', { name: testName, exact: true }).click();

  phase = 'blank score and average assertions';
  const scoreInputs = page.locator('input[aria-label^="Điểm "]');
  await scoreInputs.first().waitFor({ state: 'visible', timeout: 12000 });
  const bodyText = await page.locator('main').innerText();
  if (/Vắng thi/.test(bodyText)) throw new Error('TC-TST-004: unsupported absent-exam choice is visible');
  if (/(điểm trung bình|trung bình lớp|TB lớp|điểm TB)/i.test(bodyText)) throw new Error('TC-TST-005: average score is visible');
  if (await scoreInputs.first().inputValue()) throw new Error('fixture: expected first score cell to be blank');
  if (!/Chưa có điểm/i.test(bodyText)) throw new Error('TC-TST-004: blank score state label missing');

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-blank-average-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-blank-average" tests="2" failures="0"><testcase classname="web" name="TC-TST-004"/><testcase classname="web" name="TC-TST-005"/></testsuite>\n');
  console.log('PASS TC-TST-004');
  console.log('PASS TC-TST-005');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL scores blank/average at ${phase}: ${message}`);
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/scores-blank-average-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-blank-average" tests="2" failures="1"><testcase classname="web" name="TC-TST-004/005"><failure message="${escaped}"/></testcase></testsuite>\n`);
  await page.screenshot({ path: `${out}/scores-blank-average-failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await page.context().close();
  await browser.close();
}
