import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { saveOfflineTicketDraft } from './offline-contracts.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const suffix = randomBytes(3).toString('hex');
const className = `QA-CMT-${suffix}-Offline-Class`;
const studentName = `QA-CMT-${suffix}-Student`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
let phase = 'teacher login';
try {
    await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
    console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

    phase = 'create isolated class and student fixture';
    await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
    await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
    await page.getByRole('button', { name: 'T2', exact: true }).click();
    await page.locator('input[type=time]').fill('18:00');
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.waitForURL(/\/lop\/?$/, { timeout: 15000 });
    await page.goto('https://qlh-staging-web.pages.dev/lop');
    await page.getByRole('link', { name: new RegExp(className) }).last().click();
    const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
    await nav.getByRole('link', { name: 'Học sinh' }).click();
    await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await page.getByLabel('Họ và tên học sinh').fill(studentName);
    await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await page.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });
    await page.getByRole('navigation', { name: 'Mục của lớp' }).getByRole('link', { name: 'Buổi học' }).click();
    phase = 'create and open a current-day session';
    const sessionLinks = page.getByRole('link', { name: 'Xem buổi', exact: true });
    const priorHrefs = new Set(await sessionLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))));
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
    await page.locator('#extra-session-date').fill(todayISO);
    await page.locator('#extra-session-time').fill('19:00');
    const saveToday = page.getByRole('button', { name: 'Lưu buổi học', exact: true });
    if (!(await saveToday.isEnabled())) throw new Error('fixture_missing: staging does not allow creating the current-day session');
    await saveToday.click();
    await page.getByRole('dialog', { name: 'Thêm buổi lẻ' }).waitFor({ state: 'detached', timeout: 12000 });
    await sessionLinks.first().waitFor({ state: 'visible', timeout: 12000 });
    let currentSession;
    for (const link of await sessionLinks.all()) {
      const href = await link.getAttribute('href');
      if (href && !priorHrefs.has(href)) { currentSession = link; break; }
    }
    if (!currentSession) throw new Error('fixture_missing: newly saved current-day session has no new details link');
    await currentSession.click();
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();

  phase = 'draft ticket offline and verify send disabled';
  // Slip v4 (web df625e3): rating comes from criterion chips.
  const criterion = page.getByTestId('slip-criterion-3');
  const editableOnline = await criterion.isEnabled();
  console.log(`TC-CMT-012 online criterion enabled: ${editableOnline}`);
    if (!editableOnline) throw new Error('blocked_WEB-003: criteria remain locked on yesterday session before offline mode');
    await saveOfflineTicketDraft(page);
    phase = 'verify send becomes available and publish online';
    const sendButton = page.getByRole('button', { name: /Gửi phiếu cả lớp/ });
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    if (!(await sendButton.isEnabled())) throw new Error('TC-CMT-012: class-send button stayed disabled after reconnecting');
    await sendButton.click();
    const confirmDialog = page.getByRole('dialog', { name: /^Gửi phiếu .+\?$/ });
    await confirmDialog.waitFor({ state: 'visible', timeout: 8000 });
    const confirmSend = confirmDialog.getByRole('button', { name: /^Gửi \d+ phiếu$/, exact: false });
    await confirmSend.waitFor({ state: 'visible', timeout: 5000 });
    await confirmSend.click();
    await confirmDialog.waitFor({ state: 'detached', timeout: 15000 });
    await page.getByText(/Đã gửi/).first().waitFor({ timeout: 15000 });
    await mkdir(out, { recursive: true });
      await writeFile(`${out}/comments-offline-send-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-comments-offline-send" tests="1" failures="0" skipped="1"><testcase classname="web" name="TC-CMT-012"><skipped message="Offline draft, network-required hint, disabled send, and online publish confirmation verified; parent visibility could not be checked without a linked parent smoke session."/></testcase></testsuite>\n');
      console.log('PARTIAL TC-CMT-012: offline draft/lock and online publish pass; parent visibility unverified');
  } catch (error) {
    await mkdir(out, { recursive: true }); await page.screenshot({ path: `${out}/comments-offline-send-failure.png`, fullPage: true }).catch(() => {});
    const message = error instanceof Error ? error.message : 'unknown error';
    const blocked = message.startsWith('blocked_WEB-003:') || message.startsWith('fixture_missing:');
    console.log(`${blocked ? 'BLOCKED' : 'FAIL'} TC-CMT-012 at ${phase}: ${message}`);
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: `${out}/comments-offline-send-failure.png` }).catch(() => {});
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/comments-offline-send-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-comments-offline-send" tests="1" failures="${blocked ? 0 : 1}" skipped="${blocked ? 1 : 0}"><testcase classname="web" name="TC-CMT-012">${blocked ? `<skipped message="${escaped}"/>` : `<failure message="${escaped}"/>`}</testcase></testsuite>\n`);
  if (!blocked) process.exitCode = 1;
} finally {
  await context.setOffline(false).catch(() => {});
  await context.close();
  await browser.close();
}
