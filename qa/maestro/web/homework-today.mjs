import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/dev-qa.txt`;
const credentials = Object.fromEntries((await readFile(credentialPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-${suffix}-HW-Class`;
const homeworkTitle = `QA-Web-${suffix}-Vocabulary U1`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
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

  phase = 'create today class';
  await page.goto(WEB_BASE + '/lop/moi');
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await page.getByRole('button', { name: 'T2', exact: true }).click();
  await page.locator('input[type=time]').fill('18:00');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop$/, { timeout: 15000 });
  await page.goto(WEB_BASE + '/lop');
  await page.getByRole('link', { name: new RegExp(className) }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await page.goto(new URL(await nav.getByRole('link', { name: 'Buổi học' }).getAttribute('href'), WEB_BASE).toString());

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

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/homework-today-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-homework-today" tests="1" failures="0"><testcase classname="web" name="TC-HW-001"/></testsuite>\n');
  console.log('PASS TC-HW-001');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-HW-001 at ${phase}: ${message}`);
  const alerts = await page.getByRole('alert').allTextContents().catch(() => []);
  if (alerts.length) console.log('FORM_ALERT', alerts.map((text) => text.trim()).filter(Boolean).join(' | '));
  const screenshot = phase === 'create today class' ? 'class-sunday-validation.png' : 'homework-today-failure.png';
  await page.screenshot({ path: `${out}/${screenshot}` }).catch(() => {});
  await mkdir(out, { recursive: true });
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/homework-today-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-homework-today" tests="1" failures="1"><testcase classname="web" name="TC-HW-001"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
