import { API_BASE, WEB_BASE } from "./config.mjs";
// Brief 97 web checks on fixtures built by fixture-brief97-api.mjs.
// Usage: node brief97-web.mjs <classId>:<sessionId> (whole class) <classId>:<sessionId> (one opened slip)
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((l) => {
  const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', ''];
}).filter(([k]) => k));
const [whole, one] = process.argv.slice(2).map((a) => a.split(':'));
const base = WEB_BASE;
const out = 'plans/20261021-mvp/qa/runs/2026-10-26/web';
await mkdir(out, { recursive: true });
const rec = (id, ok, note = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${note ? ': ' + note : ''}`);
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' })).newPage();
// Student list only (desktop shows the editor beside it; its stars must not count as card stars).
const panel = async () => {
  const rows = page.getByRole('button', { name: /AAA-QA97-.*-HS\d/ });
  const parts = [];
  for (let i = 0; i < await rows.count(); i += 1) parts.push((await rows.nth(i).innerText()).replace(/\s+/g, ' '));
  return parts.join('\n');
};
const sendLabel = async () => (await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).innerText()).replace(/\s+/g, ' ').trim();
const count = (text, re) => (text.match(re) || []).length;
const openComments = async (ids) => {
  await page.goto(`${base}/lop/${ids[0]}/buoi-hoc/${ids[1]}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();
  await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).waitFor({ timeout: 12000 });
  await page.waitForTimeout(1200);
};
const confirmDialog = async (name, btn) => {
  const d = page.getByRole('dialog', { name });
  await d.waitFor({ state: 'visible', timeout: 8000 });
  const text = (await d.innerText()).replace(/\s+/g, ' ');
  if (btn) { await d.getByRole('button', { name: btn }).click(); await d.waitFor({ state: 'detached', timeout: 15000 }); }
  return text;
};
let t = '';
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  console.log('WEB_BUNDLE', await assertConfiguredBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  if (whole[0] !== 'skip') {
  // Fresh session: not attended, no slips
  await openComments(whole);
  t = await panel();
  await page.screenshot({ path: `${out}/brief97-w-fresh.png`, fullPage: true });
  rec('CMT-024-no-stars-chua-nhan-xet', count(t, /Chưa nhận xét/g) === 3 && !/\d\/5|sao/.test(t), `chuaNhanXet=${count(t, /Chưa nhận xét/g)}`);
  const l0 = await sendLabel();
  rec('CMT-024-send-count-zero', /\(0\)/.test(l0), l0);
  rec('CMT-024-send-disabled-at-zero', await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).isDisabled());

  // Assign defaults creates slips for everyone (nobody attended)
  await page.getByRole('button', { name: 'Gán tất cả mặc định', exact: true }).click();
  const ad = await confirmDialog(/Gán mặc định/, /^Gán mặc định$/);
  rec('CMT-022-dialog-count-3', /3 phiếu/.test(ad), ad.slice(0, 80));
  await page.waitForTimeout(2500);
  t = await panel();
  rec('CMT-022-slips-created-5-stars', count(t, /Nháp/g) === 3 && !/Chưa nhận xét/.test(t), `nhap=${count(t, /Nháp/g)}`);
  const l3 = await sendLabel();
  rec('CMT-021-send-count-3-after-assign', /\(3\)/.test(l3), l3);
  await page.screenshot({ path: `${out}/brief97-w-assigned.png`, fullPage: true });

  // Send; sent label has no time
  await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).click();
  const sd = await confirmDialog(/^Gửi phiếu .+\?$/, /^Gửi \d+ phiếu$/);
  rec('CMT-021-send-dialog-count-3', /3 phiếu/.test(sd), sd.slice(0, 80));
  await page.waitForFunction(() => /Đã gửi/.test(document.body.innerText), null, { timeout: 15000 });
  await page.waitForTimeout(2500);
  t = await panel();
  rec('CMT-025-sent-label-no-time', count(t, /Đã gửi/g) >= 3 && !/Đã gửi\s*·|Đã gửi\s*\d/.test(t), (t.match(/Đã gửi.{0,8}/g) || []).slice(0, 3).join(' | '));
  await page.screenshot({ path: `${out}/brief97-w-sent.png`, fullPage: true });

  // Assign again must not touch sent slips
  const before = count(t, /Nháp|Đã gửi/g);
  const btn = page.getByRole('button', { name: 'Gán tất cả mặc định', exact: true });
  if (await btn.isEnabled()) {
    await btn.click();
    const d2 = await confirmDialog(/Gán mặc định|Không có/, null).catch(() => '');
    rec('CMT-022-reassign-dialog-count-0', /0 phiếu|Không có/.test(d2), d2.slice(0, 80));
    await page.getByRole('button', { name: /Quay lại|Huỷ|Hủy/ }).first().click({ timeout: 2000 }).catch(() => page.keyboard.press('Escape'));
  } else rec('CMT-022-reassign-disabled-when-nothing-to-assign', true);
  t = await panel();
  rec('CMT-022-sent-unchanged-after-reassign', count(t, /Nháp|Đã gửi/g) === before && count(t, /Đã gửi/g) >= 3);

  }

  // One slip opened by hand, then send whole class sends only that one
  await openComments(one);
  await page.getByRole('button', { name: /HS1/ }).first().click();
  await page.getByTestId('slip-homework-row').waitFor({ state: 'visible', timeout: 8000 });
  // Desktop persists a criterion toggle at once; toggle one off and on so the slip exists with the default criteria.
  const crit = page.getByRole('button', { name: /Tham gia sôi nổi/ }).first();
  await crit.click(); await page.waitForTimeout(700); await crit.click();
  await page.getByText('Đã lưu trên máy').waitFor({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/brief97-m-typed.png`, fullPage: true });
  await openComments(one);
  t = await panel();
  rec('CMT-026-hand-slip-only-one-counted', /\(1\)/.test(await sendLabel()) && count(t, /Chưa nhận xét/g) === 2, `label=${await sendLabel()} chuaNhanXet=${count(t, /Chưa nhận xét/g)}`);
  await page.getByRole('button', { name: /Gửi phiếu cả lớp/ }).click();
  const od = await confirmDialog(/^Gửi phiếu .+\?$/, /^Gửi \d+ phiếu$/);
  rec('CMT-026-send-dialog-count-1', /1 phiếu/.test(od), od.slice(0, 80));
  await page.waitForTimeout(3000);
  t = await panel();
  rec('CMT-026-others-not-sent', count(t, /Đã gửi/g) === 1 && count(t, /Chưa nhận xét/g) === 2, `sent=${count(t, /Đã gửi/g)} chuaNhanXet=${count(t, /Chưa nhận xét/g)}`);
  await page.screenshot({ path: `${out}/brief97-m-after-send.png`, fullPage: true });
} catch (e) {
  console.log('FAIL run', String(e.message).split('\n')[0].slice(0, 200));
  await page.screenshot({ path: `${out}/brief97-failure.png`, fullPage: true }).catch(() => {});
}
await browser.close();
