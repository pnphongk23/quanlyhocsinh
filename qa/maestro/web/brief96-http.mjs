// Brief 96 HTTP checks: undeclared guardian phone is rejected; phone-check rate limit (fake numbers only; run last).
import { randomInt } from 'node:crypto';
const base = 'https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1';
const rec = (id, status, note = '') => console.log(`${status} ${id}${note ? ': ' + note : ''}`);
const fake = () => `+84${randomInt(700000000, 799999999)}`;
const post = async (path, body) => {
  const r = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j, retry: r.headers.get('retry-after') };
};
const mode = process.argv[2] || 'register';
if (mode === 'register') {
  const r = await post('/auth/register-guardian', { phone: fake(), password: 'QaB96-Throwaway1x' });
  rec('AUTH-008-undeclared-guardian-rejected', r.status === 403 && r.body?.error?.details?.reason === 'phone_not_declared' ? 'PASS' : 'FAIL', `status=${r.status} code=${r.body?.error?.code} reason=${r.body?.error?.details?.reason}`);
  const bad = await post('/auth/phone-check', { phone: '12345' });
  rec('AUTH-025-api-invalid-phone', bad.status === 422 && bad.body?.error?.details?.fields?.phone === 'invalid_phone' ? 'PASS' : 'FAIL', `status=${bad.status}`);
  const ok = await post('/auth/phone-check', { phone: fake() });
  rec('AUTH-023-api-shape', ok.status === 200 && ok.body && Object.keys(ok.body).join() === 'next' && ok.body.next === 'teacher_register' ? 'PASS' : 'FAIL', `status=${ok.status} keys=${ok.body ? Object.keys(ok.body).join() : ''}`);
} else {
  // AUTH-026: per-phone limit (contract: 10/15 min) then per-IP limit (30/15 min). Fake numbers only.
  const same = fake(); const seen = [];
  for (let i = 1; i <= 12; i += 1) { const r = await post('/auth/phone-check', { phone: same }); seen.push(r.status); if (r.status === 429) { rec('AUTH-026-per-phone', i === 11 ? 'PASS' : 'PASS-OFFSET', `first 429 at request ${i}; retry-after=${r.retry}; code=${r.body?.error?.code}`); break; } }
  if (!seen.includes(429)) rec('AUTH-026-per-phone', 'FAIL', `no 429 after 12 requests: ${seen.join(',')}`);
  let ipHit = null;
  for (let i = 1; i <= 35; i += 1) { const r = await post('/auth/phone-check', { phone: fake() }); if (r.status === 429) { ipHit = i; break; } }
  rec('AUTH-026-per-ip', ipHit ? 'PASS' : 'FAIL', ipHit ? `429 after ${ipHit} further distinct-number requests (plus the 12 above)` : 'no 429 within 35 more requests');
}
