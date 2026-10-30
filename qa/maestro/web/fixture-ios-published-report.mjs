import { API_BASE, WEB_BASE } from "./config.mjs";
// Publishes the 2026-10 report for QA-iOS-C-HS1 through the API so the guardian account has one published report.
// Teacher credentials come from ~/.config/qlh/dev-qa.txt and are never printed. Re-running reuses the month batch and publishes the report again.
// Usage: node qa/maestro/web/fixture-ios-published-report.mjs
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const api = API_BASE;
const creds = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`, 'utf8')).split(/\r?\n/).map((l) => {
  const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', ''];
}).filter(([k]) => k));
const call = async (method, path, body, token) => {
  const r = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path.replace(/[0-9a-f-]{36}/g, ':id')} -> ${r.status} ${j?.error?.code ?? ''} ${JSON.stringify(j?.error?.details ?? '').slice(0, 120)}`);
  return j;
};
const items = (x) => (Array.isArray(x) ? x : x.items ?? x.classes ?? x.students ?? []);
const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()).slice(0, 7);
const login = await call('POST', '/auth/login', { phone: creds.phone, password: creds.password, device_label: 'qa-fixture' });
const token = login.token;
const cls = items(await call('GET', '/classes', null, token)).find((c) => c.name === 'QA-iOS-C');
const student = items(await call('GET', `/classes/${cls.id}/students`, null, token)).find((s) => s.name === 'QA-iOS-C-HS1');
// The report needs attendance for every held session of the month, so mark the student present on each session up to today.
const today = month === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()).slice(0, 7) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()) : `${month}-28`;
const sessions = items(await call('GET', `/classes/${cls.id}/sessions?from=${month}-01&to=${today}`, null, token));
await call('POST', '/sync/push', { membership_id: login.active_membership_id ?? login.memberships?.[0]?.id, device_id: randomUUID(), commands: sessions.filter((s) => s.status !== 'cancelled').map((s) => ({ id: randomUUID(), base_version: 0, created_at: new Date().toISOString(), type: 'attendance.set', payload: { session_id: s.id, student_id: student.id, status: 'present', note: '' } })) }, token);
const existing = items(await call('GET', `/classes/${cls.id}/report-batches`, null, token)).find((b) => b.month === month);
const batchId = existing?.id ?? (await call('POST', `/classes/${cls.id}/report-batches`, { month }, token)).batch.id;
const reports = items(await call('GET', `/report-batches/${batchId}/reports`, null, token));
const report = reports.find((r) => r.student_id === student.id);
await call('PUT', `/reports/${report.report_id}`, { general_comment: 'QA bao cao thang' }, token);
const out = await call('POST', `/reports/${report.report_id}/publish`, {}, token);
console.log('PUBLISHED', month, out.publication_no);
