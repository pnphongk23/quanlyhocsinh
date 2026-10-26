// Builds the QA-iOS-C class on the clean iOS QA workspace through the API only (fake phone numbers):
// a held past session (21/10) with two homework sections, one current session today, three students,
// the first with a parent phone, and a guardian account for that phone.
// The guardian credentials go to ~/.config/qlh/staging-qa-ios-guardian.txt (mode 600) and are never printed.
// Teacher credentials come from ~/.config/qlh/staging-qa-ios.txt. Re-run prints QA-iOS-C=exists and changes nothing.
// Usage: node qa/maestro/web/fixture-ios-homework-guardian.mjs
import { readFile, writeFile, chmod, access } from 'node:fs/promises';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

const api = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const home = process.env.HOME;
const guardianPath = `${home}/.config/qlh/staging-qa-ios-guardian.txt`;
const parse = (text) => Object.fromEntries(text.split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const call = async (method, path, body, token) => {
  const r = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path.replace(/[0-9a-f-]{36}/g, ':id')} -> ${r.status} ${j?.error?.code ?? ''} ${j?.error?.details?.reason ?? ''}`);
  return j;
};
const fakePhone = () => `09${String(randomInt(0, 100000000)).padStart(8, '0')}`;
const tz = (offset) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.now() + offset * 86400000));

const teacher = parse(await readFile(`${home}/.config/qlh/staging-qa-ios.txt`, 'utf8'));
const login = await call('POST', '/auth/login', { phone: teacher.phone, password: teacher.password, device_label: 'qa-fixture' });
const token = login.token;
const membership = login.active_membership_id ?? login.memberships?.[0]?.id;
const listed = await call('GET', '/classes', null, token);
if ((Array.isArray(listed) ? listed : listed.items ?? listed.classes ?? []).some((c) => c.name === 'QA-iOS-C')) {
  console.log('QA-iOS-C=exists');
  process.exit(0);
}

const parentPhone = fakePhone();
const cls = await call('POST', '/classes', { id: randomUUID(), name: 'QA-iOS-C', weekdays: [1], start_time: '17:00' }, token);
const students = [];
for (let n = 1; n <= 3; n += 1) {
  const s = await call('POST', `/classes/${cls.id}/students`, { id: randomUUID(), name: `QA-iOS-C-HS${n}`, enrolled_at: tz(-30), ...(n === 1 ? { parent_phone: parentPhone } : {}) }, token);
  students.push(s.id);
}
const past = await call('POST', `/classes/${cls.id}/sessions`, { id: randomUUID(), date: tz(-6), start_time: '17:00', is_makeup: false, note: '' }, token);
const today = await call('POST', `/classes/${cls.id}/sessions`, { id: randomUUID(), date: tz(0), start_time: '17:00', is_makeup: false, note: '' }, token);

const push = async (commands) => {
  const out = await call('POST', '/sync/push', { membership_id: membership, device_id: randomUUID(), commands: commands.map((c) => ({ id: randomUUID(), base_version: 0, created_at: new Date().toISOString(), ...c })) }, token);
  const bad = out.results.filter((r) => r.status !== 'applied');
  if (bad.length) throw new Error(`sync rejected ${bad.map((b) => `${b.status}:${b.error?.code ?? ''}`).join(',')}`);
};
const vocab = randomUUID();
const reading = randomUUID();
await push(students.map((student_id) => ({ type: 'attendance.set', payload: { session_id: past.id, student_id, status: 'present', note: '' } })));
await push([{ type: 'homework.assign', payload: { session_id: past.id, sections: [
  { id: vocab, kind: 'vocabulary', title: 'QA-Tu vung C1', description: '' },
  { id: reading, kind: 'reading', title: 'QA-Doc C1', description: '' }] } }]);
// One graded cell on the vocabulary section so deleting it must fail (section_has_grades).
await push([{ type: 'homework.grade.set', payload: { section_id: vocab, student_id: students[1], level: 'done' } }]);

const password = `Qa-${randomBytes(9).toString('base64url')}-1x`;
const exists = await access(guardianPath).then(() => true, () => false);
if (!exists) {
  await call('POST', '/auth/register-guardian', { phone: parentPhone, password, display_name: 'PH QA iOS' });
  await writeFile(guardianPath, `phone=${parentPhone}\npassword=${password}\n`, { mode: 0o600 });
  await chmod(guardianPath, 0o600);
}
console.log(`QA-iOS-C=${cls.id} past=${past.id} today=${today.id} guardian_file=${guardianPath}`);
