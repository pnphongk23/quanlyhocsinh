import { mkdir, readFile } from 'node:fs/promises';
import { webkit, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const base = 'https://qlh-staging-web.pages.dev';
const apiHost = 'qlh-staging-api.tolaphamnhuphong.workers.dev';
const out = new URL('../../20261021-mvp/web/ui-feedback-30/', import.meta.url).pathname;
const attendanceSession = '/lop/c63dc019-bd5d-465f-a872-e56e8482edd5/buoi-hoc/1a5754cd-d9ab-4f2b-978f-3d52e7851556';
const criteriaSession = '/lop/687c3d3f-c415-43e5-9c87-8c41caca3594/buoi-hoc/1ad5bd29-a819-4cb4-8c8c-c13f9bbb05ee';
const dateToday = '2026-10-30';
await mkdir(out, { recursive: true });

const credentials = Object.fromEntries((await readFile('/Users/phamnhuphong/.config/qlh/staging-smoke.txt', 'utf8'))
  .split(/\r?\n/).map((line) => {
    const i = line.indexOf('=');
    return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
  }).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('QA credentials file is missing required fields.');

const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const apiEvents = [];
const pendingResponses = [];
let createdSessionId = '';
let createResponse = null;
let snapshotPresence = null;
let watchReloginSnapshots = false;

const idFrom = (payload) => payload?.id ?? payload?.session?.id ?? payload?.data?.id ?? payload?.data?.session?.id ?? '';
const scanForId = (value, target) => {
  if (value === target) return true;
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some((child) => scanForId(child, target));
};
page.on('response', (response) => {
  const url = new URL(response.url());
  if (url.hostname !== apiHost) return;
  const path = url.pathname;
  const method = response.request().method();
  if (method === 'POST' && /\/sessions(?:\/|$)/i.test(path)) {
    pendingResponses.push((async () => {
      const payload = await response.json().catch(() => null);
      const id = idFrom(payload);
      createResponse = { status: response.status(), id };
      if (id) createdSessionId = id;
      apiEvents.push({ method, path, status: response.status(), ...(id ? { id } : {}) });
    })());
    return;
  }
  if (/snapshot|pull|sync/i.test(path)) {
    pendingResponses.push((async () => {
      let payload = null;
      if (response.status() < 400) payload = await response.json().catch(() => null);
      const event = { method, path, status: response.status() };
      if (watchReloginSnapshots && createdSessionId && payload && /snapshot|pull/i.test(path)) {
        const present = scanForId(payload, createdSessionId);
        snapshotPresence = snapshotPresence === true ? true : present;
        event.createdSessionPresent = present;
      }
      if (response.status() >= 400) {
        const error = await response.json().catch(() => null);
        const code = error?.code ?? error?.error?.code ?? error?.error_code;
        if (typeof code === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(code)) event.code = code;
      }
      apiEvents.push(event);
    })());
  }
});

const scrub = () => page.evaluate(() => {
  const phone = /(?:\+?84|0)[\d .()-]{8,}/g;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) node.nodeValue = node.nodeValue.replace(phone, '*** ***');
  for (const input of document.querySelectorAll('input')) {
    if (input.type === 'tel' || phone.test(input.value)) input.value = '*** ***';
    phone.lastIndex = 0;
  }
});

const heartbeat = async (label, durationMs) => {
  const started = Date.now();
  let next = 5000;
  while (Date.now() - started < durationMs) {
    const remaining = Math.min(next - (Date.now() - started), durationMs - (Date.now() - started));
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    const body = await page.locator('body').innerText().catch(() => '');
    const sync = body.match(/Chờ đồng bộ|Đang đồng bộ|Lỗi đồng bộ|Đã đồng bộ|Đã lưu trên máy[^\n]*/)?.[0] ?? '';
    console.log(JSON.stringify({ heartbeat: label, elapsedMs: Date.now() - started, syncLabel: sync }));
    next += 5000;
  }
};

const login = async () => {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 1500 }).catch(() => {});
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 25000 });
};

let classUrl = '';
let newSessionUrl = '';
let uiAfterReload = 'not-checked';
let uiAfterLogin = 'not-checked';
let classOverflow = [];
let buildAssets = [];
let criteriaSummary = null;
let unmarkedCount = null;
let flowStatus = 'BLOCKED';
let failure = '';

try {
  await login();

  // B1: lớp cần duyệt; keep the bottom tab bar in the screenshot.
  await page.goto(`${base}/lop`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Lớp của tôi', exact: true }).waitFor({ state: 'visible' });
  await page.locator('a[href^="/lop/"][href*="/buoi-hoc"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.getByText('Việc còn dở', { exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Xem thêm \(\d+\)/ }).waitFor({ state: 'visible' });
  const todoSummary = await page.getByText('Việc còn dở', { exact: true }).locator('xpath=ancestor::section[1]').innerText();
  if (!/Xem thêm \(\d+\)/.test(todoSummary)) throw new Error('Class list is missing the remaining-work expansion control.');
  const classCards = await page.locator('a[href^="/lop/"][href*="/buoi-hoc"]').evaluateAll((anchors) => anchors
    .filter((anchor) => /^\/lop\/[0-9a-f-]+\/buoi-hoc\/?$/.test(new URL(anchor.href).pathname))
    .map((anchor) => ({ href: new URL(anchor.href).pathname, text: anchor.innerText })));
  const qaClass = classCards.find((item) => /QA/i.test(item.text) && !/demo/i.test(item.text));
  if (!qaClass) throw new Error('No non-demo class card was found on /lop for the staging QA account.');
  classUrl = qaClass.href;
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    classOverflow.push(await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll('body *')].map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className.slice(0, 70) : '', left: Math.round(rect.left * 10) / 10, right: Math.round(rect.right * 10) / 10 };
      }).filter((rect) => rect.right > width + 1 || rect.left < -1);
      return { viewport: width, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, offenders: offenders.slice(0, 8) };
    }));
  }
  if (classOverflow.some((measurement) => measurement.documentWidth > measurement.viewport || measurement.bodyWidth > measurement.viewport || measurement.offenders.length > 0)) {
    throw new Error('The /lop page has an element outside the viewport at one or more requested widths.');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await scrub();
  await page.screenshot({ path: `${out}staging-final-class-list-390.png`, animations: 'disabled' });

  // B2: inspect only; never change attendance or save.
  await page.goto(`${base}${attendanceSession}?tab=diem-danh`, { waitUntil: 'domcontentloaded' });
  const unmarked = page.locator('button[aria-label*="Chưa điểm danh"]');
  await unmarked.first().waitFor({ state: 'visible' });
  const attendanceSave = page.getByRole('button', { name: 'Lưu điểm danh', exact: true });
  unmarkedCount = await unmarked.count();
  if (unmarkedCount === 0 || await attendanceSave.isEnabled()) throw new Error('Attendance QA fixture is not unmarked or the save control is enabled; no attendance was saved.');
  await scrub();
  await page.screenshot({ path: `${out}staging-final-attendance-unmarked-390.png`, animations: 'disabled' });

  // B3: existing 3-state ticket, read-only. Do not save or send to parents.
  const slipSnapshotRequest = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.hostname === apiHost && url.pathname.endsWith('/snapshot/slip') && response.status() < 400;
  }, { timeout: 20000 });
  await page.goto(`${base}${criteriaSession}?tab=diem-danh`, { waitUntil: 'domcontentloaded' });
  await slipSnapshotRequest;
  await page.getByRole('tab', { name: 'Nhận xét' }).click();
  await page.getByRole('tab', { name: 'Theo tiêu chí' }).click();
  await page.getByRole('tab', { name: 'Theo tiêu chí' }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('button[aria-pressed]')];
    return buttons.length > 0 && buttons.some((button) => !button.className.includes('provisional'));
  }, null, { timeout: 20000 });
  const stateButtons = page.locator('button[aria-pressed]');
  criteriaSummary = await stateButtons.evaluateAll((buttons) => {
    const states = buttons.map((button) => ({ selected: button.getAttribute('aria-pressed') === 'true', provisional: button.className.includes('provisional') }));
    return {
      total: states.length,
      provisional: states.filter((state) => state.provisional).length,
      achieved: states.filter((state) => state.selected && !state.provisional).length,
      notAchieved: states.filter((state) => !state.selected && !state.provisional).length,
    };
  });
  if (!criteriaSummary.provisional || !criteriaSummary.achieved || !criteriaSummary.notAchieved || !/em chưa có phiếu|em chưa đạt|Cả lớp đạt/i.test(await page.locator('body').innerText())) {
    throw new Error('Existing criteria ticket did not render its saved status summary.');
  }
  await scrub();
  await page.screenshot({ path: `${out}staging-final-criteria-390.png`, animations: 'disabled' });

  // A: one and only one create attempt, after the read-only review screens.
  await page.goto(`${base}${classUrl}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Thêm buổi', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  if (!/Tạo một buổi học ngoài lịch lặp của lớp/.test(await dialog.innerText())) throw new Error('The add-session sheet is not the one-off session form; stopped before submitting.');
  const dateInput = dialog.locator('input[type="date"]');
  const timeInput = dialog.locator('input[type="time"]');
  await dateInput.fill(dateToday);
  const occupied = await page.locator('body').innerText();
  const candidateTimes = ['23:00', '22:00', '21:00', '20:00', '19:00', '18:00', '17:00'];
  const chosenTime = candidateTimes.find((time) => !new RegExp(`(?:^|\\D)${time.replace(':', '\\s*[:h]\\s*')}(?:\\D|$)`).test(occupied));
  if (!chosenTime) throw new Error('Could not identify a free time today; stopped before submitting a session.');
  await timeInput.fill(chosenTime);
  const createButton = dialog.getByRole('button', { name: 'Lưu buổi học', exact: true });
  await createButton.waitFor({ state: 'visible' });
  await createButton.click();
  await page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.hostname === apiHost && response.request().method() === 'POST' && /\/sessions(?:\/|$)/i.test(url.pathname);
  }, { timeout: 20000 });
  await Promise.allSettled(pendingResponses);
  if (!createResponse || createResponse.status !== 201 || !createdSessionId) {
    console.log(JSON.stringify({ createResponse: createResponse ?? 'no-response-body', urlId: null, snapshotPresence: null }));
    throw new Error('The single create attempt did not return HTTP 201 with a session id; stopping without retry.');
    }
    await heartbeat('one-off-session-sync', 15000);
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    const matchingLink = page.locator(`a[href*="${createdSessionId}"]`).first();
    if (await matchingLink.count()) newSessionUrl = new URL(await matchingLink.getAttribute('href'), base).pathname;
    if (!newSessionUrl && page.url().includes(createdSessionId)) newSessionUrl = new URL(page.url()).pathname;
    if (!newSessionUrl) {
      const sessionLinks = await page.locator('a[href*="buoi-hoc"]').evaluateAll((anchors) => anchors.map((a) => new URL(a.href).pathname));
      newSessionUrl = sessionLinks.find((href) => href.includes(createdSessionId)) ?? '';
    }
    if (!newSessionUrl) throw new Error('Created session id was not found in a session URL; stopping without retry.');
    await page.goto(`${base}${classUrl}`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const persistedLink = page.locator(`a[href*="${createdSessionId}"]`).first();
    await persistedLink.waitFor({ state: 'visible', timeout: 15000 });
    newSessionUrl = new URL(await persistedLink.getAttribute('href'), base).pathname;
    await persistedLink.click();
    await page.locator('h1').filter({ hasText: /30\/10/ }).waitFor({ state: 'visible' });
    uiAfterReload = await page.locator('body').innerText().then((text) => text.includes('30/10') ? 'present' : 'absent');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('h1').filter({ hasText: /30\/10/ }).waitFor({ state: 'visible' });
    uiAfterReload = await page.locator('body').innerText().then((text) => text.includes('30/10') ? 'present' : 'absent');

  const logoutButton = page.getByRole('button', { name: /Đăng xuất/i });
  if (await logoutButton.count()) await logoutButton.first().click();
  else {
    await page.goto(`${base}/cai-dat`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Đăng xuất/i }).click();
  }
    await page.waitForURL((url) => url.pathname.includes('dang-nhap'), { timeout: 20000 });
    await login();
    watchReloginSnapshots = true;
    await page.waitForTimeout(5000);
    await Promise.allSettled(pendingResponses);
    await page.goto(`${base}${newSessionUrl}`, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').filter({ hasText: /30\/10/ }).waitFor({ state: 'visible' });
  const reloadedBody = await page.locator('body').innerText();
  uiAfterLogin = reloadedBody.includes('30/10') ? 'present' : 'absent';
  const lost = uiAfterReload === 'absent' || uiAfterLogin === 'absent';
  flowStatus = lost ? 'DONE_WITH_CONCERNS' : 'DONE';
  await page.locator('script[src]').evaluateAll((scripts) => scripts.map((script) => script.src)).then((assets) => {
    buildAssets = assets.map((url) => url.split('/').pop()).filter((name) => /index|assets/i.test(name)).slice(0, 4);
  });
} catch (error) {
  failure = String(error?.message ?? error).replace(/(?:\+?84|0)[\d .()-]{8,}/g, '*** ***');
  flowStatus = createdSessionId ? 'DONE_WITH_CONCERNS' : 'BLOCKED';
} finally {
  await Promise.allSettled(pendingResponses);
  console.log(JSON.stringify({
    result: flowStatus,
    failure,
    build: { deployment: 'e0423355', hash: '960d696', assets: buildAssets },
    classUrl,
    screenshots: ['staging-final-class-list-390.png', 'staging-final-attendance-unmarked-390.png', 'staging-final-criteria-390.png'],
    classOverflow,
    criteriaSummary,
    attendanceUnmarkedCount: unmarkedCount,
    createResponse,
    urlId: newSessionUrl ? createdSessionId : null,
    urlIdFound: Boolean(newSessionUrl),
    snapshotPresence,
    afterReload: uiAfterReload,
    afterRelogin: uiAfterLogin,
    syncEvents: apiEvents,
  }));
  await browser.close();
}
