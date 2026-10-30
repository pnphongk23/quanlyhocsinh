import { API_BASE, WEB_BASE } from "./config.mjs";
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertConfiguredBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
const out = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const results = [];

try {
  await page.goto(WEB_BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });
  const bundle = await assertConfiguredBundle(page);
  await page.locator('#login-phone').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });
  await page.goto(WEB_BASE + '/lop', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Tìm lớp hoặc học sinh').waitFor({ timeout: 10000 });
  const cards = await page.locator('a[href^="/lop/"]').evaluateAll((anchors) => anchors.map((anchor) => ({
    href: anchor.getAttribute('href'),
    name: (anchor.innerText ?? '').trim().split('\n')[0],
    students: Number((anchor.innerText ?? '').match(/(\d+) học sinh/)?.[1] ?? -1),
  })).filter((card) => /^QA[-_]/i.test(card.name) && /^\/lop\/[0-9a-f-]{36}(?:\/buoi-hoc)?$/i.test(card.href ?? '')));

  const seen = new Set();
  for (const card of cards) {
    if (seen.has(card.href)) continue;
    seen.add(card.href);
    await page.goto(`${WEB_BASE}${card.href}`, { waitUntil: 'domcontentloaded' });
    const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
    const reportsHref = await nav.getByRole('link', { name: 'Báo cáo', exact: true }).getAttribute('href');
    if (!reportsHref) continue;
    await page.goto(new URL(reportsHref, WEB_BASE).toString(), { waitUntil: 'domcontentloaded' });
    const add = page.getByRole('button', { name: 'Thêm báo cáo', exact: true });
    const addCount = await add.count();
    const enabled = addCount > 0 && await add.isEnabled();
    const disabledTitle = addCount ? await add.getAttribute('title') : null;
    const bodyText = (await page.locator('main').last().innerText()).slice(0, 800);
    const reports = {
      classId: card.href.split('/')[2],
      className: card.name,
      studentCount: card.students,
      reportAddEnabled: enabled,
      reportAddTitle: disabledTitle,
      hasBatch: await page.getByRole('button', { name: 'Thêm tùy chọn báo cáo' }).count() > 0,
      noHeldSession: bodyText.includes('Báo cáo cần ít nhất một buổi đã diễn ra.'),
    };
    results.push(reports);
    if (enabled && card.students >= 0 && card.students <= 3) break;
  }
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/report-fixture-discovery.json`, `${JSON.stringify({ bundle, candidatesSeen: seen.size, results }, null, 2)}\n`);
  console.log('REPORT_FIXTURE_DISCOVERY', JSON.stringify({ bundle, candidatesSeen: seen.size, results: results.map((item) => ({ studentCount: item.studentCount, reportAddEnabled: item.reportAddEnabled, hasBatch: item.hasBatch, noHeldSession: item.noHeldSession })) }));
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  results.push({ error: message });
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/report-fixture-discovery.json`, `${JSON.stringify({ error: message, results }, null, 2)}\n`);
  console.log('REPORT_FIXTURE_DISCOVERY_FAIL', message);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
