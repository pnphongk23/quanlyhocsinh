import { mkdir, readFile } from 'node:fs/promises';
import { webkit, devices } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const base = 'https://qlh-staging-web.pages.dev';
const apiHost = 'qlh-staging-api.tolaphamnhuphong.workers.dev';
const out = '/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-feedback-30/staging-final-attendance-unmarked-v2-390.png';
const session = '/lop/c63dc019-bd5d-465f-a872-e56e8482edd5/buoi-hoc/1a5754cd-d9ab-4f2b-978f-3d52e7851556';

const credentials = Object.fromEntries((await readFile('/Users/phamnhuphong/.config/qlh/staging-smoke.txt', 'utf8'))
  .split(/\r?\n/).map((line) => {
    const i = line.indexOf('=');
    return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
  }).filter(([key]) => key));
if (!credentials.phone || !credentials.password) throw new Error('QA credentials file is missing required fields.');

await mkdir('/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-feedback-30', { recursive: true });
const browser = await webkit.launch({ headless: true });
try {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

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

  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dùng tạm trên trình duyệt' }).click({ timeout: 1500 }).catch(() => {});
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 25000 });

  await page.goto(`${base}${session}?tab=diem-danh`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Chưa điểm danh 3 em', { exact: false }).first().waitFor({ state: 'visible' });

  await scrub();
  const bodyText = await page.locator('body').innerText();
  const summaryLine = bodyText.split('\n').map((line) => line.trim()).find((line) => line.includes('Chưa điểm danh')) ?? '';
  const saveButton = page.getByRole('button', { name: 'Lưu điểm danh', exact: true });
  const saveDisabled = !(await saveButton.isEnabled());
  if (!summaryLine.includes('Chưa điểm danh 3 em')) throw new Error('Expected unmarked summary was not visible in the attendance list.');
  if (/vắng mặt/i.test(bodyText)) throw new Error('The outdated absence summary is still present.');
  if (!saveDisabled) throw new Error('Attendance save control is enabled; stopped without saving.');

  await page.screenshot({ path: out, animations: 'disabled' });
  console.log(JSON.stringify({ result: 'DONE', summaryLine, saveDisabled, screenshot: out }));
  await context.close();
} finally {
  await browser.close();
}
