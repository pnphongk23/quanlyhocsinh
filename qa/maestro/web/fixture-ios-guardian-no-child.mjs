// Checks the existing QA guardian account that has no linked child can log in. It never registers accounts or edits data.
// Credentials come from ~/.config/qlh/staging-qa-ios-guardian-no-child.txt and are never printed.
// Usage: node qa/maestro/web/fixture-ios-guardian-no-child.mjs
import { readFile } from 'node:fs/promises';

const api = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const credPath = `${process.env.HOME}/.config/qlh/staging-qa-ios-guardian-no-child.txt`;
const text = await readFile(credPath, 'utf8').catch(() => null);
if (!text) { console.error('GUARDIAN_NO_CHILD=missing: ask the owner for an existing QA account; this script does not register one'); process.exit(1); }
const cred = Object.fromEntries(text.split(/\r?\n/).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', '']; }).filter(([k]) => k));
const r = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: cred.phone, password: cred.password, device_label: 'qa-fixture' }) });
console.log(r.ok ? 'GUARDIAN_NO_CHILD=ok' : `GUARDIAN_NO_CHILD=login_failed status=${r.status}`);
process.exit(r.ok ? 0 : 1);
