import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let phase = 'login';
let passed = false;
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap');
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop/);

  phase = 'QA class navigation';
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const classNav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await page.goto(new URL(await classNav.getByRole('link', { name: 'Buổi học' }).getAttribute('href'), 'https://qlh-staging-web.pages.dev').toString());

  phase = 'future session detail';
  const viewLinks = page.getByRole('link', { name: 'Xem buổi' });
  if (await viewLinks.count() < 2) throw new Error('fixture_missing: need two future sessions in QA class');
    await viewLinks.nth(1).click();
    await page.getByRole('tablist', { name: 'Nội dung buổi học' }).waitFor();
    const sessionTabs = await page.getByRole('tablist', { name: 'Nội dung buổi học' }).getByRole('tab').allTextContents();
    for (const label of ['Điểm danh', 'Nhận xét', 'Bài tập về nhà']) {
      if (!sessionTabs.includes(label)) throw new Error(`missing session tab: ${label}`);
    }

    phase = 'attendance read only';
    await page.getByRole('tab', { name: 'Điểm danh', exact: true }).click();
  const body = await page.locator('body').innerText();
  if (!body.includes('Bây giờ bạn chỉ xem hoặc huỷ buổi.')) throw new Error('future-session read-only hint missing');
  if (await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).count()) throw new Error('future session exposes save attendance');
  const stateGroups = page.getByRole('group', { name: /^Trạng thái của / });
  if (!(await stateGroups.count())) throw new Error('fixture_missing: future session has no student attendance rows');
  const statusButtons = stateGroups.first().getByRole('button');
  if (!(await statusButtons.count())) throw new Error('attendance state controls missing');
  for (const button of await statusButtons.all()) {
    if (await button.isEnabled()) throw new Error('future attendance state control is enabled');
  }

  phase = 'cancel action available';
  await page.getByRole('button', { name: 'Thêm tùy chọn' }).click();
  await page.getByText('Hủy buổi', { exact: true }).waitFor({ state: 'visible' });
  passed = true;
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-CLS-016 at ${phase}: ${message}`);
  if (!message.startsWith('fixture_missing:')) {
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: `${out}/class-future-session-failure.png` }).catch(() => {});
  }
  const blocked = message.startsWith('fixture_missing:');
  await mkdir(out, { recursive: true });
      const result = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-class-future-session" tests="3" failures="${blocked || passed ? 0 : 3}"><testcase classname="web" name="TC-CLS-016">${blocked ? `<skipped message="${message}"/>` : passed ? '' : `<failure message="${message.replaceAll('"', '&quot;')}"/>`}</testcase><testcase classname="web" name="TC-ATT-003">${blocked ? `<skipped message="${message}"/>` : passed ? '' : `<failure message="${message.replaceAll('"', '&quot;')}"/>`}</testcase><testcase classname="web" name="TC-ATT-010">${blocked ? `<skipped message="${message}"/>` : passed ? '' : `<failure message="${message.replaceAll('"', '&quot;')}"/>`}</testcase></testsuite>\n`;
  await writeFile(`${out}/class-future-session-junit.xml`, result);
  if (!blocked) process.exitCode = 1;
} finally {
  await browser.close();
}
if (passed) {
  await mkdir(out, { recursive: true });
    await writeFile(`${out}/class-future-session-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-class-future-session" tests="3" failures="0"><testcase classname="web" name="TC-CLS-016"/><testcase classname="web" name="TC-ATT-003"/><testcase classname="web" name="TC-ATT-010"/></testsuite>\n`);
    console.log('PASS TC-CLS-016, TC-ATT-003, TC-ATT-010');
}
