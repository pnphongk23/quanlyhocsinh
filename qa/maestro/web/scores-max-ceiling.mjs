import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');
  const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
  const testName = `QA-Web-${randomBytes(3).toString('hex')}-Large-Scores`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
let phase = 'login';
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
    const className = `QA-Web-${randomBytes(3).toString('hex')}-Scores-Class`;
    const studentNames = Array.from({ length: 2 }, (_, index) => `QA-Web-${randomBytes(2).toString('hex')}-Large-${index + 1}`);
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
    await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
    phase = 'create a test with no maximum-score field';
    await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
      const createDialog = page.getByRole('dialog');
      await createDialog.getByLabel('Tên bài kiểm tra').fill(testName);
      const dateField = createDialog.locator('input[type="date"]');
      if (await dateField.count() !== 1) throw new Error('create form must expose one test-date field');
      await dateField.fill(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
    if (await createDialog.getByLabel(/điểm tối đa/i).count()) throw new Error('create form still exposes a maximum-score field');
    await createDialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
    await createDialog.waitFor({ state: 'detached', timeout: 15000 });
    await page.getByRole('link', { name: testName, exact: true }).click();

    phase = 'save large scores and verify persistence';
    const inputs = page.locator('input[aria-label^="Điểm "]');
    await inputs.first().waitFor({ state: 'visible', timeout: 12000 });
    if (await inputs.count() < 2) throw new Error('fixture_missing: expected at least 2 student score inputs');
    await inputs.nth(0).fill('20');
    await inputs.nth(1).fill('100');
    await page.getByRole('button', { name: 'Lưu điểm', exact: true }).click();
    await page.getByText('Đã lưu', { exact: true }).waitFor({ timeout: 10000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    for (const [index, expected] of [[0, '20'], [1, '100']]) {
      const actual = (await inputs.nth(index).inputValue()).replace(',', '.');
      if (actual !== expected) throw new Error(`TC-TST-008: expected ${expected} after reload, found ${actual}`);
    }
    const bodyText = await page.locator('main').innerText();
    if (/\/(?:\s*15|\s*điểm tối đa)/i.test(bodyText)) throw new Error('TC-TST-008: score table still displays a maximum-score suffix');
  await mkdir(out, { recursive: true });
    await writeFile(`${out}/scores-max-ceiling-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-large-values" tests="1" failures="0"><testcase classname="web" name="TC-TST-008"/></testsuite>\n');
  console.log('PASS TC-TST-008');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-TST-008 at ${phase}: ${message}`);
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await mkdir(out, { recursive: true });
    await writeFile(`${out}/scores-max-ceiling-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-large-values" tests="1" failures="1"><testcase classname="web" name="TC-TST-008"><failure message="${escaped}"/></testcase></testsuite>\n`);
  await page.screenshot({ path: `${out}/scores-max-ceiling-failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
