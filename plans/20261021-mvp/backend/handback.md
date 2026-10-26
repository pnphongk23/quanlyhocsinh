# Handback Backend (Domain Lead `ccb7d3d2`)

Nhánh `mvp-backend`, HEAD `665c5ff` (chưa push/merge). Staging: https://qlh-staging-api.tolaphamnhuphong.workers.dev (Worker `qlh-staging-api`, version `90584f55-a138-4315-b24d-1f448b6cab3b`, D1 `qlh-staging-db`, gói Workers Free). Đăng nhập demo: `/tmp/qlh-staging-demo.txt` (ngoài repo, chmod 600).

## Đã làm
- Pha 1: schema 29 bảng + trigger, tầng `db` + `authz`, auth đầy đủ (B-1).
- Endpoint miền: lớp, học sinh, buổi, điểm danh, cron sinh buổi (B-2a); GET bài kiểm tra/điểm/BTVN/phiếu + 8 endpoint báo cáo (B-2b); notifications, device tokens, FCM sender mock (B-2c); sync push/pull (B-3). Ghi bài kiểm tra/điểm/BTVN/phiếu chỉ qua sync, đúng api-spec 5.5.
- Staging + đo CPU (B-4), deploy lại từ HEAD + smoke + CORS + workspace demo (B-6).
- Review tổng thể r1 (1 BLOCKER đa vai trò, 2 MAJOR) và r2 (1 MAJOR CORS) đều đã sửa kèm test hồi quy đỏ→xanh. Không mở r3 (r2 hết BLOCKER/MAJOR sau Fix D; phán đoán của lead, chưa reviewer nào xác nhận lại).

## Bằng chứng (lead tự chạy)
- HEAD `77c8cb0`: `npm run typecheck` sạch; `npm test` 23 file / 99 test qua. Bundle gzip ≈ 40 KiB (141,6 KiB chưa nén).
- Staging: `GET /v1/health` 200; preflight `OPTIONS /v1/auth/login` từ `http://localhost:5173` → 204 + `access-control-allow-origin` đúng origin; từ `https://evil.example` → 204 không có header allow-origin; `/__probe/*` 404.
- Smoke HTTPS thật (B-6): đăng ký → đăng nhập → `/me` → lớp → học sinh → điểm danh qua sync → đọc; đa vai trò chọn vai trò hai chiều.
- Demo: lớp 6A, 8 học sinh, 19 buổi (có hủy, buổi lẻ), 4 trạng thái điểm danh, 2 bài kiểm tra (max 15 và 100), BTVN chấm 3 mức, phiếu gửi cho 2 con, báo cáo 2026-10 phát hành cho 1 con.
- CPU thật (Free, 21 mẫu/mức): PBKDF2 30k/60k/100k trung vị 9/14/26 ms; đăng nhập trung vị 29, p95 50,8; `/me` trung vị 4, p95 14,8; RS256 import+sign 1–2 ms. 170 bản ghi không `exceededCpu`.

## Rủi ro / quyết định cho người dùng
- Q8: PBKDF2 100.000 vòng ≈ 26 ms trung vị, gấp 2,6 lần ngân sách 10 ms; `/me` p95 14,8 ms cũng vượt. Gói Free không cắt trong mẫu đo nhưng không phải bảo đảm. Chọn: giữ 100k ở Free, giảm vòng (60k ≈ 14 ms), hoặc nâng gói 5 USD. KHÔNG tự đổi số vòng.
- Q17 (mới): đổi lịch lặp khi buổi hôm nay đã có dữ liệu — tạm giữ buổi hôm nay, áp lịch mới từ ngày mai.
- CORS do Worker chịu, theo danh sách `ALLOWED_ORIGINS` (không `*`). Hiện có 3 cổng localhost + `https://quanlyhocsinh-proto.pages.dev`; khi mảng Web có Pages staging thật phải thêm origin rồi deploy lại.
- R2 chưa bật: PDF báo cáo trả 503 `pdf_storage_unavailable`. Cần người dùng bật R2, tạo bucket `qlh-staging-reports`, wrangler có quyền R2.
- FCM thật chưa kiểm: cần Firebase service account; các trần 5/20/5 của dispatch chưa đo.
- MINOR còn hở (xem `review-impl-r2.md`): m1 (`duplicate` với `original_status=rejected` dễ bị client coi là đã nhận), m12 (hai PATCH lớp đồng thời), N4 (upload PDF đồng thời), N5 (`POST /workspaces` không throttle), N6 (oracle `command_id_used`), m6 (chưa có test quét log).
- Lưu ý client: `GET /sessions/{id}/homework` trả `grades` của phần giao ở buổi trước, client phải ghép `section_id` với nội dung đã cache.
- Docs cần General Lead đồng bộ: hợp đồng CORS trong `api-spec.md`; 6.5(b) thêm chiều cổng đóng lại (client nhận `deleted`); Q9 (PDF phát qua Worker, không link ký) trong `architecture.md`; Q17.

## Sổ worker (profile-deviation: người dùng yêu cầu bỏ pi, sau đó chuyển sang deepseek)
| Id | Vai | Model | Việc |
|---|---|---|---|
| `64c167ef` | worker | codex gpt-6-luna | B-1 pha 1, R2 tùy chọn, nối cron, tích hợp sync/body |
| `a7ed806a` | worker | codex gpt-6-luna | B-2a |
| `680dd6d3` | worker | codex gpt-6-luna | B-2b (bị trả lại vì route ghi ngoài spec) |
| `d6bae1f2` | worker | codex gpt-6.1-sol | B-3 sync |
| `5991e899` | worker | pi deepseek-v4.1-flash | B-2c notifications/devices/FCM |
| `910a714f` | worker | pi deepseek | B-4 staging + đo CPU |
| `48fd78bb` | reviewer | pi deepseek | review r1 |
| `2f15416e`, `48f25306`, `d132ea4b` | worker | pi deepseek | sửa r1: A đa vai trò, B hình dạng items, C PATCH lớp |
| `73ef1d11` | reviewer | pi deepseek | review r2 |
| `9769598b`, `24d4f14f` | worker | pi deepseek | sửa r2: D CORS/auth, E replay/cron |
| `b1185ba8` | worker | pi deepseek | B-6 deploy lại staging, smoke, demo |
Lỗi upstream 429 tạm thời của deepseek xảy ra nhiều lần, đều được chạy lại.

## 2026-10-22 · Domain Lead mới: áp quyết định 71 (backend)
- Commit `ff9e2a6` (điểm bước 0,5, `invalid_score_step`), `a2d308a` (bỏ `REGISTRATION_CODE`, bỏ `guardian-credentials`, PBKDF2 mặc định 30.000). HEAD `a2d308a`, 103 test, typecheck sạch. Chưa push.
- Staging version `aea6464b-7641-45bb-906a-b62958c34f19`; secret `REGISTRATION_CODE` đã xoá. Mật khẩu phụ huynh demo đã đặt lại theo `runbook-reset-password.md` (ghi vào `/tmp/qlh-staging-demo.txt`).
- Đo đăng nhập: `stack-and-cpu.md` mục 4.2 (p95 > 10 ms ở mọi số vòng, kể cả 1.000).
- Docs đã sửa: api-spec, data-model, authz-matrix, stack-and-cpu. Còn chờ người dùng: phụ huynh lấy mật khẩu lần đầu.
- Snapshot báo cáo tháng: máy chủ tự dựng `homework` sai hình dạng (`{kind, level, count}`); sửa ở `59a0250` thành `{kind, excellent, done, not_done}` mỗi kind. Staging version `71bee1e8-be5d-413c-b370-59f2e2d1bcae`. Bản phát hành demo cũ (no. 1) bất biến, còn sai hình dạng; đã phát hành lại thành no. 2 và 3 (đúng hình dạng).
- Phụ huynh tự đăng ký: `POST /auth/register-guardian` (commit `d0a10c2`), liên kết/membership khi giáo viên thêm/sửa SĐT học sinh, throttle `POST /workspaces`. Staging version `eb427baa-f6b3-4dab-ab32-3371eaf5dc2e`. Origin web staging đã có trong `ALLOWED_ORIGINS` (`f9465eb`). Docs: api-spec mục 3/4/5.2/10, data-model, authz-matrix (T23a).
- Gỡ lưu PDF/R2 (commit `2992647`): hai route PDF trả 404, binding `REPORT_PDFS` và `has_pdf` bỏ; cột `pdf_key`/`pdf_bytes` giữ nhưng không dùng. Staging version `99db74bf-63d9-491d-8815-162b2d14bd7d`. Báo cáo demo hiện có thêm các bản phát hành số 4 (lần chạy lặp script kiểm).
- Đợt 2026-10-23: `0dedc3a` (sync `rejected` phát lại, UUID trùng workspace, PATCH lớp, log), `86d6b2d` (`PATCH /sessions/{id}` buổi lẻ, `students` trong membership phụ huynh), `2d311cb` đã hoàn tác bằng `71ae3a5` (người dùng huỷ yêu cầu siết SĐT; `register-guardian` tạo tài khoản kể cả SĐT chưa khớp). Staging `8095b92d-9a1f-41c0-96b8-30991a66ca9a`, 114 test.
- Review tổng thể backend (codex luna, vòng 1): 1 REQUIRED (throttle đăng ký không nguyên tử), 0 OPTIONAL; sửa ở `afb7b8b` (`consumeThrottle`). Staging `fe536528-8d24-4d80-87e0-9ef46d93b076`, 116 test. Đăng nhập (`LOGIN_*`) vẫn dùng check+record tách rời (cùng lớp lỗi đồng thời, chưa sửa).
- Throttle đăng nhập/đổi mật khẩu nguyên tử (`b91e98a`): đặt chỗ lượt IP rồi SĐT trước khi băm; đúng ⇒ xoá SĐT + hoàn lượt IP; SĐT từ chối ⇒ hoàn lượt IP. Staging `28354237-44ef-4e44-b87c-66090f61006d`, 120 test. CPU login 30.000 vòng, 40 mẫu: trung vị 10 ms, p95 17 ms (trước đó 9 / 17).
- `teacher_name` cho phụ huynh (`58e5665`); lớp của phụ huynh trong snapshot/pull có thêm `weekdays`, `start_time` đúng api-spec 6.4 (`8fac5d6`; trước đó bị thiếu). Staging `c97e77f0-eabb-4aed-b42e-40aa450c2c2f`, 122 test.
- Bàn giao `worker/` cho Domain Lead Dữ liệu + API đầu-cuối (2026-10-23). Không còn worker backend nào đang chạy hoặc sửa `worker/`. HEAD `mvp-backend` = `8fac5d6`, staging `c97e77f0-eabb-4aed-b42e-40aa450c2c2f`, 122 test, typecheck sạch. Còn hở: review r2 chưa chạy (bỏ theo GL); docs `plans/20261021-mvp/backend/*` đã sửa nhưng chưa commit (ở checkout chính). Creds demo: `~/.config/qlh/staging-demo.txt`. Smoke từ nay dùng workspace riêng, không dùng workspace demo.
