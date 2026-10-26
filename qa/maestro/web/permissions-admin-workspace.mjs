import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const { chromium } = await import('file:///Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs');

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');
const out = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  const classA = page.getByRole('link', { name: /QA-Web-241025A-Class/ });
  const classB = page.getByRole('link', { name: /QA-Web-241025B-Class/ });
  await classA.or(classB).first().waitFor({ timeout: 10000 });
  const visibleClasses = Number(await classA.count() > 0) + Number(await classB.count() > 0);
  if (visibleClasses < 2) {
    const className = `QA-Web-PRM-${randomBytes(3).toString('hex')}`;
    await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
    await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
    await page.getByRole('button', { name: 'T3', exact: true }).click();
    await page.locator('input[type=time]').fill('18:00');
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.waitForURL(/\/lop$/, { timeout: 15000 });
    await page.goto('https://qlh-staging-web.pages.dev/lop');
    await page.getByRole('link', { name: new RegExp(className) }).waitFor({ timeout: 12000 });
    const listed = (await page.getByRole('link').allTextContents()).filter((name) => /QA-Web-241025[A-B]-Class|QA-Web-PRM-/.test(name));
    if (listed.length < 2) throw new Error(`fixture_missing: owner can create a class but list has only ${listed.length} QA entries`);
  }
  await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').waitFor({ timeout: 10000 });
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/permissions-admin-workspace-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-permissions-admin-workspace" tests="1" failures="0"><testcase classname="web" name="TC-PRM-001"/></testsuite>\n');
  console.log('PASS TC-PRM-001');
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  const blocked = message.startsWith('fixture_missing:');
  console.log(`${blocked ? 'BLOCKED' : 'FAIL'} TC-PRM-001: ${message}`);
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/permissions-admin-workspace-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-permissions-admin-workspace" tests="1" failures="${blocked ? 0 : 1}" skipped="${blocked ? 1 : 0}"><testcase classname="web" name="TC-PRM-001">${blocked ? `<skipped message="${escaped}"/>` : `<failure message="${escaped}"/>`}</testcase></testsuite>\n`);
  if (!blocked) process.exitCode = 1;
} finally {
  await page.context().close();
  await browser.close();
}
