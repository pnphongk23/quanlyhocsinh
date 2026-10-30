import { API_BASE, WEB_BASE } from "./config.mjs";
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const web = WEB_BASE;
const api = API_BASE;
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const results = [];
const errors = [];
let browser;
let context;
let page;
let teacherToken = '';
let parentToken = '';
let classId = '';
let studentId = '';
let studentName = '';
let parentFieldUi = { present: false, digits: 0, matches: false };
let parentFieldApi = { present: false, digits: 0, matches: false };
let parentSeesStudent = false;
let phaseName = 'startup';

function local9(value) {
  let digits = String(value ?? '').replace(/\D/gu, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  if (digits.length !== 9) throw new Error('invalid smoke phone format');
  return digits;
}

function normalized9(value) {
  let digits = String(value ?? '').replace(/\D/gu, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  return digits.length === 9 ? digits : '';
}

function safeMessage(error) {
  return String(error?.message ?? error ?? 'unknown error')
    .replace(/Bearer\s+[^\s"']+/giu, '[redacted]')
    .replace(/\b(?:\+?84|0)?\d{9,10}\b/gu, '[phone]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, '[long-value]')
    .replace(/[\r\n\t]+/gu, ' ').slice(0, 180);
}

function record(id, status, note = '') {
  results.push({ id, status, note: safeMessage(note) });
  console.log(`${status} ${id}${note ? `: ${safeMessage(note)}` : ''}`);
}

async function phase(name, work) {
  phaseName = name;
  try { return await work(); }
  catch (error) {
    const kind = error?.name ?? 'Error';
    const message = safeMessage(error);
    errors.push({ phase: name, kind, message });
    process.stderr.write(`ERROR phase="${name}" kind="${kind}" message="${message}"\n`);
    throw error;
  }
}

async function request(path, token, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function loginOnce(phone, password, label) {
  const { response, body } = await request('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ phone: `+84${local9(phone)}`, password, device_label: label }),
  });
  record(`LOGIN-${label}`, response.ok && body?.token ? 'pass' : 'blocked', `HTTP ${response.status}`);
  if (response.status === 401 || response.status === 429 || !response.ok || !body?.token) {
    throw new Error(`login HTTP ${response.status}`);
  }
  const profile = await request('/me', body.token);
  if (!profile.response.ok) throw new Error(`profile HTTP ${profile.response.status}`);
  return {
    token: body.token,
    session: {
      token: body.token,
      user: body.user,
      me: profile.body,
      activeMembershipId: body.active_membership_id ?? body.memberships?.[0]?.id ?? profile.body?.active_membership_id ?? profile.body?.memberships?.[0]?.id ?? null,
      guardianAccount: label === 'PH-fb2',
    },
  };
}

async function findQaStudent(classes) {
  for (const link of classes) {
    const href = await link.getAttribute('href');
    if (!href) continue;
    const id = href.split('/').filter(Boolean)[1];
    if (!id) continue;
    const list = await request(`/classes/${encodeURIComponent(id)}/students`, teacherToken);
    if (!list.response.ok || !Array.isArray(list.body?.items)) continue;
    const candidate = list.body.items.find((item) => typeof item.name === 'string' && item.name.startsWith('QA-Web-Brief91-Linked-'));
    if (candidate) return { classId: id, student: candidate };
  }
  return null;
}

async function inspectSavedParentPhone(student, guardianPhone) {
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  const studentsHref = await nav.getByRole('link', { name: 'Học sinh', exact: true }).getAttribute('href');
  await page.goto(new URL(studentsHref, web).toString(), { waitUntil: 'domcontentloaded' });
  const row = page.getByText(student.name, { exact: true }).locator('xpath=ancestor::tr[1]');
  await row.waitFor({ state: 'visible', timeout: 12000 });
  await row.getByRole('button', { name: `Thêm tùy chọn ${student.name}` }).click();
  const menu = page.getByRole('menu');
  const menuItems = menu.getByRole('menuitem');
  let edit = null;
  for (const item of await menuItems.all()) {
    const label = (await item.innerText()).trim();
    if (/Sửa.*số điện thoại phụ huynh|Sửa số điện thoại/u.test(label)) { edit = item; break; }
  }
  if (!edit) throw new Error('student parent-phone edit action unavailable');
  await edit.click();
  const dialog = page.getByRole('dialog', { name: 'Sửa số điện thoại phụ huynh' });
  await dialog.waitFor({ state: 'visible', timeout: 8000 });
  const input = dialog.getByLabel('Số điện thoại phụ huynh');
  const value = await input.inputValue();
  const guardianDigits = local9(guardianPhone);
  const digits = value.replace(/\D/gu, '');
  parentFieldUi = { present: Boolean(value.trim()), digits: digits.length, matches: normalized9(value) === guardianDigits };
  await dialog.getByRole('button', { name: 'Huỷ', exact: true }).click().catch(() => {});
  const list = await request(`/classes/${encodeURIComponent(classId)}/students`, teacherToken);
  if (!list.response.ok || !Array.isArray(list.body?.items)) throw new Error(`students list HTTP ${list.response.status}`);
  const saved = list.body.items.find((item) => item.id === studentId);
  const phoneKey = Object.keys(saved ?? {}).find((key) => /(?:parent|guardian).*phone|phone.*(?:parent|guardian)/iu.test(key));
  const apiValue = String(phoneKey ? saved[phoneKey] ?? '' : '');
  const apiDigits = apiValue.replace(/\D/gu, '');
  parentFieldApi = {
    present: Boolean(apiValue),
    digits: apiDigits.length,
    matches: normalized9(apiValue) === guardianDigits,
  };
  record('PARENT-PHONE-UI', parentFieldUi.matches ? 'pass' : 'fail', `present=${parentFieldUi.present}; digits=${parentFieldUi.digits}; matches=${parentFieldUi.matches}`);
  record('PARENT-PHONE-API', parentFieldApi.matches ? 'pass' : 'fail', `present=${parentFieldApi.present}; digits=${parentFieldApi.digits}; matches=${parentFieldApi.matches}`);
}

async function main() {
  await mkdir(out, { recursive: true });
  const raw = await readFile(`${homedir()}/.config/qlh/dev-qa.txt`, 'utf8');
  const fields = Object.fromEntries(raw.split(/\r?\n/u).map((line) => {
    const i = line.indexOf('=');
    return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
  }).filter(([key]) => key));
  if (!fields.phone || !fields.password || !fields.guardian_phone) throw new Error('fb2 smoke credential keys incomplete');

  const teacher = await phase('GV fb2 login', () => loginOnce(fields.phone, fields.password, 'GV-fb2'));
  teacherToken = teacher.token;
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  await context.addInitScript((value) => localStorage.setItem('qlh.session.v1', JSON.stringify(value)), teacher.session);
  page = await context.newPage();
  await phase('bundle update and teacher QA class discovery', async () => {
    await page.goto(`${web}/lop`, { waitUntil: 'domcontentloaded' });
    const bundleSeen = async () => page.evaluate((expected) => performance.getEntriesByType('resource').some((item) => {
      try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
    }), 'index-l7_C4kqA.js');
    await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => {
      try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
    }), 'index-l7_C4kqA.js', { timeout: 12000 }).catch(() => {});
    const firstBundleSeen = await bundleSeen();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((item) => {
      try { return new URL(item.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
    }), 'index-l7_C4kqA.js', { timeout: 15000 });
    record('BUNDLE-l7_C4kqA', 'pass', `initial=${firstBundleSeen}; reloaded=true`);
    await page.locator('a[href^="/lop/"][href$="/buoi-hoc"]').first().waitFor({ state: 'visible', timeout: 12000 });
    const links = await page.locator('a[href^="/lop/"][href$="/buoi-hoc"]').all();
    const found = await findQaStudent(links);
    if (!found) throw new Error('no saved QA-Web-Brief91 linked student found in visible classes');
    classId = found.classId;
    studentId = found.student.id;
    studentName = found.student.name;
    record('QA-STUDENT-FOUND', 'pass');
    let href = '';
    for (const link of links) {
      const candidate = await link.getAttribute('href');
      if (candidate?.split('/').filter(Boolean)[1] === classId) { href = candidate; break; }
    }
    if (!href) throw new Error('QA class link unavailable');
    await page.goto(new URL(href, web).toString(), { waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'Mục của lớp' }).waitFor({ state: 'visible', timeout: 10000 });
  });

  await phase('inspect saved parent phone', () => inspectSavedParentPhone({ id: studentId, name: studentName }, fields.guardian_phone));
  if (!parentFieldUi.matches || !parentFieldApi.matches) {
    record('PH-LATE-LINK', 'blocked', 'parent phone not confirmed saved correctly; no PH login submitted');
    return;
  }

  const parent = await phase('PH fb2 login', () => loginOnce(fields.guardian_phone, fields.password, 'PH-fb2'));
  parentToken = parent.token;
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  await pctx.addInitScript((value) => localStorage.setItem('qlh.session.v1', JSON.stringify(value)), parent.session);
  const ppage = await pctx.newPage();
  await phase('PH child visibility', async () => {
    await ppage.goto(`${web}/ph`, { waitUntil: 'domcontentloaded' });
    parentSeesStudent = await ppage.getByText(studentName, { exact: true }).waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    record('PH-LATE-LINK', parentSeesStudent ? 'pass' : 'fail', parentSeesStudent ? '' : `studentId=${studentId}; checkedAtUtc=${new Date().toISOString()}`);
    if (!parentSeesStudent) {
      await writeBugEvidence(studentId);
      return;
    }
    const child = ppage.getByText(studentName, { exact: true }).first();
    await child.screenshot({ path: `${out}/fb2-child-visibility.png` });
  });
  if (parentSeesStudent) {
    record('PRM-004', 'blocked', 'no confirmed unlinked QA student fixture in this class');
    record('PRM-005', 'blocked', 'no linked score fixture available in this diagnostic-only pass');
    record('RPT-020', 'blocked', 'published report fixture not available in diagnostic pass');
    record('CMT-PH-VIEW', 'blocked', 'no published QA feedback fixture available in diagnostic pass');
  } else {
    for (const id of ['PRM-004', 'PRM-005', 'RPT-020', 'CMT-PH-VIEW']) record(id, 'blocked', 'stopped immediately after confirmed late-link failure');
  }
  await pctx.close();
}

async function writeBugEvidence(id) {
  const utc = new Date().toISOString();
  const bug = `\n### WEB-009 · PH fb2 không thấy HS đã lưu SĐT đúng — Còn lỗi trên staging\n- Tái hiện: tài khoản smoke fb2, lớp QA hiện có, GV mở hồ sơ HS QA và xác nhận ô SĐT phụ huynh đã lưu đúng 9 chữ số; GET danh sách HS bằng GV cũng trả trường SĐT đúng 9 chữ số. GV và PH đăng nhập mỗi tài khoản một lần trong cùng tiến trình; PH mở trang chủ và không thấy HS.\n- HS ID: \`${id}\`; thời điểm kiểm tra UTC: ${utc}.\n- Kết quả mong đợi: PH thấy HS sau khi GV lưu số khớp; kếtผลจริง: HS không hiển thị. Không lặp lại.\n- Bằng chứng: \`${out}/brief91-fb2-diagnosis-junit.xml\` và \`${out}/brief91-fb2-diagnosis.json\`.\n`;
  const bugsPath = 'qa/bugs.md';
  const existing = await readFile(bugsPath, 'utf8');
  if (!existing.includes('WEB-009')) await writeFile(bugsPath, `${existing.trimEnd()}\n${bug}`);
}

try {
  await main();
} catch (error) {
  if (!results.some((item) => item.status === 'blocked' && item.id.startsWith('LOGIN-'))) record(`BLOCKED-${phaseName}`, 'blocked', safeMessage(error));
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  const testcase = results.map((item) => {
    const detail = item.status === 'blocked' ? `<skipped message="${safeMessage(item.note).replaceAll('"', '&quot;')}"/>` : item.status === 'fail' ? `<failure message="${safeMessage(item.note || 'assertion failed').replaceAll('"', '&quot;')}"/>` : `<system-out>${item.note ? safeMessage(item.note) : 'pass'}</system-out>`;
    return `<testcase classname="web" name="${item.id}">${detail}</testcase>`;
  }).join('');
  await writeFile(`${out}/brief91-fb2-diagnosis-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="brief91-fb2-diagnosis" tests="${results.length}" failures="${results.filter((item) => item.status === 'fail').length}" skipped="${results.filter((item) => item.status === 'blocked').length}">${testcase}</testsuite>\n`);
  await writeFile(`${out}/brief91-fb2-diagnosis.json`, `${JSON.stringify({ bundle: 'index-l7_C4kqA.js', parentFieldUi, parentFieldApi, parentSeesStudent, studentId: studentId || null, checkedAtUtc: parentSeesStudent === false && studentId ? new Date().toISOString() : null, results, errors }, null, 2)}\n`);
}
