// Logs in both App Review accounts once and prints counts only. Reads ~/.config/qlh/staging-appreview.txt.
import fs from 'node:fs';
import os from 'node:os';
const API = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const txt = fs.readFileSync(os.homedir() + '/.config/qlh/staging-appreview.txt', 'utf8');
const sec = (name) => { const b = txt.split(/\n\n/).find((x) => x.startsWith(name)); return { phone: b.match(/phone: (\S+)/)[1], password: b.match(/password: (\S+)/)[1] }; };
const call = async (m, p, b, t) => { const r = await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, b: j }; };
const out = {};
for (const [role, name] of [['teacher', 'Giáo viên'], ['guardian', 'Phụ huynh']]) {
  const l = await call('POST', '/auth/login', sec(name));
  out[role + '_login'] = l.s;
  if (l.s !== 200) continue;
  const T = l.b.token;
  const cls = (await call('GET', '/classes', undefined, T)).b?.items ?? [];
  out[role + '_classes'] = cls.length;
  let students = 0, reports = 0, slips = 0;
  for (const c of cls) {
    const st = (await call('GET', `/classes/${c.id}/students`, undefined, T)).b?.items ?? [];
    students += st.length;
    for (const s of st) {
      if (role === 'guardian') reports += ((await call('GET', `/students/${s.id}/reports`, undefined, T)).b?.items ?? []).length;
    }
    if (role === 'guardian') {
      const ses = (await call('GET', `/classes/${c.id}/sessions?from=2020-01-01&to=2030-01-01&limit=100`, undefined, T)).b?.items ?? [];
      for (const x of ses) slips += ((await call('GET', `/sessions/${x.id}/slips`, undefined, T)).b?.items ?? []).length;
    }
  }
  out[role + '_students'] = students;
  if (role === 'guardian') { out.guardian_reports = reports; out.guardian_slips = slips; }
}
console.log(JSON.stringify(out));
