// Brief 97 fixture via API only (no browser): a class with 3 students and one one-off session today, no attendance, no slips.
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';

const api = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const creds = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`, 'utf8')).split(/\r?\n/).map((l) => {
  const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', ''];
}).filter(([k]) => k));
if (!creds.phone || !creds.password) throw new Error('Required smoke credential keys are missing');

const call = async (method, path, body, token) => {
  const r = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path.replace(/[0-9a-f-]{36}/g, ':id')} -> ${r.status} ${j?.error?.code ?? ''}`);
  return j;
};

const suffix = randomBytes(3).toString('hex');
const label = process.argv[2] || 'W';
const className = `AAA-QA97-${label}-${suffix}`;
const login = await call('POST', '/auth/login', { phone: creds.phone, password: creds.password, device_label: 'qa-fixture' });
if (!login.active_membership_id) throw new Error('login did not select a membership');
const token = login.token;

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const todayWeekday = new Date(`${today}T12:00:00+07:00`).getDay(); // 0=Sun
const otherDay = todayWeekday === 3 ? 4 : 3; // recurring weekday that is never today
const cls = await call('POST', '/classes', { id: randomUUID(), name: className, weekdays: [otherDay === 0 ? 7 : otherDay], start_time: '18:00' }, token);
const names = [1, 2, 3].map((n) => `AAA-QA97-${label}-${suffix}-HS${n}`);
for (const name of names) await call('POST', `/classes/${cls.id}/students`, { id: randomUUID(), name, enrolled_at: today }, token);
const ses = await call('POST', `/classes/${cls.id}/sessions`, { id: randomUUID(), date: today, start_time: '23:00', is_makeup: false, note: '' }, token);
console.log(`FIXTURE_READY class=${className} students=${names.length} session_date=${today} session_time=23:00 class_id=${cls.id} session_id=${ses.id}`);
