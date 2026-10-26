import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const credentials = Object.fromEntries((await readFile(credentialPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-${suffix}-Attendance-Class`;
const students = ['One', 'Two', 'Three', 'Four'].map((part) => `QA-Web-${suffix}-${part}`);
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh', serviceWorkers: 'block' });
const page = await context.newPage();
let phase = 'login and create class';

async function saveAndWait() {
  await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Lưu điểm danh');
    return Boolean(button?.disabled);
  }, { timeout: 15000 });
}

async function assertState(student, expected) {
  const group = page.getByRole('group', { name: `Trạng thái của ${student}` });
  const selected = group.getByRole('button', { name: expected, exact: true });
  if (await selected.getAttribute('aria-pressed') !== 'true') throw new Error(`${student} expected ${expected}`);
}

try {
    await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
    console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
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
  let nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await page.goto(new URL(await nav.getByRole('link', { name: 'Học sinh' }).getAttribute('href'), 'https://qlh-staging-web.pages.dev').toString());

  phase = 'add four students';
  for (const student of students) {
    await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await page.getByLabel('Họ và tên học sinh').fill(student);
    await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await page.getByText(student, { exact: true }).waitFor({ timeout: 12000 });
  }

  phase = 'create current session';
  nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await page.goto(new URL(await nav.getByRole('link', { name: 'Buổi học' }).getAttribute('href'), 'https://qlh-staging-web.pages.dev').toString());
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
  await page.locator('#extra-session-date').fill(today);
  await page.locator('#extra-session-time').fill('18:00');
  await page.getByRole('button', { name: 'Lưu buổi học', exact: true }).click();
  await page.getByRole('link', { name: 'Xem buổi', exact: true }).first().waitFor({ timeout: 15000 });
  await page.getByRole('link', { name: 'Xem buổi', exact: true }).first().click();
  await page.getByRole('tab', { name: 'Điểm danh', exact: true }).click();

  phase = 'save four attendance states';
  for (const [student, state] of [[students[0], 'Có mặt'], [students[1], 'Muộn'], [students[2], 'Có phép'], [students[3], 'Vắng']]) {
    await page.getByRole('group', { name: `Trạng thái của ${student}` }).getByRole('button', { name: state, exact: true }).click();
  }
  await page.getByLabel(`Giờ đến muộn của ${students[1]}`).fill('18:10');
  await saveAndWait();
  await page.reload({ waitUntil: 'domcontentloaded' });
  for (const [student, state] of [[students[0], 'Có mặt'], [students[1], 'Muộn'], [students[2], 'Có phép'], [students[3], 'Vắng']]) await assertState(student, state);

  phase = 'edit saved attendance';
  await page.getByRole('group', { name: `Trạng thái của ${students[3]}` }).getByRole('button', { name: 'Có mặt', exact: true }).click();
  await saveAndWait();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertState(students[3], 'Có mặt');

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/attendance-four-states-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-attendance-four-states" tests="2" failures="0"><testcase classname="web" name="TC-ATT-001"/><testcase classname="web" name="TC-ATT-002"/></testsuite>\n');
  console.log('PASS TC-ATT-001, TC-ATT-002');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL attendance group at ${phase}: ${message}`);
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: `${out}/attendance-four-states-failure.png` }).catch(() => {});
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const failure = `<failure message="${escaped}"/>`;
  await writeFile(`${out}/attendance-four-states-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-attendance-four-states" tests="2" failures="2"><testcase classname="web" name="TC-ATT-001">${failure}</testcase><testcase classname="web" name="TC-ATT-002">${failure}</testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
