import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

export const apiBase = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const artifactDir = 'plans/20261021-mvp/qa/runs/2026-10-25/web';
const artifactFile = `${artifactDir}/permissions-http-prm004-005-junit.xml`;
const uuid = () => crypto.randomUUID();

export function parseFixture(text) {
  const values = Object.create(null);
  for (const line of text.split(/\r?\n/u)) {
    const i = line.indexOf('=');
    if (i > 0) values[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return {
    teacherPhone: values.phone ?? '',
    teacherPassword: values.password ?? '',
    parentPhone: values.guardian_phone ?? '',
    parentPassword: values.password ?? '',
    workspaceName: values.workspace_name ?? '',
  };
}

function normalizePhone(value) {
  let digits = value.replace(/\D/gu, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  if (digits.length !== 9) throw new Error('HTTP login phone must normalize to 9 local digits');
  return `+84${digits}`;
}

function safeError(error, secrets = []) {
  let message = error instanceof Error ? error.message : 'unknown error';
  for (const secret of secrets.filter(Boolean)) message = message.replaceAll(secret, '[redacted]');
  message = message
    .replace(/Bearer\s+[^\s"']+/giu, 'Bearer [redacted]')
    .replace(/\b(?:\+?84|0)?\d{9,10}\b/gu, '[phone]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, '[long-value]')
    .replace(/[\r\n\t]+/gu, ' ').slice(0, 180);
  return { kind: error?.name ?? 'Error', message: message || 'no message' };
}

function emitError(phaseName, error, secrets) {
  const safe = safeError(error, secrets);
  process.stderr.write(`ERROR phase="${phaseName}" kind="${safe.kind}" message="${safe.message}"\n`);
  return safe;
}

async function request(path, token, init = {}) {
  return fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

async function readJson(response) {
  try { return await response.json(); } catch { return null; }
}

async function writeJUnit(records) {
  await mkdir(artifactDir, { recursive: true });
  const cases = records.map((record) => {
    const body = record.outcome === 'blocked'
      ? `<skipped message="${record.phase ?? 'fixture unavailable'}"/>`
      : record.outcome === 'fail'
        ? `<failure message="${record.phase ?? 'assertion failed'}"/>`
        : '';
    const output = Number.isInteger(record.http) ? `<system-out>HTTP ${record.http}</system-out>` : '';
    return `<testcase classname="web" name="${record.id}">${body}${output}</testcase>`;
  }).join('');
  const failures = records.filter((item) => item.outcome === 'fail').length;
  const skipped = records.filter((item) => item.outcome === 'blocked').length;
  await writeFile(artifactFile, `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-prm004-005-http" tests="${records.length}" failures="${failures}" skipped="${skipped}">${cases}</testsuite>\n`);
}

export async function runHttpPermissionPhases({ credentials, onPhase = () => {} }) {
  const records = [];
  const secrets = [credentials.teacherPhone, credentials.parentPhone, credentials.teacherPassword, credentials.parentPassword];
  const add = (id, outcome, http, phaseName) => {
    const item = { id, outcome, ...(Number.isInteger(http) ? { http } : {}), ...(phaseName ? { phase: phaseName } : {}) };
    records.push(item);
    process.stdout.write(`${outcome.toUpperCase()} ${id}${Number.isInteger(http) ? ` HTTP ${http}` : ''}\n`);
    return item;
  };
  let currentPhase = 'login GV';
  let teacherAuth;
  let parentAuth;
  const runPhase = async (name, work) => {
    currentPhase = name;
    onPhase(name);
    try { return await work(); }
    catch (error) {
      emitError(name, error, secrets);
      if (error && typeof error === 'object') error.phaseCaptured = true;
      throw error;
    }
  };
  try {
    const teacherBody = await runPhase('login GV', async () => {
      const teacherResponse = await request('/auth/login', null, {
        method: 'POST', body: JSON.stringify({ phone: normalizePhone(credentials.teacherPhone), password: credentials.teacherPassword, device_label: 'QA PRM HTTP' }),
      });
      const body = await readJson(teacherResponse);
      teacherAuth = { status: teacherResponse.status, token: body?.token ?? null, body };
      add('teacher-login', teacherAuth.token ? 'pass' : 'blocked', teacherResponse.status, teacherAuth.token ? undefined : 'login GV');
      if (!teacherAuth.token) throw new Error(`login teacher rejected HTTP ${teacherResponse.status}`);
      return body;
    });

    const parentBody = await runPhase('login PH', async () => {
      const parentResponse = await request('/auth/login', null, {
        method: 'POST', body: JSON.stringify({ phone: normalizePhone(credentials.parentPhone), password: credentials.parentPassword, device_label: 'QA PRM HTTP' }),
      });
      const body = await readJson(parentResponse);
      parentAuth = { status: parentResponse.status, token: body?.token ?? null, body };
      add('parent-login', parentAuth.token ? 'pass' : 'blocked', parentResponse.status, parentAuth.token ? undefined : 'login PH');
      if (!parentAuth.token) throw new Error(`login parent rejected HTTP ${parentResponse.status}`);
      return body;
    });

    const teacherMid = teacherBody?.active_membership_id ?? teacherBody?.memberships?.[0]?.id;
    const parentMid = parentBody?.active_membership_id ?? parentBody?.memberships?.[0]?.id;
    if (!teacherMid || !parentMid) throw new Error('membership fixture unavailable');

    const prm004 = await runPhase('PRM-004', async () => {
    const classesResponse = await request('/classes', teacherAuth.token);
    const classesBody = await readJson(classesResponse);
    if (!classesResponse.ok || !Array.isArray(classesBody?.items)) throw new Error(`teacher class list HTTP ${classesResponse.status}`);
    const linkedResponse = await request(`/sync/snapshot/student?membership_id=${encodeURIComponent(parentMid)}`, parentAuth.token);
    const linkedBody = await readJson(linkedResponse);
    if (!linkedResponse.ok || !Array.isArray(linkedBody?.items)) throw new Error(`parent linked-student snapshot HTTP ${linkedResponse.status}`);
    const linkedIds = new Set(linkedBody.items.map((student) => student.id));
    let targetStudentId = null;
    for (const cls of classesBody.items.filter((item) => typeof item?.name === 'string' && item.name.startsWith('QA-'))) {
      const studentsResponse = await request(`/classes/${encodeURIComponent(cls.id)}/students`, teacherAuth.token);
      const studentsBody = await readJson(studentsResponse);
      if (!studentsResponse.ok || !Array.isArray(studentsBody?.items)) continue;
      const candidate = studentsBody.items.find((student) => typeof student?.name === 'string'
        && student.name.startsWith('QA-') && !linkedIds.has(student.id));
      if (candidate) { targetStudentId = candidate.id; break; }
    }
    if (!targetStudentId) {
      add('PRM-004', 'blocked', undefined, 'chặn: không có học sinh QA không liên kết trong workspace smoke');
    } else {
      const deniedResponse = await request(`/students/${encodeURIComponent(targetStudentId)}`, parentAuth.token);
      let exposed = false;
      if (deniedResponse.ok) {
        const body = await readJson(deniedResponse);
        exposed = body?.id === targetStudentId;
      }
      const denied = [401, 403, 404].includes(deniedResponse.status) || (deniedResponse.ok && !exposed);
      add('PRM-004', denied ? 'pass' : 'fail', deniedResponse.status);
    }
    return { classesBody, linkedIds };
    });

    await runPhase('PRM-005', async () => {
    const ownClasses = prm004.classesBody.items.filter((item) => typeof item?.name === 'string' && item.name.startsWith('QA-'));
    let qaTarget = null;
    for (const cls of ownClasses) {
      const studentsResponse = await request(`/classes/${encodeURIComponent(cls.id)}/students`, teacherAuth.token);
      const studentsBody = await readJson(studentsResponse);
      const student = studentsBody?.items?.find((item) => typeof item?.name === 'string' && item.name.startsWith('QA-') && prm004.linkedIds.has(item.id));
      if (!student) continue;
      const testsResponse = await request(`/classes/${encodeURIComponent(cls.id)}/tests`, teacherAuth.token);
      const testsBody = await readJson(testsResponse);
      const test = testsBody?.items?.find((item) => typeof item?.name === 'string' && item.name.startsWith('QA-'));
      if (test) { qaTarget = { student, test }; break; }
    }
    if (!qaTarget) {
      add('PRM-005', 'blocked', undefined, 'chặn: thiếu bài kiểm tra và học sinh QA liên kết để tạo lệnh score.set hợp lệ');
    } else {
      const commandId = uuid();
      const response = await request('/sync/push', parentAuth.token, {
        method: 'POST',
        body: JSON.stringify({
          membership_id: parentMid,
          device_id: uuid(),
          commands: [{ id: commandId, type: 'score.set', base_version: 0, created_at: new Date().toISOString(), payload: { test_id: qaTarget.test.id, student_id: qaTarget.student.id, value: 0 } }],
        }),
      });
      const body = await readJson(response);
      const result = body?.results?.find((item) => item.id === commandId);
      const denied = response.status === 401 || response.status === 403 || (response.ok && result?.status === 'rejected');
      add('PRM-005', denied ? 'pass' : response.ok && result?.status === 'applied' ? 'fail' : 'blocked', response.status,
        denied ? undefined : response.ok ? undefined : `chặn: HTTP ${response.status}, không có kết quả lệnh phân quyền`);
    }
    });
  } catch (error) {
    const safe = error?.phaseCaptured ? safeError(error, secrets) : emitError(currentPhase, error, secrets);
    for (const id of ['PRM-004', 'PRM-005']) {
      if (!records.some((item) => item.id === id)) add(id, 'blocked', undefined, `chặn tại ${currentPhase}: ${safe.kind} ${safe.message}`);
    }
  } finally {
    await writeJUnit(records);
  }
  return { records, teacherAuth, parentAuth, teacherMembershipId: teacherAuth?.body?.active_membership_id ?? teacherAuth?.body?.memberships?.[0]?.id ?? null,
    parentMembershipId: parentAuth?.body?.active_membership_id ?? parentAuth?.body?.memberships?.[0]?.id ?? null };
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    const demo = parseFixture('phone=redacted\npassword=redacted\nguardian_phone=redacted\nworkspace_name=smoke\n');
    if (!demo.teacherPhone || !demo.parentPhone || !demo.teacherPassword) throw new Error('dry run fixture parser failed');
    for (const phaseName of ['login GV', 'login PH', 'PRM-004', 'PRM-005']) process.stderr.write(`DRY-RUN phase="${phaseName}"\n`);
    process.stdout.write('DRY-RUN PASS permissions-http-prm004-005 (no network, no login)\n');
    return;
  }
  const raw = await readFile(`${homedir()}/.config/qlh/staging-smoke-fb2.txt`, 'utf8');
  const credentials = parseFixture(raw);
  if (!credentials.teacherPhone || !credentials.teacherPassword || !credentials.parentPhone || !credentials.workspaceName) {
    throw new Error('smoke fixture missing required fields');
  }
  await runHttpPermissionPhases({ credentials });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    emitError('fixture load', error);
    process.exitCode = 2;
  });
}
