import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const suffix = randomBytes(3).toString('hex');
const className = `QA-${suffix}-Scores-Sticky`;
const students = Array.from({ length: 10 }, (_, index) => `QA-${suffix}-Student-${String(index + 1).padStart(2, '0')}`);
const testName = `QA-${suffix}-Scores-Sticky-Test`;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
const results = [];
let phase = 'teacher login';

async function check(id, callback) {
  phase = id;
  try {
    const details = await callback();
    results.push({ id, passed: true, ...details });
    console.log(`PASS ${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    results.push({ id, passed: false, error: message });
    console.log(`FAIL ${id}: ${message}`);
    await page.screenshot({ path: `${out}/scores-save-sticky-${id}-failure.png`, fullPage: true }).catch(() => {});
  }
}

async function geometry(label) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const save = page.getByRole('button', { name: 'Lưu điểm', exact: true });
  const lastInput = page.getByLabel(`Điểm ${students.at(-1)}`);
  await lastInput.scrollIntoViewIfNeeded();
  const measured = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Lưu điểm');
    const input = Array.from(document.querySelectorAll('input[aria-label]')).find((node) => node.getAttribute('aria-label')?.endsWith('Student-10'));
    if (!button || !input) return null;
    let row = input;
    while (row && !(typeof row.className === 'string' && row.className.includes('studentRow'))) row = row.parentElement;
    const b = button.getBoundingClientRect();
    const r = row?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      button: { top: b.top, bottom: b.bottom, height: b.height, position: getComputedStyle(button.parentElement).position },
      lastRow: r ? { top: r.top, bottom: r.bottom, height: r.height } : null,
      scrollY: scrollY,
    };
  });
  if (!measured) throw new Error(`${label}: save button or last student row not found`);
  const { button, lastRow, viewport } = measured;
  if (button.top < 0 || button.bottom > viewport.height) throw new Error(`${label}: Lưu điểm is outside viewport: ${JSON.stringify(measured)}`);
  if (!lastRow || lastRow.bottom > button.top + 2) throw new Error(`${label}: save footer overlaps the last student row: ${JSON.stringify(measured)}`);
  if (!(await save.isEnabled())) throw new Error(`${label}: Lưu điểm is disabled after score edit`);
  await page.screenshot({ path: `${out}/scores-save-sticky-${label}.png`, fullPage: false });
  await save.click();
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Lưu điểm');
    return Boolean(button?.disabled);
  }, undefined, { timeout: 15000 });
  return measured;
}

try {
  await mkdir(out, { recursive: true });
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  const bundle = await assertStagingBundle(page);
  console.log('STAGING_BUNDLE', bundle);
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'create QA class';
  await page.goto('https://qlh-staging-web.pages.dev/lop/moi', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
  await page.getByRole('button', { name: 'T2', exact: true }).click();
  await page.locator('input[type=time]').fill('18:00');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await page.waitForURL(/\/lop\/?$/, { timeout: 15000 });
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: new RegExp(className) }).last().click();
  const classId = new URL(page.url()).pathname.split('/')[2];
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });

  phase = 'create ten QA students';
  await nav.getByRole('link', { name: 'Học sinh', exact: true }).click();
  for (const student of students) {
    await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await page.getByLabel('Họ và tên học sinh').fill(student);
    await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await page.getByText(student, { exact: true }).waitFor({ timeout: 12000 });
  }

  phase = 'create score test';
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên bài kiểm tra').fill(testName);
  const date = dialog.locator('input[type="date"]');
  if (await date.count()) await date.fill(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  await dialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  const testLink = page.getByRole('link', { name: testName, exact: true });
  await testLink.waitFor({ timeout: 12000 });
  await testLink.click();
  const detailUrl = page.url();

  await page.getByLabel(`Điểm ${students[0]}`).fill('20');
  await check('desktop', () => geometry('desktop'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(`Điểm ${students[1]}`).fill('17,5');
  await check('mobile', () => geometry('mobile'));
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  results.push({ id: phase, passed: false, error: message });
  console.log(`FAIL ${phase}: ${message}`);
  await page.screenshot({ path: `${out}/scores-save-sticky-setup-failure.png`, fullPage: true }).catch(() => {});
} finally {
  const failures = results.filter((item) => !item.passed);
  const cases = results.map((item) => `<testcase classname="web" name="${item.id}">${item.passed ? '' : `<failure message="${item.error.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"/>`}</testcase>`).join('');
  await writeFile(`${out}/scores-save-sticky-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-scores-save-sticky" tests="${results.length}" failures="${failures.length}">${cases}</testsuite>\n`);
  await writeFile(`${out}/scores-save-sticky.json`, `${JSON.stringify({ bundle: 'index-BhzpF4oY.js', classCreated: className, studentCount: students.length, results }, null, 2)}\n`);
  await context.close();
  await browser.close();
}

if (results.some((item) => !item.passed)) process.exitCode = 1;
