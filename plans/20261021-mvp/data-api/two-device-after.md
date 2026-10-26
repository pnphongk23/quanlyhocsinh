# V-2 · Hai thiết bị sau sửa

Ngày chạy: 2026-10-23. Staging web build `f31150e`, deploy `0b11361d`, entry `index-B8MD-40o.js`; API version `6f2338f6-acab-4596-be93-c162bb590d39`. Đăng ký workspace giả mới; hai context A/B đăng nhập đúng một lần mỗi context. Không ghi/in SĐT, mật khẩu hoặc nội dung nhận xét vào report/log; artifact chỉ giữ nhãn thao tác, route/status, trigger và thời gian.

## Bảng trước/sau

`✓` = B thấy bản ghi trong IndexedDB sau trigger; `✗` = chưa thấy trong cửa sổ quan sát; `—` = không thể kết luận. Trước lấy từ `two-device-before.md`. Thứ tự trigger sau: R1 `idle → nav → visibilitychange → focus → reload`; R2 `nav → visibilitychange → focus → reload`; R3 `reload → nav → visibilitychange → focus`; R4 `visibilitychange → focus → nav → reload`. Cột sau ghi trigger đầu tiên thấy dữ liệu mới ở B, cùng độ trễ từ lần ghi A.

| Loại dữ liệu / thao tác A | Trước: idle / nav / visibility / focus / reload | Sau R1 | Sau R2 | Sau R3 | Sau R4 |
|---|---|---|---|---|---|
| Lớp: tạo, sửa lịch | tick / ✗ / ✗ / ✓ / ✓ | idle, 79/75 s* | reload, 80/75 s | reload, 79/75 s | focus, 81/76 s |
| Học sinh: thêm, sửa tên qua API | tick / ✗ / ✗ / ✓ / ✓ | idle, 71/67 s* | reload, 71/68 s | reload, 71/68 s | focus, 72/69 s |
| Buổi: thêm, sửa, huỷ | tick / ✗ / ✗ / ✓ / ✓ | idle, 65/63/57 s | reload, 66/64/57 s | reload, 66/64/57 s | focus, 66/64/57 s |
| Điểm danh | tick / ✗ / ✗ / ✓ / ✓ | — | — | — | — |
| Phiếu nhận xét: lưu nháp | tick / ✗ / ✗ / ✓ / ✓ | idle, 35 s | reload, 35 s | reload, 35 s | focus, 35 s |
| Phiếu nhận xét: gửi | tick / ✗ / ✗ / ✓ / ✓ | idle, 31 s | visibilitychange, 44 s | reload, 33 s | focus, 31 s |
| BTVN: giao | tick / ✗ / ✗ / ✓ / ✓ | idle, 22 s | visibilitychange, 35 s | reload, 25 s | focus, 23 s |
| BTVN: chấm | tick / ✗ / ✗ / ✓ / ✓ | idle, 50 s | visibilitychange, 28 s | reload, 17 s | focus, 15 s |
| Bài kiểm tra: tạo | tick / ✗ / ✗ / ✓ / ✓ | idle, 46 s | visibilitychange, 24 s | reload, 13 s | focus, 11 s |
| Điểm: nhập | tick / ✗ / ✗ / ✓ / ✓ | idle, 43 s | visibilitychange, 20 s | reload, 10 s | focus, 8 s |
| Báo cáo: nhận xét chung | chưa xác định / — / — / — / — | — | — | — | — |
| Báo cáo: phát hành | tick / ✗ / ✗ / ✓ / ✓ | idle, 36 s | visibilitychange, 13 s | reload, 2 s | visibilitychange, 1 s |

\* Chờ yên được đặt 70 giây tính từ lần ghi cuối của A. B thấy các thay đổi trong lượt này, nhưng ba thao tác đầu của chuỗi được phát hiện sau 79, 75 và 71 giây tính từ chính thời điểm ghi; vì vậy chưa đạt ngưỡng 70 giây cho từng thay đổi riêng lẻ. Độ trễ R1 của các loại còn lại là 22–67 giây.

Điều hướng SPA ở R2 không làm B thấy thay đổi. `visibilitychange` sau đó đồng bộ phiếu đã gửi, BTVN, bài kiểm tra, điểm và phát hành báo cáo. R3 kiểm tra reload; R4 kiểm tra `visibilitychange` rồi focus và B thấy dữ liệu chờ tương ứng ở focus/visibility. Các số đo là thời gian tới khi IndexedDB của B có bản ghi, không phải thời gian phản hồi request.

## Ca chưa xác minh

- **Điểm danh:** cả bốn vòng A đều timeout 15 giây ở thao tác click trong bước “điểm danh S1”; không có `attendance.set` nên không có thay đổi để kiểm tra đồng bộ ở B. Đây là lỗi locator/UI của kịch bản, không kết luận được hành vi đồng bộ điểm danh.
- **Nhận xét chung báo cáo:** A nhận phản hồi ghi REST thành công và B pull có một `report` upsert, nhưng predicate đọc bản ghi không khớp; không đánh dấu là đã thấy. Không ghi giá trị nhận xét vào artifact.
- **Idle:** chỉ có một lượt idle, bị giới hạn 70 giây từ lần ghi cuối; ba thay đổi đầu tiên quá 70 giây tính từ lúc ghi A như ghi chú trên.
- Kịch bản ổn định: lỗi context đóng được bắt ở mức vòng chạy và đóng browser an toàn; reload chỉ gọi trong các bước reload của thang. Không có context đóng trong lần chạy này.

## Trigger pull khi pull đang chạy

Ca riêng `focus → visibilitychange` chạy trên context mới; mỗi context đăng nhập một lần. Giữ request pull đầu 1,5 giây tại route mạng, phát `visibilitychange` trong lúc request còn chờ, rồi đo bằng CDP. Kết quả: 2 GET `/sync/pull`; request thứ hai bắt đầu sau khi request đầu kết thúc, cách lần bắt đầu đầu 1.708 giây; kết thúc với 0 request đang hoạt động. Xác nhận trigger quay lại app được chạy thêm một vòng sau pull đang thực thi. Tài khoản chỉ có một vai; đo đổi vai warm được bỏ qua.

## Bổ sung

### Idle-only, 3 vòng

Web staging đối chiếu khớp build `f31150e` / deploy `0b11361d` / entry `index-B8MD-40o.js`. B mở `/lop`; A dùng REST tạo lớp → học sinh → buổi lẻ. Mỗi POST trả 201. Hai Chrome process riêng, bật `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`; CDP ghi request API bắt đầu/kết thúc; B được đọc trạng thái mỗi 5 giây. Trong mọi mẫu B là `visible` và `hasFocus=true`.

| Vòng | 2xx REST lớp / học sinh / buổi (từ bắt đầu vòng) | GET pull kế tiếp: bắt đầu / kết thúc (từ mốc idle B) | B thấy lớp / học sinh / buổi trong IndexedDB | Pull bỏ sót? |
|---|---|---|---|---|
| 1 | 0.30 / 0.51 / 0.72 s | 24.39 / 24.77 s | 24.76 / 24.55 / 24.34 s | Không |
| 2 | 0.30 / 0.57 / 0.72 s sau khi vòng 1 được phát hiện | 84.39 / 84.77 s | 59.73 / 59.46 / 59.31 s sau từng 2xx | Không |
| 3 | 0.25 / 0.44 / 0.61 s sau khi vòng 2 được phát hiện | 144.39 / 144.81 s | 59.75 / 59.56 / 59.39 s sau từng 2xx | Không |

Các khoảng bắt đầu giữa 4 GET pull quan sát được là 56.94, 60.00 và 60.00 s; ba pull trả 200 sau mốc idle bắt đầu. Lần đầu chờ khoảng 24.4 s do pull timer đã được lập lịch trước mốc idle; hai vòng sau ghi ngay sau khi pull trước hoàn tất nên đợi gần đủ 60 s. Pull 200 kế tiếp sau từng nhóm ghi đã làm cả ba loại xuất hiện trong IndexedDB; không có bản ghi bị pull bỏ qua. Do B ở foreground/visible và browser giảm throttling đã tắt mà vẫn thấy khoảng chờ gần 60 s, nguyên nhân của các số 71–79 s cũ phù hợp với pha timer poll cộng độ trễ thao tác/đo, không phải B bị background throttle trong ca này. Kịch bản trước không giữ được xác nhận đúng pull do predicate path có tiền tố sai; bảng này ghép sự xuất hiện IndexedDB theo thời gian với CDP pull và không khẳng định có kiểm tra body/upsert ở lần đo này.

CDP trace B chứa thời điểm bắt đầu/kết thúc, method/path/status cho tất cả API request gồm OPTIONS; file tạm `/tmp/qlh-data-api/two-device/idle-cadence-result.json` để quyền `0600`. Nó không chứa số điện thoại, mật khẩu hoặc nội dung nhận xét.

### Attendance và nhận xét chung

Kịch bản attendance được sửa để đổi trạng thái một học sinh (trạng thái mặc định đã là có mặt nên nút “Tất cả có mặt” có thể không tạo thay đổi), rồi mới bấm lưu và chờ kết quả `attendance.set`. Predicate báo cáo được sửa sang kiểm tra `general_comment`/`generalComment` là chuỗi có độ dài > 0, không so sánh hay ghi giá trị. Chưa chạy xác nhận lại hai ca này: bốn context đăng nhập multi-role đã dùng hết giới hạn 4 login được phép của tài khoản mới trước khi phát hiện lỗi locator chọn vai. Do đó không kết luận attendance applied hay B thấy attendance/comment ở `visibilitychange`; hai hàng này tiếp tục là chưa xác minh.

## Bổ sung 2

Không tạo workspace mới ở lượt cuối. Lượt trước ghi nhận đã dùng 5/5 lượt đăng ký `register:ip`/giờ; lần thành công gần nhất là 11:04 UTC và lần kiểm tra này lúc 11:16 UTC vẫn trong cửa sổ một giờ. Không có API chỉ đọc để xác nhận bộ đếm hiện tại sau khi các lượt cũ hết hạn, nên không gửi thêm request đăng ký có thể tạo tài khoản hoặc tăng bộ đếm. Vì không có tài khoản/context mới, thứ tự ưu tiên (A/B attendance + nhận xét chung, rồi cold/warm multi-role) chưa chạy ở lượt này; không ghi credentials mới.

## Bổ sung 3

Theo lượt cho phép bổ sung, dùng tài khoản giả đã có trong workspace giả; không đăng ký thêm. A/B đều không ghi SĐT hoặc nội dung nhận xét vào artifact. Không gặp HTTP 429.

| Dữ liệu / thao tác A | Xác nhận ghi A | B: trigger và lúc thấy dữ liệu | Kết quả |
|---|---|---|---|
| Điểm danh: đổi trạng thái một học sinh rồi lưu | `POST /sync/push` HTTP 200; `attendance.set` = `applied` | Trước đó B chưa có bản ghi; sau `visibilitychange`, thấy trong IndexedDB sau 212 ms; tổng từ lúc A lưu là 2.510 ms | Thấy ở visibilitychange |
| Nhận xét chung báo cáo | REST HTTP 200 | `visibilitychange` xảy ra sau 1 ms; B thấy trường nhận xét chung không rỗng sau 420 ms nữa (421 ms từ lúc A lưu) | Thấy ở visibilitychange; chỉ lưu độ dài 24, không lưu giá trị |

Trong cùng workspace, REST thêm một học sinh liên kết phụ huynh tới tài khoản giáo viên giả trả 201; `GET /me` trả 200 và xác nhận 2 membership, trong đó có 1 membership phụ huynh. Chi tiết định danh và nội dung nhập được giữ ngoài báo cáo.
