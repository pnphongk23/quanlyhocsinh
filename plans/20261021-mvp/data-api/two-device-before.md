# DA-3 · Hai thiết bị trên staging (trước khi sửa)

Ngày chạy: 2026-10-23. Staging: web `qlh-staging-web.pages.dev`, API `qlh-staging-api…/v1`. Không sửa mã, không deploy.

## Cách đo

- Workspace riêng, đăng ký bằng `POST /v1/auth/register` với SĐT giả `+8490005xxxxx` (không lộ trong báo cáo). Không đụng workspace demo.
- Hai context Chrome độc lập (A, B), cùng một tài khoản giáo viên, màn hình 390x844. A thao tác qua UI và chờ A báo lưu xong (REST 2xx hoặc `sync/push` trả `applied`). B đứng yên ở `/lop`.
- "B thấy" = bản ghi có trong IndexedDB `qlh-web` của B (nguồn của giao diện), quét mỗi 0,7 giây. Chưa đối chiếu từng màn hình bằng mắt.
- 4 vòng. Mỗi vòng tạo lớp mới (`Lớp R1..R4`) rồi chạy cùng một chuỗi thao tác của A (khoảng 65–100 giây), sau đó B kích hoạt theo thang:
  - Vòng 1: B chờ yên (idle) tối đa 150 giây rồi mới thử các kích hoạt khác.
  - Vòng 2: chuyển trang đi rồi quay lại (nav) → visibilitychange → focus → reload.
  - Vòng 3: reload → nav → visibilitychange → focus.
  - Vòng 4: visibilitychange → focus → nav → reload.
  - Mỗi vòng từ 2 trở đi reload B trước khi A bắt đầu để đặt lại đồng hồ 120 giây.
- Kết quả thô (có thể chứa id, không có SĐT/mật khẩu): `/tmp/qlh-data-api/two-device/results2.json`.

## Kết quả theo loại dữ liệu

Cột "B thấy": ✓ = thấy ở kích hoạt đó; ✗ = không thấy khi chỉ có kích hoạt đó (đã thử, B vẫn chưa có dữ liệu); "tick" = lần `pull` định kỳ 120 giây.

| Loại dữ liệu | Thao tác của A | Đường ghi của A (kết quả) | idle | nav | visibilitychange | focus | reload |
|---|---|---|---|---|---|---|---|
| Lớp | tạo | REST `POST /classes` (201) | tick | ✗ | ✗ | ✓ | ✓ |
| Lớp | sửa lịch T2→T4 | REST `PATCH /classes/{id}` (200) | tick | ✗ | ✗ | ✓ | ✓ |
| Học sinh | thêm | REST `POST /classes/{id}/students` (201) | tick | ✗ | ✗ | ✓ | ✓ |
| Học sinh | sửa tên | **không có trong UI**; thử qua API `PATCH /students/{id}` (200) | tick | ✗ | ✗ | ✓ | ✓ |
| Buổi | thêm buổi lẻ | REST `POST /classes/{id}/sessions` (201) | tick | ✗ | ✗ | ✓ | ✓ |
| Buổi | sửa buổi lẻ (ghi chú) | REST `PATCH /sessions/{id}` (200) | tick | ✗ | ✗ | ✓ | ✓ |
| Buổi | huỷ | REST `POST /sessions/{id}/cancel` (200) | tick | ✗ | ✗ | ✓ | ✓ |
| Điểm danh | lưu cả lớp có mặt | `sync/push` `attendance.set` (`applied`) | tick | ✗ | ✗ | ✓ | ✓ |
| Phiếu nhận xét | lưu nháp 2 sao | `sync/push` `slip.set` (`applied`) | tick | ✗ | ✗ | ✓ | ✓ |
| Phiếu nhận xét | gửi | `sync/push` `slip.send` (`applied`) | tick | ✗ | ✗ | ✓ | ✓ |
| Bài kiểm tra | tạo | `sync/push` `test.create` (`applied`) | tick | ✗ | ✗ | ✓ | ✓ |
| Điểm | nhập 7,5 | `sync/push` `score.set` (`applied`) | tick | ✗ | ✗ | ✓ | ✓ |
| BTVN | giao 1 phần | `sync/push` `homework.section.upsert` (`applied`; UI không dùng `homework.assign`) | tick | ✗ | ✗ | ✓ | ✓ |
| BTVN | chấm ở buổi sau | `sync/push` `homework.grade.set` (`applied`) | tick | ✗ | ✗ | ✓ | ✓ |
| Báo cáo | lưu nhận xét chung | REST `PUT /students/{id}/reports/{month}` (200) | chưa xác định (xem dưới) | | | | |
| Báo cáo | phát hành | REST `POST …/publish` (200) | tick | ✗ | ✗ | ✓ | ✓ |

Thời gian:

- **Chờ yên:** B không tự thấy gì cho tới lần `pull` định kỳ, mỗi 120 giây tính từ lúc tải trang. Vòng 1: lần tick tới ở giây 120, B thấy cả lô đồng thời. Độ trễ thực tế của từng mục là 32–91 giây vì tick rơi vào khoảng nào của chuỗi thao tác. Trường hợp xấu nhất khoảng 120 giây. Không thấy sớm hơn ở mốc 30 hay 70 giây của từng thay đổi, trừ khi tick tình cờ rơi vào.
- **Chuyển trang đi rồi quay lại (SPA):** chỉ gọi `GET /me`, không gọi `sync/pull`; B không thấy gì sau 12 giây (đủ 4 vòng nav).
- **visibilitychange:** không có gì xảy ra (mã chỉ nghe `focus`, `online` và bộ đếm 120 giây); B không thấy gì sau 8 giây.
- **focus:** B gọi `GET /sync/pull` ngay, thấy toàn bộ thay đổi trong cửa sổ quan sát (dưới 8 giây).
- **reload:** B gọi `GET /me` rồi `GET /sync/pull` (không tải lại snapshot), thấy toàn bộ trong dưới 12 giây.

## Request mạng của B

- Chỉ có `GET /me` và `GET /sync/pull`. Không có REST GET danh sách (`/classes`, `/students`, …) nào ngoài snapshot lúc đăng nhập.
- `sync/pull` xảy ra ở: sau đăng nhập, tick 120 giây, focus, reload. Không xảy ra ở nav và visibilitychange.
- Mỗi pull sau thao tác của A trả gộp cả lô (khoảng 12 loại thực thể), `has_more` false, 1 request.

## Request của A

- Thao tác REST (lớp, học sinh, buổi, báo cáo) gọi thẳng REST, chờ máy chủ, không qua hàng đợi; cần mạng.
- Thao tác offline-được đi qua `sync/push`, mỗi lệnh `applied`; điểm danh cả lớp gửi 2 lệnh `attendance.set` (mỗi em một lệnh) trong 1 request. Không có lệnh `rejected` hay `duplicate`.
- Ngay sau mỗi push A gọi `sync/pull` (khớp offline-plan).

## Chưa xác định / lỗi script

- **Nhận xét chung của báo cáo:** bước phát hành thấy `report_publication` và `report` ở cùng lần pull, nhưng điều kiện "`general_comment` khớp" của script không khớp cả 4 vòng. Có thể do script điền mọi ô nhận xét trong trang hoặc `report` chưa mang `general_comment`. Chưa tìm nguyên nhân; không kết luận về lỗi sản phẩm.
- **Vòng 3** bước "sửa buổi lẻ" của A lỗi script (timeout ô ghi chú), nên không có dòng này ở vòng 3; vòng 1, 2, 4 có.
- Lệnh `homework.assign` và "chấm BTVN từ phần giao nhiều phần" chưa đo (UI chỉ giao từng phần bằng `homework.section.upsert`).
- Chưa đo trường hợp B ở nhiều trang khác nhau, chưa đo Safari/iPhone thật, và "thấy" chưa đối chiếu từng màn hình.

## Quan sát phụ

- Sau đăng nhập, snapshot tải tuần tự nhiều request (`class`, `student`, `class_session`, … mỗi thực thể một request), mất khoảng 3–18 giây cho workspace gần trống; mở thẳng một đường dẫn sâu lúc đó hiện "Không tìm thấy lớp/buổi học" cho tới khi snapshot xong.
- Một lần quan sát (chưa lặp lại có kiểm soát): ngay sau khi A tạo buổi lẻ, danh sách buổi chỉ hiện buổi đó, 7 buổi sinh theo lịch xuất hiện lại sau khi tải lại trang.

## Kết luận

1. Với một tài khoản trên hai thiết bị, B **không** thấy thay đổi của A trừ khi có `sync/pull`. Có bốn nguồn kích hoạt pull: tick 120 giây, focus, reload và (khi B tự ghi) sau push. Chuyển trang trong ứng dụng và visibilitychange không kích hoạt.
2. Tất cả loại dữ liệu trong bảng đi cùng một đường pull (`change_log`) nên hành vi giống nhau, kể cả dữ liệu A ghi bằng REST. Không có loại nào "không bao giờ" thấy.
3. Điểm yếu: độ trễ tới 120 giây khi B chỉ mở và chờ; trên iPhone, tab ẩn không phát `focus` đáng tin, nên B có thể trễ hơn nữa. Gợi ý (ngoài phạm vi bước đo này): thêm `visibilitychange` và pull khi chuyển trang.

## Chạy lại bằng một lệnh

```
cd /tmp/qlh-data-api/two-device && node register.mjs --force && node main.mjs --out=results.json
```

`register.mjs` tạo workspace mới (giới hạn 5 lần đăng ký/giờ/IP; bỏ `--force` để dùng lại tài khoản trong `creds.json`, chmod 600). `main.mjs` chạy khoảng 10 phút, dùng Chrome hệ thống (`QLH_CHROME` để đổi). Thêm `--rounds=1,2` hoặc `--a-only` để chạy rút gọn.
