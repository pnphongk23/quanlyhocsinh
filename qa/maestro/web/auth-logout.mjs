import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let phase = 'login';
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  phase = 'logout from settings';
  await page.goto('https://qlh-staging-web.pages.dev/cai-dat');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.waitForURL(/\/dang-nhap(?:\?|$)/, { timeout: 15000 });
  phase = 'verify protected route requires login';
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.waitForURL(/\/dang-nhap(?:\?|$)/, { timeout: 15000 });
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor({ timeout: 5000 });
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/auth-logout-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-auth-logout" tests="1" failures="0"><testcase classname="web" name="TC-AUTH-019"/></testsuite>\n');
  console.log('PASS TC-AUTH-019');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL TC-AUTH-019 at ${phase}: ${message}`);
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: `${out}/auth-logout-failure.png` }).catch(() => {});
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/auth-logout-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-auth-logout" tests="1" failures="1"><testcase classname="web" name="TC-AUTH-019"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
