import { API_BASE, WEB_BASE } from "./config.mjs";
// Prints the generated slip sentence on web for each criteria mask (bit order = criterion order, last bit = homework).
// Uses the first student's draft slip of class QA-iOS-D (today's session) created by fixture-ios-draft-slip-cancel.mjs.
// The sentences are app-generated criteria text, not teacher comments. Output: one "mask<TAB>stars<TAB>sentence" line per mask.
// Credentials come from ~/.config/qlh/dev-qa.txt and are never printed.
// Usage: node qa/maestro/web/slip-sentence-matrix.mjs [mask ...]
import { readFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const api = API_BASE;
const base = WEB_BASE;
const masks = process.argv.length > 2 ? process.argv.slice(2) : ['11111', '11101', '00000', '11000', '00001', '10101', '01110', '11110'];
const creds = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((l) => {
  const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', ''];
}).filter(([k]) => k));
const get = async (path, token) => (await fetch(`${api}${path}`, { headers: { authorization: `Bearer ${token}` } })).json();
const login = await (await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: creds.phone, password: creds.password, device_label: 'qa-matrix' }) })).json();
const items = (x) => (Array.isArray(x) ? x : x.items ?? x.classes ?? []);
const cls = items(await get('/classes', login.token)).find((c) => c.name === 'QA-iOS-D');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const session = items(await get(`/classes/${cls.id}/sessions?from=${today}&to=${today}`, login.token)).find((s) => s.date === today);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' })).newPage();
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  console.log('WEB_BUNDLE', await assertConfiguredBundle(page));
  await page.locator('#login-phone').fill(creds.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(creds.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await page.goto(`${base}/lop/${cls.id}/buoi-hoc/${session.id}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  await page.getByRole('button', { name: /QA-iOS-D-HS1/ }).first().click();
  await page.getByTestId('slip-homework-row').waitFor({ state: 'visible', timeout: 10000 });
  const button = (i) => page.getByTestId(i === 4 ? 'slip-homework-row' : `slip-criterion-${i}`);
  for (const mask of masks) {
    for (let i = 0; i < 5; i += 1) {
      const want = mask[i] === '1';
      const on = (await button(i).getAttribute('aria-pressed')) === 'true';
      if (on !== want) { await button(i).click(); await page.waitForTimeout(700); }
    }
    await page.waitForTimeout(900);
    const sentence = (await page.getByTestId('slip-generated-comment').inputValue()).replace(/\s+/g, ' ');
    const stars = (await page.getByTestId('slip-star-panel').innerText()).replace(/\s+/g, ' ').match(/\d\/5/)?.[0] ?? '?';
    console.log(`${mask}\t${stars}\t${sentence}`);
  }
} catch (e) {
  console.log('FAIL', String(e.message).split('\n')[0].slice(0, 200));
}
await browser.close();
