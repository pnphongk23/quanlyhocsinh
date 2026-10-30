import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentialPath = `${process.env.HOME}/.config/qlh/dev-qa.txt`;
const credentials = Object.fromEntries((await readFile(credentialPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const runId = randomBytes(3).toString('hex');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
const checks = [];
const diagnostics = [];
let phase = 'startup';

function safeStack(value) {
  return String(value ?? '')
    .replace(/https?:\/\/[^\s)]+/g, (url) => { try { return new URL(url).pathname; } catch { return '[url]'; } })
    .replace(/[+\d][\d .()\-]{7,}\d/g, '[redacted-number]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/(token|authorization|password|phone|body)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 1600);
}

page.on('console', (message) => {
  if (message.type() !== 'error') return;
  const text = message.text();
  diagnostics.push({ kind: 'console-error', phase, text: safeStack(text) });
});
page.on('pageerror', (error) => diagnostics.push({ kind: 'page-error', phase, name: error.name, stack: safeStack(error.stack) }));
page.on('response', (response) => {
  if (response.status() < 400) return;
  let path = '[invalid-url]';
  try { path = new URL(response.url()).pathname; } catch {}
  diagnostics.push({ kind: 'http-error', phase, status: response.status(), path });
});
page.on('requestfailed', (request) => {
  let path = '[invalid-url]';
  try { path = new URL(request.url()).pathname; } catch {}
  diagnostics.push({ kind: 'request-failed', phase, path, error: safeStack(request.failure()?.errorText) });
});

async function classify(id) {
  await page.waitForTimeout(1800);
  const pageText = await page.locator('body').innerText().catch(() => '');
  let outcome = 'opens';
  if (/Không thể mở màn hình/i.test(pageText)) outcome = 'screen-error';
  else if (pageText.trim().length < 12) outcome = 'blank';
  checks.push({ id, outcome, url: new URL(page.url()).pathname, textLength: pageText.trim().length });
  console.log(`${id}: ${outcome}`);
  if (outcome !== 'opens') {
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: `${out}/WEB-005-${id}-${runId}.png`, fullPage: true }).catch(() => {});
  }
  return outcome;
}

async function openTestLink(link) {
  await link.click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  return classify(phase);
}

try {
  phase = 'login';
  await page.goto(WEB_BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });
  console.log('WEB_BUNDLE', await assertConfiguredBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

  phase = 'new-test-setup';
  await page.goto(WEB_BASE + '/lop');
  const scoreClass = page.getByRole('link', { name: /QA-Web-.*-Scores-Class/ }).last();
  await scoreClass.waitFor({ timeout: 12000 });
  await scoreClass.click();
  const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
  await nav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
  const testName = `QA-Web-Detail-${runId}-New`;
  await page.locator('header').getByRole('button', { name: 'Tạo bài kiểm tra', exact: true }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('Tên bài kiểm tra').fill(testName);
  const dateField = createDialog.locator('input[type="date"]');
  if (await dateField.count()) await dateField.fill(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  await createDialog.getByRole('button', { name: 'Tạo bài', exact: true }).click();
  await createDialog.waitFor({ state: 'detached', timeout: 15000 });
  const newTestLink = page.getByRole('link', { name: testName, exact: true });
  await newTestLink.waitFor({ timeout: 12000 });

  phase = 'new-test-detail';
  await openTestLink(newTestLink);
  await page.goto(WEB_BASE + '/lop');

  phase = 'old-test-setup';
  const qaClasses = await page.getByRole('link').evaluateAll((links) => links.map((link) => ({
    text: link.innerText.trim(),
  })).filter(({ text }) => /^QA-Web-/.test(text) && /Class/.test(text)));
  let oldOpened = false;
  for (const { text: classText } of qaClasses) {
    await page.goto(WEB_BASE + '/lop');
    const classLink = page.getByRole('link', { name: classText, exact: true }).last();
    if (!(await classLink.count())) continue;
    await classLink.click();
    const oldNav = page.getByRole('navigation', { name: 'Mục của lớp' });
    await oldNav.getByRole('link', { name: 'Bài kiểm tra', exact: true }).click();
    const candidateNames = await page.getByRole('link').evaluateAll((links) => links.map((link) => link.innerText.trim())
      .filter((text) => /^QA-Web-/.test(text) && /Score-Step|Max-Ceiling|Old|Legacy/i.test(text)));
    if (!candidateNames.length) continue;
    const oldLink = page.getByRole('link', { name: candidateNames.at(-1), exact: true }).last();
    phase = 'old-test-detail';
    await openTestLink(oldLink);
    oldOpened = true;

    // Explore only archive navigation visibly offered by the UI; never mutate existing tests.
    const archiveEntry = page.getByRole('link', { name: /đã lưu trữ|bài lưu trữ|lưu trữ/i }).first();
    const archiveButton = page.getByRole('button', { name: /đã lưu trữ|bài lưu trữ|lưu trữ/i }).first();
    if (await archiveEntry.count()) {
      phase = 'archived-list';
      await archiveEntry.click();
    } else if (await archiveButton.count()) {
      phase = 'archived-list';
      await archiveButton.click();
    } else {
      checks.push({ id: 'archived-test', outcome: 'not-accessible-via-ui' });
      console.log('archived-test: not-accessible-via-ui');
    }
    if (phase === 'archived-list') {
      const archivedLink = page.getByRole('link', { name: /Score-Step|Max-Ceiling|Old|Legacy/i }).last();
      if (await archivedLink.count()) {
        phase = 'archived-test-detail';
        await openTestLink(archivedLink);
      } else {
        checks.push({ id: 'archived-test', outcome: 'archive-ui-visible-no-test-link' });
        console.log('archived-test: archive-ui-visible-no-test-link');
      }
    }
    break;
  }
  if (!oldOpened) {
    checks.push({ id: 'old-test', outcome: 'fixture-not-found' });
    console.log(`old-test: fixture-not-found (QA classes inspected=${qaClasses.length})`);
    checks.push({ id: 'archived-test', outcome: 'not-accessible-via-ui' });
    console.log('archived-test: not-accessible-via-ui (no old-test fixture reachable)');
  }
} catch (error) {
  console.log(`HARNESS_ERROR ${phase}: ${safeStack(error instanceof Error ? error.stack : error)}`);
  checks.push({ id: 'harness', outcome: 'error', phase, message: safeStack(error instanceof Error ? error.message : error) });
  process.exitCode = 1;
} finally {
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/test-detail-open-triage-${runId}.json`, JSON.stringify({ bundle: 'index-Cp4GJ8XB.js', checks, diagnostics }, null, 2));
  const cases = checks.map(({ id, outcome }) => `<testcase classname="web" name="${id}">${outcome === 'opens' ? '' : `<failure message="${outcome}"/>`}</testcase>`).join('');
  const failed = checks.filter(({ outcome }) => outcome !== 'opens' && outcome !== 'not-accessible-via-ui' && outcome !== 'archive-ui-visible-no-test-link').length;
  await writeFile(`${out}/test-detail-open-triage-${runId}-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="test-detail-open-triage" tests="${checks.length}" failures="${failed}">${cases}</testsuite>\n`);
  await context.close();
  await browser.close();
}
