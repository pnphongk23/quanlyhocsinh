import { API_BASE, WEB_BASE } from "./config.mjs";
// Brief 96 auth checks on web: two-step login branches, removed elements, phone formats.
// Uses the smoke phone once (branch 1, no password submit) and fake numbers elsewhere.
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
const guardianPhone = (await readFile('/tmp/b96-guardian-phone.txt', 'utf8')).trim();
const base = WEB_BASE;
const rec = (id, status, note = '') => console.log(`${status} ${id}${note ? ': ' + note : ''}`);
const nat = (p) => p.replace(/^\+84/, '');
const fake = () => `+84${7 + Math.floor(Math.random() * 3)}${Math.floor(10000000 + Math.random() * 89999999)}`;

const browser = await chromium.launch({ headless: true });
let phase = 'start';
async function fresh() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').waitFor();
  return { context, page };
}
async function next(page, value) {
  await page.locator('#login-phone').fill(value);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
}
try {
  let { context, page } = await fresh();
  console.log('WEB_BUNDLE', await assertConfiguredBundle(page));
  await context.close();

  phase = 'AUTH-024 removed elements';
  ({ context, page } = await fresh());
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const gone = ['Dành cho giáo viên và phụ huynh', 'Chưa có không gian làm việc', 'Đăng ký cho giáo viên', 'Tạo tài khoản phụ huynh'].filter((t) => body.includes(t));
  const hasPassword = await page.locator('#login-password').count();
  await page.screenshot({ path: 'plans/20261021-mvp/qa/runs/2026-10-26/web/brief96-login-step1.png' });
  rec('AUTH-024-removed-elements', gone.length === 0 && hasPassword === 0 ? 'PASS' : 'FAIL', `stillShown=${gone.join('|') || 'none'} passwordFieldOnStep1=${hasPassword}`);
  await context.close();

  phase = 'AUTH-025 phone formats';
  const f = fake();
  const forms = [`0${nat(f)}`, f, `0${nat(f).slice(0, 2)} ${nat(f).slice(2, 5)} ${nat(f).slice(5)}`];
  const results = [];
  for (const v of forms) {
    ({ context, page } = await fresh());
    await next(page, v);
    await page.waitForURL(/dang-ky/, { timeout: 10000 }).catch(() => {});
    const prefilled = await page.locator('#register-phone').inputValue().catch(() => '');
    results.push(prefilled.replace(/\D/g, '').endsWith(nat(f)) && /dang-ky/.test(page.url()));
    await context.close();
  }
  ({ context, page } = await fresh());
  await page.locator('#login-phone').fill('0'.repeat(25));
  const longKept = (await page.locator('#login-phone').inputValue()).length;
  await page.locator('#login-phone').fill('12345');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.waitForTimeout(1500);
  const invalid = (await page.locator('body').innerText()).includes('Số điện thoại không hợp lệ');
  const stillStep1 = (await page.locator('#login-password').count()) === 0 && !/dang-ky/.test(page.url());
  rec('AUTH-025-phone-formats', results.every(Boolean) && longKept >= 20 && invalid && stillStep1 ? 'PASS' : 'FAIL', `formatsToRegister=${results.join(',')} longKeptLen=${longKept} errorAfterContinue=${invalid} stayedStep1=${stillStep1}`);
  await context.close();

  phase = 'AUTH-023 branch 3 (teacher_register, fake number)';
  ({ context, page } = await fresh());
  await next(page, fake());
  await page.waitForURL(/dang-ky/, { timeout: 10000 });
  const teacherForm = (await page.getByRole('heading').first().innerText()).trim();
  const wsField = await page.locator('#register-workspace').count();
  const phoneReadable = (await page.locator('#register-phone').inputValue()).length > 0;
  rec('AUTH-023-branch3-teacher-register', /Tạo không gian làm việc/.test(teacherForm) && wsField === 1 && phoneReadable ? 'PASS' : 'FAIL', `heading=${teacherForm} workspaceField=${wsField} phonePrefilled=${phoneReadable}`);
  await context.close();

  phase = 'AUTH-023 branch 2 + AUTH-007 (declared guardian phone)';
  ({ context, page } = await fresh());
  await next(page, guardianPhone);
  await page.waitForURL(/dang-ky/, { timeout: 10000 });
  const gHeading = (await page.getByRole('heading').first().innerText()).trim();
  const noWs = (await page.locator('#register-workspace').count()) === 0;
  const pwd = randomBytes(9).toString('base64url') + 'A1';
  await page.locator('#register-password').fill('short1');
  const shortDisabled = await page.getByRole('button', { name: 'Vào ứng dụng', exact: true }).isDisabled();
  await page.locator('#register-password').fill(pwd);
  await page.locator('#register-confirm').fill(pwd + 'x');
  const mismatchMsg = await page.getByText('Mật khẩu nhập lại không khớp.').count();
  const mismatchDisabled = await page.getByRole('button', { name: 'Vào ứng dụng', exact: true }).isDisabled();
  await page.locator('#register-confirm').fill(pwd);
  await page.getByRole('button', { name: 'Vào ứng dụng', exact: true }).click();
  await page.waitForURL(/\/ph(?:\/|$)|chon-vai-tro/, { timeout: 15000 });
  const landed = new URL(page.url()).pathname;
  const seesChild = await page.getByText(/S4-Cold/).first().waitFor({ timeout: 12000 }).then(() => true).catch(() => false);
  rec('AUTH-023-branch2-guardian-setup', /Đặt mật khẩu/.test(gHeading) && noWs ? 'PASS' : 'FAIL', `heading=${gHeading} noWorkspaceField=${noWs}`);
  rec('AUTH-007-guardian-first-password', shortDisabled && mismatchMsg > 0 && mismatchDisabled && seesChild ? 'PASS' : 'FAIL', `shortBlocked=${shortDisabled} mismatchMsg=${mismatchMsg} mismatchBlocked=${mismatchDisabled} landed=${landed} seesChild=${seesChild}`);
  await context.close();

  phase = 'registered guardian now routes to login';
  ({ context, page } = await fresh());
  await next(page, guardianPhone);
  await page.locator('#login-password').waitFor({ timeout: 10000 });
  rec('AUTH-008-existing-guardian-goes-to-login', 'PASS', 'registered guardian phone now routes to the password step');
  await context.close();

  phase = 'AUTH-023 branch 1 (smoke phone, password step shown, no submit)';
  ({ context, page } = await fresh());
  await next(page, credentials.phone);
  await page.locator('#login-password').waitFor({ timeout: 10000 });
  const forgot = await page.getByRole('link', { name: 'Quên mật khẩu?' }).count();
  const submitBtn = await page.getByRole('button', { name: 'Đăng nhập', exact: true }).count();
  rec('AUTH-023-branch1-login', forgot === 1 && submitBtn === 1 ? 'PASS' : 'FAIL', `forgot=${forgot} loginButton=${submitBtn}`);
  await context.close();
} catch (error) {
  console.log(`FAIL brief96-auth at ${phase}: ${(error instanceof Error ? error.message : 'unknown').slice(0, 300)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
