import { mkdir, readFile } from 'node:fs/promises';
import { chromium, devices, webkit } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const base = 'https://qlh-staging-web.pages.dev';
const out = new URL('./shots-web/deploy-smoke/', import.meta.url).pathname;
const engineName = process.argv[2] ?? 'chromium';
if (!['chromium', 'webkit'].includes(engineName)) throw new Error('Browser must be chromium or webkit.');
await mkdir(out, { recursive: true });

const credentials = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8'))
  .split(/\r?\n/)
  .map((line) => { const i = line.indexOf('='); return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', '']; })
  .filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('QA credentials are incomplete.');

const browser = engineName === 'webkit'
  ? await webkit.launch({ headless: true })
  : await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
  timezoneId: 'Asia/Ho_Chi_Minh',
});
const page = await context.newPage();
page.setDefaultTimeout(6000);
let consoleErrorCount = 0;
const consoleTexts = [];
page.on('console', (message) => { if (message.type() === 'error') { consoleErrorCount++; consoleTexts.push(message.text().slice(0, 160) + ' @' + (message.location().url || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 80)); } });
page.on('pageerror', (e) => { consoleErrorCount++; consoleTexts.push('pageerror ' + String(e.message).slice(0, 160)); });

async function settle() { await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(900); }
async function setView(view) { await page.setViewportSize({ width: view === '390' ? 390 : 1440, height: view === '390' ? 844 : 1440 }); }
async function screenshot(letter, view) {
  await page.evaluate(() => {
    const phone = /(?:\+?84|0)[\d .()-]{8,}/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) node.nodeValue = node.nodeValue.replace(phone, '*** ***');
    for (const field of document.querySelectorAll('input, textarea')) {
      if (field.type === 'tel' || field.autocomplete === 'tel' || field instanceof HTMLTextAreaElement) {
        field.value = field.value.replace(phone, '*** ***');
      }
    }
  });
  await page.waitForTimeout(400);
  const path = `${out}${letter}-${view}-${engineName}.png`;
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  return path.slice(path.lastIndexOf('/') + 1);
}

const shots = [];
try {
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 1500 }).catch(() => {});
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 20000 });
  if (page.url().includes('chon-vai-tro')) {
    await page.getByText('Quản trị viên', { exact: true }).first().click();
    await settle();
  }

  await page.goto(`${base}/lop`, { waitUntil: 'domcontentloaded' });
  await settle();
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/lop/"][href$="/buoi-hoc"]').length > 0, { timeout: 8000 }).catch(() => {});
  const classLinks = page.locator('a[href^="/lop/"][href$="/buoi-hoc"]');
  if (!(await classLinks.count())) throw new Error('No class is available for the QA account.');
  let classLink = classLinks.first();
  for (let i = 0; i < await classLinks.count(); i++) {
    if (/\b[1-9]\d* học sinh/.test(await classLinks.nth(i).innerText())) { classLink = classLinks.nth(i); break; }
  }
  const classPath = await classLink.getAttribute('href');
  const classId = classPath.split('/')[2];
  await page.goto(`${base}${classPath.replace(/\/buoi-hoc$/, '/hoc-sinh')}`, { waitUntil: 'domcontentloaded' });
  await settle();
  const sampleStudent = (await page.locator('main strong').first().innerText()).trim();
  if (!sampleStudent) throw new Error('No student name is available for the notes preview.');
  await page.goto(`${base}${classPath}`, { waitUntil: 'domcontentloaded' });
  await settle();
  const pastLink = page.locator('section[aria-labelledby="past-sessions-heading"] a[href*="/buoi-hoc/"]').first();
  const sessionLink = await pastLink.count()
    ? await pastLink.getAttribute('href')
    : await page.locator(`a[href^="/lop/${classId}/buoi-hoc/"]`).first().getAttribute('href');
  if (sessionLink) {
    const commentPath = `${sessionLink}?tab=nhan-xet`;
    await setView('390');
    await page.goto(`${base}${commentPath}`, { waitUntil: 'domcontentloaded' });
    await settle();
    await page.getByText('Theo tiêu chí', { exact: true }).click();
    await settle();
    shots.push(await screenshot('A', '390'));
    await setView('1440');
    await page.goto(`${base}${commentPath}`, { waitUntil: 'domcontentloaded' });
    await settle();
    await page.getByText('Theo tiêu chí', { exact: true }).click();
    await settle();
    shots.push(await screenshot('A', '1440'));

    await setView('390');
    await page.waitForTimeout(1800);
    const notesButtonCount = await page.getByRole('button', { name: 'Nhập từ ghi chú', exact: true }).count();
    if (!notesButtonCount) {
      console.log(JSON.stringify({ stage: 'before-B-mobile', path: new URL(page.url()).pathname, textLabelCount: await page.getByText('Nhập từ ghi chú', { exact: true }).count() }));
    }
    await page.getByRole('button', { name: 'Nhập từ ghi chú', exact: true }).click();
    await page.locator('#notes-import-text').fill(`Mất tập trung trong giờ: ${sampleStudent}`);
    await page.getByRole('button', { name: 'Xem trước', exact: true }).click();
    await page.getByText('Gợi ý từ ghi chú, kiểm tra rồi Lưu', { exact: true }).waitFor();
    await settle();
    shots.push(await screenshot('B', '390'));
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await setView('1440');
    await page.waitForTimeout(450);
    await page.getByRole('button', { name: 'Nhập từ ghi chú', exact: true }).click();
    await page.locator('#notes-import-text').fill(`Mất tập trung trong giờ: ${sampleStudent}`);
    await page.getByRole('button', { name: 'Xem trước', exact: true }).click();
    await page.getByText('Gợi ý từ ghi chú, kiểm tra rồi Lưu', { exact: true }).waitFor();
    await settle();
    shots.push(await screenshot('B', '1440'));
  } else {
    console.log('A/B not captured: the selected class has no session.');
  }

  await setView('390');
  await page.goto(`${base}${classPath.replace(/\/buoi-hoc$/, '/hoc-sinh')}`, { waitUntil: 'domcontentloaded' });
  await settle();
  await page.getByRole('button', { name: 'Nhập danh sách', exact: true }).click();
  await page.locator('#student-import-text').fill([
    'An Nhiên\t0900000001',
    'Bảo Minh\t0900000002',
    'Gia Hân\t0900000003',
    'Minh Khang\t0900000004',
    'Tuệ Lâm\t0900000005',
  ].join('\n'));
  await settle();
  shots.push(await screenshot('C', '390'));
  await setView('1440');
  await page.goto(`${base}${classPath.replace(/\/buoi-hoc$/, '/hoc-sinh')}`, { waitUntil: 'domcontentloaded' });
  await settle();
  await page.getByRole('button', { name: 'Nhập danh sách', exact: true }).click();
  await page.locator('#student-import-text').fill([
    'An Nhiên\t0900000001', 'Bảo Minh\t0900000002', 'Gia Hân\t0900000003',
    'Minh Khang\t0900000004', 'Tuệ Lâm\t0900000005',
  ].join('\n'));
  await settle();
  shots.push(await screenshot('C', '1440'));

  await setView('390');
  await page.goto(`${base}/cai-dat/nhan-su`, { waitUntil: 'domcontentloaded' });
  await settle();
  await page.getByText('Gửi nhận xét', { exact: true }).first().waitFor({ timeout: 8000 });
  shots.push(await screenshot('D', '390'));
  await setView('1440');
  await page.goto(`${base}/cai-dat/nhan-su`, { waitUntil: 'domcontentloaded' });
  await settle();
  await page.getByText('Gửi nhận xét', { exact: true }).first().waitFor({ timeout: 8000 });
  shots.push(await screenshot('D', '1440'));

  console.log(JSON.stringify({ browser: engineName, screenshots: shots, consoleErrorCount, consoleTexts }));
} finally {
  await browser.close();
}
