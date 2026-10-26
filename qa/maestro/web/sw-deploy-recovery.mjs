import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const EXPECTED_BUNDLE = 'index-BhzpF4oY.js';
const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
const diagnostics = [];
const results = [];
let phase = 'startup';

function sanitize(value) {
  return String(value ?? '')
    .replace(/https?:\/\/[^\s)]+/g, (raw) => { try { return new URL(raw).pathname; } catch { return '[url]'; } })
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/((?:token|authorization|password|phone|email|body)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi, '$1[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b\+?\d[\d ()-]{8,}\d\b/g, '[number]')
    .slice(0, 1400);
}

function pathOnly(raw) {
  try { return new URL(raw).pathname; } catch { return '[invalid-url]'; }
}

page.on('console', (message) => {
  if (message.type() === 'error') diagnostics.push({ phase, kind: 'console-error', text: sanitize(message.text()) });
});
page.on('pageerror', (error) => diagnostics.push({ phase, kind: 'page-error', name: error.name, text: sanitize(error.stack ?? error.message) }));
page.on('response', (response) => {
  if (response.status() >= 400) diagnostics.push({ phase, kind: 'http-error', status: response.status(), path: pathOnly(response.url()) });
});
page.on('requestfailed', (request) => diagnostics.push({ phase, kind: 'request-failed', path: pathOnly(request.url()), error: sanitize(request.failure()?.errorText) }));

async function bundleSeen() {
  const seen = await page.evaluate((expected) => performance.getEntriesByType('resource').some((entry) => {
    try { return new URL(entry.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
  }), EXPECTED_BUNDLE);
  if (!seen) throw new Error(`expected bundle ${EXPECTED_BUNDLE} not found in page resources`);
  return EXPECTED_BUNDLE;
}

async function waitForShell() {
  await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
  const text = (await page.locator('body').innerText()).trim();
  if (!text || /Không thể mở màn hình/i.test(text)) throw new Error(`app shell did not render in phase ${phase}`);
  return text.length;
}

async function record(label, callback, { offlineShell = false } = {}) {
  phase = label;
  const before = diagnostics.length;
  try {
    const detail = await callback();
    const phaseErrors = diagnostics.slice(before);
    const hasAssetFailure = phaseErrors.some((event) =>
      (event.kind === 'request-failed' || event.kind === 'http-error') && event.path?.startsWith('/assets/'));
    const relevantErrors = offlineShell
      ? phaseErrors.filter((event) => {
          if (event.kind === 'page-error') return true;
          if (event.kind === 'http-error') return event.path?.startsWith('/assets/');
          if (event.kind === 'request-failed') return event.path?.startsWith('/assets/');
          return event.kind === 'console-error' && !/Failed to load resource: net::ERR_(?:INTERNET_DISCONNECTED|FAILED)/i.test(event.text);
        })
      : phaseErrors;
    const ok = !hasAssetFailure && !relevantErrors.some((event) => ['console-error', 'page-error', 'http-error', 'request-failed'].includes(event.kind));
    results.push({ label, ok, ...detail, errors: phaseErrors.length });
    console.log(`${label}: ${ok ? 'PASS' : 'FAIL'}${detail.bundle ? ` bundle=${detail.bundle}` : ''}`);
    if (!ok) await page.screenshot({ path: `${out}/sw-deploy-recovery-failure.png`, fullPage: true }).catch(() => {});
    return ok;
  } catch (error) {
    const phaseErrors = diagnostics.slice(before);
    results.push({ label, ok: false, error: sanitize(error instanceof Error ? error.message : 'unknown error'), errors: phaseErrors.length });
    console.log(`FAIL ${label}: ${sanitize(error instanceof Error ? error.message : 'unknown error')}`);
    await page.screenshot({ path: `${out}/sw-deploy-recovery-failure.png`, fullPage: true }).catch(() => {});
    return false;
  }
}

try {
  await mkdir(out, { recursive: true });
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
  await bundleSeen();
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'choose smoke class from UI';
  await page.goto('https://qlh-staging-web.pages.dev/', { waitUntil: 'domcontentloaded' });
  await waitForShell();
  await page.goto('https://qlh-staging-web.pages.dev/lop', { waitUntil: 'domcontentloaded' });
  await waitForShell();
  const classLink = page.getByRole('link', { name: /QA-Web-.*-Scores-Class/ }).first();
  let scoreUrl = null;
  let detailUrl = null;
  if (await classLink.count()) {
    await classLink.click();
    await page.waitForURL(/\/lop\/[^/]+/, { timeout: 12000 });
    const classId = new URL(page.url()).pathname.split('/')[2];
    if (!classId) throw new Error('fixture_missing: class link did not navigate to a class route');
    scoreUrl = `https://qlh-staging-web.pages.dev/lop/${classId}/diem`;
    await page.goto(scoreUrl, { waitUntil: 'domcontentloaded' });
    await waitForShell();
    await page.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
    const testLink = page.locator('main').getByRole('link', { name: /QA-Web-/ }).first();
    if (await testLink.count()) {
      const detailHref = await testLink.getAttribute('href');
      if (detailHref) detailUrl = new URL(detailHref, page.url()).href;
    }
  } else {
    results.push({ label: 'score-page-and-detail-fixture', ok: false, blocked: true, error: 'fixture_missing: smoke workspace UI shows 0 classes and no QA score class link' });
    console.log('BLOCKED score-page-and-detail-fixture: no smoke class link in UI');
  }
  if (scoreUrl) await page.goto(scoreUrl, { waitUntil: 'domcontentloaded' });
  if (scoreUrl) await waitForShell();
  if (detailUrl) {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
    await waitForShell();
    const text = await page.locator('body').innerText();
    if (/Không thể mở màn hình/i.test(text)) throw new Error('test detail shows “Không thể mở màn hình” during online cache warmup');
  }

  await record('service-worker-active', async () => {
    const sw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false, active: false, controlling: false };
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('service worker did not become ready')), 20000)),
      ]);
      return { supported: true, active: Boolean(registration.active), controlling: Boolean(navigator.serviceWorker.controller) };
    });
    if (!sw.supported || !sw.active) throw new Error('service worker is not active');
    return { sw };
  });

  await record('service-worker-cache-warm-online', async () => {
    for (const url of ['https://qlh-staging-web.pages.dev/', 'https://qlh-staging-web.pages.dev/lop', scoreUrl, detailUrl].filter(Boolean)) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await waitForShell();
      await bundleSeen();
      if (url === detailUrl && /Không thể mở màn hình/i.test(await page.locator('body').innerText())) {
        throw new Error('test detail shows “Không thể mở màn hình” during online cache warmup');
      }
    }
    return { bundle: await bundleSeen(), routesWarmed: [ '/', '/lop', scoreUrl && new URL(scoreUrl).pathname, detailUrl && new URL(detailUrl).pathname ].filter(Boolean) };
  });

  await record('normal-reload-1', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    return { bundle: await bundleSeen(), bodyLength: await waitForShell() };
  });
  await record('normal-reload-2', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    return { bundle: await bundleSeen(), bodyLength: await waitForShell() };
  });
  if (!detailUrl) {
    results.push({ label: 'score-detail-open', ok: false, blocked: true, error: 'fixture_missing: no test detail link in smoke workspace UI' });
    console.log('BLOCKED score-detail-open: no visible test detail link');
  }
  for (const [label, url] of [['root', 'https://qlh-staging-web.pages.dev/'], ['class-list', 'https://qlh-staging-web.pages.dev/lop'], ['score-grid', scoreUrl], ['test-detail', detailUrl]]) {
    if (!url) continue;
    await record(`offline-${label}`, async () => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await waitForShell();
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
      const bodyLength = await waitForShell();
      return { path: new URL(page.url()).pathname, bodyLength };
    }, { offlineShell: true });
    await context.setOffline(false);
    await record(`online-recovery-${label}`, async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      return { bundle: await bundleSeen(), bodyLength: await waitForShell() };
    });
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  const blocked = message.startsWith('fixture_missing:');
  results.push({ label: phase, ok: false, blocked, error: sanitize(message) });
  console.log(`${blocked ? 'BLOCKED' : 'FAIL'} ${phase}: ${sanitize(message)}`);
  await page.screenshot({ path: `${out}/sw-deploy-recovery-failure.png`, fullPage: true }).catch(() => {});
} finally {
  const report = {
    bundle: EXPECTED_BUNDLE,
    serviceWorkers: 'enabled',
    legacyServiceWorkerUpgrade: 'not tested; old Cp4GJ8XB bundle unavailable on staging',
    results,
    diagnostics,
  };
  await writeFile(`${out}/sw-deploy-recovery.json`, `${JSON.stringify(report, null, 2)}\n`);
  const failed = results.filter((item) => !item.ok && !item.blocked);
  const blocked = results.filter((item) => item.blocked);
  const cases = results.map((item) => `<testcase classname="web" name="${item.label}">${item.blocked ? `<skipped message="${sanitize(item.error).replaceAll('"', '&quot;')}"/>` : !item.ok ? `<failure message="${sanitize(item.error ?? `${item.errors} sanitized console/network errors`).replaceAll('"', '&quot;')}"/>` : ''}</testcase>`).join('');
  await writeFile(`${out}/sw-deploy-recovery-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-sw-deploy-recovery" tests="${results.length}" failures="${failed.length}" skipped="${blocked.length}">${cases}</testsuite>\n`);
  await context.close();
  await browser.close();
}

if (results.some((item) => !item.ok && !item.blocked)) process.exitCode = 1;
