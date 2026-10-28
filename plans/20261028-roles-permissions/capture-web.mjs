// node capture-web.mjs <baseUrl> <outDir>; mock API, no real credentials or real phone numbers.
import { mkdir } from 'node:fs/promises';
import { chromium, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
const [base, out] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const user = { id: 'u1', phone: '+84900000001', display_name: 'Cô Lan', must_change_password: false };
const perm = { classes: 'write', students: 'write', sessions_attendance: 'write', scores: 'write', lectures: 'write', comments_reports: 'write' };
const asstPerm = { classes: 'read', students: 'read', sessions_attendance: 'write', scores: 'read', comments_reports: 'write' };
const role = (id, name, key, scope) => ({ id, name, system_key: key, scope_kind: scope });
const admin = { id: 'm1', status: 'active', scope_epoch: 1, workspace: { id: 'w1', name: 'Lớp cô Lan' }, role: role('ra', 'Admin', 'admin', 'workspace'), permissions: perm };
const me = { user, active_membership_id: 'm1', memberships: [admin] };
const cls = (id, name) => ({ id, name, status: 'active', weekdays: [2, 4], start_time: '18:00', teacher_name: 'Cô Lan', version: 1 });
const sm = (id, name, key, rname, status, ids, extra = {}) => ({ id, kind: status === 'pending' ? 'pending' : 'member', user_id: status === 'pending' ? null : 'u' + id, display_name: name, phone: '+8490000' + id.padStart(4, '0'), role: { id: 'r' + key, name: rname, system_key: key }, class_ids: ids, status, is_self: false, created_at: '2026-10-28T00:00:00Z', version: 2, ...extra });
const staff = [
  sm('1', 'Cô Lan', 'admin', 'Admin', 'active', [], { is_self: true }),
  sm('2', 'Cô Hoa', 'teacher', 'Giáo viên', 'active', ['c1']),
  sm('3', 'Thầy Nam', 'assistant', 'Trợ giảng', 'pending', ['c1', 'c2']),
  sm('4', 'Cô Mai', 'assistant', 'Trợ giảng', 'disabled', []),
];
const perms = [
  { role: { id: 'rt', name: 'Giáo viên', system_key: 'teacher' }, permissions: { classes: 'write', students: 'write', sessions_attendance: 'write', scores: 'write', comments_reports: 'write' } },
  { role: { id: 'rs', name: 'Trợ giảng', system_key: 'assistant' }, permissions: asstPerm },
];
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) });
async function run(name, ctxOpts) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...ctxOpts, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await ctx.newPage();
  await page.route('http://mock.test/**', async (route) => {
    const req = route.request(); const u = new URL(req.url()); const p = u.pathname.replace(/^\/v1/, ''); const m = req.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (p === '/auth/phone-check') return json(route, { next: 'login' });
    if (p === '/auth/login') return json(route, { token: 't', expires_at: '2099-01-01T00:00:00Z', user, memberships: [admin], active_membership_id: 'm1' });
    if (p === '/me') return json(route, me);
    if (p === '/staff') return json(route, { items: staff });
    if (p === '/roles/permissions') return json(route, { items: perms });
    if (p === '/sync/snapshot') return json(route, { cursor: 1, epoch: 1, window: { from: '2026-01-01', to: '2026-12-31' }, entities: ['class'] });
    if (p === '/sync/snapshot/class') return json(route, { items: [cls('c1', 'Tiếng Anh 6A'), cls('c2', 'Tiếng Anh 7B')], next_after: null });
    if (p.startsWith('/sync/pull')) return json(route, { cursor: 1, epoch: 1, has_more: false, server_time: '2026-10-28T00:00:00Z', upserts: {}, deleted: [] });
    return json(route, { items: [], next_after: null });
  });
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 3000 }).catch(() => {});
  await page.locator('#login-phone').fill('0900000001');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill('x-fixture-pass');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.includes('dang-nhap'), { timeout: 15000 });
  await page.goto(`${base}/cai-dat`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}-01-cai-dat.png` });
  await page.goto(`${base}/cai-dat/nhan-su`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-02-nhan-su.png`, fullPage: true });
  await page.getByText('Thầy Nam').first().click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}-03-sua-cho.png` });
  console.log(name, 'overflowX:', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Thêm nhân sự' }).first().click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}-04-them.png` });
  await browser.close();
}
await run('mobile', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
await run('desktop', { viewport: { width: 1440, height: 900 } });
