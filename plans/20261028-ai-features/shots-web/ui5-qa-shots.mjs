import { mkdir, readFile } from 'node:fs/promises';
import { webkit, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const base = 'http://localhost:4173';
const apiHost = 'qlh-staging-api.tolaphamnhuphong.workers.dev';
const out = new URL('../../20261021-mvp/web/ui-feedback-30/', import.meta.url).pathname;
const attendanceSession = '/lop/c63dc019-bd5d-465f-a872-e56e8482edd5/buoi-hoc/1a5754cd-d9ab-4f2b-978f-3d52e7851556';
const criteriaSession = '/lop/687c3d3f-c415-43e5-9c87-8c41caca3594/buoi-hoc/1ad5bd29-a819-4cb4-8c8c-c13f9bbb05ee';
await mkdir(out, { recursive: true });

const credentials = Object.fromEntries((await readFile('/Users/phamnhuphong/.config/qlh/staging-smoke.txt', 'utf8'))
  .split(/\r?\n/).map((line) => {
    const i = line.indexOf('=');
    return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
  }).filter(([key]) => key));

const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const apiEvents = [];
const pendingResponses = [];
const criteriaSessionId = criteriaSession.split('/').pop();
const slipKeys = new Map();
const studentNameById = new Map();
const collectSessionSlipIds = (value) => {
  if (Array.isArray(value)) {
    for (const item of value) collectSessionSlipIds(item);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const sessionId = value.sessionId ?? value.session_id ?? value.classSessionId ?? value.class_session_id;
  const studentId = value.studentId ?? value.student_id;
  if (sessionId === criteriaSessionId && typeof studentId === 'string' && /^[0-9a-f-]{16,64}$/i.test(studentId)) {
    const key = `${studentId.slice(0, 8)}:${sessionId.slice(0, 8)}`;
    slipKeys.set(key, { key, studentId });
  }
  for (const child of Object.values(value)) if (child && typeof child === 'object') collectSessionSlipIds(child);
};
page.on('response', (response) => {
  const url = new URL(response.url());
  if (url.hostname !== apiHost || !/slip|sync/i.test(url.pathname)) return;
  pendingResponses.push((async () => {
    const event = { method: response.request().method(), path: url.pathname, status: response.status() };
    if (url.pathname.endsWith('/snapshot/slip') && response.status() < 400) {
      const payload = await response.json().catch(() => null);
      if (payload) collectSessionSlipIds(payload);
    }
    if (url.pathname.endsWith('/snapshot/student') && response.status() < 400) {
      const payload = await response.json().catch(() => null);
      const items = payload?.items ?? payload?.data?.items ?? [];
      for (const item of items) if (typeof item?.id === 'string' && typeof item?.name === 'string') studentNameById.set(item.id, item.name);
    }
    if (url.pathname.toLowerCase().includes('slip') && response.status() < 400) {
      const payload = await response.json().catch(() => null);
      const id = payload?.id ?? payload?.slip?.id ?? payload?.data?.id;
      if (typeof id === 'string' && /^[0-9a-f-]{16,64}$/i.test(id)) event.slipId = id;
    }
    if (response.status() >= 400) {
      const payload = await response.json().catch(() => null);
      const code = payload?.code ?? payload?.error?.code ?? payload?.error_code ?? payload?.errorCode;
      if (typeof code === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(code)) event.code = code;
    }
    apiEvents.push(event);
  })());
});

const scrub = () => page.evaluate(() => {
  const phone = /(?:\+?84|0)[\d .()-]{8,}/g;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) node.nodeValue = node.nodeValue.replace(phone, '*** ***');
  for (const input of document.querySelectorAll('input')) {
    if (input.type === 'tel' || /(?:\+?84|0)[\d .()-]{8,}/.test(input.value)) input.value = '*** ***';
  }
});

const heartbeatWindow = async (label, durationMs) => {
  const start = Date.now();
  let nextBeat = 5000;
  while (Date.now() - start < durationMs) {
    const remaining = Math.min(nextBeat - (Date.now() - start), durationMs - (Date.now() - start));
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    const elapsed = Date.now() - start;
    const body = await page.locator('body').innerText().catch(() => '');
    const syncLabel = body.match(/Chờ đồng bộ|Đang đồng bộ|Lỗi đồng bộ|Đã đồng bộ|Đã lưu trên máy[^\n]*/)?.[0] ?? '';
    console.log(JSON.stringify({ heartbeat: label, elapsedMs: elapsed, syncLabel, apiEventCount: apiEvents.length }));
    nextBeat += 5000;
  }
};

let classA = '';
let classB = '';
let studentsA = [];
let studentsB = [];
let studentNames = {};
let badge = '';
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 1500 }).catch(() => {});
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 20000 });

  // Existing QA session only. Do not change or save attendance on this screen.
  await page.goto(`${base}${attendanceSession}?tab=diem-danh`, { waitUntil: 'domcontentloaded' });
  const unmarkedButtons = page.locator('button[aria-label*="Chưa điểm danh"]');
  await unmarkedButtons.first().waitFor({ state: 'visible', timeout: 12000 });
  await page.getByText('0 vắng mặt', { exact: true }).waitFor({ state: 'visible' });
  classA = 'QA-Web-d2bc50-HW-Previous-Class';
  const attendanceBody = await page.locator('body').innerText();
  studentsA = await unmarkedButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')?.replace(/: Chưa điểm danh\. Bấm để đổi$/, '') ?? ''));
  const saveAttendance = page.getByRole('button', { name: 'Lưu điểm danh', exact: true });
  if (studentsA.length !== 3 || await page.getByText('Chưa điểm danh', { exact: true }).count() !== 3 || !attendanceBody.includes('0 vắng mặt') || await saveAttendance.isEnabled()) {
    throw new Error(`Existing unmarked-session check failed: rows=${studentsA.length}, saveEnabled=${await saveAttendance.isEnabled()}.`);
  }
  await scrub();
  await page.screenshot({ path: `${out}attendance-unmarked-after-390-webkit.png`, animations: 'disabled' });

  // Existing QA session with persisted attendance. Slip edits stay in the teacher UI; never send to parents.
  await page.goto(`${base}${criteriaSession}?tab=diem-danh`, { waitUntil: 'domcontentloaded' });
  classB = 'QA-Web-24902e-Attendance-Class';
  const presentButtons = page.locator('button[aria-label*="Có mặt"]');
  await presentButtons.first().waitFor({ state: 'visible', timeout: 12000 });
  studentsB = await presentButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')?.replace(/: Có mặt\. Bấm để đổi$/, '') ?? ''));
  if (studentsB.length < 2) throw new Error(`Existing criteria session has fewer than two present students: ${studentsB.length}.`);
  studentsB = studentsB.filter((name, index, all) => all.indexOf(name) === index);

  await page.getByRole('tab', { name: 'Nhận xét' }).click();
  await page.getByRole('tab', { name: 'Theo tiêu chí' }).click();
  const firstGroup = page.getByRole('heading').nth(1).locator('xpath=ancestor::section[1]');
  const candidates = await firstGroup.locator('button[aria-pressed]').evaluateAll((buttons) => buttons.map((button) => ({ name: button.getAttribute('aria-label'), className: button.className })).filter((candidate) => candidate.name));
  const third = candidates.find((candidate) => !studentsB.includes(candidate.name) && candidate.className.includes('provisional') && !candidate.className.includes('absent'));
  if (!third) throw new Error('No unmarked non-absent third student is available for the no-ticket state.');
  studentNames = { A: studentsB[0], B: studentsB[1], C: third.name };
  const firstChip = (name) => firstGroup.getByRole('button', { name, exact: true }).first();
  const initial = {};
  for (const key of ['A', 'B', 'C']) {
    const chip = firstChip(studentNames[key]);
    initial[key] = { pressed: await chip.getAttribute('aria-pressed'), className: await chip.getAttribute('class') };
  }
  if (!initial.C.className?.includes('provisional')) throw new Error('Third student already has a ticket; stopping before altering an existing ticket.');

  // A: persist a not-achieved criterion. B: persist an all-achieved ticket.
  const chipA = firstChip(studentNames.A);
  if (await chipA.getAttribute('aria-pressed') === 'true') await chipA.click();
  const chipB = firstChip(studentNames.B);
  if (initial.B.className?.includes('provisional')) {
    await chipB.click();
    await chipB.waitFor({ state: 'visible' });
    await chipB.click();
  } else if (await chipB.getAttribute('aria-pressed') !== 'true') {
    await chipB.click();
  }
  await heartbeatWindow('criteria-slip-sync', 15000);
  await Promise.allSettled(pendingResponses);
  await page.waitForTimeout(1000);

  const states = {};
  for (const key of ['A', 'B', 'C']) {
    const chip = firstChip(studentNames[key]);
    states[key] = { pressed: await chip.getAttribute('aria-pressed'), className: await chip.getAttribute('class') };
  }
  badge = await firstGroup.locator('span').filter({ hasText: /em chưa có phiếu|em chưa đạt|Cả lớp đạt/ }).first().innerText();
  if (states.A.pressed !== 'false' || states.B.pressed !== 'true' || !states.B.className || states.B.className.includes('provisional') || !states.C.className?.includes('provisional') || !badge.includes('em chưa có phiếu')) {
    throw new Error(`Criteria-state check failed: ${JSON.stringify({ states, badge })}`);
  }

  // Reopen the same existing session after the sync window and verify states persisted.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Theo tiêu chí' }).click();
  const verifyGroup = page.getByRole('heading').nth(1).locator('xpath=ancestor::section[1]');
  const verify = {};
  for (const key of ['A', 'B', 'C']) {
    const chip = verifyGroup.getByRole('button', { name: studentNames[key], exact: true }).first();
    verify[key] = { pressed: await chip.getAttribute('aria-pressed'), className: await chip.getAttribute('class') };
  }
  badge = await verifyGroup.locator('span').filter({ hasText: /em chưa có phiếu|em chưa đạt|Cả lớp đạt/ }).first().innerText();
  if (verify.A.pressed !== 'false' || verify.B.pressed !== 'true' || !verify.B.className || verify.B.className.includes('provisional') || !verify.C.className?.includes('provisional') || !badge.includes('em chưa có phiếu')) {
    throw new Error(`Persisted criteria-state check failed: ${JSON.stringify({ verify, badge })}`);
  }
  await verifyGroup.scrollIntoViewIfNeeded();
  await scrub();
  await page.screenshot({ path: `${out}criteria-three-states-after-390-webkit.png`, animations: 'disabled' });
  await Promise.allSettled(pendingResponses);
  const modifiedSlips = [...slipKeys.values()].map(({ key, studentId }) => ({ key, student: studentNameById.get(studentId) ?? '' }));
  console.log(JSON.stringify({ result: 'DONE', classA, sessionA: attendanceSession.split('/').pop(), studentsA, classB, sessionB: criteriaSessionId, studentNames, states: verify, badge, modifiedSlips, apiEvents }));
} catch (error) {
  await Promise.allSettled(pendingResponses);
  const modifiedSlips = [...slipKeys.values()].map(({ key, studentId }) => ({ key, student: studentNameById.get(studentId) ?? '' }));
  console.log(JSON.stringify({ result: 'FAILED', message: String(error?.message ?? error), classA, sessionA: attendanceSession.split('/').pop(), studentsA, classB, sessionB: criteriaSessionId, studentNames, badge, modifiedSlips, apiEvents }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
