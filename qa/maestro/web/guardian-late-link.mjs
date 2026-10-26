import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const teacher = Object.fromEntries((await readFile(credentialPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!teacher.phone || !teacher.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const phone = `0${randomInt(300000000, 999999999)}`;
const password = `${randomBytes(12).toString('base64url')}A1`;
const studentName = `QA-Web-Late-Link-${suffix}`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const parentContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const parentPage = await parentContext.newPage();
let phase = 'parent registration without a match';

try {
    await parentPage.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
    console.log('STAGING_BUNDLE', await assertStagingBundle(parentPage));
  await parentPage.getByRole('link', { name: /Tạo tài khoản/ }).click();
  await parentPage.getByRole('tablist', { name: 'Bạn đăng ký với vai trò' }).getByRole('tab', { name: 'Phụ huynh', exact: true }).click();
  await parentPage.locator('#register-name').fill('QA-Web-Late-Guardian');
  await parentPage.locator('#register-phone').fill(phone);
  await parentPage.locator('#register-password').fill(password);
  await parentPage.locator('#register-confirm').fill(password);
  await parentPage.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await parentPage.waitForURL(/\/ph(?:\/|$)/, { timeout: 20000 });
  await parentPage.getByText('Chưa có con nào được liên kết', { exact: true }).waitFor({ timeout: 10000 });

  phase = 'teacher adds matching student';
    const teacherContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const teacherPage = await teacherContext.newPage();
    await teacherPage.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
    await assertStagingBundle(teacherPage);
  await teacherPage.locator('#login-phone').fill(teacher.phone);
  await teacherPage.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await teacherPage.locator('#login-password').fill(teacher.password);
  await teacherPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await teacherPage.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await teacherPage.goto('https://qlh-staging-web.pages.dev/lop');
  await teacherPage.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const nav = teacherPage.getByRole('navigation', { name: 'Mục của lớp' });
  await teacherPage.goto(new URL(await nav.getByRole('link', { name: 'Học sinh' }).getAttribute('href'), 'https://qlh-staging-web.pages.dev').toString());
  await teacherPage.getByRole('button', { name: /Thêm học sinh/ }).first().click();
  await teacherPage.getByLabel('Họ và tên học sinh').fill(studentName);
  await teacherPage.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
  await teacherPage.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });

  await teacherPage.getByRole('button', { name: `Thêm tùy chọn ${studentName}` }).click();
  await teacherPage.getByText('Sửa số điện thoại', { exact: true }).click();
  const editPhone = teacherPage.getByRole('dialog').getByLabel('Số điện thoại phụ huynh');
  await editPhone.fill(phone);
  await teacherPage.getByRole('dialog').getByRole('button', { name: 'Lưu số điện thoại', exact: true }).click();
  await teacherPage.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15000 });

  phase = 'parent receives late link';
  await parentPage.reload({ waitUntil: 'domcontentloaded' });
  await parentPage.locator('#noi-dung').getByText(studentName, { exact: true }).waitFor({ timeout: 15000 });
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/guardian-late-link-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-guardian-late-link" tests="1" failures="0"><testcase classname="web" name="TC-AUTH-009"/></testsuite>\n');
  console.log('PASS TC-AUTH-009');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-AUTH-009 at ${phase}: ${message}`);
  console.log('CURRENT_PATH', new URL(parentPage.url()).pathname);
  const alerts = await parentPage.getByRole('alert').allTextContents().catch(() => []);
  if (alerts.length) console.log('PARENT_ALERT', alerts.map((text) => text.trim()).filter(Boolean).join(' | '));
  await mkdir(out, { recursive: true });
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/guardian-late-link-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-guardian-late-link" tests="1" failures="1"><testcase classname="web" name="TC-AUTH-009"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
