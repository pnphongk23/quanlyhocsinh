import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const phone = String(randomInt(700000000, 999999999));
const password = `${randomBytes(12).toString('base64url')}A1`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let phase = 'guardian registration';

try {
  await page.goto(WEB_BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Tạo tài khoản/ }).click();
  await page.getByRole('tablist', { name: 'Bạn đăng ký với vai trò' }).getByRole('tab', { name: 'Phụ huynh', exact: true }).click();
  await page.locator('#register-name').fill('QA-Web-Guardian');
  await page.locator('#register-phone').fill(phone);
  await page.locator('#register-password').fill(password);
  await page.locator('#register-confirm').fill(password);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await page.waitForURL(/\/ph(?:\/|$)/, { timeout: 20000 });

  phase = 'empty guardian home';
  await page.getByText('Chưa có con nào được liên kết', { exact: true }).waitFor({ timeout: 10000 });
  phase = 'settings entry for unlinked guardian';
  const settings = page.getByRole('link', { name: 'Cài đặt', exact: true });
  if (await settings.getAttribute('href') !== '/cai-dat') throw new Error('TC-GRD-010: settings route is not available from empty state');
  await settings.click();
  await page.waitForURL(/\/cai-dat(?:\/|$)/, { timeout: 10000 });
  await page.getByText('Cài đặt', { exact: true }).last().waitFor({ timeout: 10000 });
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-guardian-no-student" tests="2" failures="0"><testcase classname="web" name="TC-AUTH-008"/><testcase classname="web" name="TC-GRD-010"/></testsuite>\n';
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/guardian-no-student-junit.xml`, xml);
  console.log('PASS TC-AUTH-008');
  console.log('PASS TC-GRD-010');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-AUTH-008 at ${phase}: ${message}`);
  await mkdir(out, { recursive: true });
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/guardian-no-student-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-guardian-no-student" tests="1" failures="1"><testcase classname="web" name="TC-AUTH-008"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
