# V-1 · Kiểm chứng Smart Placement và bước đỏ DA-6

Status: DONE_WITH_CONCERNS

## Summary

Đã chạy tải chỉ đọc qua `GET /v1/me` và `GET /v1/sync/pull` với UA riêng từ 2026-10-23T09:30:14Z đến 2026-10-23T09:54:45Z; tail được lọc theo UA từ 2026-10-23T09:41:04.428000+00:00 đến 2026-10-23T09:54:46.089000+00:00 để loại traffic khác. Placement API lần đầu báo `smart/SUCCESS` (analyzed at 2026-10-23T09:27:41Z); kết luận cuối dựa trên header/runtime và latency bên dưới.
Đã chạy bộ test DA-6 trên detached worktree `de3b6d4^`: 7/7 test đỏ bằng assertion; không có lỗi import/API thiếu. Worktree tạm đã được gỡ; backend worktree sạch, thay đổi có sẵn trên web worktree không đổi.
Lượt bổ sung sau region hint ghi nhận edge LAX/SEA chạy `remote-HKG`; server wall median LAX `/me` và `/pull` là 78/56.5 ms so với baseline 859/699 ms. So sánh này có giới hạn vì baseline mang scriptVersion khác.

## Smart Placement

- Target: Worker `qlh-staging-api`, deployed version `d2a6b1fd-a144-4ba2-85c6-81a69836959a`; `worker/wrangler.jsonc` staging có `placement.mode = smart`.
- Baseline: 3 file tail (2026-10-23 06:00–06:24 UTC), 868 request events, 146 nhóm colo × method × path. `scriptVersion` trong event là `c97e77f0-eabb-4aed-b42e-40aa450c2c2f`; deployment list hiện tại ghi `d2a6…`, nên hai phía không được xem là cùng-version A/B. UUID trên path đã đổi thành `:id`; query string bỏ khỏi nhóm.
- Placement fields trong baseline: none. Header response/client được ghi nhận bên dưới nếu có. `wallTime` và `cpuTime` từ tail (ms); p90 là nearest-rank.
- Cloudflare cho biết Smart Placement có thể mất tới 15 phút phân tích; `cf-placement` mang `remote-<colo>` hoặc `local-<colo>` để chỉ vị trí thực thi. [Cloudflare Placement docs](https://developers.cloudflare.com/workers/configuration/placement/).

### Endpoints trọng tâm (GET)

**Trước**

| colo | path | n | wall med ms | wall p90 ms | CPU med ms |
|---|---|---|---|---|---|
| CDG | /v1/me | 1 | 1043 | 1043 | 5 |
| CDG | /v1/sync/pull | 6 | 839.0 | 854 | 7.0 |
| HKG | /v1/me | 92 | 65.0 | 81 | 3.0 |
| HKG | /v1/sync/pull | 69 | 56 | 69 | 3 |
| LAX | /v1/me | 7 | 859 | 875 | 3 |
| LAX | /v1/sync/pull | 6 | 699.0 | 715 | 2.5 |
| MRS | /v1/me | 47 | 889 | 904 | 3 |
| MRS | /v1/sync/pull | 36 | 721.0 | 733 | 3.0 |
| NRT | /v1/me | 5 | 312 | 325 | 5 |
| NRT | /v1/sync/pull | 1 | 270 | 270 | 6 |
| SIN | /v1/me | 70 | 277.0 | 348 | 4.5 |
| SIN | /v1/sync/pull | 52 | 220.5 | 298 | 4.0 |

**Sau — chỉ UA của lượt đo**

| colo | path | n | wall med ms | wall p90 ms | CPU med ms |
|---|---|---|---|---|---|
| HKG | /v1/me | 26 | 75.0 | 89 | 4.0 |
| HKG | /v1/sync/pull | 28 | 75.0 | 86 | 6.5 |
| LAX | /v1/me | 6 | 855.0 | 925 | 5.5 |
| LAX | /v1/sync/pull | 4 | 735.0 | 751 | 9.0 |

Client sample summary (latency end-to-end, not Worker wall):

| path | n | client med ms | client p90 ms | status counts | cf-placement client | cf-ray colo |
|---|---|---|---|---|---|---|
| /v1/health | 125 | 132.5 | 601.1 | {'200': 125} | {'local-HKG': 107, 'local-LAX': 18} | {'HKG': 107, 'LAX': 18} |
| /v1/me | 116 | 217.1 | 1439.5 | {'200': 116} | {'None': 116} | {'None': 116} |
| /v1/sync/pull | 116 | 216.8 | 1332.1 | {'200': 116} | {'None': 116} | {'None': 116} |

Tail after event counts (UA-filtered): `179`; scriptVersion: `{"d2a6b1fd-a144-4ba2-85c6-81a69836959a": 179}`; placement header counts: `{}`; statuses: `{"('GET', '/health', 200)": 115, "('GET', '/me', 200)": 32, "('GET', '/sync/pull', 200)": 32}`.
Cloudflare placement API final: `[{"placement_mode": "smart", "placement_status": "SUCCESS"}, {"mode": "smart", "status": "SUCCESS", "last_analyzed_at": "2026-10-23T09:27:41.135702Z"}]`.

Placement split by edge colo and runtime header:

| edge colo | cf-placement | method | path | n | wall med ms | wall p90 ms | CPU med ms |
|---|---|---|---|---|---|---|---|
| HKG | <missing> | GET | /v1/health | 100 | 1.0 | 1 | 0.0 |
| HKG | <missing> | GET | /v1/me | 26 | 75.0 | 89 | 4.0 |
| HKG | <missing> | GET | /v1/sync/pull | 28 | 75.0 | 86 | 6.5 |
| LAX | <missing> | GET | /v1/health | 15 | 2 | 9 | 1 |
| LAX | <missing> | GET | /v1/me | 6 | 855.0 | 925 | 5.5 |
| LAX | <missing> | GET | /v1/sync/pull | 4 | 735.0 | 751 | 9.0 |


### Tất cả route × colo

Bảng dưới tổng hợp toàn bộ nhóm request và chỉ số theo đề bài. Mẫu trước gồm traffic staging của nhiều luồng; mẫu sau chỉ gồm UA `qlh-data-api-verify/1.0`.

**Trước**

| colo | method | path | n | wall med ms | wall p90 ms | CPU med ms |
|---|---|---|---|---|---|---|
| CDG | GET | /v1/me | 1 | 1043 | 1043 | 5 |
| CDG | GET | /v1/sync/pull | 6 | 839.0 | 854 | 7.0 |
| CDG | GET | /v1/sync/snapshot | 1 | 807 | 807 | 3 |
| CDG | GET | /v1/sync/snapshot/attendance | 1 | 1026 | 1026 | 3 |
| CDG | GET | /v1/sync/snapshot/class | 1 | 1028 | 1028 | 4 |
| CDG | GET | /v1/sync/snapshot/class_session | 1 | 1073 | 1073 | 3 |
| CDG | GET | /v1/sync/snapshot/homework_grade | 1 | 1055 | 1055 | 2 |
| CDG | GET | /v1/sync/snapshot/homework_section | 1 | 1051 | 1051 | 3 |
| CDG | GET | /v1/sync/snapshot/report | 1 | 975 | 975 | 2 |
| CDG | GET | /v1/sync/snapshot/report_publication | 1 | 1011 | 1011 | 2 |
| CDG | GET | /v1/sync/snapshot/score | 1 | 1050 | 1050 | 2 |
| CDG | GET | /v1/sync/snapshot/student | 1 | 1058 | 1058 | 3 |
| CDG | GET | /v1/sync/snapshot/test | 1 | 1002 | 1002 | 2 |
| CDG | OPTIONS | /v1/auth/login | 3 | 6 | 11 | 6 |
| CDG | OPTIONS | /v1/sync/snapshot | 1 | 5 | 5 | 4 |
| CDG | OPTIONS | /v1/sync/snapshot/attendance | 1 | 0 | 0 | 0 |
| CDG | OPTIONS | /v1/sync/snapshot/class | 1 | 0 | 0 | 0 |
| CDG | OPTIONS | /v1/sync/snapshot/class_session | 1 | 0 | 0 | 0 |
| CDG | OPTIONS | /v1/sync/snapshot/homework_grade | 1 | 0 | 0 | 0 |
| CDG | OPTIONS | /v1/sync/snapshot/report_publication | 1 | 0 | 0 | 0 |
| CDG | OPTIONS | /v1/sync/snapshot/slip | 1 | 0 | 0 | 0 |
| CDG | OPTIONS | /v1/sync/snapshot/student | 1 | 0 | 0 | 0 |
| CDG | OPTIONS | /v1/sync/snapshot/test | 1 | 0 | 0 | 0 |
| CDG | POST | /v1/auth/login | 3 | 1658 | 1700 | 13 |
| HKG | GET | /v1/me | 92 | 65.0 | 81 | 3.0 |
| HKG | GET | /v1/sync/pull | 69 | 56 | 69 | 3 |
| HKG | GET | /v1/sync/snapshot | 6 | 53.5 | 134 | 5.5 |
| HKG | GET | /v1/sync/snapshot/class | 6 | 69.0 | 123 | 7.0 |
| HKG | GET | /v1/sync/snapshot/class_session | 2 | 93.0 | 116 | 6.0 |
| HKG | GET | /v1/sync/snapshot/score | 1 | 131 | 131 | 7 |
| HKG | GET | /v1/sync/snapshot/student | 6 | 65.0 | 130 | 4.5 |
| HKG | OPTIONS | /v1/auth/login | 6 | 6.5 | 12 | 6.5 |
| HKG | OPTIONS | /v1/me | 21 | 1 | 6 | 0 |
| HKG | OPTIONS | /v1/session/membership | 1 | 0 | 0 | 0 |
| HKG | OPTIONS | /v1/sync/pull | 14 | 0.0 | 1 | 0.0 |
| HKG | OPTIONS | /v1/sync/snapshot | 6 | 0.5 | 2 | 0.0 |
| HKG | OPTIONS | /v1/sync/snapshot/class | 6 | 0.5 | 2 | 0.0 |
| HKG | OPTIONS | /v1/sync/snapshot/class_session | 2 | 0.5 | 1 | 0.0 |
| HKG | OPTIONS | /v1/sync/snapshot/student | 6 | 0.5 | 1 | 0.0 |
| HKG | PATCH | /v1/students/REDACTED | 2 | 95.0 | 100 | 3.5 |
| HKG | POST | /v1/auth/login | 8 | 279.0 | 306 | 15.0 |
| HKG | POST | /v1/auth/register | 1 | 146 | 146 | 13 |
| LAX | GET | /v1/me | 7 | 859 | 875 | 3 |
| LAX | GET | /v1/sync/pull | 6 | 699.0 | 715 | 2.5 |
| LAX | GET | /v1/sync/snapshot | 2 | 684.5 | 690 | 4.0 |
| LAX | GET | /v1/sync/snapshot/attendance | 1 | 860 | 860 | 3 |
| LAX | GET | /v1/sync/snapshot/class | 1 | 858 | 858 | 6 |
| LAX | GET | /v1/sync/snapshot/homework_grade | 1 | 860 | 860 | 3 |
| LAX | GET | /v1/sync/snapshot/homework_section | 1 | 870 | 870 | 4 |
| LAX | GET | /v1/sync/snapshot/report | 1 | 859 | 859 | 3 |
| LAX | GET | /v1/sync/snapshot/report_publication | 1 | 862 | 862 | 3 |
| LAX | GET | /v1/sync/snapshot/score | 1 | 853 | 853 | 3 |
| LAX | GET | /v1/sync/snapshot/slip | 1 | 855 | 855 | 3 |
| LAX | GET | /v1/sync/snapshot/test | 1 | 888 | 888 | 8 |
| LAX | OPTIONS | /v1/auth/login | 1 | 5 | 5 | 5 |
| LAX | OPTIONS | /v1/me | 1 | 1 | 1 | 0 |
| LAX | OPTIONS | /v1/sync/pull | 1 | 0 | 0 | 0 |
| LAX | OPTIONS | /v1/sync/snapshot | 1 | 0 | 0 | 0 |
| LAX | OPTIONS | /v1/sync/snapshot/class | 1 | 0 | 0 | 0 |
| LAX | OPTIONS | /v1/sync/snapshot/homework_grade | 1 | 0 | 0 | 0 |
| LAX | OPTIONS | /v1/sync/snapshot/test | 1 | 1 | 1 | 0 |
| LAX | POST | /v1/auth/login | 1 | 1441 | 1441 | 15 |
| MRS | GET | /v1/me | 47 | 889 | 904 | 3 |
| MRS | GET | /v1/sync/pull | 36 | 721.0 | 733 | 3.0 |
| MRS | GET | /v1/sync/snapshot | 15 | 710 | 718 | 3 |
| MRS | GET | /v1/sync/snapshot/attendance | 1 | 881 | 881 | 2 |
| MRS | GET | /v1/sync/snapshot/class | 14 | 885.0 | 910 | 4.0 |
| MRS | GET | /v1/sync/snapshot/class_session | 4 | 881.0 | 885 | 3.0 |
| MRS | GET | /v1/sync/snapshot/homework_grade | 3 | 874 | 876 | 3 |
| MRS | GET | /v1/sync/snapshot/homework_section | 5 | 883 | 887 | 3 |
| MRS | GET | /v1/sync/snapshot/report | 4 | 884.5 | 894 | 3.0 |
| MRS | GET | /v1/sync/snapshot/report_publication | 4 | 876.5 | 882 | 3.0 |
| MRS | GET | /v1/sync/snapshot/score | 5 | 881 | 897 | 3 |
| MRS | GET | /v1/sync/snapshot/slip | 4 | 876.0 | 1040 | 3.0 |
| MRS | GET | /v1/sync/snapshot/student | 7 | 884 | 921 | 3 |
| MRS | GET | /v1/sync/snapshot/test | 2 | 874.0 | 875 | 2.0 |
| MRS | OPTIONS | /v1/auth/login | 6 | 0.0 | 5 | 0.0 |
| MRS | OPTIONS | /v1/classes | 1 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/classes/REDACTED/sessions | 1 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/me | 13 | 0 | 6 | 0 |
| MRS | OPTIONS | /v1/session/membership | 1 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/sync/pull | 11 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/sync/snapshot | 11 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/sync/snapshot/attendance | 2 | 0.0 | 0 | 0.0 |
| MRS | OPTIONS | /v1/sync/snapshot/class | 12 | 0.0 | 0 | 0.0 |
| MRS | OPTIONS | /v1/sync/snapshot/class_session | 5 | 0 | 1 | 0 |
| MRS | OPTIONS | /v1/sync/snapshot/homework_grade | 3 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/sync/snapshot/homework_section | 1 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/sync/snapshot/report | 1 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/sync/snapshot/score | 3 | 0 | 0 | 0 |
| MRS | OPTIONS | /v1/sync/snapshot/student | 10 | 0.0 | 0 | 0.0 |
| MRS | POST | /v1/auth/login | 7 | 1442 | 1465 | 14 |
| MRS | POST | /v1/classes/REDACTED/sessions | 1 | 1103 | 1103 | 4 |
| MRS | POST | /v1/classes/REDACTED/students | 1 | 953 | 953 | 6 |
| MRS | PUT | /v1/session/membership | 2 | 742.5 | 749 | 3.5 |
| NRT | GET | /v1/me | 5 | 312 | 325 | 5 |
| NRT | GET | /v1/sync/pull | 1 | 270 | 270 | 6 |
| NRT | GET | /v1/sync/snapshot | 1 | 253 | 253 | 4 |
| NRT | GET | /v1/sync/snapshot/class | 1 | 302 | 302 | 6 |
| NRT | GET | /v1/sync/snapshot/student | 1 | 309 | 309 | 4 |
| NRT | GET | /v1/sync/snapshot/test | 1 | 303 | 303 | 3 |
| NRT | OPTIONS | /v1/auth/login | 2 | 9.5 | 12 | 8.0 |
| NRT | OPTIONS | /v1/me | 2 | 3.5 | 6 | 3.5 |
| NRT | OPTIONS | /v1/sync/pull | 1 | 3 | 3 | 2 |
| NRT | OPTIONS | /v1/sync/snapshot | 1 | 1 | 1 | 0 |
| NRT | OPTIONS | /v1/sync/snapshot/class | 1 | 2 | 2 | 1 |
| NRT | OPTIONS | /v1/sync/snapshot/homework_grade | 1 | 0 | 0 | 0 |
| NRT | OPTIONS | /v1/sync/snapshot/student | 1 | 0 | 0 | 0 |
| NRT | POST | /v1/auth/login | 2 | 651.5 | 669 | 22.5 |
| SIN | GET | /v1/me | 70 | 277.0 | 348 | 4.5 |
| SIN | GET | /v1/sync/pull | 52 | 220.5 | 298 | 4.0 |
| SIN | GET | /v1/sync/snapshot | 7 | 224 | 284 | 7 |
| SIN | GET | /v1/sync/snapshot/class | 7 | 302 | 378 | 8 |
| SIN | GET | /v1/sync/snapshot/class_session | 2 | 264.5 | 286 | 6.0 |
| SIN | GET | /v1/sync/snapshot/homework_section | 3 | 260 | 275 | 5 |
| SIN | GET | /v1/sync/snapshot/report | 1 | 281 | 281 | 5 |
| SIN | GET | /v1/sync/snapshot/report_publication | 3 | 258 | 274 | 4 |
| SIN | GET | /v1/sync/snapshot/score | 2 | 251.0 | 260 | 4.5 |
| SIN | GET | /v1/sync/snapshot/student | 7 | 283 | 383 | 6 |
| SIN | GET | /v1/sync/snapshot/test | 1 | 302 | 302 | 7 |
| SIN | OPTIONS | /v1/auth/login | 9 | 7 | 14 | 6 |
| SIN | OPTIONS | /v1/classes | 3 | 0 | 1 | 0 |
| SIN | OPTIONS | /v1/classes/REDACTED | 3 | 0 | 1 | 0 |
| SIN | OPTIONS | /v1/classes/REDACTED/sessions | 3 | 0 | 1 | 0 |
| SIN | OPTIONS | /v1/classes/REDACTED/students | 2 | 0.0 | 0 | 0.0 |
| SIN | OPTIONS | /v1/me | 17 | 1 | 12 | 1 |
| SIN | OPTIONS | /v1/session/membership | 1 | 0 | 0 | 0 |
| SIN | OPTIONS | /v1/sessions/REDACTED | 3 | 0 | 1 | 0 |
| SIN | OPTIONS | /v1/sessions/REDACTED/cancel | 1 | 0 | 0 | 0 |
| SIN | OPTIONS | /v1/students/REDACTED/reports/2026-12 | 1 | 0 | 0 | 0 |
| SIN | OPTIONS | /v1/sync/pull | 18 | 0.0 | 3 | 0.0 |
| SIN | OPTIONS | /v1/sync/push | 2 | 1.0 | 2 | 0.5 |
| SIN | OPTIONS | /v1/sync/snapshot | 8 | 0.0 | 1 | 0.0 |
| SIN | OPTIONS | /v1/sync/snapshot/class | 7 | 1 | 2 | 0 |
| SIN | OPTIONS | /v1/sync/snapshot/class_session | 3 | 0 | 2 | 0 |
| SIN | OPTIONS | /v1/sync/snapshot/report_publication | 1 | 1 | 1 | 0 |
| SIN | OPTIONS | /v1/sync/snapshot/student | 7 | 1 | 3 | 0 |
| SIN | PATCH | /v1/classes/REDACTED | 3 | 320 | 357 | 6 |
| SIN | PATCH | /v1/sessions/REDACTED | 3 | 369 | 390 | 8 |
| SIN | POST | /v1/auth/login | 9 | 593 | 694 | 18 |
| SIN | POST | /v1/classes | 3 | 288 | 327 | 8 |
| SIN | POST | /v1/classes/REDACTED/sessions | 9 | 400 | 434 | 7 |
| SIN | POST | /v1/classes/REDACTED/students | 4 | 311.5 | 345 | 4.0 |
| SIN | POST | /v1/sync/push | 7 | 419 | 637 | 8 |
| SIN | PUT | /v1/session/membership | 1 | 229 | 229 | 2 |
| SIN | PUT | /v1/students/REDACTED/reports/2026-12 | 1 | 344 | 344 | 5 |

**Sau**

| colo | method | path | n | wall med ms | wall p90 ms | CPU med ms |
|---|---|---|---|---|---|---|
| HKG | GET | /v1/health | 100 | 1.0 | 1 | 0.0 |
| HKG | GET | /v1/me | 26 | 75.0 | 89 | 4.0 |
| HKG | GET | /v1/sync/pull | 28 | 75.0 | 86 | 6.5 |
| LAX | GET | /v1/health | 15 | 2 | 9 | 1 |
| LAX | GET | /v1/me | 6 | 855.0 | 925 | 5.5 |
| LAX | GET | /v1/sync/pull | 4 | 735.0 | 751 | 9.0 |

## Sau region hint

- Cấu hình staging hiện tại là `placement.region = "gcp:asia-east2"`; deployment version `6f2338f6-acab-4596-be93-c162bb590d39`. `/health` trả `local-HKG` tại HKG và `remote-HKG` tại LAX/SEA.
- Lượt đo chỉ đọc chạy 15 phút, từ `2026-10-23T09:58:47Z` đến `10:13:41Z`: 119 GET mỗi route `/v1/me` và `/v1/sync/pull`, tất cả 200; header được chuẩn hóa không phân biệt hoa/thường. Health loop có 125/125 response 200, gồm HKG local-HKG 112, LAX remote-HKG 10, SEA remote-HKG 3.
- Tail lọc được 360 event trên version `6f2338f6-acab-4596-be93-c162bb590d39`: 1 login, 119 `/me`, 117 `/sync/pull`, 123 `/health`, tất cả 200. Hai pull và hai health client request không có event tail tương ứng.
- Bảng dưới ghép latency client theo `cf-ray` colo và response `cf-placement`; server wall median lấy từ tail theo edge colo và path. Tail không có trường `cf-placement`; mỗi edge trong client sample chỉ quan sát một placement label. `Trước` là server wall median của baseline cũ, không phải cùng-version A/B.

| edge colo | cf-placement | path | client n | client med ms | client p90 ms | server n | server wall med trước ms | server wall med sau ms |
|---|---|---|---:|---:|---:|---:|---:|---:|
| HKG | local-HKG | /v1/me | 104 | 195.9 | 265.5 | 104 | 65.0 | 72.0 |
| HKG | local-HKG | /v1/sync/pull | 106 | 183.7 | 266.8 | 104 | 56 | 67.5 |
| LAX | remote-HKG | /v1/me | 9 | 836.2 | 981.7 | 9 | 859 | 78 |
| LAX | remote-HKG | /v1/sync/pull | 8 | 853.9 | 929.5 | 8 | 699.0 | 56.5 |
| SEA | remote-HKG | /v1/me | 6 | 890.5 | 1134.7 | 6 | — | 66.0 |
| SEA | remote-HKG | /v1/sync/pull | 5 | 927.9 | 1111.5 | 5 | — | 69 |

Client latency gộp mọi edge trước→sau (baseline trước không lưu colo do lỗi đọc hoa/thường): `/v1/me` 217.1/1439.5 ms (n=116) → 198.3/812.3 ms (n=119); `/v1/sync/pull` 216.8/1332.1 ms (n=116) → 188.2/815.1 ms (n=119). P90 dùng nearest-rank.

## DA-6 red check

## DA-6 old-code red check
- Worktree: temporary detached `ff66e1c` (`de3b6d4^`); copied only `src/test/rest-writes.test.ts` from `de3b6d4`; symlinked existing `node_modules`; `npx vitest run src/test/rest-writes.test.ts`.
- Result: 7/7 failed, 0 passed; suite imported and executed, so no missing import/API failure.
- `keeps a created student...`: retry reached remote mock, but no `scheduleSync(0)` call on old code; old code sends no client ID so the equality assertion passes vacuously with `undefined` and does not prove ID reuse.
- `treats 200 on a repeated create...`: parallel creates yielded duplicate local rows (2 expected 1).
- `reports id_conflict in Vietnamese`: old code surfaced raw `id_conflict`, not localized text.
- `schedule change does not build sessions locally...`: old code built 8 sessions locally.
- `cancelling a session...`: cancellation API call was made but cancelled status did not survive `hydrateStore`.
- `only accepts cancelling in setSessionStatus`: test has no `s1` row; old code fails first with “Không tìm thấy buổi học.”, so it does not reach the invalid-status behavior. Treat this one as an invalid test setup/weak red proof.
- `change password succeeds even if /me fails`: POST succeeded, then old code propagated the offline GET `/me` TypeError instead of resolving.


## Kết luận và đề nghị

- Region hint đưa request từ edge LAX/SEA tới Worker `remote-HKG`. Tại LAX, server wall median sau là 78 ms cho `/me` và 56.5 ms cho `/sync/pull`, so với baseline 859/699 ms; mẫu sau nhỏ (n=9/8). Đây là bằng chứng thực tế phù hợp với giả thuyết Worker ở gần D1 giảm thời gian chờ xa, nhưng baseline có version khác nên chưa phải A/B cùng mã.
- HKG giữ `local-HKG`; server wall median sau 72/67.5 ms, nhỉnh hơn baseline 65/56 ms. Client LAX còn median 836/854 ms trong khi Worker wall thấp; suy luận là phần lớn độ trễ client còn lại nằm ngoài thời gian thực thi Worker.
- Kết quả runtime xác nhận placement theo vùng quan sát được. Giữ region hint hiện tại khi D1 được xác nhận ở `gcp:asia-east2`; nên lặp lại so sánh cùng version/điều kiện nếu cần kết luận định lượng chặt hơn.

## Concerns

- Log baseline có event scriptVersion `c97e…`, khác deployment target `d2a6…`; không thể gán chênh lệch latency hoàn toàn cho Smart Placement.
- Test `only accepts cancelling in setSessionStatus` không seed session `s1`; fail ở lookup trước khi chạm rule cần kiểm, nên test này cần sửa setup trước khi dùng làm bằng chứng đỏ.
- Lượt region hint đến từ một client có edge HKG, LAX và SEA; LAX/SEA có mẫu nhỏ (tổng n=9/8 và 6/5 theo route), chưa phải kiểm thử đa vùng độc lập.
- Tail region hint chạy đủ cửa sổ gần 15 phút, nhưng không chứa `cf-placement`; bảng ghép nhãn client placement với tail theo edge colo/path. Có hai `/sync/pull` và hai `/health` client request thiếu event tail tương ứng.
- Lượt Smart mode ban đầu có các giới hạn đã ghi ở phần trên: tail mở muộn, client header lookup sai casing, và lệnh `--env staging` bị Wrangler resolve thành `qlh-staging-api-staging` (`code 10007`). Lượt region hint khắc phục casing và gọi tail theo tên worker trực tiếp.
- Baseline scriptVersion `c97e…` khác version region hint `6f2338f6…`, vì vậy thay đổi latency không thể quy hoàn toàn cho placement.
- Không ghi SĐT, token, mật khẩu hay body. Không sửa mã sản phẩm, không commit, không deploy.
