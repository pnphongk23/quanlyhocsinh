import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const values = Object.fromEntries((await readFile(credentialPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!values.phone || !values.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const studentName = `QA-Web-Link-${suffix}`;
const phone = `0${randomInt(300000000, 999999999)}`;
const unrelatedStudentName = `QA-Web-Unlinked-${suffix}`;
const unrelatedPhone = `0${randomInt(300000000, 999999999)}`;
const password = `${randomBytes(12).toString('base64url')}A1`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const teacherPage = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })).newPage();
let phase = 'teacher login and student setup';

try {
    await teacherPage.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
    console.log('STAGING_BUNDLE', await assertStagingBundle(teacherPage));
  await teacherPage.locator('#login-phone').fill(values.phone);
  await teacherPage.locator('#login-password').fill(values.password);
  await teacherPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await teacherPage.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await teacherPage.goto('https://qlh-staging-web.pages.dev/lop');
  await teacherPage.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const classNav = teacherPage.getByRole('navigation', { name: 'Mục của lớp' });
  await teacherPage.goto(new URL(await classNav.getByRole('link', { name: 'Học sinh' }).getAttribute('href'), 'https://qlh-staging-web.pages.dev').toString());
  await teacherPage.getByRole('button', { name: /Thêm học sinh/ }).first().click();
  await teacherPage.getByLabel('Họ và tên học sinh').fill(studentName);
  await teacherPage.getByLabel(/Số điện thoại phụ huynh/).fill(phone);
    await teacherPage.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await teacherPage.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });
    await teacherPage.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await teacherPage.getByLabel('Họ và tên học sinh').fill(unrelatedStudentName);
    await teacherPage.getByLabel(/Số điện thoại phụ huynh/).fill(unrelatedPhone);
    await teacherPage.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await teacherPage.getByText(unrelatedStudentName, { exact: true }).waitFor({ timeout: 12000 });

  phase = 'parent registration and auto-link';
    const parentPage = await (await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
    await parentPage.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
    await assertStagingBundle(parentPage);
  await parentPage.getByRole('link', { name: /Tạo tài khoản/ }).click();
  await parentPage.getByRole('tablist', { name: 'Bạn đăng ký với vai trò' }).getByRole('tab', { name: 'Phụ huynh', exact: true }).click();
  await parentPage.locator('#register-name').fill('QA-Web-Guardian-Link');
  await parentPage.locator('#register-phone').fill(phone);
  await parentPage.locator('#register-password').fill(password);
  await parentPage.locator('#register-confirm').fill(password);
  await parentPage.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await parentPage.waitForURL(/\/ph(?:\/|$)/, { timeout: 20000 });
    await parentPage.locator('#noi-dung').getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });
    if ((await parentPage.locator('#noi-dung').innerText()).includes(unrelatedStudentName)) throw new Error('TC-GRD-009: parent can see a student linked to another phone');
    await parentPage.getByRole('link', { name: 'Nhận xét của cô', exact: true }).click();
    await parentPage.waitForURL(/\/ph\/nhan-xet(?:\/|$)/, { timeout: 10000 });
    if ((await parentPage.locator('main').innerText()).includes(unrelatedStudentName)) throw new Error('TC-GRD-009: unrelated student is visible in parent comments');
    if (await parentPage.locator('input, textarea, select').count()) throw new Error('TC-GRD-008: parent comments view exposes editable form controls');

    await mkdir(out, { recursive: true });
    await writeFile(`${out}/guardian-links-student-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-guardian-links-student" tests="3" failures="0"><testcase classname="web" name="TC-AUTH-007"/><testcase classname="web" name="TC-GRD-008"/><testcase classname="web" name="TC-GRD-009"/></testsuite>\n');
    console.log('PASS TC-AUTH-007');
    console.log('PASS TC-GRD-008');
    console.log('PASS TC-GRD-009');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-AUTH-007 at ${phase}: ${message}`);
  const alerts = await teacherPage.getByRole('alert').allTextContents().catch(() => []);
  if (alerts.length) console.log('FORM_ALERT', alerts.map((text) => text.trim()).filter(Boolean).join(' | '));
  await mkdir(out, { recursive: true });
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/guardian-links-student-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-guardian-links-student" tests="1" failures="1"><testcase classname="web" name="TC-AUTH-007"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
