# Đặc tả: App quản lý lớp tiếng Anh

Cập nhật: 2026-10-16 · Trạng thái: đã chốt phạm vi bản đầu (mục 8) và luồng mời phụ huynh (mục 4).

## 1. Tổng quan

App cho giáo viên tiếng Anh dạy lớp riêng tại Việt Nam. Giáo viên có nhiều lớp, mỗi lớp dưới 20 học sinh. Phụ huynh có tài khoản riêng và chỉ xem dữ liệu của con mình.

- **Nền tảng:** PWA, ưu tiên iPhone, gọn nhẹ và dùng được khi mạng ở lớp học chập chờn (offline-first cho thao tác tại lớp). Giáo viên có thêm bản web (desktop). Kiến trúc và stack: [architecture.md](architecture.md).
- **Ngôn ngữ:** Việt–Anh.
- **Thiết kế:** artifact https://claude.ai/artifact/45L4h3VhEUQ8Jw2pJd5421 (21 màn: mobile giáo viên, phụ huynh, chung, web giáo viên).

## 2. Actor

| Actor | Mô tả |
|---|---|
| Giáo viên | Tạo lớp, thêm học sinh, điểm danh, nhập điểm, nhận xét, phát hành báo cáo, mời phụ huynh. Là người duy nhất tạo lớp và thêm học sinh. |
| Phụ huynh | Một tài khoản có thể liên kết nhiều con (kể cả khác lớp). Chỉ xem, không sửa dữ liệu. |
| Hệ thống | Phân quyền, tính toán, sinh PDF, thông báo, đồng bộ. |

## 3. Quy tắc nghiệp vụ đã chốt

1. **Điểm lớp:** phụ huynh chỉ thấy điểm của con. Không hiển thị điểm trung bình lớp.
2. **Điểm trung bình:** trung bình cộng đơn giản, mọi bài ngang nhau, không có hệ số.
3. **Học sinh nghỉ hoặc chuyển lớp:** giữ lịch sử, đánh dấu "đã nghỉ", lưu ngày vào lớp và ngày rời lớp. Không xóa dữ liệu điểm danh, điểm cũ.
4. **Học phí:** ngoài phạm vi bản này.

## 4. Quy tắc đề xuất (chờ duyệt)

**Điểm danh và buổi học**
- Trạng thái: Có mặt, Muộn, Có phép, Vắng.
- Muộn tính là có đi học. Có phép không bị trừ chuyên cần (đã chốt).
- Cảnh báo giáo viên khi một em vắng 2 buổi liên tiếp.
- Buổi học có thể hủy, dời, học bù. Số buổi chỉ đếm buổi đã diễn ra.
- Sửa điểm danh sau khi lưu được, có ghi lịch sử thay đổi.

**Điểm**
- Vắng thi và chưa nhập điểm: không tính vào trung bình, hiển thị rõ là "chưa có điểm".
- Sửa điểm sau khi đã phát hành báo cáo: phụ huynh thấy điểm mới ngay; báo cáo đã phát hành ghi chú "điểm có cập nhật, cần phát hành lại" (đã chốt).
- Sửa điểm có ghi lịch sử.

**Nhận xét và báo cáo**
- Nhận xét sau buổi chỉ gửi cho phụ huynh khi giáo viên bấm gửi.
- Báo cáo chỉ phụ huynh thấy sau khi giáo viên phát hành.
- Nội dung báo cáo: chuyên cần, điểm từng bài, trung bình, nhận xét chung. Có bản nháp, cho phép phát hành lại.
- Kỳ báo cáo: theo tháng hoặc 3 tháng gần nhất.

**Tài khoản**
- Mời bằng số điện thoại: giáo viên nhập SĐT phụ huynh khi thêm học sinh. Bấm "Mời cả lớp" thì mỗi phụ huynh nhận một link riêng qua SMS hoặc Zalo. Phụ huynh mở link, xác nhận OTP đúng SĐT đó, hệ thống tự liên kết mọi con có cùng SĐT (kể cả khác lớp).
- Link dùng một lần, hết hạn sau 7 ngày, gửi lại được. Gắn nhầm người thì giáo viên sửa SĐT trên hồ sơ học sinh, liên kết cũ bị gỡ.
- Dự phòng cho người dùng số khác (ông bà, người đón): mỗi lớp có link hoặc mã QR chung. Phụ huynh nhập tên con, giáo viên duyệt bằng 1 chạm.
- Màn kích hoạt chỉ hiện tên con sau khi OTP đúng.
- Phụ huynh chỉ thấy con được cấp quyền.

## 5. Tính năng theo actor

Ký hiệu thiết kế (TK): ✓ đã có màn · ◐ có nhưng cần sửa · ✗ chưa có.

### 5.1 Giáo viên (mobile + web)

| Nhóm | Tính năng | TK |
|---|---|---|
| Lớp học | Danh sách lớp, việc cần làm hôm nay | ✓ |
| | Tạo lớp (tên, ngày giờ học, thang điểm mặc định) | ✓ |
| | Sửa lớp, đóng hoặc lưu trữ lớp | ✗ |
| | Chuyển nhanh giữa các lớp | ◐ |
| Lịch & buổi học | Lịch buổi học theo tuần | ✗ |
| | Hủy, dời, học bù; đánh số buổi | ✗ |
| Học sinh | Thêm học sinh, thêm từ lớp khác | ◐ |
| | Hồ sơ học sinh (thông tin, các lớp, lịch sử) | ✗ |
| | Đánh dấu nghỉ học, chuyển lớp | ✗ |
| Điểm danh | Điểm danh theo buổi | ✓ |
| | Ghi chú giờ đến muộn, sửa sau lưu, cảnh báo chưa lưu | ✗ |
| | Lịch sử điểm danh, cảnh báo vắng 2 buổi liên tiếp | ◐ |
| Điểm số | Tạo bài kiểm tra (tên, ngày, thang điểm; bỏ hệ số) | ✓ |
| | Nhập điểm, vắng thi, bảng điểm cả lớp | ✓ |
| | Sửa điểm có lịch sử | ✗ |
| Nhận xét | Nhận xét sau buổi, câu mẫu, gửi phụ huynh | ✓ mobile, ✗ web |
| | Nhận xét tổng hợp theo tháng hoặc 3 tháng | ✗ |
| Báo cáo | Chọn kỳ, xem em nào đủ dữ liệu | ✓ |
| | Xem trước PDF đầy đủ, phát hành, phát hành lại | ◐ |
| Phụ huynh | Nhập SĐT phụ huynh ở hồ sơ học sinh, mời cả lớp qua link riêng, gửi lại, duyệt yêu cầu từ link chung của lớp | ◐ |
| Tài khoản | Đăng nhập, đổi và quên mật khẩu, ngôn ngữ, cài đặt giáo viên | ✗ |

### 5.2 Phụ huynh (mobile/PWA)

| Nhóm | Tính năng | TK |
|---|---|---|
| Tài khoản | Kích hoạt bằng link mời và OTP (thay cho nhập mã và đặt mật khẩu) | ◐ |
| | Đăng nhập bằng SĐT và OTP | ◐ |
| | Hướng dẫn cài PWA, mở bằng Safari | ✗ |
| Con của tôi | Chuyển giữa các con | ✓ |
| | Tổng quan: chuyên cần, điểm trung bình, nhận xét mới nhất | ✓ |
| Điểm danh | Xem theo tháng, thống kê, ghi chú từng buổi | ✓ |
| Điểm số | Điểm từng bài và xu hướng của con (bỏ TB lớp) | ◐ |
| Nhận xét | Nhận xét từng buổi | ✓ |
| | Nhận xét tổng hợp theo kỳ | ✗ |
| Báo cáo | Chọn kỳ, xem trước, tải PDF, chia sẻ | ✓ |
| Cài đặt | Hồ sơ, Việt/Anh, thông báo, đổi mật khẩu, đăng xuất | ◐ |

### 5.3 Hệ thống

| Nhóm | Tính năng |
|---|---|
| Phân quyền | Phụ huynh chỉ thấy con được cấp quyền, kiểm tra ở máy chủ. Dữ liệu mỗi lớp tách biệt. |
| Lời mời | Link riêng dùng một lần, hết hạn 7 ngày, OTP phải khớp SĐT đã khai. Link chung của lớp cần giáo viên duyệt. |
| Dữ liệu | Giữ lịch sử khi nghỉ hoặc chuyển lớp; lịch sử sửa điểm và điểm danh. |
| Tính toán | Trung bình cộng đơn giản; vắng thi và chưa nhập không tính. |
| Thông báo | Có nhận xét, điểm, báo cáo mới. Thông báo quan trọng gửi thêm qua Zalo hoặc SMS. |
| Báo cáo PDF | Sinh PDF trên máy giáo viên khi phát hành, lưu bản chụp của phiên bản đã phát hành trên máy chủ, bản nháp, phát hành lại. |
| Song ngữ | Giao diện, lỗi, thông báo, ngày tháng, PDF. |
| PWA | Cài lên màn hình chính, giữ đăng nhập lâu. |
| Offline | Điểm danh, nhập điểm, vắng thi, tạo bài kiểm tra và soạn nhận xét ghi được khi mất mạng, tự đồng bộ khi có mạng. Hiện rõ "Đã lưu trên máy" (chờ đồng bộ) và "Đã đồng bộ". Phụ huynh xem được dữ liệu đã tải kèm thời gian cập nhật. Cần có mạng: OTP, mời và duyệt phụ huynh, gửi nhận xét, phát hành báo cáo. Hai thiết bị sửa cùng một ô: giữ cả hai giá trị và hiện cờ để giáo viên chọn. Không cho đăng xuất khi còn thay đổi chưa đồng bộ. |
| Trạng thái chung | Đang tải, rỗng, lỗi lưu, mất mạng. |

## 6. PWA: lưu ý cho phụ huynh

- Cài lên màn hình chính phải qua Safari (Chia sẻ → Thêm vào Màn hình chính). Mở link trong Zalo hoặc Facebook thì không cài được.
- Thông báo đẩy trên iPhone chỉ hoạt động sau khi cài (iOS 16.4 trở lên).
- Face ID không gọi trực tiếp được; dùng passkey (WebAuthn).
- Cách giảm rắc rối: dùng được ngay không cần cài; đăng nhập bằng số điện thoại cộng mã SMS hoặc Zalo; màn hướng dẫn 3 bước có hình; màn "mở bằng Safari"; thông báo quan trọng gửi thêm qua Zalo hoặc SMS.

## 7. Rủi ro của luồng mời bằng SĐT

- SĐT có thể đổi chủ hoặc giáo viên nhập sai: bắt buộc OTP, và link chung của lớp phải được giáo viên duyệt.
- OTP SMS tốn phí từng tin; bản đầu chỉ dùng SMS cho đăng nhập và mời.
- Link mở trong Zalo không cài được PWA: sau link phải có hướng dẫn "Mở bằng Safari".

## 8. Phạm vi

**Bản đầu**
- Lớp: tạo, sửa, lưu trữ lớp; thang điểm cố định 10.
- Học sinh: thêm (kèm SĐT phụ huynh), đánh dấu nghỉ, giữ lịch sử; hồ sơ cơ bản.
- Buổi học: tự sinh theo lịch lặp của lớp; hủy buổi bằng 1 nút.
- Điểm danh: 4 trạng thái, sửa sau lưu, cảnh báo vắng 2 buổi trong app.
- Điểm: tạo bài kiểm tra, nhập điểm, vắng thi, trung bình cộng; ghi log sửa điểm trong DB.
- Nhận xét sau buổi, câu mẫu, giáo viên bấm gửi.
- Báo cáo theo tháng: xem trước, phát hành, PDF.
- Phụ huynh: xem điểm danh, điểm, nhận xét, báo cáo của con; chuyển giữa các con.
- Hệ thống: phân quyền ở máy chủ, thông báo trong app và push.
- Offline cho điểm danh, nhập điểm, vắng thi, tạo bài kiểm tra, soạn nhận xét (hàng đợi ghi, đồng bộ lại, báo trạng thái lưu).
- Chạy mobile/PWA, giao diện tiếng Việt.

**Làm sau**
- Bản web giáo viên (màn đầu tiên nên làm: bảng điểm hoặc báo cáo).
- Lịch tuần đầy đủ, dời buổi, học bù; thêm học sinh từ lớp khác, chuyển lớp, hồ sơ học sinh chi tiết.
- Nhận xét tổng hợp theo kỳ, báo cáo 3 tháng (có thể gợi ý bằng AI).
- Giao diện tiếng Anh, passkey.
- Thông báo qua Zalo hoặc SMS.
- Màn lịch sử điểm danh và lịch sử sửa điểm.

**Chưa nên làm**
Học phí, chat với giáo viên, xin nghỉ trong app, nhập danh sách từ Excel, thang điểm tuỳ chỉnh, hiển thị lịch sử sửa điểm cho phụ huynh.

## 9. Phi chức năng

- Gọn nhẹ cho mạng yếu: JS tải ban đầu mục tiêu không quá 200 KB gzip (chưa đo, đo rồi mới siết).
- Thao tác chính tại lớp (điểm danh, nhập điểm) không chờ mạng.
- Không mất dữ liệu khi đồng bộ: chỉ xoá thay đổi chờ gửi khi máy chủ đã xác nhận.
- Không ghi SĐT và nội dung nhận xét vào log lỗi.

## 10. Việc thiết kế tiếp theo

0. Đổi màn kích hoạt sang link mời + OTP; thêm ô SĐT phụ huynh ở form thêm học sinh; thêm màn duyệt yêu cầu từ link chung.

1. Bỏ "TB lớp" khỏi màn Điểm số phụ huynh.
2. Bỏ hệ số ở màn Tạo bài kiểm tra và Bảng điểm web.
3. Thêm màn Lịch buổi học, Hồ sơ học sinh, hướng dẫn cài PWA.
4. Thêm màn Nhận xét, tạo/sửa lớp, tạo bài kiểm tra trên web.
5. Thiết kế trạng thái rỗng, lỗi, offline.
6. Hoàn thiện quên và đổi mật khẩu, song ngữ.
