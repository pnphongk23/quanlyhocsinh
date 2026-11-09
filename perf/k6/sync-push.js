// k6: POST /v1/sync/push của một buổi điểm danh lớp 20 em, gate p95 < 300 ms. CHỈ CHẠY LOCAL.
//
// Chuẩn bị (một lần, trong thư mục worker/):
//   npx wrangler d1 migrations apply qlh-dev-db --local --env dev
//   npx wrangler dev --local --env dev --port 8787
// Mỗi lần chạy đăng ký một tài khoản mới, mà D1 local giới hạn 5 lượt đăng ký/giờ/IP; chạy lại nhiều
// lần trong một giờ thì xoá throttle cục bộ trước (chỉ D1 local):
//   npx wrangler d1 execute qlh-dev-db --local --env dev --command "DELETE FROM auth_throttle" 
// Chạy gate và ramp (thư mục gốc repo):
//   perf/k6/run-sync-push.sh                     # gate: 5 VU × 1 phút, p95 < 300 ms
//   SCENARIO=ramp perf/k6/run-sync-push.sh       # tăng dần tới RAMP_MAX_VUS (40) VU
// Script tự đăng ký một tài khoản + workspace mới trên máy local (mật khẩu sinh ngẫu nhiên,
// không in ra), tạo lớp QA-PERF-k6-<n> với 20 em và buổi hôm nay. Không đọc file creds,
// không gọi dev/staging/prod: host khác 127.0.0.1/localhost thì dừng ngay.
//   SCENARIO=gate (mặc định) | ramp
//   COMMANDS: số lệnh attendance.set mỗi push (mặc định 20 = cả lớp bấm "Tất cả có mặt").
import http from 'k6/http';
import { check, fail } from 'k6';

const API = (__ENV.QLH_API_BASE || 'http://127.0.0.1:8787/v1').replace(/\/$/, '');
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(`${API}/`)) {
  fail('chỉ chạy local: QLH_API_BASE phải là http://127.0.0.1:<cổng> hoặc http://localhost:<cổng>');
}
const STUDENTS = 20;
const COMMANDS = Math.min(STUDENTS, Number(__ENV.COMMANDS || STUDENTS));
const SCENARIO = __ENV.SCENARIO || 'gate';
const GATE_VUS = Number(__ENV.GATE_VUS || 5);
const RAMP_MAX_VUS = Number(__ENV.RAMP_MAX_VUS || 40);
// Mỗi VU một lớp riêng (một giáo viên một lớp), để tranh chấp CAS không làm méo số đo.
const CLASSES = Number(__ENV.CLASSES || (SCENARIO === 'ramp' ? RAMP_MAX_VUS : GATE_VUS));
const PREFIX = 'QA-PERF-k6';

const scenarios = {
  gate: { executor: 'constant-vus', vus: GATE_VUS, duration: __ENV.GATE_DURATION || '1m' },
  ramp: {
    executor: 'ramping-vus', startVUs: 1, gracefulRampDown: '10s',
    stages: [5, 10, 20, 30, RAMP_MAX_VUS].map((target) => ({ duration: __ENV.RAMP_STAGE || '30s', target })),
  },
};
if (!scenarios[SCENARIO]) fail(`SCENARIO không hợp lệ: ${SCENARIO}`);

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  setupTimeout: '20m',
  thresholds: {
    // Gate bắt buộc cho thay đổi đường sync (ops/decisions.md): trượt thì k6 exit ≠ 0.
    'http_req_duration{name:sync_push}': ['p(95)<300'],
    'checks{name:sync_push}': ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// k6 không có Intl: ngày theo giờ Việt Nam (UTC+7, không có giờ mùa hè).
const localDay = (offsetDays) => new Date(Date.now() + 7 * 3600 * 1000 - offsetDays * 86400 * 1000).toISOString().slice(0, 10);
const today = () => localDay(0);
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
  const r = (Math.random() * 16) | 0;
  return (ch === 'x' ? r : (r & 3) | 8).toString(16);
});
const digits = (count) => Array.from({ length: count }, () => Math.floor(Math.random() * 10)).join('');
// SĐT Việt Nam hợp lệ và mật khẩu 8–128 ký tự, không trùng SĐT; chỉ sống trên D1 local.
const newAccount = () => ({ phone: `+8490${digits(7)}`, password: `K6-${uuid().replace(/-/g, '')}` });

function call(method, path, body, token, tag) {
  const res = http.request(method, `${API}${path}`, body === undefined ? null : JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    tags: { name: tag || 'setup' },
  });
  if (tag === undefined && (res.status < 200 || res.status >= 300)) {
    // Đường dẫn có id được che; không in body (có thể chứa dữ liệu người dùng).
    fail(`${method} ${path.replace(/[0-9a-f-]{36}/g, ':id').replace(/\?.*$/, '')} -> ${res.status}`);
  }
  return res;
}

export function setup() {
  // Tài khoản mới mỗi lần chạy: dữ liệu đo không lẫn với lần trước, không cần creds.
  const account = newAccount();
  const register = http.post(`${API}/auth/register`, JSON.stringify({
    phone: account.phone, password: account.password,
    display_name: 'QA perf', workspace_name: `${PREFIX}-${today()}`,
  }), { headers: { 'content-type': 'application/json' }, tags: { name: 'setup' } });
  if (register.status === 429) fail('D1 local đã chạm hạn mức đăng ký theo IP: xoá auth_throttle local rồi chạy lại (xem đầu file)');
  if (register.status !== 201) fail(`đăng ký local -> ${register.status}`);
  const registered = register.json();
  if (!registered.active_membership_id || !registered.token) fail('đăng ký local không trả token');
  const token = registered.token;
  const day = today();
  const classes = [];
  for (let n = 1; n <= CLASSES; n++) {
    const cls = call('POST', '/classes', { id: uuid(), name: `${PREFIX}-${n}`, weekdays: [7], start_time: '06:00' }, token).json();
    for (let k = 1; k <= STUDENTS; k++) {
      // Ghi danh trước buổi hôm nay để điểm danh không bị từ chối student_not_enrolled_on_date.
      call('POST', `/classes/${cls.id}/students`, { id: uuid(), name: `${PREFIX}-HS${k}`, enrolled_at: localDay(30) }, token);
    }
    const students = call('GET', `/classes/${cls.id}/students?status=active`, undefined, token).json().items;
    if (students.length < STUDENTS) fail(`lớp ${cls.id}: chỉ có ${students.length}/${STUDENTS} học sinh`);
    const session = call('POST', `/classes/${cls.id}/sessions`, {
      id: uuid(), date: day, start_time: '00:05', is_makeup: false, note: '',
    }, token).json();
    classes.push({ sessionId: session.id, students: students.slice(0, STUDENTS).map((s) => s.id) });
  }
  return { token, membershipId: registered.active_membership_id, classes };
}

export default function (data) {
  const cls = data.classes[(__VU - 1) % data.classes.length];
  // Đổi trạng thái mỗi lượt để lệnh luôn ghi thật, không rơi vào nhánh noop.
  const status = __ITER % 2 === 0 ? 'present' : 'late';
  const now = new Date().toISOString();
  const commands = cls.students.slice(0, COMMANDS).map((student_id) => ({
    id: uuid(), type: 'attendance.set', base_version: 0, created_at: now,
    payload: { session_id: cls.sessionId, student_id, status },
  }));
  const res = call('POST', '/sync/push', { membership_id: data.membershipId, device_id: uuid(), commands }, data.token, 'sync_push');
  let body = null;
  try { body = res.json(); } catch (_) { body = null; }
  check(res, {
    'push 200': (r) => r.status === 200,
    'mọi lệnh applied': () => !!body && body.results.length === COMMANDS && body.results.every((r) => r.status === 'applied'),
  }, { name: 'sync_push' });
}
