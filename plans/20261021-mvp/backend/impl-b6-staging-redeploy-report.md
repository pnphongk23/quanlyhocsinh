# B-6: deploy lại staging từ HEAD, smoke + CORS, dữ liệu DEMO

Ngày: 2026-10-21 · Worktree `mvp-backend` (nhánh `mvp-backend`, HEAD `77c8cb0`) · Chỉ staging (`qlh-staging-api`, D1 `qlh-staging-db`); không production, không R2, không sửa `src/`.

## 1. Version và cấu hình

| Mục | Trước | Sau |
|---|---|---|
| Worker version | `1e20f5a4-ef0d-4142-ac1f-c276eb0296f1` | **`90584f55-a138-4315-b24d-1f448b6cab3b`** (deploy `2026-10-21T05:01:29Z`) |
| Migration từ xa | — | không có gì mới (`✅ No migrations to apply!`) |
| `ALLOWED_ORIGINS` (env.staging, var) | rỗng (chặn mọi origin khác miền) | `http://localhost:5173,http://localhost:4173,http://localhost:3000,https://quanlyhocsinh-proto.pages.dev` |
| `REGISTRATION_CODE` | secret, không đổi | không đổi (không đọc ra ngoài `.dev.vars`) |

Origin Pages: `wrangler pages project list` chỉ có **một** project, `quanlyhocsinh-proto` (`https://quanlyhocsinh-proto.pages.dev`) — tức Pages của **prototype**, chưa có project Pages riêng cho mảng Web. Vì vậy allow list dùng origin đó cộng ba cổng localhost (`5173` dev Vite, `4173` preview Vite, `3000` dự phòng), đúng yêu cầu brief "chưa có thì chỉ localhost" nhưng vẫn cho prototype gọi API khi demo.

## 2. Lệnh và kết quả (đã che)

```sh
npx wrangler --version                       # 4.151.3
npx wrangler whoami                          # đã đăng nhập (cảnh báo thiếu scope k2/agent-memory/challenge-widgets, không ảnh hưởng)
npx wrangler deployments list --env staging  # bản đang chạy trước khi làm: 1e20f5a4-…
npx wrangler d1 migrations list DB --remote --env staging   # ✅ No migrations to apply!
npx wrangler pages project list              # 1 project: quanlyhocsinh-proto
# sửa worker/wrangler.jsonc (chỉ env.staging.vars.ALLOWED_ORIGINS)
npx wrangler deploy --env staging
#   Total Upload 244.84 KiB / gzip 55.33 KiB · Startup Time 3 ms
#   bindings: DB=qlh-staging-db, ENVIRONMENT=staging, PBKDF2_ITERATIONS=100000,
#             ALLOWED_ORIGINS="http://localhost:5173,http://localhos..."
#   Current Version ID: 90584f55-a138-4315-b24d-1f448b6cab3b
```

Kiểm chứng cục bộ sau khi đổi cấu hình: `npm run typecheck` PASS · `npx vitest run` **23 file / 99 test PASS**. Cây làm việc chỉ có `worker/wrangler.jsonc` thay đổi.

## 3. Smoke HTTPS thật trên bản `90584f55`

Script Python ở `/tmp` (ngoài repo), mọi request đặt `User-Agent`; chỉ in mã trạng thái và số đếm.

| Bước | Kết quả |
|---|---|
| `GET /v1/health` | `200 {"status":"ok","version":"staging"}` |
| `OPTIONS /v1/auth/login` + `Origin` hợp lệ | `204`, `Access-Control-Allow-Origin` = đúng origin, có `Allow-Methods`/`Allow-Headers` (gồm `Authorization`) / `Max-Age: 600`, `Vary: Origin` |
| `OPTIONS /v1/auth/login` + origin lạ | `204`, **không** có `Access-Control-Allow-Origin`, không có `Allow-Methods` ⇒ trình duyệt chặn |
| `POST /v1/auth/register` (có `registration_code`) | `201`, membership Admin, `must_change_password:false` |
| `POST /v1/auth/login` → `GET /v1/me` | `200`, `permissions.classes:"write"`, `scope_epoch:1` |
| `POST /v1/classes` (`weekdays:[3]`, `18:00`) | `201` |
| `POST /v1/classes/{id}/students` | `201` |
| `GET /v1/classes/{id}/sessions?from=to=hôm nay` | `200`, 1 buổi `planned` |
| `POST /v1/sync/push` (`attendance.set`, `late` + `late_at`) | `200`, `applied`, `version:1` |
| `GET /v1/sessions/{id}/attendance` | `200`, 1 dòng `late` (đúng dữ liệu vừa ghi), buổi chuyển `held` |
| `GET /v1/me` (lại) | `200` |

Kiểm CORS bổ sung trên cùng bản deploy (preflight `OPTIONS /v1/auth/login`):

| `Origin` gửi lên | Mã | `Access-Control-Allow-Origin` |
|---|---|---|
| `http://localhost:5173` | 204 | phản chiếu đúng |
| `http://localhost:4173` | 204 | phản chiếu đúng |
| `http://localhost:3000` | 204 | phản chiếu đúng |
| `https://quanlyhocsinh-proto.pages.dev` | 204 | phản chiếu đúng |
| `http://localhost:9999` | 204 | không có |
| `https://evil.example` | 204 | không có |
| `http://localhost:5173/` (có `/` cuối) | 204 | không có (trình duyệt không bao giờ gửi `/` cuối trong `Origin`, nên không phải lỗi) |

`GET /v1/me` không token từ origin Pages trả `401` **kèm** `Access-Control-Allow-Origin`, nên web đọc được `error.code` khi lỗi.

### Ca đa vai trò (một SĐT vừa giáo viên vừa phụ huynh)

SĐT `+84900000193` được tạo bằng `POST /students/{id}/guardian-credentials` (mật khẩu tạm, `must_change_password:true`) → đăng nhập bằng mật khẩu tạm → `POST /auth/change-password` `200` → đăng nhập lại → `POST /workspaces` `201` (thành Admin của workspace thứ hai). Sau đó:

| Bước | Kết quả |
|---|---|
| `POST /auth/login` | `200`, **2** membership, `active_membership_id: null` (đúng hợp đồng) |
| `GET /me` (chưa chọn vai trò) | `200`, liệt kê đủ 2 membership + `permissions` từng vai trò |
| `PUT /session/membership` → Phụ huynh, rồi `GET /me` | `200`, `active_membership_id` đổi đúng |
| `PUT /session/membership` → Giáo viên, rồi `GET /me` | `200`, `active_membership_id` đổi đúng |

## 4. Workspace DEMO (dữ liệu giả, ghi qua API thật)

Toàn bộ ghi offline-được đi qua `POST /sync/push`; lớp/học sinh/buổi lẻ/hủy buổi/báo cáo đi qua route thật tương ứng.

| Hạng mục | Số liệu đã đọc lại |
|---|---|
| Lớp | 1 — tên `6A`, lịch thứ Ba + thứ Năm `18:00` |
| Học sinh | 8 (2 em là con của tài khoản phụ huynh demo, 6 em SĐT phụ huynh giả khác) |
| Buổi | 19 tổng: **2 `held`** (một buổi đã diễn ra 14/10 + buổi chấm BTVN 16/10), **1 `cancelled`**, 16 `planned`; thêm **1 buổi lẻ** (`is_makeup:true`, 24/10) |
| Điểm danh buổi 14/10 | 8 dòng, đủ 4 trạng thái: 4 `present` · 2 `late` · 1 `excused` · 1 `absent` |
| Bài kiểm tra | 2 — `max 15` và `max 100`, mỗi bài 8 điểm (điểm trong khoảng, có số lẻ) |
| BTVN | 2 phần (`vocabulary`, `reading`) ở buổi 14/10; 9 dòng chấm đủ **3 mức** `excellent`/`done`/`not_done` |
| Phiếu nhận xét | Gửi cho **2 con** ở buổi 16/10 (`stars` 3 và 2, nhận xét giả ngắn); gửi thêm 2 phiếu ở buổi 14/10 để inbox phụ huynh có dữ liệu |
| Báo cáo tháng | `2026-10` đã phát hành cho **1 con** (`publication_no: 1`, `status: published`, `needs_republish: 0`); con còn lại chưa có báo cáo |
| Inbox phụ huynh | 4 dòng, 3 loại: `slip_sent`, `report_published`, `score_updated` |

Xác minh bằng cách đăng nhập từng tài khoản rồi đọc lại (chỉ đếm):
- Giáo viên: `/classes` 1 · `/classes/{id}/students` 8 · `/classes/{id}/sessions` (01/10–31/12) 19 · `/sessions/{S1}/attendance` 8 · `/classes/{id}/tests` 2 · `/tests/{T1}/scores` 8 · `/sessions/{S2}/homework` 9 grade · `/sessions/{S2}/slips` 2 (đều `sent`) · `/classes/{id}/reports?month=2026-10` 1 `published`.
- Phụ huynh (`+84900000002`, đã đổi mật khẩu lần đầu theo spec): `/me` 1 membership role `guardian` · `/classes` 1 · `/sync/snapshot/student` 2 con · `/classes/{id}/sessions` 19 · `/sessions/{S2}/slips` 2 · `/sessions/{S2}/homework` 3 grade (lộ ra đúng, của 2 con) · `/sessions/{S1}/homework` 2 phần nội dung · `/students/{con A}/reports` 1 · `/students/{con B}/reports` 0 · `/reports/{id}/publications/1` đọc được · `/notifications` 4 · `/sync/snapshot` + `/sync/pull` `200`, `pull_upserts` rỗng (không có thay đổi sau mốc snapshot).

Thông tin đăng nhập demo (SĐT, mật khẩu, URL, `class_id`, id các buổi/bài/báo cáo) ghi ở `/tmp/qlh-staging-demo.txt` (`chmod 600`), không nằm trong repo, không in ra chat/log/báo cáo. Nơi khác không lưu mật khẩu.

## 5. Vấn đề

1. **Chưa có project Pages của mảng Web** — chỉ có Pages của prototype (`quanlyhocsinh-proto`). Allow list hiện dùng origin đó; khi tạo Pages staging cho web (`https://<tên>.pages.dev`) phải thêm origin mới vào `env.staging.vars.ALLOWED_ORIGINS` và deploy lại, nếu không web sẽ bị CORS chặn (triệu chứng: response không có `Access-Control-Allow-Origin`).
2. **`register:ip` 5 lần/giờ chặn đúng thiết kế**: chạy lại script smoke/demo nhiều lần trong một giờ làm `POST /auth/register` trả `429 rate_limited` (`retry_after` ~58 phút). Không phải lỗi ứng dụng; script đã đổi sang "có mật khẩu lưu cục bộ thì đăng nhập trước, chỉ đăng ký khi chưa có". Ai chạy lại demo ngay sau đây sẽ không đăng ký được tài khoản mới trong ~1 giờ từ cùng IP.
3. **Buổi lặp chỉ sinh từ hôm nay trở đi** (`POST /classes` sinh 8 tuần tới), nên "buổi đã diễn ra" trong dữ liệu demo phải tạo bằng `POST /classes/{id}/sessions` với ngày trong quá khứ (đã làm: 14/10 và 16/10). Muốn demo dữ liệu lịch sử dày hơn thì phải tạo thêm buổi lẻ thủ công.
4. **`GET /sessions/{id}/homework` bất đối xứng có chủ đích**: `sections` là phần BTVN **của chính buổi đó**, còn `grades` là điểm của các phần có **buổi chấm** là buổi đó (buổi trước). Vì vậy đọc buổi 16/10 trả `sections: 0` nhưng `grades: 3` (của phần giao ở 14/10). Client phải ghép `section_id` với nội dung phần đã có trong cache; nếu không sẽ hiện điểm mà không có đề bài. Ghi lại để web/iOS xử lý đúng, không phải lỗi dữ liệu.
5. **Inbox phụ huynh chỉ có sự kiện phát sinh sau khi tài khoản phụ huynh tồn tại** (fanout lọc theo `guardian_student` tại thời điểm ghi). Lần chạy đầu tạo điểm/BTVN trước khi cấp tài khoản phụ huynh nên các sự kiện đó không vào inbox; đã bổ sung hoạt động sau khi cấp tài khoản để inbox có 4 dòng. Khi demo lại từ đầu, giữ đúng thứ tự: cấp tài khoản phụ huynh trước, rồi mới nhập điểm/gửi phiếu.
6. **`ALLOWED_ORIGINS` là biến công khai trong `wrangler.jsonc`, không phải secret** — đúng như brief; đừng đặt token/mật khẩu ở đây.
7. Không kiểm PDF báo cáo (R2 vẫn tắt ⇒ `503 pdf_storage_unavailable` là đúng) và không kiểm push FCM (chưa có service account), như các báo cáo trước.

## 6. Câu hỏi

1. **Origin Pages của mảng Web**: dùng tạm origin prototype, hay chờ project Pages staging riêng rồi thêm? Nếu ai đó deploy web lên Pages mới, cần nhớ bước thêm origin + deploy lại — có nên ghi vào checklist phát hành không?
2. **Vòng đời dữ liệu demo**: workspace demo dùng SĐT thật trong dải giả (`+8490000000x`) và lớp tên "6A". Có cần cơ chế xóa/đặt lại workspace demo (ví dụ script `reset-demo`) trước mỗi buổi demo/bàn giao, hay để nguyên và chỉ thêm dữ liệu?
3. **Ai giữ mật khẩu demo**: hiện chỉ ở `/tmp/qlh-staging-demo.txt` trên máy này. Khi bàn giao cho người demo, có nên chuyển sang trình quản lý mật khẩu dùng chung, hay cấp lại mật khẩu demo bằng `guardian-credentials`/đăng ký mới mỗi lần?
4. **`/tmp/qlh-staging-demo.txt` có phải chỗ chốt cuối** hay cần thêm một file `.md` (đã che) trong `plans/.../backend/` chỉ ghi SĐT + `class_id` (không mật khẩu) để người khác đọc được khi review tài liệu?

## 7. Kiểm chứng

- Deploy thật: version `90584f55-a138-4315-b24d-1f448b6cab3b` (100% traffic), `GET /v1/health` → `{"status":"ok","version":"staging"}`.
- Migration: `No migrations to apply!` (không có migration mới từ `0001`, `0002`).
- Smoke + CORS + đa vai trò: chạy trên bản deploy mới, toàn bộ bước đạt như mục 3 (2 lần chạy, lần 2 idempotent).
- Demo: tạo và đọc lại bằng chính API thật từ hai tài khoản; số liệu ở mục 4 khớp giữa lần ghi và lần đọc.
- `npm run typecheck` PASS · `npx vitest run` 23 file / **99/99** PASS (sau khi chỉ đổi `wrangler.jsonc`).
- Không in mật khẩu/token/registration code ở bất kỳ lệnh, log hay báo cáo nào; SĐT dùng trong smoke/demo là số giả, không phải SĐT thật của người dùng.
