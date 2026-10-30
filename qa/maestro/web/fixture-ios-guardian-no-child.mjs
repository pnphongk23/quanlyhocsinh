// Builds a guardian account with no linked child (fake phone numbers): a student of QA-iOS-E gets a parent phone,
// the guardian registers with it, then the student's parent phone changes so the link is removed.
// Credentials go to ~/.config/qlh/staging-qa-ios-guardian-no-child.txt (mode 600) and are never printed.
// Teacher credentials come from ~/.config/qlh/staging-qa-ios.txt. Re-run changes nothing when the guardian file exists.
// Usage: node qa/maestro/web/fixture-ios-guardian-no-child.mjs
import { readFile, writeFile, chmod, access } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';

const api = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const home = process.env.HOME;
const outPath = `${home}/.config/qlh/staging-qa-ios-guardian-no-child.txt`;
if (await access(outPath).then(() => true, () => false)) { console.log('GUARDIAN_NO_CHILD=exists'); process.exit(0); }
const parse = (text) => Object.fromEntries(text.split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const call = async (method, path, body, token) => {
  const r = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path.replace(/[0-9a-f-]{36}/g, ':id')} -> ${r.status} ${j?.error?.code ?? ''} ${JSON.stringify(j?.error?.details ?? '').slice(0, 120)}`);
  return j;
};
const items = (x) => (Array.isArray(x) ? x : x.items ?? x.classes ?? x.students ?? []);
const fakePhone = () => `09${String(randomInt(0, 100000000)).padStart(8, '0')}`;
const teacher = parse(await readFile(`${home}/.config/qlh/staging-qa-ios.txt`, 'utf8'));
const { token } = await call('POST', '/auth/login', { phone: teacher.phone, password: teacher.password, device_label: 'qa-fixture' });
const cls = items(await call('GET', '/classes', null, token)).find((c) => c.name === 'QA-iOS-E');
const student = items(await call('GET', `/classes/${cls.id}/students`, null, token))[0];
const phone = fakePhone();
const password = `Qa-${randomBytes(9).toString('base64url')}-1x`;
await call('PATCH', `/students/${student.id}`, { parent_phone: phone }, token);
await call('POST', '/auth/register-guardian', { phone, password, display_name: 'PH QA khong con' });
await writeFile(outPath, `phone=${phone}\npassword=${password}\n`, { mode: 0o600 });
await chmod(outPath, 0o600);
await call('PATCH', `/students/${student.id}`, { parent_phone: fakePhone() }, token);
console.log(`GUARDIAN_NO_CHILD=created cred_file=${outPath}`);
