import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `QA-Web-${suffix}-Cancel-Class`;
const firstSessionDate = new Date();
firstSessionDate.setDate(firstSessionDate.getDate() + 1);
const firstDay = firstSessionDate.getDay();
const firstDayLabel = firstDay === 0 ? 'CN' : `T${firstDay + 1}`;
const manualDates = [2, 3].map((offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
});
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let phase = 'teacher login';

try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'create class with recurring sessions';
  await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await page.getByRole('button', { name: firstDayLabel, exact: true }).click();
  await page.locator('input[type=time]').fill('18:00');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop$/, { timeout: 15000 });
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: new RegExp(className) }).last().click();

  phase = 'identify Buổi 2 and 3';
  const classNav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await classNav.getByRole('link', { name: 'Buổi học', exact: true }).click();
  for (const date of manualDates) {
    await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
    await page.locator('#extra-session-date').fill(date);
    await page.locator('#extra-session-time').fill('18:00');
    await page.getByRole('button', { name: 'Lưu buổi học', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu buổi học', exact: true }).waitFor({ state: 'detached', timeout: 20000 });
  }

  const manualCard = page.getByRole('heading', { name: 'Buổi lẻ sắp tới', exact: true }).locator('..');
  const manualTitle = manualCard.locator('p').first();
  await manualTitle.waitFor({ timeout: 10000 });
  if (!/^Buổi 2 · /.test((await manualTitle.innerText()).trim())) {
    throw new Error(`expected first one-off to be Buổi 2; saw ${(await manualTitle.innerText()).trim()}`);
  }

  phase = 'cancel Buổi 2';
  await manualCard.getByRole('link', { name: 'Xem buổi', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm tùy chọn', exact: true }).click();
  const optionsMenu = page.getByRole('menu');
  await optionsMenu.waitFor({ state: 'visible', timeout: 5000 });
  await optionsMenu.getByRole('menuitem', { name: 'Hủy buổi', exact: true }).click();
  const confirm = page.getByRole('dialog');
  await confirm.getByText('Buổi học sẽ được đánh dấu là đã huỷ. Không thể hoàn tác.', { exact: true }).waitFor({ timeout: 5000 });
  await confirm.getByRole('button', { name: 'Huỷ buổi học', exact: true }).click();
  await page.getByText('Buổi này đã huỷ', { exact: true }).waitFor({ timeout: 15000 });

  phase = 'verify canceled row and renumbering';
  await classNav.getByRole('link', { name: 'Buổi học', exact: true }).click();
  await page.getByRole('link', { name: 'Buổi đã hủy', exact: true }).waitFor({ timeout: 10000 });
  const renumberedManual = page.getByRole('heading', { name: 'Buổi lẻ sắp tới', exact: true }).locator('..').locator('p').first();
  await renumberedManual.waitFor({ timeout: 10000 });
  if (!/^Buổi 2 · /.test((await renumberedManual.innerText()).trim())) {
    throw new Error(`expected following session to become Buổi 2; saw ${(await renumberedManual.innerText()).trim()}`);
  }

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/class-cancel-renumber-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-class-cancel-renumber" tests="1" failures="0"><testcase classname="web" name="TC-CLS-007"/></testsuite>\n');
  console.log('PASS TC-CLS-007');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-CLS-007 at ${phase}: ${message}`);
  if (!message.startsWith('fixture_missing:')) {
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: `${out}/class-cancel-renumber-failure.png` }).catch(() => {});
  }
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/class-cancel-renumber-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-class-cancel-renumber" tests="1" failures="1"><testcase classname="web" name="TC-CLS-007"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = message.startsWith('fixture_missing:') ? 2 : 1;
} finally {
  await browser.close();
}
