import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const configPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const values = Object.fromEntries((await readFile(configPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('=');
  return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const apiErrors = [];
page.on('response', async (response) => {
  if (response.status() < 400 || !new URL(response.url()).pathname.startsWith('/v1/')) return;
  const record = { path: new URL(response.url()).pathname, status: response.status() };
  try {
    const body = await response.json();
    record.code = body?.error?.code ?? body?.code;
    const details = body?.error?.details ?? body?.details;
    record.fieldNames = details && typeof details === 'object' ? Object.keys(details) : [];
  } catch {}
  apiErrors.push(record);
});

try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap');
  await page.locator('input').first().fill(values.phone);
  await page.locator('input[type=password]').fill(values.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/lop/);
  await page.goto('https://qlh-staging-web.pages.dev/lop');
  await page.getByRole('link', { name: /QA-Web-241025B-Class/ }).last().click();
  const studentsLink = page.getByRole('navigation', { name: 'Mục của lớp' }).getByRole('link', { name: 'Học sinh' });
  await page.goto(new URL(await studentsLink.getAttribute('href'), 'https://qlh-staging-web.pages.dev').toString());

  const cases = [
    { label: 'optional-parent-phone-empty', name: 'QA', phone: '' },
    { label: 'phone-leading-zero-10-digits', name: 'QA', phone: '0900000021' },
    { label: 'short-simple-name', name: 'QA', phone: '0900000022' },
  ];
  for (const testCase of cases) {
    await page.getByRole('button', { name: /Thêm học sinh/ }).first().click();
    await page.getByLabel('Họ và tên học sinh').fill(testCase.name);
    const phoneField = page.getByLabel(/Số điện thoại phụ huynh/);
    if (testCase.phone) await phoneField.fill(testCase.phone);
    await page.getByRole('button', { name: 'Lưu học sinh', exact: true }).click();
    await page.waitForTimeout(1000);
    const saved = (await page.locator('body').innerText()).includes(testCase.name);
    const failure = apiErrors.at(-1);
    console.log(JSON.stringify({ case: testCase.label, saved, apiError: failure ?? null }));
    if (!saved) {
      await mkdir('plans/20261021-mvp/qa/runs/2026-10-24/web', { recursive: true });
      await page.screenshot({ path: 'plans/20261021-mvp/qa/runs/2026-10-24/web/student-diagnostic-failure.png' });
      const close = page.getByRole('button', { name: /Đóng|Huỷ|Hủy/ });
      if (await close.count()) await close.last().click().catch(() => {});
    }
  }
} finally {
  await browser.close();
}
