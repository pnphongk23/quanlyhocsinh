#!/usr/bin/env node
// Dựng dữ liệu mẫu để chụp ảnh App Store, chỉ qua API (fetch, không trình duyệt).
// Chạy:  node build-fixtures.mjs --dry-run     (in kế hoạch, không gọi mạng)
//        node build-fixtures.mjs               (gọi API thật)
// Biến môi trường (người chạy cung cấp, script không đọc file nào và không in giá trị):
//   QLH_API_BASE   gốc API, ví dụ https://<host>/v1
//   QLH_PHONE      SĐT tài khoản giáo viên của workspace smoke
//   QLH_PASSWORD   mật khẩu tài khoản đó
//   QLH_GUARDIAN_PHONE  (tuỳ chọn) SĐT phụ huynh gắn cho 1 học sinh để chụp màn phụ huynh
import { randomUUID } from 'node:crypto';

const dryRun = process.argv.includes('--dry-run');
const ICT = 'Asia/Ho_Chi_Minh';
const day = (offset) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: ICT }).format(d);
};
const today = day(0);
const yesterday = day(-1);
const enrolledAt = day(-45);

const CLASSES = [
  { name: 'Lớp Tiếng Anh 6A', weekdays: [1, 3, 5], time: '18:00',
    students: ['Nguyễn Minh Anh', 'Trần Bảo Châu', 'Lê Gia Hân', 'Phạm Quốc Khánh', 'Võ Thanh Mai', 'Đặng Hoàng Nam', 'Bùi Ngọc Linh', 'Hoàng Đức Phúc'] },
  { name: 'Lớp Giao Tiếp 7B', weekdays: [2, 4], time: '17:30',
    students: ['Đỗ Khánh Vy', 'Ngô Anh Tuấn', 'Dương Thảo Nhi', 'Lý Gia Bảo', 'Phan Tuệ Lâm', 'Vũ Hải Đăng', 'Trịnh Mai Chi', 'Huỳnh Quang Huy'] },
];

// Ba trạng thái điểm danh, chia vòng theo thứ tự học sinh.
const ATTENDANCE = ['present', 'present', 'late', 'present', 'absent', 'present', 'present', 'late'];
// Tiêu chí tích (mặt nạ 5 bit) cho phiếu nháp hôm nay và phiếu đã gửi hôm qua.
const CRITERIA_TODAY = [31, 31, 15, 31, 7, 23, 31, 15];
const CRITERIA_SENT = [31, 31, 27, 31, 15, 31, 31, 23];
const HOMEWORK_LEVELS = ['excellent', 'done', 'done', 'excellent', 'not_done', 'done', 'excellent', 'done'];
const SCORES = [9, 8.5, 7, 9.5, 6.5, 8, 10, 7.5];

const bits = (n) => [...Array(5)].filter((_, i) => n & (1 << i)).length;
const sentence = (criteria) => {
  const n = bits(criteria);
  if (n === 5) return 'Hôm nay em học rất tốt: chăm chú, làm đủ bài và hợp tác với bạn. Cô khen em, tiếp tục phát huy nhé!';
  if (n >= 4) return 'Em học tốt, chỉ còn một điểm nhỏ cần cố gắng thêm. Cô tin em sẽ làm tốt hơn buổi sau.';
  if (n >= 3) return 'Em có tiến bộ nhưng còn vài điểm cần chú ý. Em cố gắng hơn ở buổi sau nhé!';
  return 'Buổi này em chưa tập trung. Cô mong em dành thêm thời gian ôn bài và chú ý hơn trên lớp.';
};

const plan = CLASSES.map((c) => ({ ...c, ids: { class: randomUUID(), today: randomUUID(), previous: randomUUID(), test: randomUUID(),
  vocab: randomUUID(), reading: randomUUID(), students: c.students.map(() => randomUUID()) } }));

if (dryRun) {
  console.log(`DRY RUN (không gọi mạng). Hôm nay ${today}, hôm qua ${yesterday}, học sinh ghi danh từ ${enrolledAt}.`);
  for (const c of plan) {
    console.log(`- ${c.name}: thứ ${c.weekdays.join(',')} lúc ${c.time}; ${c.students.length} học sinh`);
    console.log(`  buổi hôm qua ${yesterday} ${c.time}: điểm danh đủ, 2 phần BTVN đã chấm, ${c.students.length} phiếu đã gửi`);
    console.log(`  buổi hôm nay ${today} ${c.time}: điểm danh present/late/absent, ${c.students.length} phiếu nháp (5 tiêu chí + sao)`);
    console.log(`  1 bài kiểm tra "Kiểm tra từ vựng Unit 3" ${yesterday}, ${c.students.length} điểm`);
  }
  console.log(process.env.QLH_GUARDIAN_PHONE ? 'Gắn SĐT phụ huynh (từ biến môi trường) cho học sinh đầu của lớp đầu.' : 'Không có QLH_GUARDIAN_PHONE: bỏ qua gắn phụ huynh.');
  process.exit(0);
}

const need = (name) => {
  const v = process.env[name];
  if (!v) { console.error(`Thiếu biến môi trường ${name}`); process.exit(2); }
  return v;
};
const api = need('QLH_API_BASE').replace(/\/$/, '');
const phone = need('QLH_PHONE');
const password = need('QLH_PASSWORD');

const call = async (method, path, body, token) => {
  const res = await fetch(`${api}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  // Không in body hay dữ liệu cá nhân: chỉ phương thức, đường dẫn đã che id, mã lỗi.
  if (!res.ok) throw new Error(`${method} ${path.replace(/[0-9a-f-]{36}/g, ':id')} -> ${res.status} ${json?.error?.code ?? ''}`);
  return json;
};

const login = await call('POST', '/auth/login', { phone, password, device_label: 'app-store-fixture' });
if (!login.active_membership_id) throw new Error('đăng nhập không chọn được membership');
const token = login.token;
const membershipId = login.active_membership_id;
const deviceId = randomUUID();

const push = async (commands) => {
  for (let i = 0; i < commands.length; i += 50) {
    const chunk = commands.slice(i, i + 50).map((c) => ({ id: randomUUID(), base_version: 0, created_at: new Date().toISOString(), ...c }));
    const res = await call('POST', '/sync/push', { membership_id: membershipId, device_id: deviceId, commands: chunk }, token);
    const bad = res.results.filter((r) => r.status !== 'applied');
    if (bad.length) throw new Error(`sync/push: ${bad.length} lệnh không áp dụng (${[...new Set(bad.map((r) => r.status))].join(',')})`);
  }
};

for (const [ci, c] of plan.entries()) {
  const { ids } = c;
  await call('POST', '/classes', { id: ids.class, name: c.name, weekdays: c.weekdays, start_time: c.time }, token);
  for (const [i, name] of c.students.entries()) {
    const body = { id: ids.students[i], name, enrolled_at: enrolledAt };
    if (ci === 0 && i === 0 && process.env.QLH_GUARDIAN_PHONE) body.parent_phone = process.env.QLH_GUARDIAN_PHONE;
    await call('POST', `/classes/${ids.class}/students`, body, token);
  }
  await call('POST', `/classes/${ids.class}/sessions`, { id: ids.previous, date: yesterday, start_time: c.time, is_makeup: false, note: '' }, token);
  await call('POST', `/classes/${ids.class}/sessions`, { id: ids.today, date: today, start_time: c.time, is_makeup: false, note: '' }, token);

  const commands = [];
  commands.push({ type: 'homework.assign', payload: { session_id: ids.previous, sections: [
    { id: ids.vocab, kind: 'vocabulary', title: 'Học thuộc 20 từ Unit 3', description: '' },
    { id: ids.reading, kind: 'reading', title: 'Đọc bài 3 và trả lời câu hỏi', description: '' }] } });
  commands.push({ type: 'test.create', payload: { id: ids.test, class_id: ids.class, name: 'Kiểm tra từ vựng Unit 3', date: yesterday } });
  c.students.forEach((_, i) => {
    const sid = ids.students[i];
    commands.push({ type: 'attendance.set', payload: { session_id: ids.previous, student_id: sid, status: i === 7 ? 'late' : 'present' } });
    commands.push({ type: 'attendance.set', payload: { session_id: ids.today, student_id: sid, status: ATTENDANCE[i] } });
    for (const section of [ids.vocab, ids.reading]) {
      commands.push({ type: 'homework.grade.set', payload: { section_id: section, student_id: sid, level: HOMEWORK_LEVELS[i] } });
    }
    commands.push({ type: 'score.set', payload: { test_id: ids.test, student_id: sid, value: SCORES[i] } });
    commands.push({ type: 'slip.set', payload: { session_id: ids.previous, student_id: sid, criteria: CRITERIA_SENT[i], comment: sentence(CRITERIA_SENT[i]), note: '', hw_manual: false } });
    commands.push({ type: 'slip.set', payload: { session_id: ids.today, student_id: sid, criteria: CRITERIA_TODAY[i], comment: sentence(CRITERIA_TODAY[i]), note: '', hw_manual: false } });
  });
  await push(commands);
  await push([{ type: 'slip.send', payload: { session_id: ids.previous, student_ids: ids.students } }]);
  console.log(`FIXTURE_READY lớp="${c.name}" học_sinh=${c.students.length} hôm_nay=${today}`);
}
