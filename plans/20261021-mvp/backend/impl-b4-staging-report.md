# B-4: staging Cloudflare + đo CPU thật

Ngày: 2026-10-21 · Worktree `mvp-backend` (nhánh `mvp-backend`, HEAD `1f5fbf4`) · Mọi tài nguyên chỉ tiền tố `qlh-staging-`, không đụng production.

## 1. Tài nguyên đã tạo

| Loại | Tên | Chi tiết |
|---|---|---|
| D1 | `qlh-staging-db` | `database_id` = `ab89f59d-5f7e-4db2-aff0-cbb2932d0a6d`, region **APAC**; đã ghi vào `worker/wrangler.jsonc` (`env.staging`) |
| Worker | `qlh-staging-api` | https://qlh-staging-api.tolaphamnhuphong.workers.dev · version hiện tại `1e20f5a4-ef0d-4142-ac1f-c276eb0296f1` · workers.dev + Preview URLs bật mặc định · cron `* * * * *` |
| Secret | `REGISTRATION_CODE` | đặt bằng `wrangler secret put` qua stdin, giá trị sinh ngẫu nhiên 32 hex, **không in ra**; bản cục bộ ở `worker/.dev.vars` (đã gitignore) |
| R2 | — | **không tạo** (token không có quyền, người dùng chưa bật) ⇒ PDF báo cáo trả `503 pdf_storage_unavailable` là đúng |
| FCM | — | **bỏ qua** (chưa có service account) |

Gói Workers: **Free**. Xác định bằng cách deploy thử `limits.cpu_ms = 10000`: Cloudflare từ chối, lỗi `100328 "CPU limits are not supported for the Free plan"`. Gọi API `GET /accounts/{id}/subscriptions` bằng OAuth token hiện có trả `403 code 10000` nên không đọc được gói qua API; kết luận Free dựa trên lỗi `100328` ở trên. Tài khoản chưa có tài nguyên nào trước đó (`wrangler d1 list --json` = `[]`, `qlh-staging-api` không tồn tại: `10007`).

Wrangler thực tế: **4.151.3** (tài liệu B1 ghi 4.87.0).

## 2. Lệnh và kết quả

```sh
# 1. D1 + migrations từ xa
npx wrangler d1 create qlh-staging-db
#   ✅ created in region APAC, id ab89f59d-…

npx wrangler d1 migrations apply DB --remote --env staging
#   0001_schema.sql ✅ (59 câu, 14.59 ms) · 0002_triggers.sql ✅ (65 câu, 10.55 ms)
#   kiểm lại: "✅ No migrations to apply!"

# 2. Secret (giá trị lấy từ worker/.dev.vars, không in)
printf '%s' "$REGISTRATION_CODE" | npx wrangler secret put REGISTRATION_CODE --env staging
#   ✨ Success! Uploaded secret REGISTRATION_CODE  (tạo Worker rỗng trước lần deploy đầu)
npx wrangler secret list --env staging     # [{"name":"REGISTRATION_CODE","type":"secret_text"}]

# 3. Deploy staging
npx wrangler deploy --env staging
#   Total Upload 242.74 KiB / gzip 54.61 KiB · Worker Startup Time 3 ms
#   bindings: DB=qlh-staging-db, ENVIRONMENT=staging, PBKDF2_ITERATIONS=100000
#   Deployed triggers (schedule * * * * *)

# 4. Kiểm sau khi gỡ route đo
curl -o /dev/null -w '%{http_code}' .../__probe/pbkdf2   # 404
npm run typecheck                                        # PASS
npx vitest run                                           # 20 files / 82 tests PASS

# 5. Thử xác định gói (không commit)
#   thêm "limits": { "cpu_ms": 10000 } rồi `wrangler deploy --env staging`
#   → ERROR code 100328 "CPU limits are not supported for the Free plan"
```

Sau bước 5, cấu hình được khôi phục nguyên trạng (chỉ còn đúng một thay đổi `database_id`).

## 3. Smoke test thật qua HTTPS

Script Python (ngoài repo, `/tmp`) gọi tuần tự; SĐT giả `+8490000010x`, mật khẩu và token không in ra. Payload điểm danh đi đúng đường sản phẩm `POST /v1/sync/push` (`attendance.set`), không phải route thử.

| Bước | Kết quả |
|---|---|
| `GET /v1/health` | `200 {"status":"ok","version":"staging"}` |
| `POST /v1/auth/register` (kèm `registration_code`) | `201`, trả token + membership Admin, `must_change_password:false` |
| `POST /v1/auth/login` | `200`, `active_membership_id` điền sẵn (1 membership) |
| `GET /v1/me` | `200`, `permissions.classes:"write"`, `scope_epoch:1` |
| `POST /v1/classes` (`weekdays:[3]`, `18:00`) | `201`, sinh buổi lặp 8 tuần có buổi hôm nay |
| `POST /v1/classes/{id}/students` | `201`, `enrolled_at:2026-10-21` |
| `GET /v1/classes/{id}/sessions?from=&to=hôm nay` | `200`, 1 buổi `planned` |
| `POST /v1/sync/push` (1 lệnh `attendance.set`) | `200`, `{"status":"applied","version":1}` |
| `GET /v1/sessions/{id}/attendance` | `200`, 1 dòng `present`, `version:1` (buổi chuyển `held`) |
| `GET /v1/me` (lại) | `200` |

Chạy lặp lần 2 sau khi deploy bản cuối: `register` trả `409 conflict` (`phone_registered`, đúng hợp đồng), các bước còn lại `200`. Tổng: đăng ký → đăng nhập → tạo lớp → thêm học sinh → điểm danh → `/me` đều chạy trên staging thật.

**Lỗi môi trường gặp khi đo (đã che, không phải lỗi ứng dụng):** `POST` bằng `python3 urllib` mặc định bị Cloudflare chặn ở biên với `403 error code: 1010` (không vào tới Worker); thêm header `User-Agent` là qua bình thường. `GET` không bị. Đáng ghi để script `cpu-probe` sau này luôn đặt UA.

## 4. Đo CPU thật (`wrangler tail --format json`, trường `cpuTime`, đơn vị ms nguyên)

Thiết bị: máy cá nhân, colo **SIN**, HTTP/2, gọi tuần tự (1 request tại một thời điểm). Route đo tạm `GET /__probe/pbkdf2?iterations=` (importKey + `deriveBits` 256 bit, salt 16 byte) và `GET /__probe/rs256?mode=import|sign` (khoá RSA 2048 sinh trong Worker bằng WebCrypto, không dùng khoá thật, không trả private key). Đã gỡ file `src/probe.ts` + mount trong `src/index.ts`, deploy lại, xác minh `404`. Tail chỉ đọc `cpuTime`/`outcome`; không log body/token/SĐT.

Mỗi mức gồm 3 lần làm nóng + 21 mẫu đo (n trong bảng là tổng số record tail bắt được, kể cả làm nóng).

| Phép đo | n | min | trung vị | p95 | max | Toàn bộ mẫu (ms) |
|---|---|---|---|---|---|---|
| PBKDF2-SHA256 30.000 vòng | 24 | 4 | **9** | 13 | 16 | 4,5,5,6,7,8,8,8,9,9,9,9,9,9,10,10,10,10,10,11,11,13,13,16 |
| PBKDF2-SHA256 60.000 vòng | 24 | 8 | **14** | 22.8 | 24 | 8,9,9,9,10,10,12,13,13,14,14,14,14,15,16,16,18,18,19,21,21,22,23,24 |
| PBKDF2-SHA256 100.000 vòng | 23 | 14 | **26** | 33.9 | 56 | 14,17,17,19,19,20,20,21,22,24,26,26,27,27,28,28,30,31,32,32,33,34,56 |
| RS256: `importKey(pkcs8)` + `sign` mỗi request | 24 | 1 | **1** | 2 | 2 | 1×18, 2×6 |
| RS256: `sign` bằng CryptoKey cache trong isolate | 24 | 0 | **1** | 136.6 | 180 | 0,1×14,2×3,27,63,72,148,180 |
| **`POST /v1/auth/login` thật** (PBKDF2 100.000 + D1 + JSON) | 25 | 16 | **29** | 50.8 | 60 | 16,17,17,18,20,23,23,25,25,29,29,29,29,30,31,31,33,35,35,36,37,38,42,53,60 |
| `GET /v1/me` thật | 26 | 2 | **4** | 14.8 | 17 | 2×4,3×4,4×7,5×6,6,7,11,16,17 |
| 1 lần cron (`session_generation` + `notification_dispatch`) | 1 | — | 3 | — | 3 | 3 |

**Outcome:** toàn bộ 170 record là `ok`, **0** `exceededCpu`, **0** exception — kể cả request 56 ms (PBKDF2 100.000) và 180 ms (sinh khoá RSA) trên gói Free. Lặp lại đúng kết quả B1 (mục 3.1): không quan sát được việc Cloudflare cắt request vì CPU ở gói Free, nhưng không kết luận là được phép vượt.

**Đọc số:**
- PBKDF2 100.000 vòng ≈ **26 ms** CPU riêng phần băm (login thật 29 ms trung vị, chênh ~3 ms cho D1/JSON/route — khớp ngân sách "băm + ≤ 3 ms").
- 30.000 vòng (9 ms) và 60.000 vòng (14 ms) cho thấy chi phí gần tuyến tính theo số vòng, không có "bậc" bất thường.
- **RS256 không phải vấn đề CPU**: import khoá PKCS8 + ký chỉ 1–2 ms. Nhưng **sinh khoá RSA 2048 thì rất đắt (27–180 ms)** và lặp lại mỗi khi isolate mới (cache CryptoKey ở phạm vi module không sống lâu). Vì vậy luồng FCM phải `importKey` từ secret mỗi lần (hoặc cache có kiểm soát), **không được `generateKey` lúc chạy** — đúng thiết kế ở `stack-and-cpu.md` mục 9.
- `/me` trung vị 4 ms, p95 ~15 ms trong 26 mẫu: **vượt ngân sách p95 ≤ 3 ms** ở `stack-and-cpu.md` mục 2. Chưa tối ưu; cần đo lại với mẫu lớn hơn trước khi coi là vi phạm cổng phát hành.

## 5. Vấn đề

1. **Gói Free, không đặt được giới hạn CPU** (`100328`), nên không thể mô phỏng ngưỡng 10 ms; mọi kết luận "không bị cắt" chỉ là quan sát, không phải bảo đảm. Điều kiện nâng gói ở `stack-and-cpu.md` 4.5 vẫn áp dụng.
2. **PBKDF2 100.000 vượt 10 ms danh nghĩa 2,6–6 lần** (login p95 51 ms). Staging chạy được, nhưng quyết định Q8 (giữ 100.000 + theo dõi, nâng gói 5 USD, hay giảm vòng) vẫn chưa chốt.
3. **`/me` p95 14,8 ms > ngân sách 3 ms** (n=26, một khung giờ, máy cá nhân). Cần đo lại và có thể tối ưu số truy vấn xác thực trước khi coi cổng phát hành đạt.
4. **Sinh khoá RSA trong Worker rất đắt và không ổn định theo isolate**; nếu ai đó "tối ưu" bằng cách sinh khoá lúc chạy thay vì import secret, FCM cron sẽ vượt CPU ngay. Ghi lại để review sau này bắt được.
5. **`403 error code: 1010`** ở biên Cloudflare với `POST` từ `python3 urllib` không có `User-Agent`: script đo/smoke phải đặt UA, nếu không sẽ tưởng nhầm là lỗi xác thực.
6. **Cấu hình top-level vẫn `REPLACE_AT_DEPLOY`** (chỉ dùng local/test) và trùng tên Worker với `env.staging`; deploy không có `--env staging` sẽ hỏng. README đã ghi rõ, nhưng nên tách tên hoặc bỏ khối top-level khi có production.
7. **Chưa kiểm PDF/FCM trên staging**: R2 chưa bật nên `pdf_storage_unavailable` là đúng; chưa có secret FCM nên `notification_dispatch` chỉ chạy phần D1 (cron 3 ms, outcome `ok`).
8. Wrangler thực tế 4.151.3 khác số trong tài liệu B1 (4.87.0); output/format `tail` có thể khác khi đối chiếu sau.

## 6. Câu hỏi

1. **Q8 (băm mật khẩu/gói)**: với login trung vị 29 ms, p95 51 ms, max 60 ms, 0 lần bị cắt trên staging Free — chọn (a) giữ 100.000 vòng và theo dõi, (b) nâng Workers Paid 5 USD/tháng ngay trước khi có người dùng thật, hay (c) hạ vòng? Đề xuất của tôi: (a) cho staging, nhưng phải quyết (b) trước production, vì "không bị cắt" chưa được bảo đảm bằng tài liệu.
2. **Ngân sách `/me`**: giữ p95 ≤ 3 ms (và tối ưu), hay nới ngân sách vì đo thật 4 ms trung vị? Cần chốt để cổng phát hành không báo sai.
3. **Có cần đo lặp ở khung giờ khác** (như `stack-and-cpu.md` 4.4 bước 3) trước khi đóng cổng CPU, hay chấp nhận một khung giờ cho B-4?
4. **Ai giữ `REGISTRATION_CODE` staging** khi bàn giao (chỉ có trong `.dev.vars` máy này và secret trên Cloudflare)? Có cần xoay mã định kỳ hoặc cấp riêng cho từng người thử không?

## 7. Kiểm chứng

- `npm run typecheck`: PASS · `npx vitest run`: 20 file / **82/82** PASS (sau khi gỡ route đo).
- Probe đã gỡ khỏi mã nguồn và khỏi bản deploy: `GET /__probe/pbkdf2` → `404`. Cấu hình staging + README đã commit trên `mvp-backend` tại `aad4f52` (`chore(worker): record staging D1 id and document staging deploy`), chưa push/merge; cây làm việc sạch.
- `wrangler d1 migrations list --remote --env staging`: "No migrations to apply!"; `wrangler secret list --env staging`: có `REGISTRATION_CODE`.
- Smoke test chạy 2 lần trên bản deploy cuối, tất cả bước đạt như bảng mục 3.
- Không in secret/token/mật khẩu/SĐT thật ở bất kỳ lệnh, log hay báo cáo nào; SĐT smoke là số giả `+8490000010x`.
