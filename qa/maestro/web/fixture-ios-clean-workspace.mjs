// Builds a clean iOS QA workspace on staging through the API only (fake phone numbers).
// Flow: phone-check -> teacher_register -> classes (recurring schedule) -> students (one with parent_phone) -> one one-off session.
// Credentials go to ~/.config/qlh/staging-qa-ios.txt (mode 600) and are never printed.
// Usage: node qa/maestro/web/fixture-ios-clean-workspace.mjs
// If the credential file already exists, the script logs in and only adds what is missing (no register call).
import { readFile, writeFile, chmod, access } from 'node:fs/promises';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

const api = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const credPath = `${process.env.HOME}/.config/qlh/staging-qa-ios.txt`;

const call = async (method, path, body, token) => {
  const r = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path.replace(/[0-9a-f-]{36}/g, ':id')} -> ${r.status} ${j?.error?.code ?? ''} ${j?.error?.details?.reason ?? ''}`);
  return j;
};
const fakePhone = () => `09${String(randomInt(0, 100000000)).padStart(8, '0')}`;

let creds;
const exists = await access(credPath).then(() => true, () => false);
if (exists) {
  creds = Object.fromEntries((await readFile(credPath, 'utf8')).split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
} else {
  let phone = fakePhone();
  for (let i = 0; i < 5; i += 1) {
    const check = await call('POST', '/auth/phone-check', { phone });
    if (check.next === 'teacher_register') break;
    phone = fakePhone();
  }
  creds = { phone, password: `Qa-${randomBytes(9).toString('base64url')}-1x` };
  await call('POST', '/auth/register', { phone: creds.phone, password: creds.password, display_name: 'GV QA iOS', workspace_name: 'QA iOS sạch' });
  await writeFile(credPath, `phone=${creds.phone}\npassword=${creds.password}\n`, { mode: 0o600 });
  await chmod(credPath, 0o600);
}

const login = await call('POST', '/auth/login', { phone: creds.phone, password: creds.password, device_label: 'qa-fixture' });
const token = login.token;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const addDays = (n) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.now() + n * 86400000));
const todayWeekday = new Date(`${today}T12:00:00+07:00`).getDay();
const iso = (d) => (d === 0 ? 7 : d);

const listed = await call('GET', '/classes', null, token);
const have = new Set((Array.isArray(listed) ? listed : listed.items ?? listed.classes ?? []).map((c) => c.name));
const specs = [
  { name: 'QA-iOS-A', weekdays: [iso((todayWeekday + 2) % 7), iso((todayWeekday + 4) % 7)], start_time: '18:00', students: 5 },
  { name: 'QA-iOS-B', weekdays: [iso((todayWeekday + 3) % 7)], start_time: '19:30', students: 4 }
];
const out = [];
for (const spec of specs) {
  if (have.has(spec.name)) { out.push(`${spec.name}=exists`); continue; }
  const cls = await call('POST', '/classes', { id: randomUUID(), name: spec.name, weekdays: spec.weekdays, start_time: spec.start_time }, token);
  for (let n = 1; n <= spec.students; n += 1) {
    await call('POST', `/classes/${cls.id}/students`, { id: randomUUID(), name: `${spec.name}-HS${n}`, enrolled_at: addDays(-14), ...(n === 1 ? { parent_phone: fakePhone() } : {}) }, token);
  }
  await call('POST', `/classes/${cls.id}/sessions`, { id: randomUUID(), date: addDays(1), start_time: '20:00', is_makeup: false, note: '' }, token);
  out.push(`${spec.name}=${cls.id}`);
}
console.log(`CLEAN_WORKSPACE_READY ${out.join(' ')} cred_file=${credPath}`);
