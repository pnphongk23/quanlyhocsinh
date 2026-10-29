# Metadata App Store (tiếng Việt)

Trạng thái: BẢN NHÁP để người dùng duyệt. Chỉ chuẩn bị, chưa tạo app, chưa upload, chưa submit. Số trong ngoặc là số ký tự đếm bằng script (App Store tính ký tự Unicode).

Phạm vi nội dung: đúng `docs/spec.md` mục 8 "Bản đầu". Không nhắc học phí, bài giảng, nhân sự, role, lương, tải ảnh báo cáo, giao diện tiếng Anh, passkey, Zalo/SMS. Không nhắc thông báo đẩy vì app iOS chưa gắn Firebase Messaging (xem mục Kiểm tra sẵn sàng).

## 1. Tên app (≤30)

1. Quản lý lớp học tiếng Anh (25)
2. Mít: Sổ lớp tiếng Anh (21)
3. Lớp Mít - Quản lý lớp học (25)

Đề xuất: phương án 1 (nói đúng việc, dễ tìm kiếm). Tên app trên App Store phải còn trống; cần kiểm tra khi tạo app. Tên hiện trong máy (`CFBundleDisplayName`) đang là "Quản lý lớp".

## 2. Phụ đề (≤30)

1. Điểm danh, nhận xét, bài tập (28)
2. Sổ lớp cho giáo viên dạy riêng (30)
3. Điểm danh, điểm số, nhận xét (28)

Đề xuất: phương án 1.

## 3. Promotional text (≤170) (145)

Điểm danh bằng một lần vuốt, nhận xét 5 tiêu chí kèm sao, chấm bài tập về nhà và gửi phiếu cho phụ huynh. Ghi được cả khi mạng lớp học chập chờn.

## 4. Mô tả (≤4000) (1640)

Dành cho giáo viên tiếng Anh dạy lớp riêng và phụ huynh theo dõi con.

GIÁO VIÊN
• Lớp và buổi học: tạo lớp, đặt lịch lặp hằng tuần, tự sinh buổi học, hủy buổi chỉ bằng một nút, thêm buổi lẻ. Xem lịch theo ngày và theo tháng.
• Điểm danh nhanh: ba trạng thái Có mặt, Muộn, Vắng. Vuốt trái một dòng học sinh để đổi trạng thái. Có cảnh báo khi học sinh vắng hai buổi liên tiếp.
• Điểm số: tạo bài kiểm tra, nhập điểm theo bước 0,5, so sánh với bài trước theo phần trăm, có nút gán điểm mặc định.
• Nhận xét sau buổi: chấm theo 5 tiêu chí, mỗi tiêu chí đạt được một sao. Câu nhận xét tự sinh, sửa tay được, thêm ghi chú riêng cho từng em. Gán mặc định cho cả lớp rồi chỉ chỉnh những em cần.
• Bài tập về nhà: giao theo từng phần, chấm từng em ở buổi sau, kết quả đi cùng phiếu nhận xét.
• Báo cáo theo tháng: tự chọn khoảng buổi, xem trước, phát hành cho phụ huynh và tải PDF ngay trên máy.
• Làm việc khi mạng yếu: điểm danh, nhập điểm, soạn nhận xét và chấm bài tập ghi được ngay cả khi mất mạng, tự đồng bộ khi có mạng trở lại.

PHỤ HUYNH
• Xem điểm danh, điểm số, nhận xét, bài tập về nhà và báo cáo của con. Chuyển nhanh giữa các con.
• Chỉ thấy dữ liệu của con mình. Phụ huynh đăng nhập bằng số điện thoại mà giáo viên đã khai trong hồ sơ học sinh.

GỌN VÀ RIÊNG TƯ
• Giao diện tiếng Việt, chữ rõ, nút lớn, dùng một tay trên iPhone.
• Dữ liệu mỗi lớp tách biệt. Phụ huynh không thấy điểm trung bình hay dữ liệu của học sinh khác.
• Không quảng cáo, không theo dõi để quảng cáo.

Giáo viên tự đăng ký không gian làm việc bằng số điện thoại và mật khẩu. Cần kết nối mạng để đăng nhập, gửi phiếu nhận xét cho phụ huynh và phát hành báo cáo.

## 5. Từ khoá (≤100, cách nhau dấu phẩy, không lặp tên app) (93)

điểm danh,giáo viên,lớp học,nhận xét,bài tập về nhà,sổ điểm,phụ huynh,gia sư,báo cáo,học sinh

Ghi chú: không đưa từ "tiếng Anh" vào từ khoá nếu chọn tên phương án 1 (đã có trong tên).

## 6. Danh mục và độ tuổi

- Danh mục chính: Education (Giáo dục). Danh mục phụ: Productivity (Năng suất).
- Độ tuổi đề xuất: 4+. Không có nội dung người lớn, không bình luận công khai giữa người dùng, không mua trong app, không quảng cáo. Trả lời bảng câu hỏi độ tuổi của Apple tất cả "Không".
- App không thuộc danh mục Kids: người dùng là giáo viên và phụ huynh, không phải trẻ em. Dữ liệu học sinh (tên, SĐT phụ huynh, điểm, nhận xét) do giáo viên nhập, xem mục App Privacy.

## 7. URL bắt buộc

| Mục | Giá trị |
|---|---|
| Support URL | THIẾU (dự án chưa có trang hỗ trợ) |
| Marketing URL (không bắt buộc) | THIẾU |
| Privacy Policy URL | THIẾU (bắt buộc; chưa có trang chính sách quyền riêng tư) |

Cần người dùng quyết: tên miền và nơi đặt trang. Tối thiểu hai trang tĩnh (hỗ trợ + chính sách). Chính sách phải nói về dữ liệu của học sinh là trẻ vị thành niên do giáo viên nhập, SĐT phụ huynh, thời gian lưu giữ, cách yêu cầu xoá. Không bịa URL; địa chỉ `workers.dev` của staging không dùng được cho App Store.

## 8. Copyright

© 2026 [cần tên chủ sở hữu tài khoản Apple Developer]

THIẾU tên pháp lý (cá nhân hoặc công ty) của tài khoản Apple Developer.

## 9. Bản nháp trả lời App Privacy

Đối chiếu `docs/architecture.md` (bảng `users`, `device_tokens`, nhật ký, đồng bộ) và code iOS hiện tại. Mọi dữ liệu dưới đây đều **gắn với danh tính người dùng** (tài khoản) và **không dùng để theo dõi** (Tracking = Không). Mục đích: App Functionality. Không dùng cho quảng cáo, phân tích bên thứ ba hay cá nhân hoá quảng cáo.

| Loại dữ liệu Apple | Thu thập? | Chi tiết | Ghi chú |
|---|---|---|---|
| Contact Info › Phone Number | Có | SĐT giáo viên/phụ huynh để đăng nhập; SĐT phụ huynh do giáo viên khai trong hồ sơ học sinh | Gắn danh tính |
| Contact Info › Name | Có | Tên hiển thị của giáo viên; tên học sinh do giáo viên nhập | Học sinh là trẻ vị thành niên, dữ liệu do giáo viên nhập |
| Contact Info › Email Address | Có (tuỳ chọn) | Email lưu trong tài khoản để nhận link đặt lại mật khẩu | Không bắt buộc |
| User Content › Other User Content | Có | Điểm danh, điểm số, nhận xét, ghi chú, bài tập về nhà, báo cáo | Gắn danh tính |
| Identifiers › User ID | Có | Mã tài khoản, mã thiết bị đồng bộ | App Functionality |
| Identifiers › Device ID / push token | Chưa | Mã đăng ký thông báo FCM chỉ thu thập sau khi gắn Firebase Messaging. Hiện `NoOpPushRegistrar`, không gửi. Nếu bật push trước khi submit thì đổi thành Có | Cần quyết trước khi submit |
| Diagnostics, Usage Data, Location, Contacts, Photos, Health, Financial, Browsing, Search | Không | Không có SDK phân tích hay quảng cáo; không dùng vị trí, danh bạ, ảnh | Xác nhận lại nếu thêm SDK |

Mật khẩu: lưu băm PBKDF2 trên máy chủ. Apple không có mục riêng cho mật khẩu; xử lý như dữ liệu xác thực, không khai thêm. CẦN XÁC NHẬN với người dùng khi điền form.

## 10. Ghi chú cho App Review

Ứng dụng quản lý lớp tiếng Anh cho giáo viên dạy riêng, kèm phần xem cho phụ huynh. Không có đăng nhập bên thứ ba.

Cách đăng nhập (hai bước):
1. Nhập số điện thoại rồi bấm "Tiếp tục".
2. Nếu số đã có tài khoản, app hiện ô mật khẩu, nhập mật khẩu rồi bấm "Đăng nhập" (hoặc phím Return trên bàn phím).
Số chưa có tài khoản và đã được giáo viên khai cho học sinh sẽ vào màn tự đặt mật khẩu lần đầu (phụ huynh). Số còn lại vào màn đăng ký không gian làm việc cho giáo viên.

Tài khoản demo giáo viên: [cần tài khoản reviewer]
Tài khoản demo phụ huynh: [cần tài khoản reviewer]
(Mỗi tài khoản có lớp, học sinh, buổi học và phiếu nhận xét mẫu. Dữ liệu giả.)

Lưu ý:
- Đăng nhập, gửi phiếu nhận xét và phát hành báo cáo cần kết nối mạng; điểm danh, nhập điểm và soạn nhận xét ghi được khi mất mạng rồi tự đồng bộ.
- Đăng nhập sai nhiều lần sẽ bị khoá tạm 15 phút. Vui lòng nhập đúng mật khẩu demo.
- Ứng dụng không thu thập dữ liệu để theo dõi hay quảng cáo.

Không ghi SĐT hay mật khẩu thật vào file này. Tài khoản reviewer phải tạo trên môi trường production khi có.

## Đề xuất bổ sung khi gộp phân quyền (chờ người dùng duyệt, chưa áp dụng)

Từ 2026-10-29 bản nộp đầu tiên có nhân sự, ma trận quyền, chọn/đổi vai trò (`docs/spec.md` mục 8 "Bản đầu"). Dòng "Phạm vi nội dung" ở đầu file và các mục 4, 10 hiện vẫn ghi "Không nhắc ... nhân sự, role"; cần sửa cho khớp nếu duyệt. Nháp, không phải mô tả đã chốt:

**Mô tả (mục 4), thêm trong khối GIÁO VIÊN, trước dòng "Làm việc khi mạng yếu":**
• Cộng tác: chủ không gian làm việc thêm giáo viên hoặc trợ giảng bằng số điện thoại, gán lớp và chỉnh quyền từng vai trò. Mỗi người chỉ thấy lớp được gán và dùng đúng quyền của mình; ai có nhiều vai trò thì chọn và đổi trong Cài đặt.

**Ghi chú cho App Review (mục 10), thêm:**
- Tài khoản demo trợ giảng (tuỳ chọn, không bắt buộc; tài khoản giáo viên demo đủ để duyệt màn Nhân sự): [cần tài khoản reviewer] (chỉ thấy lớp được gán, không sửa được điểm, lớp, học sinh; dữ liệu giả). Tài khoản demo giáo viên là chủ không gian: vào Cài đặt → Nhân sự để thêm, gán lớp, đổi vai trò, chỉnh quyền.
- Người dùng có nhiều vai trò chọn vai trò sau khi đăng nhập và đổi trong Cài đặt.

Cần kiểm lại trước khi nộp: đường dẫn "Cài đặt → Nhân sự" đúng tên màn trong app; App Privacy (mục 9) không đổi vì nhân sự chỉ thêm tên và SĐT do Admin nhập, cùng loại dữ liệu đã khai; ảnh chụp màn hình App Store có cần thêm màn nhân sự không.
