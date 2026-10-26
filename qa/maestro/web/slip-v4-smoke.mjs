import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
import { assertStagingBundle } from './staging-bundle-check.mjs';

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('Required smoke credential keys are missing');

const out = 'plans/20261021-mvp/qa/runs/2026-10-26/web';
const suffix = randomBytes(3).toString('hex');
const className = `QA-CMT-${suffix}-Slip-Class`;
const studentName = `QA-CMT-${suffix}-Student`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
const page = await context.newPage();
let phase = 'teacher login';
const rec = (id, status, note = '') => console.log(`${status} ${id}${note ? ': ' + note : ''}`);
try {
    await page.goto('https://qlh-staging-web.pages.dev/dang-nhap', { waitUntil: 'domcontentloaded' });
    console.log('STAGING_BUNDLE', await assertStagingBundle(page));
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop(?:\/|$)/, { timeout: 15000 });

    phase = 'create isolated class and student fixture';
    await page.goto('https://qlh-staging-web.pages.dev/lop/moi');
    await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className);
    await page.getByRole('button', { name: 'T2', exact: true }).click();
    await page.locator('input[type=time]').fill('18:00');
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.waitForURL(/\/lop\/?$/, { timeout: 15000 });
    await page.goto('https://qlh-staging-web.pages.dev/lop');
    await page.getByRole('link', { name: new RegExp(className) }).last().click();
    const nav = page.getByRole('navigation', { name: 'Mục của lớp' });
    await nav.getByRole('link', { name: 'Học sinh' }).click();
    await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await page.getByLabel('Họ và tên học sinh').fill(studentName);
    await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await page.getByText(studentName, { exact: true }).waitFor({ timeout: 12000 });
    await page.getByRole('navigation', { name: 'Mục của lớp' }).getByRole('link', { name: 'Buổi học' }).click();
    phase = 'create and open a current-day session';
    const sessionLinks = page.getByRole('link', { name: 'Xem buổi', exact: true });
    const priorHrefs = new Set(await sessionLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))));
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await page.getByRole('button', { name: 'Thêm buổi lẻ', exact: true }).click();
    await page.locator('#extra-session-date').fill(todayISO);
    await page.locator('#extra-session-time').fill('19:00');
    const saveToday = page.getByRole('button', { name: 'Lưu buổi học', exact: true });
    if (!(await saveToday.isEnabled())) throw new Error('fixture_missing: staging does not allow creating the current-day session');
    await saveToday.click();
    await page.getByRole('dialog', { name: 'Thêm buổi lẻ' }).waitFor({ state: 'detached', timeout: 12000 });
    await sessionLinks.first().waitFor({ state: 'visible', timeout: 12000 });
    let currentSession;
    for (const link of await sessionLinks.all()) {
      const href = await link.getAttribute('href');
      if (href && !priorHrefs.has(href)) { currentSession = link; break; }
    }
    if (!currentSession) throw new Error('fixture_missing: newly saved current-day session has no new details link');
    await currentSession.click();
  await page.getByRole('tab', { name: 'Nhận xét', exact: true }).click();

  phase = 'slip structure (CMT-005)';
  const ids = ['slip-criterion-0','slip-criterion-1','slip-criterion-2','slip-criterion-3','slip-homework-row','slip-star-panel','slip-mascot','slip-generated-comment','slip-note','slip-ticket-status'];
  const missing = [];
  for (const id of ids) if (!(await page.getByTestId(id).count())) missing.push(id);
  const noDefaultBtn = (await page.getByText('Dùng câu mặc định').count()) === 0;
  const homeworkAuto = await page.getByTestId('slip-homework-auto-label').count();
  rec('TC-CMT-005', missing.length === 0 && noDefaultBtn && homeworkAuto === 1 ? 'PASS' : 'FAIL',
    `missing=${missing.join(',') || 'none'} noDefaultBtn=${noDefaultBtn} autoLabel=${homeworkAuto} (mobile bottom sheet not covered: desktop viewport)`);

  phase = 'mascot per star (CMT-016) + generated sentence (CMT-001)';
  const mascot = page.getByTestId('slip-mascot');
  const gen = page.getByTestId('slip-generated-comment');
  const panel = page.getByTestId('slip-star-panel');
  const shots = [];
  const chips = [0,1,2,3].map((n) => page.getByTestId(`slip-criterion-${n}`));
  const hw = page.getByTestId('slip-homework-row');
  const hwBtn = (await hw.getAttribute('aria-pressed')) !== null ? hw : hw.getByRole('button').first();
  async function snap() {
    const el = await mascot.elementHandle();
    const info = await el.evaluate(async (n) => { const img = n.tagName === 'IMG' ? n : n.querySelector('img'); if (img) await img.decode().catch(() => {}); return img ? { w: img.naturalWidth, src: (img.getAttribute('src') || '').split('/').pop(), full: img.getAttribute('src') } : { w: -1, src: 'no-img' }; });
    const text = (await panel.innerText()).replace(/\s+/g, ' ');
    return { ...info, stars: (text.match(/(\d)\/5/) || [])[1] };
  }
  const seen = new Map();
  { const x = await snap(); seen.set(x.stars, x); }
  for (let k = 0; k < 4; k += 1) { await chips[k].click(); const x = await snap(); seen.set(x.stars, x); }
  await hwBtn.click(); const z = await snap(); seen.set(z.stars, z);
  const rows = [...seen.entries()].filter(([, v]) => v).map(([k, v]) => `${k}:${v.src}:w${v.w}`).sort();
  const broken = [...seen.values()].filter((v) => v && v.w <= 0);
  const zeroSentence = (await gen.innerText()).replace('Tự sinh theo tiêu chí', '').trim();
  const zeroOk = zeroSentence === 'Con chưa chú ý nghe giảng, chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà.';
  const distinct = new Set([...seen.values()].filter(Boolean).map((v) => v.src)).size;
  await page.screenshot({ path: `${out}/slip-v4-zero-star.png`, fullPage: true });
  rec('TC-CMT-016', broken.length === 0 && distinct >= 6 ? 'PASS' : 'FAIL', `levels=${rows.join(' ')} broken=${broken.length} distinct=${distinct}`);
  console.log('ZERO_SENTENCE', zeroSentence);
  console.log('MASCOT_SRC', [...seen.values()].filter(Boolean).map((v) => v.full).join(' | '));
  rec('TC-CMT-001-zero-sentence', zeroOk ? 'PASS' : 'FAIL', zeroOk ? '' : 'sentence mismatch for 0 stars');
  await mkdir(out, { recursive: true });
  } catch (error) {
    await mkdir(out, { recursive: true }); await page.screenshot({ path: `${out}/slip-v4-smoke-failure.png`, fullPage: true }).catch(() => {});
    const message = error instanceof Error ? error.message : 'unknown error';
    const blocked = message.startsWith('blocked_WEB-003:') || message.startsWith('fixture_missing:');
    console.log(`${blocked ? 'BLOCKED' : 'FAIL'} TC-CMT-005/016 at ${phase}: ${message}`);
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: `${out}/slip-v4-smoke-failure.png` }).catch(() => {});
  const escaped = message.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  await writeFile(`${out}/slip-v4-smoke-junit.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-slip-v4-smoke" tests="1" failures="${blocked ? 0 : 1}" skipped="${blocked ? 1 : 0}"><testcase classname="web" name="TC-CMT-005/016">${blocked ? `<skipped message="${escaped}"/>` : `<failure message="${escaped}"/>`}</testcase></testsuite>\n`);
  if (!blocked) process.exitCode = 1;
} finally {
  await context.setOffline(false).catch(() => {});
  await context.close();
  await browser.close();
}
