# Stack, khung đo CPU và kế hoạch băm mật khẩu

Ngày: 2026-10-21 · Đi kèm: `data-model.md`, `api-spec.md`. Số liệu ở mục 3 là **đo thật** trên Cloudflare (tài khoản gói Free, wrangler 4.87.0, ngày 2026-10-21, khu vực D1 APAC); mọi chỗ không đo được đều nói rõ.

## 1. Stack

| Lớp | Chọn | Ghi chú |
|---|---|---|
| Runtime | Cloudflare Workers (module worker), TypeScript | gói Free: 10 ms CPU/request, 128 MB RAM |
| HTTP | Hono 4 (router, middleware tự viết cho xác thực/lỗi) | 14,7 KiB gzip cùng một route (mục 3.3). Không dùng thêm middleware nặng; không dùng logger mặc định (nó in đường dẫn có ID) |
| CSDL | D1 (SQLite), nhóm ghi bằng `env.DB.batch` | chỉ mục theo `data-model.md` mục 3 |
| Truy vấn | SQL viết tay trong `worker/src/db/*` qua `prepare().bind()` | lý do và số đo: `data-model.md` mục 6 |
| Schema, migration | Drizzle (`drizzle-orm/sqlite-core` + `drizzle-kit`) chỉ lúc thiết kế; trigger/chỉ mục từng phần viết tay trong migration tùy chỉnh | kiểu dòng lấy bằng `import type` ⇒ không vào bundle |
| Kiểm hợp lệ dữ liệu vào | hàm viết tay (kiểu `unknown` → kiểu hẹp) cho các body có hình dạng cố định | Zod 4 làm bundle phình 134 KiB gzip (mục 3.3) |
| Lưu file | Không có (không lưu PDF/R2, quyết định 2026-10-22) | |
| Push | FCM HTTP v1; iOS Firebase Messaging → APNs, web FCM web token; OAuth cache D1 | Firebase chỉ cho FCM, không Firestore |
| Việc định kỳ | Cron Trigger: sinh buổi, dọn `applied_commands`/`change_log`/`auth_throttle` | chia nhỏ để mỗi lần chạy ≤ 10 ms |
| Mật khẩu | PBKDF2-HMAC-SHA256 qua WebCrypto, mục 4 | |
| Phiên | Token ngẫu nhiên 32 byte, lưu SHA-256 trong `auth_sessions`; mỗi request 1 lần tra D1 | mục 4.5 |
| Kiểm thử | Vitest + `@cloudflare/vitest-pool-workers` (D1 thật trong Miniflare) cho test phân quyền/đồng bộ | **chưa kiểm chứng** trong repo này; nếu không dùng được thì chạy Vitest trên `wrangler dev --local` |
| Tên tài nguyên staging | Worker `qlh-staging-api`, D1 `qlh-staging-db`, Pages `qlh-staging-web` | tiền tố `qlh-staging-` để dọn dẹp an toàn; production chưa dựng |

## 2. Khung đo CPU

**Nguyên tắc:** chỉ tin số CPU do Cloudflare báo từ môi trường thật. `Date.now()` trong Worker không đo được CPU (đồng hồ chỉ nhảy khi có I/O; số `ms` của tôi trong thử nghiệm batch ở mục 3.2 là thời gian chờ I/O, không phải CPU). `wrangler dev` cục bộ không đại diện.

**Công cụ:**
1. `wrangler tail <worker> --format json`: mỗi request có `cpuTime`, `wallTime` (số nguyên ms, thô), `outcome` (`ok` \| `exceededCpu` …), `exceptions[].message`. Đây là nguồn đo của tôi.
2. Bảng điều khiển Workers → Metrics (CPU time p50/p99) và GraphQL Analytics, cho tải thật sau khi có người dùng.
3. Script `scripts/cpu-probe` (worker viết khi implement): với danh sách endpoint (token thử, dữ liệu giả), gọi mỗi endpoint 3 lần làm nóng + 30 lần đo tuần tự, đọc `cpuTime` từ `tail`, in p50/p95/max, thoát lỗi nếu p95 vượt ngân sách. Chạy sau mỗi lần deploy staging.

**Ngân sách mỗi endpoint (p95 CPU, cả xác thực + JSON + dựng câu SQL; chờ D1 không tính):**

| Nhóm | p95 mục tiêu |
|---|---|
| `GET /health`, `GET /me`, danh sách nhỏ (lớp, học sinh) | ≤ 3 ms |
| Ghi REST đơn (tạo lớp, thêm học sinh, hủy buổi) | ≤ 4 ms |
| `GET /sync/pull` (trang 200 dòng) | ≤ 6 ms |
| `POST /sync/push` (50 lệnh) | ≤ 8 ms |
| `report-preview`, `publish` | ≤ 8 ms |
| Một lần chạy cron (≤ 20 lớp) | ≤ 8 ms |
| `register`, `login`, `change-password` | = thời gian băm + ≤ 3 ms; theo dõi riêng (mục 4) |

Cổng phát hành staging: mọi nhóm trừ nhóm băm đạt p95; nhóm băm: 0 lỗi vượt CPU trong bài kiểm ở mục 4.4.

## 3. Số đo thật

Phương pháp: Worker thử nghiệm trên `*.workers.dev`, gọi bằng `curl` từ máy cá nhân, đọc `cpuTime` bằng `wrangler tail`. Số nguyên ms ⇒ độ phân giải thô; mẫu nhỏ (n ghi trong bảng). Các Worker và D1 thử nghiệm (`qlh-staging-bench`, `qlh-staging-bench-d1`, `qlh-staging-bench-db`) **đã xóa** sau khi đo.

### 3.1 Băm mật khẩu (PBKDF2, `deriveBits` 256 bit)

| Thuật toán, số vòng | n | CPU ms (từng mẫu) | Trung vị |
|---|---|---|---|
| SHA-256, 1.000 | 3 | 0, 0, 0 | 0 |
| SHA-256, 10.000 | 3 | 2, 4, 5 | 4 |
| SHA-256, 25.000 | 8 | 4, 4, 5, 7, 7, 8, 9, 12 | 7 |
| SHA-256, 50.000 | 11 | 8, 9, 9, 9, 11, 13, 15, 16, 22, 25, 28 | 13 |
| SHA-256, 75.000 | 8 | 16, 16, 20, 22, 26, 36, 37, 42 | 24 |
| **SHA-256, 100.000** | 11 | 18, 18, 24, 26, 28, 29, 30, 35, 36, 37, 45 | **29** |
| SHA-256, 210.000 / 600.000 | 6 | lỗi: `Pbkdf2 failed: iteration counts above 100000 are not supported` | — |
| SHA-1, 100.000 | 3 | 34, 40, 90 | 40 |
| SHA-512, 10.000 | 8 | 6, 7, 7, 9, 10, 10, 10, 10 | 9,5 |
| SHA-512, 25.000 | 8 | 16, 23, 24, 24, 24, 26, 27, 45 | 24 |
| SHA-512, 50.000 | 8 | 29, 31, 34, 34, 39, 39, 43, 47 | 36,5 |
| SHA-512, 100.000 | 8 | 68, 68, 75, 98, 99, 105, 150, 165 | 98,5 |

Kết luận: (1) **Cloudflare chặn PBKDF2 ở 100.000 vòng** ⇒ không đạt được mức OWASP 600.000 (SHA-256). (2) SHA-256 100.000 vòng ≈ 29 ms trung vị (tới 45), gấp 3–4 lần ngân sách 10 ms; SHA-512 chậm gấp 3–4 lần SHA-256 ở cùng số vòng nên không dùng trong giới hạn này. (3) Để nằm trong 10 ms cùng phần việc còn lại của request, số vòng SHA-256 phải ≲ 25.000 (trung vị 7, tối đa 12 trong 8 mẫu).

**Phát hiện cần ghi rõ:** trong 165 request thử được `tail` ghi nhận (kể cả các request 45–165 ms CPU), **không request nào bị cắt vì CPU** trên gói Free (chỉ các ca cố ý vượt 100.000 vòng lỗi vì giới hạn số vòng); tất cả request hợp lệ trả 200. Không kết luận được gói Free "cho phép vượt" lâu dài: tài liệu Cloudflare nói 10 ms, hành vi thực tế có thể đo theo thống kê/tải, và gói Free không cho đặt `limits.cpu_ms` để mô phỏng (lỗi API `100328`). Vì vậy kế hoạch ở mục 4 coi 10 ms là giới hạn thật và đặt cổng kiểm trước khi phát hành.

### 3.2 Các phép tính khác và D1

| Phép đo | n | CPU ms (từng mẫu) |
|---|---|---|
| Không làm gì / ký HMAC-SHA256 | 3 / 3 | 0 / 0 |
| ECDSA P-256 `sign` | 8 | 0, 0, 1, 1, 1, 1, 3, 3 |
| Đo lịch sử B1, đã loại khỏi stack: một tin Web Push (ECDH + HKDF + AES-GCM 400 byte + ECDSA, khóa cache) | 8 | 0, 0, 0, 0, 1, 1, 1, 2 |
| D1 đọc một dòng kiểu SQL thuần / kiểu Drizzle | 6 / 6 | 2, 3, 3, 5, 5, 10 / 3, 4, 4, 4, 10, 13 |
| `batch` 1 upsert điểm danh (kèm trigger lịch sử), SQL thuần / Drizzle | 6 / 6 | 1, 2, 2, 2, 3, 8 / 1, 1, 2, 2, 2, 4 |
| `batch` 20 upsert, SQL thuần / Drizzle | 6 / 6 | 1, 1, 1, 2, 2, 2 / 6, 7, 11, 11, 14, 22 |
| `batch` 50 upsert, SQL thuần / Drizzle | 6 / 6 | 1, 1, 1, 1, 2, 2 / 12, 14, 15, 15, 23, 29 |
| `batch` 100 upsert, SQL thuần | 6 | 1, 1, 1, 2, 2, 2 |

Ý nghĩa: (a) dựng câu bằng `prepare().bind()` rất rẻ, 100 câu trong một `batch` vẫn 1–2 ms CPU; thời gian chờ D1 cho 50–100 câu là khoảng 20–70 ms (chờ, không tính CPU). Con số "50–100 câu trong một `batch`" là **kịch bản đo chi phí dựng câu**, không phải ranh giới atomic của sản phẩm: khi chạy, mỗi lệnh đồng bộ là một `batch` riêng (B-02, `api-spec.md` 6.1), nên tổng CPU của 50 lô nhỏ **chưa đo**. (b) Trình dựng truy vấn của Drizzle tốn khoảng 0,3 ms mỗi câu, 50 câu = 12–29 ms, vượt ngân sách ⇒ không dùng ở đường nóng (quyết định ở `data-model.md` mục 6). (c) Số Web Push là phép đo lịch sử B1, không đại diện FCM/RS256 và không dùng làm ngân sách FCM. FCM chưa có số đo đầu cuối, xem mục 9.

### 3.3 Kích thước bundle (`wrangler deploy --dry-run`, gzip)

| Nội dung | Không nén | Gzip |
|---|---|---|
| Hono 4.13.13 + 2 route + D1 SQL thuần | 57,8 KiB | **14,7 KiB** |
| như trên + Drizzle ORM 0.45.4 (D1, trình dựng truy vấn) | 229,9 KiB | 47,5 KiB |
| Hono + Zod 4.6.7 (một schema) | 825,7 KiB | 133,9 KiB |

Ước lượng (không đo): bản chạy thật với Hono + mã tự viết cho ~45 endpoint + SQL ≈ 40–60 KiB gzip; giới hạn Worker free 3 MiB nén ⇒ dư rất xa. Khởi động của Worker thử nghiệm 2 ms (`Worker Startup Time`).

## 4. Kế hoạch băm mật khẩu

### 4.1 Quyết định đề xuất

- **Thuật toán:** PBKDF2-HMAC-SHA256, salt ngẫu nhiên 16 byte, đầu ra 32 byte, so sánh bằng `crypto.subtle.timingSafeEqual`.
- **Định dạng lưu:** `pbkdf2-sha256$<vòng>$<salt_b64url>$<hash_b64url>`. Mang tham số theo từng hash ⇒ đổi số vòng sau này không làm hỏng hash cũ, và **băm lại khi đăng nhập thành công** nếu số vòng lưu khác cấu hình hiện tại.
- **Số vòng:** biến môi trường `PBKDF2_ITERATIONS`, mặc định **30.000** (quyết định 2026-10-22: chỉ cần vừa gói Free, không nâng gói; thấp hơn nhiều so với OWASP 600.000 nên bù bằng giới hạn thử 5 lần/15 phút, mật khẩu tối thiểu 8 ký tự). Hash cũ 100.000 vòng vẫn đăng nhập được vì số vòng đọc từ chính chuỗi hash, và được băm lại ở số vòng hiện hành khi đăng nhập thành công. Số đo ở 4.2.
- **Chỗ băm:** `register` 1 lần · `login` 1 lần (SĐT lạ: băm chuỗi giả để cùng thời gian) · `change-password` 2 lần (kiểm cũ + băm mới) · phiên và mọi endpoint khác **không băm**.
- **Phiên:** token ngẫu nhiên + tra D1, không dùng token ký HMAC. Lý do: băm chỉ xảy ra lúc đăng nhập nên token ký không giảm băm; quyền và trạng thái membership phải kiểm lại mỗi request ("có hiệu lực ngay", spec mục 4) nên vẫn cần đọc D1; phiên có trong bảng thì đổi mật khẩu/đăng xuất/vô hiệu thu hồi được ngay.

### 4.2 Số đo đăng nhập trên staging (2026-10-22) và lựa chọn số vòng

Đo CPU cả request `POST /v1/auth/login` (`wrangler tail --format json`, trường `cpuTime`, ms nguyên, Workers Free, tài khoản demo; sau 1 lần đăng nhập làm nóng/băm lại; mỗi mẫu cách nhau 1 giây). Chênh lệch giữa các lần chạy lớn nên số đo là gần đúng.

| Vòng PBKDF2 | Mẫu | Trung vị (ms) | p95 (ms) | Lớn nhất |
|---|---|---|---|---|
| 1.000 (chỉ để tách phần không băm) | 25 | 3 | 22 | 28 |
| 15.000 | 25 / 40 | 8 / 9 | 22 / 20 | 24 / 23 |
| 20.000 | 25 | 10 | 22 | 24 |
| 30.000 | 26 / 40 | 8,5 / 9 | 16 / 17 | 23 / 26 |

Kết luận: trung vị đăng nhập ≈ 8–10 ms ở 15.000–30.000 vòng, gần ngân sách 10 ms; **p95 vượt 10 ms ở mọi mức kể cả 1.000 vòng** (p95 ≈ 22 ms), nên các đỉnh 15–28 ms không do băm gây ra (có thể là khởi động isolate/D1 và đo thô theo ms). Hạ số vòng không đưa p95 xuống dưới 10 ms; vì vậy giữ **30.000** (không kém hơn 15.000 về số đo). Không request nào bị cắt vì CPU (`outcome: ok` ở mọi mẫu, kể cả các mẫu 20–28 ms), đúng với quan sát cũ ở mục 3.1. Đây là điểm cần GL/người dùng biết: tiêu chí "p95 ≤ 10 ms" không đạt được bằng cách chỉnh số vòng.

### 4.3 Phương án dự phòng (theo thứ tự ưu tiên)

0. Quyết định 2026-10-22: không nâng gói trả phí; các dự phòng dưới đây chỉ để tham khảo nếu sau này Cloudflare bắt đầu cắt theo CPU.
1. **Nâng gói Workers Paid 5 USD/tháng**: giới hạn CPU 30 s mặc định (đặt `limits.cpu_ms` được); ưu tiên nhất khi chạm điều kiện ở 4.5.
2. **Giảm vòng** xuống 25.000–50.000 (trung vị 7–13 ms) kèm siết rate limit và mật khẩu tối thiểu 10 ký tự: chỉ khi chưa nâng gói được; băm lại lên 100.000 khi nâng gói (do định dạng lưu có tham số).
3. **Kéo dãn khóa phía máy khách (client-side stretching):** client chạy PBKDF2 nặng (ví dụ 600.000 vòng với CommonCrypto/WebCrypto) với salt lấy từ máy chủ, gửi khóa dẫn xuất; máy chủ chỉ băm lại một lần nhẹ (≈ 10.000). Chống lộ DB tốt hơn nhưng khóa dẫn xuất vẫn là "mật khẩu" với máy chủ, thêm một vòng gọi để lấy salt (và cách tránh lộ SĐT nào tồn tại), cố định thuật toán vào hợp đồng hai client. Không chọn mặc định.
4. Đã loại: scrypt/argon2 qua WASM (vượt CPU và tăng bundle), token ký HMAC (không giải quyết gì, mục 4.1).

### 4.4 Cổng đo trước khi implement đăng nhập (số liệu thật, không ước đoán)

Trước khi worker nối đăng nhập thật, làm trên **Worker staging tạm** (tên `qlh-staging-…`, xóa sau):

1. Deploy Worker với bốn endpoint băm giả, cấu hình `PBKDF2_ITERATIONS` đổi được.
2. `wrangler tail --format json`; gọi 200 lần tuần tự (1 request/giây) cho từng mức 25.000, 50.000, 100.000; thêm 20 đợt bắn 5 request đồng thời ở mức 100.000. Ghi `cpuTime`, `outcome`, `exceptions`.
3. Lặp lại vào hai khung giờ khác nhau (ví dụ giờ làm việc và đêm) vì thực thi có thể phụ thuộc tải.
4. Đếm lỗi vượt CPU (mã `1102`/`outcome: exceededCpu`). Báo kết quả cho controller trước khi implement.

Kết quả của bước này **chưa có**: lần đo ở mục 3.1 (mẫu nhỏ, một khung giờ) chưa đủ làm cổng; cần 4.4 đầy đủ.

### 4.5 Điều kiện nâng gói 5 USD/tháng

Nâng gói khi **bất kỳ** điều kiện nào xảy ra:
1. Có một request băm mật khẩu bị cắt vì CPU (lỗi `1102`) ở cổng 4.4 hoặc ≥ 0,5% request băm ở staging/production.
2. p95 CPU của một endpoint không phải băm vượt 10 ms sau khi đã tối ưu (mục 2).
3. Số request vượt 70.000/ngày bền vững (giới hạn 100.000/ngày; xem 7).
4. `rows_written` D1 vượt 70.000/ngày hoặc `rows_read` vượt 3,5 triệu/ngày.
5. Việc gửi push đồng loạt hoặc cron cần nhiều hơn một Worker invocation/10 ms mà không chia nhỏ được.
6. Quyết định chạy production cho người dùng thật khi chưa qua cổng 4.4.

## 5. Quy tắc ghi log và lỗi (thực thi ở Worker)

- Log JSON một dòng: `request_id`, `method`, `route` (mẫu, ví dụ `/students/:id`), `status`, `error_code`, `cpu_budget_flag`; không ghi body, query có SĐT, token, `Authorization`, ghi chú/nhận xét.
- Bắt mọi ngoại lệ ở middleware: trả `internal`, không lộ stack; lỗi D1 `SQLITE_CONSTRAINT` ánh xạ sang mã nghiệp vụ (`data-model.md` mục 2.1, 2.4, 2.5) thay vì trả nguyên văn.
- Thông báo lỗi D1 từ trigger chứa mã (`RAISE(ABORT,'score_above_max')`); tầng `db` đọc mã rồi trả `validation_error`.

## 6. Việc dễ vượt CPU khác

| Việc | Đánh giá | Cách xử lý |
|---|---|---|
| Đồng bộ đẩy 50 lệnh | dựng 100+ câu `prepare` ≈ 1–2 ms (đo, mục 3.2) | SQL thuần; **mỗi lệnh một `batch` riêng** (B-02, `api-spec.md` 6.1) ⇒ 50 lô nhỏ chứ không phải một lô lớn; số 1–2 ms là chi phí **dựng câu** đã đo, tổng 50 lô **chưa đo** — kiểm bằng `cpu-probe` |
| Gửi FCM đồng loạt (20 phụ huynh, nhiều token) | chưa đo; OAuth RS256/cache miss và xử lý nhiều response có thể vượt 10 ms | D1 deliveries + cron mỗi phút lô nhỏ, xem mục 9; không suy CPU từ phép đo Web Push cũ |
| Phát hành báo cáo | tổng hợp bằng 4–5 truy vấn tổng hợp SQL; Worker chỉ dựng JSON ≈ vài KB | đo bằng `cpu-probe`; PDF sinh ở máy giáo viên, Worker chỉ stream R2 |
| Cron sinh buổi | 20 lớp × ~16 dòng/lần | `INSERT OR IGNORE` trong `batch`; chia nhỏ ≤ 20 lớp/lần |
| Cron dọn dẹp | xóa theo khoảng `seq`/`applied_at` có chỉ mục; `change_log` theo `created_at` (chỉ mục `change_log_age`, B-03) | xóa theo lô nhỏ: `applied_commands`/`change_log` tối đa 500 dòng/lô, tối đa 4 lô mỗi lần chạy (2.000 dòng), phần còn lại để lần sau |

## 7. Hạn mức gói Free (ghi theo tài liệu Cloudflare, **chưa kiểm lại hôm nay**)

| Hạn mức | Giá trị | Mức dùng ước lượng |
|---|---|---|
| Request Worker | 100.000/ngày | mỗi người dùng mở app + đồng bộ ≈ 100–500 request/ngày (pull 120 giây/lần khi đang mở) ⇒ ~200–500 người dùng hoạt động |
| D1 hàng đọc | 5 triệu/ngày | thấp (truy vấn theo chỉ mục) |
| D1 hàng ghi | 100.000/ngày, tính cả chỉ mục | 20 lớp cùng dạy trong ngày ≈ 50.000 (`data-model.md` mục 7) ⇒ là hạn mức chạm trước |
| D1 dung lượng | 5 GB tổng | không đáng ngại |
| Subrequest mỗi request | 50 | `batch` 100 câu chạy được ở gói Free (đo, mục 3.2) và tính một lần gọi D1 |
| Bundle | 3 MiB nén | dư rất xa |

## 8. Chưa kiểm chứng

- Hành vi thực thi giới hạn 10 ms của gói Free theo tải/giờ (mục 3.1).
- Cổng đo 4.4 chưa chạy.
- `@cloudflare/vitest-pool-workers`, binding rate limiting; Queues Free đã có theo tài liệu hiện tại, chưa thử trong tài khoản này.
- Số liệu hạn mức ở mục 7.
- CPU thực của từng endpoint nghiệp vụ (chưa có mã); các số ở mục 2 là ngân sách chứ chưa phải kết quả.

## 9. FCM HTTP v1 (B2, 2026-10-21)

### OAuth và cache

1. `FCM_SERVICE_ACCOUNT_JSON` là Worker secret (JSON có client_email, private_key_id, private_key), `FCM_PROJECT_ID` là biến cấu hình. Không commit/in log secret; không đưa JSON service account vào iOS/web. Dùng WebCrypto import PKCS8 với `RSASSA-PKCS1-v1_5` + SHA-256; JWT header `alg=RS256, typ=JWT, kid`, claims `iss=client_email`, `scope=https://www.googleapis.com/auth/firebase.messaging`, `aud=https://oauth2.googleapis.com/token`, `iat=server_now`, `exp=iat+3600`. POST form `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` + `assertion` tới OAuth, lấy `access_token`/`expires_in`; JWT không dùng trực tiếp thay OAuth token gửi FCM.
2. Chọn **D1** thay KV: đang có binding D1, có cập nhật có điều kiện/lease để chia sẻ cache giữa isolate. Bảng `fcm_oauth_cache` chỉ nội bộ. Cache `refresh_at = min(now+50 phút, expires_at-5 phút)` theo `expires_in` thực, khóa bởi project + credential_key_id; không mặc định token luôn sống đúng một giờ. Xoay key làm cache không hợp lệ; không sync hoặc backup token vào artifact công khai.
3. Claim lease bằng một `UPDATE ... WHERE lease_until IS NULL OR lease_until < :now RETURNING ...` (có ngoặc khi kết hợp điều kiện khác), TTL 60 giây; insert hàng rỗng trước bằng `INSERT OR IGNORE`. Một isolate refresh, isolate khác còn token hợp lệ thì dùng; không có token thì để delivery pending cho lần cron sau, không spin/sleep. Ghi cache chỉ khi lease_id vẫn thuộc mình; lỗi xoá lease của mình, token quá hạn không được dùng. Lease hết có thể refresh trùng; chấp nhận cấp hai token, chỉ chủ lease ghi cache. Không in access token/JWT/raw response OAuth.
4. In-memory cache CryptoKey là tối ưu thêm, không thay cache chung. Khi FCM trả 401, vô hiệu cache đúng key/version và làm mới một lần; lỗi vẫn còn thì hoãn delivery, không vòng lặp vô hạn. 403 cấu hình sai không xoá device token.

Nguồn kiểm tra: [Google OAuth service account](https://developers.google.com/identity/protocols/oauth2/service-account), [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api). Private key chỉ ở secret; access token trong D1 vẫn là credential nhạy cảm, chỉ luồng gửi được đọc.

### Gửi lô và hạn mức

Chọn inbox + deliveries trong D1, cron `* * * * *` (một trigger riêng hoặc gộp lịch hiện có). Mỗi invocation claim tối đa **5 deliveries**, tối đa 2 kết nối FCM đồng thời. Tính thêm D1 đọc/cache/claim/ghi kết quả, OAuth cache miss và retry 401; giữ tổng dưới 50 subrequest, giới hạn CPU p95 dưới 8 ms để chừa dư. Các giá trị 5/2 là ngân sách đề xuất, **chưa đo**; giảm lô hoặc nâng gói nếu không đạt. Hàng chưa tới lượt nằm D1, không tự gọi Worker nối chuỗi.

**Mở rộng inbox có trần cứng (sửa R-02, siết ở r3):** mỗi invocation xét tối đa **5 inbox** và tổng **20 đăng ký thiết bị**. Trang đăng ký lấy **toàn bộ** theo `workspace_id + membership_id + id > cursor` (`ORDER BY id LIMIT :còn_lại`, chỉ mục `device_tokens_member`), rồi mới lọc điều kiện trong projection — predicate điều kiện không nằm trong `WHERE` trước `LIMIT`, nên đăng ký bị skip vẫn chiếm ngân sách và cursor vẫn đi qua chúng; trang đầy nhưng 0 delivery vẫn chưa xong. `delivery_cursor` lưu ở D1. Freeze bằng CAS `event_version` + `ready_at <= now` (0 dòng ⇒ bỏ qua), reclaim chỉ cho dòng đã freeze và giữ nguyên `expansion_started_at`; delivery/cursor/complete đều `WHERE expansion_lease_id = :lease` trong cùng batch. 5/20 là ngân sách đề xuất, **chưa đo** cùng các giá trị trên; vượt thì giảm lô hoặc nâng gói, không thêm queue ở MVP.

`ctx.waitUntil` dùng được để xử lý một ít việc sau response nhưng vẫn cùng CPU/subrequest, tối đa 30 giây sau response; không làm bộ bảo đảm gửi. Nếu crash, D1 giữ pending/lease để cron retry. D1 deliveries retry theo mục 2.7 mô hình dữ liệu. Free 10 ms CPU cho cả cron, 50 subrequest và 6 kết nối đồng thời; Workers Paid mặc định 30 giây CPU, cấu hình tối đa 5 phút, không tự nâng gói.

Cloudflare Queues là phương án mở rộng, **không bắt buộc trả phí để dùng** theo bảng giá kiểm ngày 2026-10-21: Free có 10.000 operations/ngày, retention 24 giờ; Paid có retention dài hơn/hạn mức khác. Không thêm Queues ở MVP đề xuất này vì D1 đã giữ việc gửi và cron đơn giản hơn. Khi cần throughput/độ trễ tốt hơn hoặc vượt CPU/hạn mức, báo người dùng chọn nâng gói hoặc Queues sau đo, không tự bật chi phí.

Nguồn: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/). Giới hạn ở mục này đã tra lại; các con số khác của B1 giữ nhãn chưa kiểm.

### RS256: chưa đo được, cleanup đã xác minh

- Phiên trước đã tạo `qlh-staging-rs256` và `/tmp/qlh-rs/index.js`, route `genkey` sinh RSA 2048 dùng thử bằng WebCrypto trong Worker, không dùng service account thật. Lịch sử phiên trước báo lỗi 1042; không có mẫu CPU được bàn giao.
- Tiếp quản: `wrangler whoami` thành công. Gọi `GET /genkey` bằng Python urllib nhận **HTTP 403**, không lấy được khoá thử/không thu được CPU. Không lấy số local hoặc wall time làm CPU Cloudflare; chưa gọi FCM thật và chưa có credential Firebase.
- `wrangler delete --name qlh-staging-rs256 --force`: exit 0, `Successfully deleted qlh-staging-rs256`.
- `wrangler deployments list --name qlh-staging-rs256`: exit 1, Cloudflare code **10007**, `This Worker does not exist on your account`. Đây là xác minh sau xoá; không có Worker thử nghiệm này còn chạy.
- **Không có trung vị/khoảng RS256 để báo.** Tôi không thể xác minh điều này hoạt động vì chưa đo được import/sign trên Worker và chưa có cấu hình Firebase để gửi đầu cuối.
- Lần đo tiếp theo cần môi trường gọi được workers.dev: một khoá thử RSA 2048 sinh trong Worker, giữ nội bộ (không trả private key), 3 lần warm + 30 mẫu mỗi route import/sign (cả cold import và cached key)/parse JSON, ghi cpuTime từ tail với mã route, không log JWT/token/khoá. Tách CPU generateKey khỏi import/sign, báo p50/p95/min/max và outcome; xoá Worker tạm và kiểm lại sau thử. Không tạo lại Worker chỉ để chờ mạng.

### Cổng kiểm FCM trước phát hành

Sau checklist Firebase: gửi thử iOS/web trên máy thật, thu hồi token, hai thiết bị một phụ huynh, chuyển user/role, thu hồi liên kết con trước gửi, OAuth cache hit/miss và nhiều isolate; không có nhận xét/điểm/sao trong payload/log. Đo lô 1/5/20 và nhiều token/phụ huynh, retry 429/5xx và crash sau gửi. Chưa qua các kiểm này, chưa gọi sender là hoạt động.
