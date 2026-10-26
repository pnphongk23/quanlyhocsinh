# DA-2 · Đo staging trước khi sửa (data + API)

Ngày đo: 2026-10-23. Chỉ đọc, không ghi dữ liệu. Web `qlh-staging-web.pages.dev`, API `qlh-staging-api` (Worker + D1 gói Free).
Số liệu ở file này lấy từ lượt chạy cuối (`/tmp/qlh-data-api/measure/results.json`), 3 lần/cấu hình mạng, trung vị. Đã che id; không có SĐT hay nhận xét.

## Cách đo
- Playwright + Chrome thật, viewport iPhone 390×844, tài khoản giáo viên demo, phiên đã đăng nhập sẵn (IndexedDB có dữ liệu: **ấm**), HTTP cache mặc định.
- Mạng: `unthrottled` (RTT trần tới API từ máy đo ≈ 40–50 ms) và `4g` = CDP `Network.emulateNetworkConditions` latency 150 ms, 9 Mbps xuống / 1.5 Mbps lên. Đã kiểm: request nhỏ lên API tăng từ ~45 ms lên ~160 ms.
- "Nội dung hiện" = selector đích hiển thị và không còn `[aria-busy=true]`, đo trong trang bằng `performance.now()` từ lúc bấm (rAF). Tab Điểm danh: `button[aria-label$="Bấm để đổi"]`; Nhận xét: `[aria-label="Lọc phiếu nhận xét"]`; BTVN: `[aria-label="Bài tập về nhà"]`.
- Server: `wrangler tail qlh-staging-api --format json`, lọc theo User-Agent riêng của script đo (tail dùng chung staging với agent khác, không lọc sẽ lẫn).
- Giới hạn: máy đo ở VN, mạng nhà thay đổi (một lần trong 3 lần `4g`/`unthrottled` lệch +300–2800 ms ở request đơn lẻ) nên trung vị mới đáng tin, mỗi ô có 3 mẫu.

## Theo kịch bản (trung vị; [3 lần])

| Kịch bản | Mạng thường | | 4G giả lập | |
|---|---|---|---|---|
| | Nội dung hiện (ms) | Request API | Nội dung hiện (ms) | Request API |
| 1b. Mở app (phiên có sẵn) tới trang đầu giáo viên (thẻ lớp) | 356 [353–358] | 1 (`GET /me`) | 853 [851–870] | 1 |
| 2. Bấm lớp 6A tới danh sách buổi | 78 | 0 | 86 | 0 |
| 3a. Bấm buổi S1 tới tab Điểm danh | 50 | 0 | 49 | 0 |
| 3b. Chuyển tab Nhận xét | 128 [125–176] | 2 (`/me`, `/sync/pull`) | 362 [161–427] | 2 |
| 3c. Chuyển tab BTVN | 133 | 2 | 330 [162–423] | 2 |
| 3d. Quay lại Điểm danh | 116 | 2 | 363 [181–395] | 2 |
| 4. Mở lại cùng buổi trong app (qua danh sách) | 6 | 0 | 6 | 0 |
| 4b. Mở lại cùng buổi bằng tải trang | 218 (một lần 825) | 1 (`/me`) | 841 | 1 |

Không có spinner ở bất kỳ bước nào; dữ liệu đọc từ IndexedDB nên mở lớp, mở buổi, mở lại buổi không gọi API.

## Theo endpoint (client: ms tới hết response; server: từ tail)

| Endpoint | Gọi (lượt cuối) | Client thường | Client 4G | Byte | Server wall trung vị / max | Server CPU trung vị / max |
|---|---|---|---|---|---|---|
| `GET /v1/me` | 44 | 119 ms | 353 ms | 652 | 131 / 311 ms | 3 / 16 ms |
| `GET /v1/sync/pull` | 38 | 105 ms | 285 ms | 108 (trống) | 70 / 347 ms | 3 / 7 ms |

Đăng nhập mới và tải snapshot (chỉ 1 lần, vì giới hạn 2 lần đăng nhập/tài khoản; thời gian phía client của lần này không lưu lại, chỉ có số phía server từ tail, lọc theo script đo):

| Endpoint | Wall | CPU |
|---|---|---|
| `POST /v1/auth/login` | 1441 ms | 15 ms |
| `GET /v1/sync/snapshot` (đầu) | 690 ms | 5 ms |
| `GET /v1/sync/snapshot/{class,attendance,test,score,slip,homework_grade,report,…}` (mỗi thực thể một request) | 853–888 ms mỗi request | 3–8 ms |

Thời gian D1 riêng không có trong tail (không có meta `duration`). Không chạy `d1 insights`. Số lần gọi ở bảng trên là phía client (tail ghi 27 `/me` và 23 `pull` trong lượt cuối, các request bị huỷ khi đổi trang không có đủ ở tail). Hiệu số wall − CPU (≈ 130 ms ở `/me`, 60 ms ở `pull`, ~850 ms ở mỗi snapshot) cho thấy thời gian nằm ở chờ I/O (D1 / subrequest), không phải CPU.

## Kết luận: chỗ chậm nhất
1. **Chuyển tab buổi học gọi 2 request không cần thiết và chặn hiển thị.** Tab nằm ở `?tab=`; đổi search param làm loader của route (`guardRoutes` → `initializeSession`) chạy lại, gọi `GET /me`, và `/sync/pull` chạy kèm. Trên 4G nội dung tab hiện sau 330–360 ms, gần bằng thời gian `/me` (353 ms), còn thường chỉ 120–130 ms. Mỗi lần chuyển tab (bản không có dữ liệu mới) tốn 2 round-trip mà kết quả là 652 B và 108 B trống. Đây là lỗi dễ sửa nhất.
2. **Mạng tuần tự lúc đăng nhập/snapshot**: sau login phải kéo ~10 thực thể, mỗi thực thể một request ~850 ms wall ở server (cpu 3–8 ms). Nếu chạy tuần tự (theo `src/data/sync.ts`), tổng chờ vài giây tới cả chục giây; chưa đo phía client nên chưa xác nhận tuần tự thực sự, cần kiểm khi sửa.
3. **D1/I/O, không phải CPU Worker**: CPU 3–16 ms mọi endpoint; wall 70–130 ms cho `/me` và `pull`, ~850 ms cho mỗi snapshot theo trang. Sửa nên gộp truy vấn/giảm số lần đi D1, không tối ưu mã.
4. **Mở app lạnh** (1b, 4b): 356 ms thường, 853 ms trên 4G, đều chờ `GET /me` của loader trước khi vẽ (1 round-trip). Khi có phiên lưu sẵn có thể vẽ từ IndexedDB và xác thực nền.
5. **Không chậm do render**: các bước chỉ đọc cache cục bộ (mở lớp, mở buổi, mở lại) xong trong 6–90 ms, kể cả khi giả lập 4G.

## Còn thiếu / lưu ý
- Chưa đo chọn vai trò: tài khoản giáo viên demo chỉ có một vai, vào thẳng `/lop`. Màn phụ huynh và multi-role chưa đo.
- Thời gian client của đăng nhập + snapshot chưa có số thật (lần chạy login đầu bị ghi đè khi chạy lại). Chạy lại với `QLH_LOGIN=1` cần 1 lần đăng nhập trên tài khoản (đã dùng 1 trong lượt này).
- Bước `4a` (quay lại danh sách buổi) phát sinh 3–7 request vì mỗi `goBack` qua một lần đổi search param; nhiễu từ cùng nguyên nhân với mục 1.

## Bổ sung: đăng nhập → Chọn vai trò (multi-role demo, context mới, 4G giả lập)

Context Chrome mới (cache và IndexedDB trống), 4G như trên (150 ms, 9/1.5 Mbps), tài khoản multi-role có 2 vai: Phụ huynh (1 bé) và Quản trị viên. Ba lần chạy (n=1 mỗi lần, lần 1 lỗi sớm), **chưa trọn vẹn**: đổi sang Phụ huynh và đổi lại chưa đo (xem lần chạy thứ 3 bên dưới). Số liệu bảng ngay dưới là của lần chạy 2; số của lần 3 (client đầy đủ) ở cuối mục.

| Giai đoạn (từ lúc bấm) | Thời gian | Màn trống | Ghi chú |
|---|---|---|---|
| Bấm Đăng nhập → màn Chọn vai trò hiện | 3962 ms | 49 ms | `POST /auth/login` 682→3011 ms (client), sau đó `GET /me` 2941→4468 ms chạy gối đầu |
| Bấm vai Quản trị viên → trang đầu giáo viên hiện | 2362 ms | 0 ms | `PUT /session/membership` 255→1447 ms, `GET /me` 1224→2336 ms, `GET /sync/snapshot` bắt đầu 1441 ms |
| Đổi sang Phụ huynh (cold), đổi lại (warm), đổi lần 2 | **chưa đo** | | cần thêm 1 lần đăng nhập |

Trang đầu giáo viên của tài khoản này là trạng thái trống ("Chưa chọn lớp"), nên nó hiện trước khi snapshot xong: người dùng thấy khung sớm, dữ liệu về sau.

**Waterfall phía server (từ tail, mốc 0 = bắt đầu `POST /auth/login` của lần chạy này; start theo `eventTimestamp`, end = start + wall)**

| start → end (ms) | Request | wall | CPU |
|---|---|---|---|
| 0 → 1453 | POST /auth/login | 1453 | 14 |
| 2262 → 2967 | GET /me | 705 | 3 |
| 3555 → 4291 | PUT /session/membership | 736 | 3 |
| 4524 → 5401 | GET /me | 877 | 3 |
| 4724 → 5424 | GET /sync/snapshot | 700 | 3 |
| 5854 → 6727 | snapshot/class | 873 | 3 |
| 7192 → 8072 | snapshot/student | 880 | 3 |
| (8.0 → 12.5 s) | class_session, attendance, test: tail không ghi đủ, client có gọi | ~870 | 2–3 |
| 12519 → 13400 | snapshot/score | 881 | 4 |
| 13854 → 14726 | snapshot/slip | 872 | 2 |
| 15170 → 19960 | snapshot/:entity, homework_grade, report, snapshot/:entity (4 request tuần tự) | ~875 | 3 |
| 20405 → 21114 | GET /sync/pull | 709 | 2 |

- **Snapshot chạy tuần tự, không có hai request chồng nhau.** Mỗi request chờ request trước xong rồi cách ~300–450 ms (một RTT 4G + preflight CORS) mới bắt đầu. Khớp với vòng `for … await` trong `src/data/sync.ts`.
- Tổng request sau khi chọn vai (client đếm): 1 PUT, 2 `/me`, 1 snapshot đầu, 11 snapshot theo thực thể (mỗi thực thể một request, workspace trống vẫn gọi đủ), 1 pull = **16**. Cộng login và `/me` đầu: **18 request**.
- Từ lúc chọn vai tới khi snapshot xong ≈ **16 s trên 4G** (4.7 s → 21.1 s trên mốc server), trong đó ~11 s là 12 request tuần tự cho workspace gần như không có dữ liệu.
- Mỗi request snapshot ~870 ms wall mà CPU 3 ms, bất kể dữ liệu trống hay không. Số này cũng ra ~850–890 ms ở lần đăng nhập đầu khi mạng không giới hạn, nên không do 4G giả lập.

## Thời gian D1

`npx wrangler d1 insights qlh-staging-db --env staging --time-period 1d --json` chạy được (phải có `--env staging`, thiếu thì trả mảng rỗng). File thô `/tmp/qlh-data-api/d1-insights*.json`, không chứa dữ liệu người dùng ngoài tên cột.

- Thời gian thực thi SQL **rất nhỏ**: trung bình 0.07–0.65 ms mỗi câu, kể cả các câu đọc nhiều nhất (`auth_sessions JOIN users` 0.23 ms ×~5000 lần, `memberships` 0.25 ms, trang `change_log` 0.2–0.64 ms, list lớp/buổi 0.4–0.6 ms, 29–66 hàng đọc).
- So với wall Worker 70–130 ms (`/me`, `pull` khi ấm) và 700–880 ms (snapshot, `/me` và `pull` ở lần đăng nhập mới): chênh lệch lớn hơn tổng thời gian SQL hàng trăm lần. Thời gian nằm ngoài lúc chạy SQL, nghĩa là **chờ vòng đi về giữa Worker và D1** (mỗi request gọi nhiều câu SQL tuần tự: xác thực phiên, membership, quyền, epoch, rồi mới tới câu dữ liệu) và/hoặc D1 truy cập lạnh/xa Worker. Đây là suy luận từ số liệu, chưa kiểm bằng đếm câu SQL từng request.
- Việc nên làm khi sửa: đếm số câu D1 mỗi request, gộp bằng `batch`, bỏ lặp xác thực; cân nhắc Smart Placement/chọn vùng D1.

## Lần chạy thứ 3 (cuối): waterfall phía client đầy đủ
Cùng cấu hình (context mới, 4G, tài khoản multi-role). Mốc 0 = lúc bấm của từng giai đoạn; start/end là thời gian trình duyệt (CDP timing). Đây là số chính, thay cho bảng suy từ tail ở trên (lần chạy trước).

| Giai đoạn | Tới khi nội dung hiện | Màn trống | Mạng yên (request cuối xong) |
|---|---|---|---|
| Đăng nhập → màn Chọn vai trò | 1230 ms | 82 ms | 1123 ms |
| Bấm vai Quản trị viên → trang đầu giáo viên (trạng thái trống, "Chưa chọn lớp") | 2316 ms | 0 ms | **19109 ms** |

Giai đoạn đăng nhập (ms): `POST /auth/login` 475→1308, `GET /me` 963→1213.

Giai đoạn chọn vai (ms, start → end), 14 request:

| Request | start → end | Thời lượng |
|---|---|---|
| PUT /session/membership | 165 → 1283 | 1118 |
| GET /me | 1164 → 2308 | 1144 |
| GET /sync/snapshot | 1406 → 2642 | 1236 |
| snapshot/class | 2614 → 4202 | 1588 |
| snapshot/student | 4211 → 5528 | 1317 |
| snapshot/class_session | 5535 → 6867 | 1332 |
| snapshot/attendance | 6861 → 8191 | 1330 |
| snapshot/test | 8216 → 9552 | 1336 |
| snapshot/score | 9533 → 10874 | 1341 |
| snapshot/slip | 10898 → 12387 | 1489 |
| snapshot/(thực thể) | 12369 → 13684 | 1315 |
| snapshot/homework_grade | 13958 → 15540 | 1582 |
| snapshot/report | 15271 → 16589 | 1318 |
| snapshot/(thực thể) | 16586 → 17908 | 1322 |
| GET /sync/pull | 17910 → 19319 | 1409 |

- **Xác nhận: snapshot chạy tuần tự** (request sau bắt đầu ngay khi request trước xong, ngoại trừ chồng ~20–30 ms do preflight/đo). Trang đầu hiện ở 2.3 s nhưng đồng bộ chỉ xong ở **19.1 s**. Mọi response snapshot theo thực thể chỉ ~30 byte (trống), tức là gần như toàn bộ 19 s là độ trễ từng request: ~1.3 s mỗi request trên 4G, khoảng 11 request nối đuôi.
- `GET /me` lặp 2 lần (đăng nhập và sau chọn vai); `PUT /session/membership` rồi `/me` chạy gối đầu.
- Tổng số request tới API (không tính preflight): 2 (đăng nhập) + 15 (chọn vai) = 17.

**Không đo được (hết lượt đăng nhập, lead đã chốt không đăng nhập lại)**: đổi sang Phụ huynh (cold), đổi lại giáo viên (warm), đổi lần 2. Script dừng ở Cài đặt: trang `/cai-dat` của tài khoản này chỉ có nút "Đổi vai trò" (không có mục liệt kê "Vai trò"), nên selector `section[aria-label="Vai trò"] button` không thấy. Cần sửa script: bấm "Đổi vai trò" → chọn thẻ vai ở `/chon-vai-tro`. Trang còn hiện nút "Thử đồng bộ lại"; chưa rõ có lỗi đồng bộ thật hay không (không đọc nội dung).

## Chạy lại sau khi sửa
```
cd /tmp/qlh-data-api/measure
QLH_CREDS=~/.config/qlh/staging-demo.txt QLH_RUNS=3 node measure.mjs        # dùng lại profile đã đăng nhập; QLH_LOGIN=1 để đăng nhập mới (tối đa 2 lần/tài khoản)
cd <mvp-backend>/worker && npx wrangler tail qlh-staging-api --format json > /tmp/qlh-data-api/tail.jsonl   # chạy song song, dừng khi xong
node /tmp/qlh-data-api/measure/summarize-tail.mjs /tmp/qlh-data-api/tail.jsonl /tmp/qlh-data-api/measure/results.json
```
Script: `/tmp/qlh-data-api/measure/measure.mjs` (kết quả thô ở `results.json`), `summarize-tail.mjs`. Script không in secret; chỉ đọc SĐT/mật khẩu từ file trong bộ nhớ.
