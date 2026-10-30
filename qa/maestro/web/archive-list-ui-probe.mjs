import { API_BASE, WEB_BASE } from "./config.mjs";
import { readFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
try {
  await page.goto(WEB_BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('WEB_BUNDLE', await assertConfiguredBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await page.goto(WEB_BASE + '/lop');
  const qaClass = page.getByRole('link', { name: /QA-Web-.*-Scores-Class/ }).last();
  await qaClass.waitFor({ timeout: 12000 });
  await qaClass.click();
  await page.getByRole('navigation', { name: 'Mục của lớp' }).getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  const visibleArchiveLinks = await page.getByRole('link', { name: /lưu trữ/i }).count();
  const visibleArchiveButtons = await page.getByRole('button', { name: /lưu trữ/i }).count();
  const activeQaTests = await page.getByRole('link').evaluateAll((links) => links.map((link) => link.innerText.trim()).filter((text) => /^QA-Web-/.test(text)).length);
  console.log(`archive-ui: ${visibleArchiveLinks + visibleArchiveButtons ? 'available' : 'not-visible'}; active-qa-test-links=${activeQaTests}`);
} finally {
  await context.close();
  await browser.close();
}
