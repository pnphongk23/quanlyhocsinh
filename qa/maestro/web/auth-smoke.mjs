import { readFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const lines = (await readFile(credentialPath, 'utf8')).split(/\r?\n/);
const values = Object.fromEntries(lines.map((line) => {
  const i = line.indexOf('=');
  return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
const phone = values.phone;
const password = values.password;
if (!phone || !password) throw new Error('Required smoke credential keys are missing');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.locator('input').first().fill(phone);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  const text = await page.locator('body').innerText();
  if (!text.includes('Tất cả lớp') && !text.includes('Lớp của tôi')) throw new Error('Signed-in landing did not show the class home');
  console.log('PASS: smoke login reached teacher class home');
  await (await import('node:fs/promises')).mkdir('plans/20261021-mvp/qa/runs/2026-10-24/web',{recursive:true});
  await (await import('node:fs/promises')).writeFile('plans/20261021-mvp/qa/runs/2026-10-24/web/auth-smoke-junit.xml','<?xml version="1.0" encoding="UTF-8"?><testsuite name="web-auth" tests="1" failures="0"><testcase classname="web" name="TC-AUTH-002"/></testsuite>\n');
} finally {
  await browser.close();
}
