# Bàn giao Domain Lead Backend (lead cũ `ccb7d3d2`, 2026-10-22)

Không chứa secret. Mật khẩu demo ở `/tmp/qlh-staging-demo.txt` (ngoài repo, chmod 600). Lưu ý: lead cũ lỡ in MỘT ĐOẠN mật khẩu demo của phụ huynh vào chat (tài khoản staging, dữ liệu giả); nên đặt lại.

## Mục tiêu và brief gốc
Backend Cloudflare Worker + D1 cho MVP quản lý lớp. Brief: `briefs/50-lead-common.md`, `briefs/51-lead-backend.md`, `briefs/40-backend-impl-p1.md`. Spec: `backend/{api-spec,data-model,authz-matrix,offline-plan,stack-and-cpu}.md`. Quyết định mới: `briefs/71-decisions-20261022.md`.

## Trạng thái thật
- Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, workspace `wks_a9cc7bd377b6447a`, nhánh `mvp-backend`, HEAD `70c9392` (chưa push/merge). Chưa commit: `worker/tests/sync.test.ts` (worker `63182f2d` đang sửa).
- Đã tự kiểm (lead cũ chạy trên `77c8cb0`): `npm run typecheck` sạch, 23 file / 99 test; trên `70c9392`: 100 test, typecheck sạch. Bundle gzip ≈ 40 KiB.
- Đã tự kiểm staging: `GET /v1/health` 200; preflight CORS từ `http://localhost:5173` → 204 + allow-origin đúng; origin lạ không phản chiếu; `/__probe/*` 404.
- CHỈ theo báo cáo worker (lead cũ chưa tự chạy lại): smoke HTTPS đầy đủ (B-6), workspace demo, smoke hai lệnh cùng ô trên version `e45ed4ce-6df8-4923-b19d-a0c5a6abddfc` (`impl-b7-sync-lww-report.md`).
- Review tổng thể: r1 (1 BLOCKER, 2 MAJOR) và r2 (1 MAJOR CORS) đã sửa; r3 KHÔNG mở. Quy tắc: tối đa 2 vòng, đã dùng hết.

## Đã xong (commit)
Nền pha 1 `e858e40`, R2 tùy chọn `950d3b5`, cron `8479131`, tích hợp sync/body `f31d26b`, endpoint miền `4b57f24..1f5fbf4`, staging `aad4f52`, `665c5ff`; sửa r1 `33a680c` `8a4f642` `a80f33e`; sửa r2 `bbc0696` `267bb37` `69e85b7` `77c8cb0`; sync sau-cùng-thắng `70c9392`.

## Worker đang chạy
- `63182f2d-1dac-4ff6-985e-a97a26c92080` (pi/deepseek-v4.1-flash, high). Brief `briefs/backend-10-sync-last-write-wins.md` + yêu cầu bổ sung: lệnh ĐỐI TƯỢNG (`test.update`, `homework.section.upsert`) cũng không còn `rejected version_conflict` khi `base_version` cũ (`src/db/sync.ts` ~dòng 152, `api-spec.md` ~dòng 290); test hồi quy, sửa api-spec, commit, deploy lại staging, cập nhật `impl-b7-sync-lww-report.md`. File đang sửa: `worker/src/db/sync*.ts`, `worker/tests/sync.test.ts`, `api-spec.md`.
- Worker cũ đáng nhớ: codex luna `64c167ef` (B-1), `a7ed806a` (B-2a), `680dd6d3` (B-2b, từng bị trả lại vì thêm route ghi ngoài spec); codex sol `d6bae1f2` (B-3 sync); deepseek: `5991e899` (B-2c), `910a714f` (B-4), `48fd78bb`/`73ef1d11` (review r1/r2), `2f15416e`/`48f25306`/`d132ea4b` (sửa r1), `9769598b`/`24d4f14f` (sửa r2), `b1185ba8` (B-6 staging+demo). Sổ đầy đủ ở `backend/handback.md`. deepseek hay lỗi upstream 429 tạm thời: gửi lại prompt bảo kiểm `git diff` rồi làm tiếp; có lần worker kết thúc chỉ sau khi đọc brief (ổ đĩa đầy), phải giao lại.

## Việc còn lại (ưu tiên)
1. Chờ/kiểm `63182f2d` (xem trên); tự chạy `npm test`, typecheck, `git log`, smoke hai lệnh cùng ô qua HTTPS. Báo lead iOS danh sách mục `api-spec.md` mục 6 đã đổi (lead cũ CHƯA nhắn được lead iOS).
2. Quyết định 2026-10-22 (xem dưới) — cần worker mới:
   - Bỏ `REGISTRATION_CODE` và mọi mã/lời mời: `routes/auth.ts`, `db/auth.ts`, test, `.dev.vars.example`, README, secret staging.
   - Bỏ "Cấp mật khẩu"/mật khẩu tạm phụ huynh (`POST /students/{id}/guardian-credentials`, điều kiện B-01, `must_change_password` cho luồng này) và mọi chỗ liên quan trong spec/test. LƯU Ý: workspace demo hiện dùng luồng này để tạo phụ huynh; sẽ cần cách khác (chờ câu trả lời mục 5).
   - Điểm số lẻ bước 0,5 (`score.set`, DDL/validation, `score_above_max`): kiểm kiểu cột `scores.value` trong `migrations/0001_schema.sql` và validation ở `db/sync.ts`.
   - Chọn số vòng PBKDF2 vừa gói Free: đo CPU thật ở staging (biến `PBKDF2_ITERATIONS`), gợi ý 30.000 (≈9 ms) hoặc 25.000 (≈7 ms). Lưu ý tài khoản đã băm 100.000 vòng: kiểm cách `verify` đọc số vòng (nên lưu số vòng trong chuỗi băm).
3. Docs còn lệch (GL đồng bộ): hợp đồng CORS trong `api-spec.md`; 6.5(b) thêm chiều cổng đóng lại (client nhận `deleted`); Q9 PDF phát qua Worker (không link ký) trong `architecture.md`; Q17.
4. MINOR còn hở (`backend/review-impl-r2.md`): m1 (`duplicate` có `original_status=rejected` dễ bị client coi là đã nhận), m12 (hai PATCH lớp đồng thời), N4 (upload PDF đồng thời), N5 (`POST /workspaces` không throttle), N6 (oracle `command_id_used`), m6 (chưa có test quét log).
5. Review tổng thể một lần khi gần xong (reviewer codex luna high, tối đa 2 vòng) nếu GL muốn lại sau các thay đổi trên.

## Câu hỏi chờ người dùng/GL
- Phụ huynh lấy mật khẩu lần đầu bằng cách nào (quyết định 71 mục 5): CHƯA làm.
- Q15 (vắng 2 buổi liên tiếp), Q16 (đánh số buổi): giữ tạm như cũ. Q17: đổi lịch lặp khi buổi hôm nay đã có dữ liệu, tạm giữ buổi hôm nay, áp lịch mới từ ngày mai.
- Bật R2 (bucket `qlh-staging-reports`, wrangler có quyền R2) để có PDF thật; hiện PDF trả `503 pdf_storage_unavailable`.
- Firebase service account cho FCM thật (chưa kiểm FCM đầu-cuối, các trần 5/20/5 chưa đo).
- Q8 cũ (100.000 vòng) được thay bằng quyết định 71 mục 1.

## Quyết định riêng của mảng (đã chốt, không đảo)
Ghi bài kiểm tra/điểm/BTVN/phiếu chỉ qua sync (không REST ghi ngoài spec). CORS do Worker chịu, theo `ALLOWED_ORIGINS` (lead cũ chọn, spec im lặng; staging hiện: 3 cổng localhost + `https://quanlyhocsinh-proto.pages.dev`; thêm origin Pages thật rồi deploy lại). R2 tùy chọn (khối `r2_buckets` đang comment, binding chỉ có ở vitest). Xung đột sync: bỏ, lệnh tới máy chủ sau cùng thắng (`briefs/backend-10`).

## Lệnh tự kiểm và tài nguyên
- Trong `worker/`: `npm run typecheck`; `npm test` (vitest + @cloudflare/vitest-pool-workers, D1/R2 cục bộ); bundle: `npx wrangler deploy --dry-run --outdir /tmp/x` rồi `gzip -9c`.
- Staging (chỉ staging, không production): Worker `qlh-staging-api` https://qlh-staging-api.tolaphamnhuphong.workers.dev (route `/v1/*`, gói Workers Free), D1 `qlh-staging-db` id `ab89f59d-5f7e-4db2-aff0-cbb2932d0a6d`, cron `* * * * *`. Deploy: `npx wrangler deploy --env staging`; xem bản: `npx wrangler deployments list --env staging`. Secret `REGISTRATION_CODE` (sẽ bỏ) đặt qua stdin; bản local `worker/.dev.vars` gitignore. Không có R2, không FCM.
- Số đo CPU (Free, 21 mẫu/mức): PBKDF2 30k/60k/100k trung vị 9/14/26 ms; đăng nhập 100k trung vị 29, p95 50,8; `/me` trung vị 4, p95 14,8; RS256 import+sign 1–2 ms (không `generateKey` lúc chạy: tới 180 ms).
- Demo staging: giáo viên `+84900000001`, phụ huynh `+84900000002` (2 con), lớp 6A (8 học sinh, 19 buổi, điểm danh, 2 bài kiểm tra, BTVN, phiếu, 1 báo cáo phát hành). Id lớp và mật khẩu trong file `/tmp` nói trên.

## Cạm bẫy đã gặp
- Dùng python/curl không đặt `User-Agent` → Cloudflare `403 error 1010`.
- `register:ip` giới hạn 5/giờ chặn chạy lại script đăng ký.
- Nhiều worker cùng worktree: chia file sở hữu rõ, worker miền không commit, `typecheck` có thể đỏ tạm do file người khác.
- `GET /sessions/{id}/homework` trả `grades` của phần giao ở buổi trước; client ghép `section_id`.
- Giới hạn body 256 KiB đếm theo byte UTF-8, ngoại lệ PDF 5 MB.
- Ổ đĩa từng đầy (ENOSPC) làm shell và worker hỏng; kiểm `df -h /` khi worker kết thúc bất thường.
- wrangler: token có d1, pages, workers, kv; KHÔNG có R2.

## Kết quả worker `63182f2d` (ghi 2026-10-22, nguyên văn Status; chưa tự kiểm)
Status: DONE. Summary (nguyên văn rút gọn): sửa `version()` trong `worker/src/db/sync.ts` để lệnh đối tượng (`test.update`, `test.delete`, `homework.section.upsert` khi sửa, `homework.section.delete`) có `base_version` cũ vẫn `applied`, version tăng (chỉ `B > V` bị `rejected base_version_ahead`; `PATCH` REST ở `src/db/{classes,students}.ts` giữ `409 version_conflict`); test hồi quy đỏ→xanh cho `test.update` và `homework.section.upsert`; commit `7a108f9`; `typecheck` + `npm test` 23 file / 101 test xanh; staging version `caeccc9b-4a97-4eff-ae93-d8febb44738c`, smoke HTTPS `test.update` hai lệnh `base_version 1` ⇒ `applied` v2/v3, `base_version 9` ⇒ `base_version_ahead`, `max` hạ dưới điểm ⇒ `max_below_score` (SMOKE PASS).
Mục `api-spec.md` đã đổi: mục 1 (gạch đầu dòng PATCH ~20; bảng mã lỗi `409 version_conflict` ~39), mục 6 mở đầu (~243), 6.1 (ví dụ response ~251–266, bảng `status`, quy tắc 3–4 ~270–276, "Hệ quả cho client (B-02)", bảng so khớp `base_version` ~279–288, đoạn "Đối tượng" ~290 viết lại thành lệnh-tới-sau-thắng), 6.2 (`conflict.resolve`, ghi chú ~311), 6.3 (ví dụ `pull`), 6.4 (bảng thực thể), 6.5 (tiêu đề + gạch đầu dòng mở rộng sang mọi lệnh), 6.6 (`entities`).
Báo cáo: `backend/impl-b7-sync-lww-report.md`. HEAD mvp-backend = `7a108f9` theo báo cáo.
