import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const base = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const outDir = 'plans/20261021-mvp/qa/runs/2026-10-25/web';

function parseSmoke(text) {
  const values = Object.create(null);
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf('=');
    if (i <= 0) throw new Error('malformed smoke config');
    values[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return values;
}

async function login(credentials) {
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ phone: credentials.phone, password: credentials.password, device_label: 'QA permission check' }),
  });
  if (!response.ok) return { status: response.status, token: null };
  const body = await response.json();
  return { status: response.status, token: typeof body.token === 'string' ? body.token : null };
}

async function getStudentList(token, classId) {
  const response = await fetch(`${base}/classes/${encodeURIComponent(classId)}/students`, {
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
  });
  return response.status;
}

const configDir = path.join(os.homedir(), '.config', 'qlh');
let records = [];
try {
  const [rawA, rawB] = await Promise.all([
    readFile(path.join(configDir, 'staging-smoke.txt'), 'utf8'),
    readFile(path.join(configDir, 'staging-smoke-fb2.txt'), 'utf8'),
  ]);
  const a = parseSmoke(rawA);
  const b = parseSmoke(rawB);
  if (!a.phone || !a.password || !a.class_id || !b.phone || !b.password || a.phone === b.phone || a.workspace_name === b.workspace_name) {
    throw new Error('smoke teacher fixture unavailable');
  }
  const [loginA, loginB] = await Promise.all([login(a), login(b)]);
  records.push({ name: 'teacher A auth', status: loginA.status, outcome: loginA.token ? 'pass' : 'blocked' });
  records.push({ name: 'teacher B auth', status: loginB.status, outcome: loginB.token ? 'pass' : 'blocked' });
  if (loginA.token && loginB.token) {
    const [ownerStatus, crossWorkspaceStatus] = await Promise.all([
      getStudentList(loginA.token, a.class_id),
      getStudentList(loginB.token, a.class_id),
    ]);
    records.push({ name: 'owner can read smoke class roster', status: ownerStatus, outcome: ownerStatus === 200 ? 'pass' : 'fail' });
    const denied = crossWorkspaceStatus === 403 || crossWorkspaceStatus === 404;
    records.push({ name: 'other workspace cannot read smoke class roster', status: crossWorkspaceStatus, outcome: denied ? 'pass' : 'fail' });
    records.push({ name: 'other workspace write check', status: null, outcome: 'blocked' });
  }
} catch {
  records.push({ name: 'PRM-007 fixture', status: null, outcome: 'blocked' });
}

const failures = records.filter((record) => record.outcome === 'fail').length;
const tests = records.map((record) => record.status === null
  ? `<testcase classname="web" name="${record.name}"><skipped message="fixture unavailable or write check not run"/></testcase>`
  : `<testcase classname="web" name="${record.name}"><system-out>HTTP ${record.status}; ${record.outcome}</system-out></testcase>`).join('');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-prm-007" tests="${records.length}" failures="${failures}" skipped="${records.filter((record) => record.outcome === 'blocked').length}">${tests}</testsuite>\n`;
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'permissions-http-prm007-junit.xml'), xml);
for (const record of records) console.log(`HTTP ${record.status ?? 'N/A'} ${record.outcome.toUpperCase()}`);
if (failures) process.exitCode = 1;
