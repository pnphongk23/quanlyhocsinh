// node live-web.mjs <webBase> <outDir>
// Live staging run of the 1.1 staff flow. Creds read from ~/.config/qlh/staging-smoke.txt, never printed.
// Phones and passwords of fake people are random and never printed; text nodes with +84... are masked in screenshots.
import { readFile, mkdir } from 'node:fs/promises';
import { randomUUID, randomInt } from 'node:crypto';
import { chromium, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const [web, out, mode = 'all'] = process.argv.slice(2);
const API = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
await mkdir(out, { recursive: true });
const c = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const fakePhone = () => '0911' + String(randomInt(0, 1e6)).padStart(6, '0');
const fakePass = () => 'Tt-' + randomUUID().slice(0, 12);
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: Boolean(ok), extra }); console.log(ok ? 'PASS' : 'FAIL', name, extra); };

async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  return { status: res.status, body: json };
}
async function apiLogin(phone, password) {
  const r = await call('POST', '/auth/login', null, { phone, password, device_label: 'live-check' });
  if (r.status !== 200) throw new Error(`login ${r.status} ${r.body?.error?.code}`);
  const token = r.body.token; const me = (await call('GET', '/me', token)).body;
  return { token, me };
}
async function selectMembership(token, id) { return call('PUT', '/session/membership', token, { membership_id: id }); }

// ---- setup: admin A (smoke) and a fresh workspace B (fake owner)
const A = await apiLogin(c.phone, c.password);
const adminA = A.me.memberships.find((m) => m.role.system_key === 'admin');
await selectMembership(A.token, adminA.id);
const classes = (await call('GET', '/classes', A.token)).body.items;
const smokeClass = classes.find((x) => x.id === c.class_id) ?? classes[0];
check('smoke admin sees its class', Boolean(smokeClass));

// leftovers of earlier runs: cancel pending declarations, disable active test assistants
for (const s of (await call('GET', '/staff', A.token)).body.items.filter((x) => x.display_name === 'Trợ giảng thử' && x.status !== 'disabled')) {
  if (s.kind === 'pending') await call('DELETE', `/staff/${s.id}`, A.token);
  else await call('PATCH', `/staff/${s.id}`, A.token, { status: 'disabled', base_version: s.version });
}

const phoneN1 = fakePhone(), passN1 = fakePass();

// ---- browser: admin adds assistant N1
const browser = await chromium.launch({ headless: true });
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type,x-client,x-request-id,idempotency-key', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': 'retry-after' };
// The staging API only allows its own web origin; proxy browser requests from Playwright so the local build can talk to it.
async function newCtx(opts) {
  const ctx = await browser.newContext({ ...opts, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
  await ctx.route(`${API}/**`, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const resp = await route.fetch();
    await route.fulfill({ response: resp, headers: { ...resp.headers(), ...cors } });
  });
  return ctx;
}
const mask = () => {
  const re = /\+?84\d{8,10}|0\d{9}/g;
  const run = () => { const w = document.createTreeWalker(document.body ?? document, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (re.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, '•••••••••'); };
  new MutationObserver(run).observe(document, { childList: true, subtree: true, characterData: true });
  document.addEventListener('DOMContentLoaded', run);
};
async function page(ctx) { const p = await ctx.newPage(); await p.addInitScript(mask); return p; }
async function uiLogin(p, phone, password) {
  await p.goto(`${web}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 2500 }).catch(() => {});
  await p.locator('#login-phone').fill(phone);
  await p.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await p.locator('#login-password').fill(password);
  await p.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await p.waitForURL((u) => !u.pathname.includes('dang-nhap'), { timeout: 20000 });
}
const shot = (p, n) => p.screenshot({ path: `${out}/live-${n}.png` });

let n1, staffA;
if (mode !== 'cross') {
const ctxA = await newCtx({ viewport: { width: 1440, height: 900 } });
const pa = await page(ctxA);
await uiLogin(pa, c.phone, c.password);
await pa.goto(`${web}/cai-dat/nhan-su`, { waitUntil: 'domcontentloaded' });
await pa.getByRole('button', { name: 'Thêm nhân sự' }).first().waitFor({ timeout: 20000 });
await pa.waitForTimeout(1200);
await shot(pa, '01-admin-nhan-su');
await pa.getByRole('button', { name: 'Thêm nhân sự' }).first().click();
await pa.getByLabel('Số điện thoại').fill(phoneN1);
await pa.getByLabel('Tên hiển thị').fill('Trợ giảng thử');
await pa.getByRole('tab', { name: 'Trợ giảng' }).click();
await pa.getByLabel(smokeClass.name, { exact: true }).check();
await pa.getByRole('button', { name: 'Thêm', exact: true }).click();
await pa.getByText('Trợ giảng thử').first().waitFor({ timeout: 15000 });
await pa.waitForTimeout(800);
await shot(pa, '02-admin-da-them');
staffA = (await call('GET', '/staff', A.token)).body.items;
n1 = staffA.find((s) => s.display_name === 'Trợ giảng thử' && s.status === 'pending');
check('pending declaration created with the class', n1 && n1.class_ids.length === 1 && n1.class_ids[0] === smokeClass.id);

// logout via UI
await pa.goto(`${web}/cai-dat`, { waitUntil: 'domcontentloaded' });
await pa.getByRole('button', { name: 'Đăng xuất' }).click();
await pa.waitForURL((u) => u.pathname.includes('dang-nhap'), { timeout: 15000 });
check('admin logged out', true);

// ---- N1 first-time password
await pa.locator('#login-phone').fill(phoneN1);
await pa.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
await pa.waitForURL((u) => u.pathname.includes('dang-ky'), { timeout: 15000 });
const heading = await pa.locator('h1').innerText();
const bodyText = await pa.locator('main').innerText();
check('first-time screen is neutral', heading === 'Đặt mật khẩu' && !/con\b|học sinh|phụ huynh/i.test(bodyText), heading);
await shot(pa, '03-dat-mat-khau-lan-dau');
await pa.locator('#register-password').fill(passN1);
await pa.locator('#register-confirm').fill(passN1);
await pa.getByRole('button', { name: 'Vào ứng dụng' }).click();
await pa.waitForURL((u) => !u.pathname.includes('dang-ky'), { timeout: 20000 });
await pa.waitForTimeout(2500);
check('single staff role lands in staff shell', new URL(pa.url()).pathname.startsWith('/lop'), new URL(pa.url()).pathname);
await shot(pa, '04-tro-giang-danh-sach-lop');
const listText = await pa.locator('body').innerText();
check('assistant sees only the assigned class in the UI', /\b1 lớp đang mở/.test(listText) && listText.includes(smokeClass.name), (listText.match(/\d+ lớp đang mở/) ?? ['?'])[0]);
check('assistant has no "create class" action', (await pa.getByRole('link', { name: /Tạo lớp|Thêm lớp/ }).count()) + (await pa.getByRole('button', { name: /Tạo lớp|Thêm lớp/ }).count()) === 0);

// ---- API view of N1
const N1 = await apiLogin(phoneN1, passN1);
const mN1 = N1.me.memberships.find((m) => m.role.system_key === 'assistant');
check('GET /me: assistant membership with class_ids', mN1 && Array.isArray(mN1.class_ids) && mN1.class_ids.length === 1 && mN1.class_ids[0] === smokeClass.id);
check('GET /me: default assistant permissions', mN1?.permissions.sessions_attendance === 'write' && mN1?.permissions.comments_reports === 'write' && mN1?.permissions.scores === 'read' && mN1?.permissions.classes === 'read');
if (!N1.me.active_membership_id) await selectMembership(N1.token, mN1.id);
const cls1 = (await call('GET', '/classes', N1.token)).body.items;
check('GET /classes for assistant = 1 class', cls1.length === 1 && cls1[0].id === smokeClass.id, `n=${cls1.length}`);
const createCls = await call('POST', '/classes', N1.token, { name: 'x', weekdays: [1], start_time: '18:00' });
check('assistant cannot create class (classes=read)', createCls.status === 403, String(createCls.status));

// UI: scores locked
await pa.goto(`${web}/lop/${smokeClass.id}`, { waitUntil: 'domcontentloaded' });
await pa.waitForTimeout(2500);
await shot(pa, '05-tro-giang-lop');
check('class page shows no edit-class action for assistant', (await pa.getByText('Sửa lớp', { exact: true }).count()) === 0);

// ---- sync push/pull with a real cursor
const sessR = await call('GET', `/classes/${smokeClass.id}/sessions`, N1.token);
const stuR = await call('GET', `/classes/${smokeClass.id}/students`, N1.token);
console.log('sessions', sessR.status, sessR.body?.error?.code ?? '', 'students', stuR.status, stuR.body?.error?.code ?? '', stuR.body?.error?.details?.reason ?? '');
const sessions = sessR.body?.items ?? [];
const students = (stuR.body?.items ?? []).filter((s) => s.status === 'active');
check('assistant can list sessions and students of its class', sessions.length > 0 && students.length > 0, `s=${sessions.length} st=${students.length}`);
const snap = (await call('GET', `/sync/snapshot?membership_id=${mN1.id}`, N1.token)).body;
const session = sessions.find((s) => s.status === 'planned') ?? sessions[0];
const student = students[0];
const attCmd = { id: randomUUID(), type: 'attendance.set', created_at: new Date().toISOString(), base_version: 0, payload: { session_id: session.id, student_id: student.id, status: 'present', note: '' } };
const push = await call('POST', '/sync/push', N1.token, { membership_id: mN1.id, device_id: randomUUID(), commands: [attCmd] });
const attResult = push.body?.results?.[0];
check('attendance.set applied for assistant', push.status === 200 && ['applied', 'conflict', 'duplicate'].includes(attResult?.status), `${push.status} ${attResult?.status} ${attResult?.error?.code ?? ''}`);
const pull = await call('GET', `/sync/pull?membership_id=${mN1.id}&cursor=${snap.cursor}&epoch=${snap.epoch}&limit=200`, N1.token);
check('pull with the real cursor returns the attendance row', pull.status === 200 && pull.body.cursor >= snap.cursor && (pull.body.upserts?.attendance ?? []).some((a) => a.session_id === session.id && a.student_id === student.id), `status=${pull.status} cursor ${snap.cursor}->${pull.body?.cursor}`);
// a second pull from the new cursor is empty and does not loop
const pull2 = await call('GET', `/sync/pull?membership_id=${mN1.id}&cursor=${pull.body.cursor}&epoch=${pull.body.epoch}&limit=200`, N1.token);
check('second pull from the new cursor is empty', pull2.status === 200 && pull2.body.has_more === false && Object.values(pull2.body.upserts ?? {}).every((v) => v.length === 0));
// score.set rejected
const tests = (await call('GET', `/sync/snapshot/test?membership_id=${mN1.id}`, N1.token)).body?.items ?? [];
const scoreCmd = { id: randomUUID(), type: 'score.set', created_at: new Date().toISOString(), base_version: 0, payload: { test_id: (tests[0] ?? { id: 'none' }).id, student_id: student.id, value: 5 } };
const pushScore = await call('POST', '/sync/push', N1.token, { membership_id: mN1.id, device_id: randomUUID(), commands: [scoreCmd] });
const sr = pushScore.body?.results?.[0];
check('score.set from assistant is rejected', pushScore.status === 403 || sr?.status === 'rejected', `${pushScore.status} ${sr?.status} ${sr?.error?.code ?? pushScore.body?.error?.code ?? ''} (tests=${tests.length})`);

// UI: scores tab locked
if (tests.length) {
  await pa.goto(`${web}/lop/${smokeClass.id}/diem`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await pa.waitForTimeout(2500);
  await shot(pa, '06-tro-giang-diem');
  const editable = await pa.locator('main input:not([disabled]):not([type=checkbox])').count();
  check('scores screen has no editable cell for assistant', editable === 0, `editable=${editable}`);
}

// ---- Admin disables N1 -> next call 403 -> UI back to login
staffA = (await call('GET', '/staff', A.token)).body.items;
n1 = staffA.find((s) => s.display_name === 'Trợ giảng thử');
check('pending became an active member after first password', n1 && n1.kind === 'member' && n1.status === 'active' && n1.class_ids.length === 1, `${n1?.kind}/${n1?.status}`);
const dis = await call('PATCH', `/staff/${n1.id}`, A.token, { status: 'disabled', base_version: n1.version });
check('admin disables the assistant', dis.status === 200 && dis.body.status === 'disabled', String(dis.status));
const after = await call('GET', '/classes', N1.token);
check('next REST call of the disabled assistant is 403 membership_required', after.status === 403 && after.body?.error?.details?.reason === 'membership_required', `${after.status} ${after.body?.error?.code}/${after.body?.error?.details?.reason ?? ''}`);
const pushAfter = await call('POST', '/sync/push', N1.token, { membership_id: mN1.id, device_id: randomUUID(), commands: [{ ...attCmd, id: randomUUID(), payload: { ...attCmd.payload, status: 'late' } }] });
check('sync push after disable is refused', pushAfter.status === 403 || pushAfter.body?.results?.[0]?.status === 'rejected', `${pushAfter.status}`);
await pa.goto(`${web}/lop`, { waitUntil: 'domcontentloaded' });
await pa.waitForTimeout(3500);
await pa.reload({ waitUntil: 'domcontentloaded' });
await pa.waitForTimeout(3500);
const landed = new URL(pa.url()).pathname;
await shot(pa, '07-sau-khi-bi-vo-hieu-hoa');
check('UI of the disabled assistant is sent to login / role picker', landed.includes('dang-nhap') || landed.includes('chon-vai-tro'), landed);

// ---- re-enable
n1 = (await call('GET', '/staff', A.token)).body.items.find((s) => s.display_name === 'Trợ giảng thử');
const en = await call('PATCH', `/staff/${n1.id}`, A.token, { status: 'active', base_version: n1.version });
check('admin re-enables the assistant', en.status === 200 && en.body.status === 'active', String(en.status));
await pa.goto(`${web}/dang-nhap`, { waitUntil: 'domcontentloaded' });
await uiLogin(pa, phoneN1, passN1);
await pa.waitForTimeout(2500);
check('re-enabled assistant logs in and reaches the class list', new URL(pa.url()).pathname.startsWith('/lop'), new URL(pa.url()).pathname);

}
// ---- cross workspace: admin A is added by workspace B as an assistant
if (mode !== 'main') {
const phoneB = fakePhone(), passB = fakePass();
const regB = await call('POST', '/auth/register', null, { phone: phoneB, password: passB, display_name: 'Chủ lớp B (thử)', workspace_name: 'Không gian thử B' });
check('workspace B registered', regB.status === 201 || regB.status === 200, String(regB.status));
if (!(regB.status === 201 || regB.status === 200)) { await browser.close(); process.exit(1); }
const B = await apiLogin(phoneB, passB);
const adminB = B.me.memberships.find((m) => m.role.system_key === 'admin');
await selectMembership(B.token, adminB.id);
const bClass = await call('POST', '/classes', B.token, { name: 'Lớp thử B', weekdays: [2], start_time: '18:00' });
const addA = await call('POST', '/staff', B.token, { phone: c.phone, display_name: 'Ignored', role: 'assistant', class_ids: bClass.body?.id ? [bClass.body.id] : [] });
check('workspace B adds an existing account as assistant (active member right away)', addA.status === 201 && addA.body.kind === 'member', String(addA.status));
const ctxA2 = await newCtx({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const pa2 = await page(ctxA2);
await uiLogin(pa2, c.phone, c.password);
await pa2.waitForTimeout(2000);
const pickPath = new URL(pa2.url()).pathname;
check('account with two roles is sent to the role picker', pickPath.includes('chon-vai-tro'), pickPath);
await shot(pa2, '08-chon-vai-tro-hai-vai');
const roleButtons = pa2.locator('main button');
const labels = (await roleButtons.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
check('picker lists Admin and Trợ giảng', labels.some((t) => /Admin/.test(t)) && labels.some((t) => /Trợ giảng/.test(t)), labels.join(' | ').slice(0, 120));
await pa2.locator('main button', { hasText: 'Trợ giảng' }).first().click();
await pa2.waitForURL((u) => u.pathname.startsWith('/lop'), { timeout: 20000 });
await pa2.waitForTimeout(2500);
await shot(pa2, '09-sau-khi-chon-tro-giang-b');
const bodyB = await pa2.locator('body').innerText();
check('as assistant of B only B\'s class is listed', bodyB.includes('Lớp thử B') && !bodyB.includes(smokeClass.name));
await pa2.goto(`${web}/cai-dat`, { waitUntil: 'domcontentloaded' });
await pa2.waitForTimeout(1500);
await shot(pa2, '10-cai-dat-tro-giang');
check('assistant sees no Nhân sự entry in Settings', (await pa2.getByText('Nhân sự', { exact: true }).count()) === 0);
await pa2.getByRole('button', { name: /Đổi vai trò/ }).click();
await pa2.waitForURL((u) => u.pathname.includes('chon-vai-tro'), { timeout: 10000 });
await pa2.locator('main button', { hasText: 'Admin' }).first().click();
await pa2.waitForURL((u) => u.pathname.startsWith('/lop'), { timeout: 20000 });
await pa2.waitForTimeout(2500);
const bodyA = await pa2.locator('body').innerText();
check('switched back to Admin: workspace A classes are listed again', bodyA.includes(smokeClass.name) && !bodyA.includes('Lớp thử B'));
await shot(pa2, '11-quay-lai-admin');
await pa2.goto(`${web}/cai-dat`, { waitUntil: 'domcontentloaded' });
await pa2.waitForTimeout(1200);
check('admin sees Nhân sự entry again', (await pa2.getByText('Nhân sự').count()) > 0);

// ---- cleanup B
const staffB = (await call('GET', '/staff', B.token)).body.items;
const aInB = staffB.find((s) => s.id === addA.body.id);
if (aInB) { const r = await call('PATCH', `/staff/${aInB.id}`, B.token, { status: 'disabled', base_version: aInB.version }); check('cleanup: A removed from workspace B', r.status === 200, String(r.status)); }
}
// ---- cleanup A
n1 = (await call('GET', '/staff', A.token)).body.items.find((s) => s.display_name === 'Trợ giảng thử' && s.status !== 'disabled');
if (n1) { const r = await call('PATCH', `/staff/${n1.id}`, A.token, { status: 'disabled', base_version: n1.version }); check('cleanup: test assistant disabled in A', r.status === 200, String(r.status)); }
const meA = (await call('GET', '/me', A.token)).body;
check('cleanup: smoke admin back to a single membership', meA.memberships.filter((m) => m.status === 'active').length === 1);

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) console.log('FAILED:', failed.map((f) => f.name).join('; '));
