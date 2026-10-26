import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const credentials = Object.fromEntries((await readFile(credentialPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-${suffix}-HW-Class`;
const homeworkTitle = `QA-Web-${suffix}-Vocabulary U1`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let phase = 'teacher login';

try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'create today class';
  await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await page.getByRole('button', { name: 'T2', exact: true }).click();
  await page.locator('input[type=time]').fill('18:00');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop$/, { timeout: 15000 });
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: new RegExp(className) }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await page.goto(new URL(await nav.getByRole('link', { name: 'Buổi học' }).getAttribute('href'), 'https://qlh-staging-web.pages.dev').toString());

  phase = 'create one-off session for today';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
  await page.locator('#extra-session-date').fill(today);
  await page.locator('#extra-session-time').fill('18:00');
  await page.getByRole('button', { name: 'Lưu buổi học', exact: true }).click();

  phase = 'open current session homework';
  const viewLinks = page.getByRole('link', { name: 'Xem buổi', exact: true });
  await viewLinks.first().waitFor({ timeout: 15000 });
  await viewLinks.first().click();
  await page.getByRole('tab', { name: 'Bài tập về nhà', exact: true }).click();
  await page.getByRole('tab', { name: 'Bài tập hôm nay', exact: true }).click();
  if (await page.locator('input[type=file]').count()) throw new Error('homework editor exposes a file attachment control');
  await page.getByRole('button', { name: /Luyện từ vựng/ }).first().click();
  await page.getByRole('button', { name: 'Luyện từ vựng', exact: true }).click();
  await page.locator('#hw-desktop-title').fill(homeworkTitle);
  await page.getByRole('button', { name: 'Lưu phần', exact: true }).click();
  await page.getByText(homeworkTitle, { exact: true }).waitFor({ timeout: 15000 });
  await page.locator('#hw-desktop-title').waitFor({ state: 'detached', timeout: 10000 });

  phase = 'one section per kind';
  const kindLabels = ['Luyện từ vựng', 'Luyện đọc', 'Luyện nói', 'Bài tập'];
  const addSection = page.getByRole('button', { name: /^\+ Thêm phần$/ });
  await addSection.click();
  const unsavedDialog = page.getByRole('dialog', { name: 'Bài tập chưa lưu' });
  if (await unsavedDialog.count()) {
    await unsavedDialog.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
    await unsavedDialog.waitFor({ state: 'detached', timeout: 10000 });
    await addSection.click();
  }
  if (!(await page.getByRole('button', { name: 'Luyện từ vựng', exact: true }).isDisabled())) {
    throw new Error('existing Luyện từ vựng kind was not disabled in add form');
  }
  // Keep the add editor open and save the next missing kind. The earlier flow
  // tried to click a form cancel action underneath a modal leave guard.
  let deleteTitle = '';
  await page.getByRole('button', { name: 'Luyện đọc', exact: true }).click();
  const readingTitle = 'QA-P1-Reading';
  await page.locator('#hw-desktop-title').fill(readingTitle);
  await page.getByRole('button', { name: 'Lưu phần', exact: true }).click();
  await page.getByText(readingTitle, { exact: true }).waitFor({ timeout: 15000 });
  await page.locator('#hw-desktop-title').waitFor({ state: 'detached', timeout: 10000 });
  for (const [index, kind] of kindLabels.slice(2).entries()) {
    await addSection.click();
    await page.getByRole('button', { name: kind, exact: true }).click();
    const title = `QA-P1-${index}-${kind.replaceAll(' ', '-')}`;
    if (kind === 'Bài tập') deleteTitle = title;
    await page.locator('#hw-desktop-title').fill(title);
    await page.getByRole('button', { name: 'Lưu phần', exact: true }).click();
    await page.getByText(title, { exact: true }).waitFor({ timeout: 15000 });
    await page.locator('#hw-desktop-title').waitFor({ state: 'detached', timeout: 10000 });
  }
  if (await page.getByRole('button', { name: /Thêm phần/ }).count()) {
    throw new Error('add-section button remained after all four kinds were present');
  }

  phase = 'delete ungraded section';
  await page.getByRole('button', { name: 'Xoá phần Bài tập', exact: true }).click();
  const deleteDialog = page.getByRole('dialog', { name: `Xoá phần “${deleteTitle}”?`, exact: true });
  await deleteDialog.waitFor({ state: 'visible' });
  await deleteDialog.getByRole('button', { name: 'Xoá phần', exact: true }).click();
  await page.getByText(deleteTitle, { exact: true }).waitFor({ state: 'detached', timeout: 10000 });

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/p1-homework-kinds-delete-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-p1-homework-kinds-delete" tests="2" failures="0"><testcase classname="web" name="TC-HW-002"/><testcase classname="web" name="TC-HW-005"/></testsuite>\n');
  console.log('PASS TC-HW-002: four unique kinds; existing kind disabled and no add action after the fourth');
  console.log('PASS TC-HW-005: ungraded homework section deleted and removed from the page');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL P1 homework at ${phase}: ${message}`);
  const alerts = await page.getByRole('alert').allTextContents().catch(() => []);
  if (alerts.length) console.log('FORM_ALERT', alerts.map((text) => text.trim()).filter(Boolean).join(' | '));
  const screenshot = phase === 'create today class' ? 'class-sunday-validation.png' : 'homework-today-failure.png';
  await page.screenshot({ path: `${out}/${screenshot}` }).catch(() => {});
  await mkdir(out, { recursive: true });
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/p1-homework-kinds-delete-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-p1-homework-kinds-delete" tests="2" failures="1"><testcase classname="web" name="TC-HW-002"><failure message="${escaped}"/></testcase><testcase classname="web" name="TC-HW-005"><skipped message="blocked before delete check"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
