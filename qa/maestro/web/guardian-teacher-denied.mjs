import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const phone = String(randomInt(700000000, 999999999));
const password = `${randomBytes(12).toString('base64url')}A1`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let phase = 'parent registration';

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

  phase = 'teacher route access';
  const target = WEB_BASE + '/lop/ede75178-e774-41c1-a9c0-6e0c932e1ad0/buoi-hoc';
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const path = new URL(page.url()).pathname;
  const teacherRouteStayedOpen = path.startsWith('/lop/');
  const teacherNavVisible = await page.getByRole('navigation', { name: 'Mục của lớp' }).count() > 0;
  if (teacherRouteStayedOpen || teacherNavVisible) throw new Error('guardian could access the teacher class screen');

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/guardian-teacher-denied-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-guardian-teacher-denied" tests="1" failures="0"><testcase classname="web" name="TC-PRM-003"/></testsuite>\n');
  console.log('PASS TC-PRM-003');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-PRM-003 at ${phase}: ${message}`);
  await mkdir(out, { recursive: true });
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/guardian-teacher-denied-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-guardian-teacher-denied" tests="1" failures="1"><testcase classname="web" name="TC-PRM-003"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
