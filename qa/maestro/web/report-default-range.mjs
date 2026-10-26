import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
  await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  const reportsHref = await nav.getByRole('link', { name: 'Báo cáo', exact: true }).getAttribute('href');
  await page.goto(new URL(reportsHref, 'https://qlh-staging-web.pages.dev').toString());
  const add = page.getByRole('button', { name: 'Thêm báo cáo', exact: true });
  let skipped = false;
  let detail = '';
  if (await page.getByText('Chưa có báo cáo nào', { exact: true }).count() && await page.getByText('Báo cáo cần ít nhất một buổi đã diễn ra.', { exact: true }).count()) {
    skipped = true;
    detail = 'empty state: Báo cáo cần ít nhất một buổi đã diễn ra.';
  } else if (!(await add.count())) {
    throw new Error('TC-RPT-001: Add report action missing without documented no-held-session empty state');
  } else if (!(await add.isEnabled())) {
    skipped = true;
    detail = await add.getAttribute('title') ?? 'Thêm báo cáo bị khoá';
  } else {
    await add.click();
    const dialog = page.getByRole('dialog', { name: 'Thêm báo cáo' });
    await dialog.waitFor({ timeout: 10000 });
    const from = dialog.locator('#report-from');
    const to = dialog.locator('#report-to');
    const fromCount = await from.locator('option').count();
    const toCount = await to.locator('option').count();
    const noMonthPicker = await dialog.locator('input[type=month]').count() === 0;
    const fromText = await from.locator('option:checked').innerText();
    const toText = await to.locator('option:checked').innerText();
    detail = JSON.stringify({ fromCount, toCount, noMonthPicker, fromDefault: fromText, toDefault: toText });
    if (fromCount < 4 || toCount < 4) skipped = true;
    else if (!noMonthPicker || !/Buổi\s*1/.test(fromText)) throw new Error(`TC-RPT-001: unexpected defaults (${detail})`);
  }
  await mkdir(out, { recursive: true });
  const skippedCases = ['TC-RPT-001', 'TC-RPT-002', 'TC-RPT-006', 'TC-RPT-007', 'TC-RPT-008', 'TC-RPT-009', 'TC-RPT-010', 'TC-RPT-012'];
  if (skipped) {
    await writeFile(`${out}/report-default-range-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-report-default-range" tests="8" failures="0" skipped="8">${skippedCases.map((name) => `<testcase classname="web" name="${name}"><skipped message="fixture lacks four held sessions: ${detail.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"/></testcase>`).join('')}</testsuite>\n`);
    console.log('BLOCKED report P0: fixture lacks four held sessions');
    console.log(`REPORT_FIXTURE ${detail}`);
  } else {
    await writeFile(`${out}/report-default-range-junit.xml`, '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-report-default-range" tests="1" failures="0"><testcase classname="web" name="TC-RPT-001"/></testsuite>\n');
    console.log('PASS TC-RPT-001');
    console.log(`REPORT_FIXTURE ${detail}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.log(`FAIL report P0: ${message}`);
  const body = await page.locator('body').innerText().catch(() => '');
  console.log('REPORT_UI_STATE', JSON.stringify({ noReports: body.includes('Chưa có báo cáo nào'), noHeldSession: body.includes('Báo cáo cần ít nhất một buổi đã diễn ra.'), addActionCount: await page.getByRole('button', { name: 'Thêm báo cáo', exact: true }).count().catch(() => -1), path: new URL(page.url()).pathname }));
  await mkdir(out, { recursive: true });
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/report-default-range-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-report-default-range" tests="1" failures="1"><testcase classname="web" name="TC-RPT-001"><failure message="${escaped}"/></testcase></testsuite>\n`);
  process.exitCode = 1;
} finally {
  await page.context().close();
  await browser.close();
}
