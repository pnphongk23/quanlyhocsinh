import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = 'https://qlh-staging-web.pages.dev';
const mockOnly = process.argv.includes('--mock-parent-login-check');
const mockTeacherOnly = process.argv.includes('--mock-teacher-login-check');
const parentOnly = process.argv.includes('--parent-only');
const teacherOnly = process.argv.includes('--teacher-only');
const credentialPath = process.env.QLH_STAGING_CREDENTIAL_FILE ?? `${process.env.HOME}/.config/qlh/staging-demo.txt`;
const output = '/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit/after/staging';
const reportPath = '/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/compare.md';
function readCredentialSections(raw) {
  const parsed = { api: '', teacher: {}, parent: {} };
  let section = '';
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const pair = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (!pair) continue;
    const [key, value] = [pair[1].trim(), pair[2].trim()];
    if (!/^\s/.test(line)) {
      if (/^giáo viên\b/i.test(key)) { section = 'teacher'; continue; }
      if (/^phụ huynh\b/i.test(key)) { section = 'parent'; continue; }
      if (/^multi-role\b/i.test(key)) { section = 'multi'; continue; }
    }
    if (/^API$/i.test(key)) parsed.api = value;
    else if (section === 'teacher' && /^(phone|sdt)$/i.test(key)) parsed.teacher.phone = value;
    else if (section === 'teacher' && /^password$/i.test(key)) parsed.teacher.password = value;
    else if (section === 'teacher' && /^class_id$/i.test(key)) parsed.teacher.classId = value;
    else if (section === 'parent' && /^(phone|sdt)$/i.test(key)) parsed.parent.phone = value;
    else if (section === 'parent' && /^password$/i.test(key)) parsed.parent.password = value;
  }
  return parsed;
}
const credentials = readCredentialSections(await readFile(credentialPath, 'utf8'));
if (!credentials.api || !credentials.teacher.phone || !credentials.teacher.password || !credentials.parent.phone || !credentials.parent.password) {
  throw new Error('Credential sections incomplete; no values printed.');
}
const api = new URL(credentials.api);
if (api.pathname.replace(/\/$/, '') !== '/v1' || !api.hostname.endsWith('workers.dev')) throw new Error('Unexpected staging API configuration.');
let preflight = null;
if (!mockOnly && !mockTeacherOnly) {
  preflight = await fetch(new URL('auth/login', credentials.api.endsWith('/') ? credentials.api : `${credentials.api}/`), {
    method: 'OPTIONS',
    headers: { Origin: base, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
  });
  const allowedOrigin = preflight.headers.get('access-control-allow-origin');
  const allowedMethods = preflight.headers.get('access-control-allow-methods') ?? '';
  if (!preflight.ok || allowedOrigin !== base || !/\bPOST\b/i.test(allowedMethods)) {
    throw new Error(`Login preflight rejected: HTTP ${preflight.status}; origin-matched=${allowedOrigin === base}; POST-allowed=${/\bPOST\b/i.test(allowedMethods)}. No login submitted.`);
  }
  process.stdout.write(`Preflight: HTTP ${preflight.status}; origin matched; POST allowed.\n`);
}

const phoneRegex = /(?<!\d)(?:\+?84|0)(?:[\s().-]*\d){8,10}(?!\d)/g;
const scrubInit = `(() => {
  const pattern = /(?<!\\d)(?:\\+?84|0)(?:[\\s().-]*\\d){8,10}(?!\\d)/g;
  const scrub = () => {
    if (!document.body || location.pathname === '/dang-nhap') return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { const n = walker.currentNode; const v = n.nodeValue || ''; const masked = v.replace(pattern, '•••'); if (masked !== v) n.nodeValue = masked; }
    for (const el of document.querySelectorAll('input,textarea,[aria-label],[title],[placeholder],[alt]')) {
      if ('value' in el && typeof el.value === 'string') { const v = el.value, masked = v.replace(pattern, '•••'); if (masked !== v) el.value = masked; }
      for (const a of ['aria-label','title','placeholder','alt']) if (el.hasAttribute(a)) { const v = el.getAttribute(a), masked = v.replace(pattern, '•••'); if (masked !== v) el.setAttribute(a, masked); }
    }
  };
  Object.defineProperty(window, '__qlhScrubPhone', { value: scrub });
  new MutationObserver(scrub).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['value','aria-label','title','placeholder','alt'] });
})();`;
const viewports = [{ key: '390x844', width: 390, height: 844 }, { key: '1440x900', width: 1440, height: 900 }];
const rows = [];
let sequence = 0;
const successfulRoles = [];
let stopReason = '';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });

async function signIn(role, creds, useMock = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await context.addInitScript(scrubInit);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const mock = { requests: 0 };
  if (useMock) {
    await page.route(`${base}/dang-nhap`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: `<form method="post" action="${credentials.api}/auth/login"><input id="login-phone" name="phone"><input id="login-password" name="password" type="password"><button type="submit">Đăng nhập</button></form>` }));
    await page.route(`${credentials.api}/auth/login`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      mock.requests += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'mock-session', user: { role: 'parent' } }) });
    });
  }
  let requestFailure = null;
  page.on('requestfailed', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/v1/auth/login')) {
      requestFailure = request.failure()?.errorText ?? 'request_failed';
    }
  });
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'networkidle', timeout: 45000 });
  if (new URL(page.url()).pathname !== '/dang-nhap') throw new Error(`${role}: redirected before login; stopped without submitting.`);
  await page.locator('#login-phone').waitFor({ state: 'visible' });
  const digits = creds.phone.replace(/\D/g, '');
  const localPhone = (digits.startsWith('84') ? digits.slice(2) : digits).replace(/^0/, '');
  await page.locator('#login-phone').fill(localPhone);
  await page.locator('#login-password').fill(creds.password);
  const submit = page.locator('button[type="submit"]');
  if (!(await submit.isEnabled())) throw new Error(`${role}: submit unavailable; no login sent.`);
  const responsePromise = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/v1/auth/login'), { timeout: 30000 });
  await submit.click();
  let response;
  try { response = await responsePromise; }
  catch {
    await context.close();
    throw new Error(`${role}: ${requestFailure ? `login request failed (${requestFailure})` : 'login POST had no HTTP response within 30 seconds'}; stopped without retry.`);
  }
    const httpStatus = response.status();
    process.stdout.write(`LOGIN_RESULT ${role} HTTP ${httpStatus}\n`);
    let errorCode = null;
    try { const json = await response.json(); errorCode = json?.error?.code ?? json?.code ?? null; } catch {}
    const loginResponse = { http: httpStatus, errorCode };
  if (response.status() !== 200) { await context.close(); throw new Error(`${role}: login failed HTTP ${response.status()}${errorCode ? ` code ${String(errorCode).slice(0, 50)}` : ''}; stopped without retry.`); }
  await page.waitForURL((url) => url.pathname !== '/dang-nhap', { timeout: 15000 }).catch(() => {});
  if (new URL(page.url()).pathname === '/dang-nhap') { await context.close(); throw new Error(`${role}: HTTP 200 but still on login route; stopped without retry.`); }
  return { context, page, loginResponse, mockRequestCount: mock.requests };
}

if (mockOnly || mockTeacherOnly) {
  const mockRole = mockTeacherOnly ? 'teacher' : 'parent';
  const { context, page, loginResponse, mockRequestCount } = await signIn(mockRole, credentials[mockRole], true);
  const passed = loginResponse.http === 200 && mockRequestCount === 1 && new URL(page.url()).pathname !== '/dang-nhap';
  await context.close();
  await browser.close();
  if (!passed) throw new Error('Local parent login mock did not complete exactly one HTTP 200 flow.');
  process.stdout.write(`Mock ${mockRole} login: PASS; intercepted POST count=1; recorded HTTP 200; no staging login sent.\n`);
  process.exit(0);
}

async function nav(page, route) {
  await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 30, null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(450);
  if (new URL(page.url()).pathname === '/dang-nhap') throw new Error(`Session redirected to login at ${route}; stopping.`);
}
async function capture(page, team, vp, route, label) {
  await page.evaluate(() => window.__qlhScrubPhone?.());
  const residue = await page.evaluate((source) => {
    const re = new RegExp(source, 'g');
    const values = [document.body.innerText, ...[...document.querySelectorAll('input,textarea,[aria-label],[title],[placeholder],[alt]')].flatMap((el) => [el.value ?? '', ...['aria-label','title','placeholder','alt'].map((a) => el.getAttribute(a) ?? '')])];
    return values.reduce((n, value) => n + [...String(value).matchAll(re)].length, 0);
  }, phoneRegex.source);
  if (residue) throw new Error(`Phone redaction verification failed for ${team}/${vp.key}; no image written.`);
  const dir = path.join(output, team, vp.key);
  await mkdir(dir, { recursive: true });
  const filename = `${String(++sequence).padStart(3, '0')}-${label}.png`;
  const image = path.join(dir, filename);
  await page.screenshot({ path: image, fullPage: false, animations: 'disabled' });
  rows.push({ team, viewport: vp.key, route: new URL(page.url()).pathname, label, image: `after/staging/${team}/${vp.key}/${filename}`, residue });
}

try {
    const roles = parentOnly ? [['C', 'parent', credentials.parent]] : teacherOnly ? [['A', 'teacher', credentials.teacher]] : [['A', 'teacher', credentials.teacher], ['C', 'parent', credentials.parent]];
    for (const [team, role, creds] of roles) {
      const { context, page, loginResponse } = await signIn(role, creds);
      successfulRoles.push(role);
    let routes;
    if (role === 'teacher') {
      await nav(page, '/lop');
      const classHref = await page.locator('a[href^="/lop/"]').evaluateAll((els) => els.map((el) => el.getAttribute('href')).find((href) => href && /^\/lop\/[^/]+$/.test(href) && !['/lop/moi', '/lop/archived'].includes(href)));
      if (!classHref) throw new Error('teacher: no class route discovered after successful login; stopped.');
      const classId = classHref.split('/')[2];
      routes = [
        ['/lop', 'classes'], ['/lop/moi', 'create-class'], ['/lich', 'schedule'],
        [`/lop/${classId}/buoi-hoc`, 'class-sessions'], [`/lop/${classId}/hoc-sinh`, 'class-students'],
        [`/lop/${classId}/bai-kiem-tra`, 'tests'], [`/lop/${classId}/diem`, 'score-grid'],
        [`/lop/${classId}/bao-cao`, 'reports'],
      ];
      await nav(page, `/lop/${classId}/bai-kiem-tra`);
      const testHref = await page.locator(`a[href^="/lop/${classId}/bai-kiem-tra/"]`).evaluateAll((els) => els.map((el) => el.getAttribute('href')).find((href) => href && !href.endsWith('/moi')));
      if (testHref) routes.push([testHref, 'test-scores']);
    } else routes = [['/ph', 'guardian-home'], ['/ph/nhan-xet', 'guardian-comments'], ['/ph/diem', 'guardian-scores'], ['/ph/bao-cao', 'guardian-reports']];
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const [route, label] of routes) {
        await nav(page, route);
        await capture(page, team, vp, route, label);
      }
      if (role === 'teacher' && vp.key === '390x844') for (const [route, label] of routes.filter(([, label]) => ['class-students', 'create-class', 'test-scores'].includes(label))) {
        const mobile = { key: '375x667', width: 375, height: 667 };
        await page.setViewportSize({ width: mobile.width, height: mobile.height });
        await nav(page, route); await capture(page, team, mobile, route, label);
      }
    }
    await context.close();
    process.stdout.write(`${role}: authenticated; login HTTP ${loginResponse.http}; screenshots=${rows.filter((x) => x.team === team).length}\n`);
  }
  } catch (error) {
    await browser.close();
    stopReason = error instanceof Error ? error.message : 'unknown error';
    process.stdout.write(`STOP: ${stopReason}\n`);
    process.exitCode = 1;
  }
  if (browser.isConnected()) await browser.close();
const old = await readFile(reportPath, 'utf8');
const roleResult = successfulRoles.length ? `Đăng nhập thành công: ${successfulRoles.join(', ')}.` : 'Chưa có vai đăng nhập thành công.';
const stopText = stopReason ? ` Dừng: ${stopReason}` : '';
const priorRows = [...(old.match(/\n## Staging\n[\s\S]*$/)?.[0] ?? '').matchAll(/^\| [AC] \| [^\n]*\[ảnh\]\([^\n]+\) \| \d+ \|$/gm)].map((m) => m[0]);
const currentRows = rows.map((r) => `| ${r.team} | ${r.viewport} | ${base}${r.route} | ${r.label} | [ảnh](../shots/ui-audit/${r.image}) | ${r.residue} |`);
const tableRows = [...new Set([...priorRows, ...currentRows])];
const summary = `\n## Staging\n\nNguồn: ${base}. OPTIONS preflight trước đăng nhập: HTTP ${preflight.status}, origin khớp, POST được phép. Parser readCredentialSections và selector/form login theo scripts/e2e-staging-ui.mjs; mỗi vai gửi tối đa một lần trong browser context mới, không tái dùng storage. ${roleResult} Chỉ mở route và chụp, không ghi dữ liệu.${stopText} Lần đầu teacher harness ghi nhận response nhưng lỗi biến trước khi ghi mã HTTP; lần sau lỗi CORS ở deployment URL nên không tới API. Dry-run parser đúng 2 mục vai. CSS/DOM che số điện thoại trước mỗi ảnh; kiểm tra regex DOM trước khi chụp: 0 kết quả.\n\n| Team | Viewport | URL thật | Màn | Ảnh | Phone residue |\n|---|---|---|---|---|---:|\n${tableRows.join('\n') || '| — | — | — | — | — | — |'}\n`;
await (await import('node:fs/promises')).writeFile(reportPath, `${old.replace(/\n## Staging\n[\s\S]*$/, '').trimEnd()}\n${summary}`);
process.stdout.write(`Staging captures complete: ${rows.length}; phone residue checks passed.\n`);
