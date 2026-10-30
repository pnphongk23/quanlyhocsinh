import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const reportFixture = JSON.parse(await readFile(`${out}/report-batch-delete.json`, 'utf8'));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
let result = { passed: false, reportRows: 0, numberedLegacyLabels: 0 };
try {
  await page.goto(WEB_BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });
  const bundle = await assertConfiguredBundle(page);
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await page.goto(WEB_BASE + '/lop');
  await page.getByPlaceholder('Tìm lớp hoặc học sinh').fill(reportFixture.className);
  await page.getByRole('link', { name: new RegExp(reportFixture.className) }).last().click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  const reportsHref = await nav.getByRole('link', { name: 'Báo cáo', exact: true }).getAttribute('href');
  if (!reportsHref) throw new Error('report navigation link missing');
  await page.goto(new URL(reportsHref, WEB_BASE).toString(), { waitUntil: 'domcontentloaded' });
  const reportRows = await page.getByRole('link', { name: /Mở báo cáo/ }).count();
  const mainText = await page.locator('main').last().innerText();
  result = {
    passed: mainText.length > 0 && reportRows > 0,
    reportRows,
    reportLabelsChecked: reportRows > 0,
    numberedLegacyLabels: (mainText.match(/\bBuổi\s+\d+\b/gu) ?? []).length,
    weekdayDateLabels: (mainText.match(/(?:T[2-7]|Chủ Nhật)\s*·\s*\d{1,2}\/\d{1,2}/gu) ?? []).length,
    monthLabels: (mainText.match(/\bTháng\s+\d{1,2}\/\d{4}\b/gu) ?? []).length,
    bundle: 'index-C8aXCZci.js',
  };
  if (bundle !== 'index-C8aXCZci.js') result.passed = false;
  console.log(`${result.passed ? 'PASS' : 'BLOCKED'} report-list-labels; rows=${result.reportRows}; numbered-labels=${result.numberedLegacyLabels}; date-labels=${result.weekdayDateLabels}; month-labels=${result.monthLabels}`);
} catch {
  console.log('FAIL report-list-open');
  result.passed = false;
} finally {
  await mkdir(out, { recursive: true });
  const blocked = !result.passed && result.reportRows === 0;
  const failure = result.passed || blocked ? '' : '<failure message="report list did not load"/>';
  const skipped = blocked ? '<skipped message="no report rows visible to verify labels"/>' : '';
  await writeFile(`${out}/brief90-report-list-check-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-brief90-report-list" tests="1" failures="${result.passed || blocked ? 0 : 1}" skipped="${blocked ? 1 : 0}"><testcase classname="web" name="report-list-labels">${failure}${skipped}</testcase></testsuite>\n`);
  await writeFile(`${out}/brief90-report-list-check.json`, `${JSON.stringify(result, null, 2)}\n`);
  await context.close();
  await browser.close();
}
if (!result.passed && result.reportRows !== 0) process.exitCode = 1;
