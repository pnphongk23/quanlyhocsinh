// Adds two classes on the clean iOS QA workspace through the API only:
//  QA-iOS-D: past held session with homework (one cell graded), today's session held with a DRAFT slip for the first
//            student, whose parent phone is the QA guardian's phone, so the guardian can be checked before sending.
//  QA-iOS-E: past held session with homework, then two planned sessions (the next one is the cancel target).
// Credentials come from ~/.config/qlh/staging-qa-ios.txt and ~/.config/qlh/staging-qa-ios-guardian.txt; nothing secret is printed.
// Usage: node qa/maestro/web/fixture-ios-draft-slip-cancel.mjs   (re-run prints =exists and changes nothing)
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const api = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const home = process.env.HOME;
const parse = (text) => Object.fromEntries(text.split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const call = async (method, path, body, token) => {
  const r = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path.replace(/[0-9a-f-]{36}/g, ':id')} -> ${r.status} ${j?.error?.code ?? ''} ${j?.error?.details?.reason ?? ''}`);
  return j;
};
const tz = (offset) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.now() + offset * 86400000));
const items = (x) => (Array.isArray(x) ? x : x.items ?? x.classes ?? x.sessions ?? []);

const teacher = parse(await readFile(`${home}/.config/qlh/staging-qa-ios.txt`, 'utf8'));
const guardian = parse(await readFile(`${home}/.config/qlh/staging-qa-ios-guardian.txt`, 'utf8'));
const login = await call('POST', '/auth/login', { phone: teacher.phone, password: teacher.password, device_label: 'qa-fixture' });
const token = login.token;
const membership = login.active_membership_id ?? login.memberships?.[0]?.id;
const have = new Set(items(await call('GET', '/classes', null, token)).map((c) => c.name));

const push = async (commands) => {
  const out = await call('POST', '/sync/push', { membership_id: membership, device_id: randomUUID(), commands: commands.map((c) => ({ id: randomUUID(), base_version: 0, created_at: new Date().toISOString(), ...c })) }, token);
  const bad = out.results.filter((r) => r.status !== 'applied');
  if (bad.length) throw new Error(`sync rejected ${bad.map((b) => `${b.status}:${b.error?.code ?? ''}`).join(',')}`);
};
const build = async (name, weekday, withParent) => {
  const cls = await call('POST', '/classes', { id: randomUUID(), name, weekdays: [weekday], start_time: '17:00' }, token);
  const students = [];
  for (let n = 1; n <= 3; n += 1) {
    const s = await call('POST', `/classes/${cls.id}/students`, { id: randomUUID(), name: `${name}-HS${n}`, enrolled_at: tz(-30), ...(n === 1 && withParent ? { parent_phone: guardian.phone } : {}) }, token);
    students.push(s.id);
  }
  const past = await call('POST', `/classes/${cls.id}/sessions`, { id: randomUUID(), date: tz(-6), start_time: '17:00', is_makeup: false, note: '' }, token);
  await push(students.map((student_id) => ({ type: 'attendance.set', payload: { session_id: past.id, student_id, status: 'present', note: '' } })));
  const vocab = randomUUID();
  await push([{ type: 'homework.assign', payload: { session_id: past.id, sections: [
    { id: vocab, kind: 'vocabulary', title: `${name}-Tu vung`, description: '' },
    { id: randomUUID(), kind: 'reading', title: `${name}-Doc`, description: '' }] } }]);
  return { cls, students, past, vocab };
};

const out = [];
const sessionsOf = async (classId) => items(await call('GET', `/classes/${classId}/sessions?from=${tz(-10)}&to=${tz(10)}`, null, token));
// Today's session held with a draft slip for the first student; skipped when it already happened.
const finishDraft = async (classId) => {
  const today = (await sessionsOf(classId)).find((s) => s.date === tz(0));
  if (!today) throw new Error('no session today for QA-iOS-D');
  if (today.status !== 'planned') return `QA-iOS-D=exists today=${today.id}`;
  const first = items(await call('GET', `/classes/${classId}/students`, null, token)).find((s) => s.name === 'QA-iOS-D-HS1');
  await push([
    { type: 'attendance.set', payload: { session_id: today.id, student_id: first.id, status: 'present', note: '' } },
    { type: 'slip.set', payload: { session_id: today.id, student_id: first.id, criteria: 31, comment: 'QA nhan xet nhap', note: '' } }]);
  return `QA-iOS-D=${classId} today=${today.id}`;
};
if (have.has('QA-iOS-D')) {
  const existing = items(await call('GET', '/classes', null, token)).find((c) => c.name === 'QA-iOS-D');
  out.push(await finishDraft(existing.id));
} else {
  const d = await build('QA-iOS-D', 2, true);
  await push([{ type: 'homework.grade.set', payload: { section_id: d.vocab, student_id: d.students[0], level: 'excellent' } }]);
  out.push(await finishDraft(d.cls.id));
}
if (have.has('QA-iOS-E')) out.push('QA-iOS-E=exists');
else {
  const e = await build('QA-iOS-E', 3, false);
  out.push(`QA-iOS-E=${e.cls.id} past=${e.past.id}`);
}
console.log(out.join(' '));
