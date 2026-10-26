import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const credentials = Object.fromEntries((await readFile(credentialPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();
const className = `QA-Web-${randomBytes(3).toString('hex')}-Sunday`;
let phase = 'teacher login';
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
    await page.locator('#login-password').fill(credentials.password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
    phase = 'create Sunday-only class';
    await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
    await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await page.getByRole('button', { name: 'CN', exact: true }).click();
    await page.locator('input[type=time]').fill('18:00');
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.waitForURL(/\/lop$/, { timeout: 20000 });
    phase = 'verify created class sessions';
    await page.goto('https://qlh-staging-web.pages.dev/lop');
    await page.getByRole('link', { name: new RegExp(className) }).last().click();
    const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
    await nav.getByRole('link', { name: 'Buổi học', exact: true }).click();
    await page.getByText(/^Buổi 1 · Chủ Nhật,/, { exact: false }).waitFor({ state: 'visible', timeout: 15000 });
    await mkdir(out, { recursive: true });
    await writeFile(`${out}/sunday-class-validation-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-sunday-class-validation" tests="1" failures="0"><testcase classname="web" name="TC-CLS-017"/></testsuite>\n');
    console.log('PASS TC-CLS-017; Sunday session visible');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.log(`FAIL TC-CLS-017 at ${phase}: ${message}`);
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: `${out}/class-sunday-validation-postfix-failure.png` }).catch(() => {});
    const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    await writeFile(`${out}/sunday-class-validation-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-sunday-class-validation" tests="1" failures="1"><testcase classname="web" name="TC-CLS-017"><failure message="${escaped}"/></testcase></testsuite>\n`);
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
