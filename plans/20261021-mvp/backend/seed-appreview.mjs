// Seed the Apple App Review demo accounts on staging. Run: node seed-appreview.mjs
// Generates phones and passwords into ~/.config/qlh/staging-appreview.txt (chmod 600) and never prints them.
// Refuses to run when that file already exists.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const CREDS = path.join(os.homedir(), '.config/qlh/staging-appreview.txt');
if (fs.existsSync(CREDS)) throw new Error('creds file exists, refusing to seed twice');

const rand = (n) => String(crypto.randomInt(0, 10 ** n)).padStart(n, '0');
const phone = () => `+849${rand(8)}`;
const pw = () => crypto.randomBytes(12).toString('base64url') + 'aA1';
const teacher = { phone: phone(), password: pw() };
const guardian = { phone: phone(), password: pw() };
fs.mkdirSync(path.dirname(CREDS), { recursive: true });
fs.writeFileSync(CREDS, `Giáo viên\nphone: ${teacher.phone}\npassword: ${teacher.password}\n\nPhụ huynh\nphone: ${guardian.phone}\npassword: ${guardian.password}\n`, { mode: 0o600 });
fs.chmodSync(CREDS, 0o600);

const call = async (method, p, body, token) => {
  const r = await fetch(API + p, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, b: j };
};
const must = (label, r, ok = [200, 201]) => {
  if (!ok.includes(r.s)) throw new Error(`${label} failed ${r.s} ${r.b?.error?.code ?? ''} ${JSON.stringify(r.b?.error?.details ?? {})}`);
  return r.b;
};

// Dates in Vietnam time.
const vnToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const dayMs = 86400000;
const addDays = (d, n) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * dayMs).toISOString().slice(0, 10);
const weekday = (d) => ((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7) + 1; // 1 = Monday
const [ty, tm] = vnToday.split('-').map(Number);
const prevY = tm === 1 ? ty - 1 : ty, prevM = tm === 1 ? 12 : tm - 1;
const prevMonth = `${prevY}-${String(prevM).padStart(2, '0')}`;
const prevDay = (d) => `${prevMonth}-${String(d).padStart(2, '0')}`;

// Teacher.
const reg = must('register', await call('POST', '/auth/register', { phone: teacher.phone, password: teacher.password, workspace_name: 'Lớp Cô Demo', display_name: 'Cô Demo' }));
const T = reg.token;
const mid = reg.memberships?.[0]?.id;
if (!mid) throw new Error('no membership id');

const classA = must('class A', await call('POST', '/classes', { name: 'Tiếng Anh Giao tiếp 6', weekdays: [...new Set([weekday(vnToday), ((weekday(vnToday) + 2) % 7) + 1])], start_time: '18:00' }, T));
const classB = must('class B', await call('POST', '/classes', { name: 'Tiếng Anh Thiếu nhi 4', weekdays: [((weekday(vnToday) + 0) % 7) + 1, ((weekday(vnToday) + 3) % 7) + 1], start_time: '16:30' }, T));
const names = [['An', 'Bình', 'Chi', 'Dũng', 'Hà'], ['Khoa', 'Lan', 'Minh', 'Ngọc', 'Phúc']];
const enrolled = `${prevMonth}-01`;
const students = { A: [], B: [] };
for (const [key, cls, list] of [['A', classA, names[0]], ['B', classB, names[1]]]) {
  for (let i = 0; i < list.length; i++) {
    const body = { name: `${list[i]} Demo`, enrolled_at: enrolled };
    if (i === 0) body.parent_phone = guardian.phone;
    students[key].push(must('student', await call('POST', `/classes/${cls.id}/students`, body, T)));
  }
}

const sessions = { A: [], B: [] };
const mk = async (key, cls, date, time) => sessions[key].push(must('session', await call('POST', `/classes/${cls.id}/sessions`, { date, start_time: time }, T)));
for (const d of [6, 13, 20, 27]) await mk('A', classA, prevDay(d), '10:00');
for (const d of [7, 14, 21, 28]) await mk('B', classB, prevDay(d), '10:00');
await mk('A', classA, addDays(vnToday, -1), '10:00');
const todayA = (await call('GET', `/classes/${classA.id}/sessions?from=${vnToday}&to=${addDays(vnToday, 14)}`, undefined, T)).b?.items ?? [];
const todaySession = todayA.find((s) => s.date === vnToday) ?? todayA[0];

const cmd = (type, payload, base = 0) => ({ id: crypto.randomUUID(), type, payload, base_version: base, created_at: new Date().toISOString() });
let failures = {};
const push = async (cs) => {
  for (let i = 0; i < cs.length; i += 40) {
    const r = await call('POST', '/sync/push', { membership_id: mid, device_id: crypto.randomUUID(), commands: cs.slice(i, i + 40) }, T);
    if (r.s !== 200) throw new Error(`push ${r.s}`);
    for (const x of r.b.results) if (x.status === 'rejected') { const k = x.error?.code + ':' + (x.error?.details?.reason ?? ''); failures[k] = (failures[k] ?? 0) + 1; }
  }
};

const statusFor = (si, ki) => ((si + ki) % 7 === 3 ? 'late' : (si * 3 + ki) % 9 === 8 ? 'absent' : 'present');
const sentence = ['Con học tập trung và hoàn thành tốt các bài trong buổi.', 'Con tích cực phát biểu và làm bài tập đầy đủ.', 'Con tiến bộ rõ ở phần từ vựng, cần luyện nói thêm ở nhà.'];

const attendanceCmds = [];
for (const key of ['A', 'B']) {
  sessions[key].forEach((ses, si) => students[key].forEach((st, ki) => attendanceCmds.push(cmd('attendance.set', { session_id: ses.id, student_id: st.id, status: statusFor(si, ki) }))));
}
if (todaySession) students.A.forEach((st) => attendanceCmds.push(cmd('attendance.set', { session_id: todaySession.id, student_id: st.id, status: 'present' })));
await push(attendanceCmds);

// Tests and scores.
const testCmds = [], scoreCmds = [];
for (const [key, cls] of [['A', classA], ['B', classB]]) {
  [['Kiểm tra từ vựng', 10], ['Kiểm tra giữa tháng', 24]].forEach(([name, day]) => {
    const id = crypto.randomUUID();
    testCmds.push(cmd('test.create', { id, class_id: cls.id, name, date: prevDay(day) }));
    students[key].forEach((st, ki) => scoreCmds.push(cmd('score.set', { test_id: id, student_id: st.id, value: 6 + ((ki * 3 + day) % 8) * 0.5 })));
  });
}
await push(testCmds);
await push(scoreCmds);

// Homework on the second session, graded; slips on the first three sessions, sent.
const hwCmds = [], gradeCmds = [];
for (const key of ['A', 'B']) {
  const ses = sessions[key][1];
  const secIds = ['vocabulary', 'reading'].map(() => crypto.randomUUID());
  hwCmds.push(cmd('homework.assign', { session_id: ses.id, sections: [
    { id: secIds[0], kind: 'vocabulary', title: 'Học 10 từ mới', description: 'Học thuộc và đặt câu với 5 từ.' },
    { id: secIds[1], kind: 'reading', title: 'Đọc bài 3', description: 'Đọc to bài 3 hai lần.' }] }));
  students[key].forEach((st, ki) => secIds.forEach((sid, j) => gradeCmds.push(cmd('homework.grade.set', { section_id: sid, student_id: st.id, level: (ki + j) % 5 === 4 ? 'not_done' : ki % 2 ? 'excellent' : 'done' }))));
}
await push(hwCmds);
await push(gradeCmds);

const slipCmds = [], sendCmds = [];
for (const key of ['A', 'B']) {
  sessions[key].slice(0, 3).forEach((ses, si) => {
    students[key].forEach((st, ki) => slipCmds.push(cmd('slip.set', { session_id: ses.id, student_id: st.id, criteria: 31 - ((ki + si) % 3 === 2 ? 4 : 0), comment: sentence[(ki + si) % 3], note: '' })));
    sendCmds.push(cmd('slip.send', { session_id: ses.id, student_ids: students[key].map((s) => s.id) }));
  });
}
await push(slipCmds);
await push(sendCmds);

// One published monthly report per class.
let reportStatus = [];
for (const cls of [classA, classB]) {
  const batch = await call('POST', `/classes/${cls.id}/report-batches`, { month: prevMonth }, T);
  reportStatus.push(`batch ${batch.s}`);
  if (batch.s !== 200 && batch.s !== 201) continue;
  for (const rep of batch.b.reports ?? []) await call('PUT', `/reports/${rep.report_id}`, { general_comment: 'Tháng này con học đều, tham gia tích cực và có tiến bộ rõ rệt.' }, T);
  const pub = await call('POST', `/report-batches/${batch.b.batch.id}/publish`, undefined, T);
  reportStatus.push(`publish ${pub.s}`);
}

// Guardian first-time password setup, using the 'guardian_setup' branch of phone-check.
const pc = (await call('POST', '/auth/phone-check', { phone: guardian.phone })).b?.next;
const greg = pc === 'guardian_setup' ? await call('POST', '/auth/register-guardian', { phone: guardian.phone, password: guardian.password, display_name: 'Phụ huynh Demo' }) : { s: 0 };

console.log(JSON.stringify({ phone_check_before_setup: pc, guardian_register: greg.s, prevMonth, today_session: !!todaySession, rejected_commands: failures, reports: reportStatus,
  counts: { classes: 2, students: students.A.length + students.B.length, sessions: sessions.A.length + sessions.B.length } }));
