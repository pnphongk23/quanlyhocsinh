import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';

const credentialsPath = `${process.env.HOME}/.config/qlh/staging-smoke.txt`;
const credentials = Object.fromEntries((await readFile(credentialsPath, 'utf8')).split(/\r?\n/).map((line) => {
  const i = line.indexOf('=');
  return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', ''];
}).filter(([key]) => key));
const outputDir = 'plans/20261021-mvp/qa/runs/2026-10-24/web';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto('https://qlh-staging-web.pages.dev/dang-nhap');
  await page.locator('#login-phone').fill(credentials.phone);
  await page.locator('#login-password').fill('QA-Web-invalid-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  // LoginPage renders the authentication failure as <p role="alert">.
  const alert = page.getByRole('alert');
  await alert.waitFor({ state: 'visible', timeout: 10000 });
  const remainsOnLogin = new URL(page.url()).pathname === '/dang-nhap';
  const hasMessage = (await alert.innerText()).trim().length > 0;
  const passed = remainsOnLogin && hasMessage;

  await mkdir(outputDir, { recursive: true });
  const result = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-auth-invalid" tests="1" failures="${passed ? 0 : 1}"><testcase classname="web" name="TC-AUTH-003">${passed ? '' : '<failure message="login error alert missing or session navigated"/>'}</testcase></testsuite>\n`;
  await writeFile(`${outputDir}/auth-invalid-junit.xml`, result);
  console.log(passed ? 'PASS TC-AUTH-003' : 'FAIL TC-AUTH-003');
  if (!passed) process.exitCode = 1;
} finally {
  await browser.close();
}
