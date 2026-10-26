# Review r1 — Tài khoản (đăng nhập SĐT + mật khẩu)

Đã đối chiếu brief, outbox 01, `docs/spec.md` (mục 4, 5.1, 5.2, 8), `lead-brief.md` mục 1 và 24 ảnh trong thư mục `auth-r1/`. Ảnh là căn cứ chính; không phán xét các quyết định nghiệp vụ còn chờ xác nhận.

## Đối chiếu outbox

| Mục | Kết quả | Ảnh và ghi chú |
|---|---|---|
| (1) Đăng nhập | ĐÚNG | 01–03, 14–16: chung một luồng SĐT +84 và mật khẩu, có biểu tượng hiện/ẩn; có đăng ký cho giáo viên và hướng dẫn cho phụ huynh. Lỗi dùng câu trung tính “Số điện thoại hoặc mật khẩu không đúng”; trạng thái khóa nêu thử lại sau 15 phút. |
| (2) Đăng ký workspace | ĐÚNG | 04, 17: có tên hiển thị, tên không gian, SĐT, mật khẩu/nhập lại, gợi ý độ mạnh, tối thiểu 8 ký tự và ghi chú người tạo là quản trị viên đầu tiên. Dữ liệu mẫu giáo viên nhất quán. |
| (3) Đổi mật khẩu bắt buộc lần đầu | ĐÚNG | 05–06, 18–19: có mật khẩu tạm, mật khẩu mới và nhập lại; không thấy nút bỏ qua/quay lại; biến thể trùng mật khẩu tạm báo lỗi rõ. |
| (4) Quên mật khẩu | ĐÚNG | 07–08, 20–21: phụ huynh được hướng dẫn nhờ giáo viên cấp lại; giáo viên được hướng dẫn liên hệ quản trị viên. SĐT hiển thị chỉ đọc và không có luồng gửi mã. |
| (5) Chọn vai trò | ĐÚNG | 09, 22: có hai thẻ Giáo viên · Lớp của cô Lan và Phụ huynh · Bé Minh Anh; có ghi chú đổi vai trò trong Cài đặt. |
| (6) Cài đặt tài khoản | SAI (một điểm MINOR) | 10–13, 23–24: đổi mật khẩu, đổi vai trò khi có nhiều vai trò, đăng xuất và chặn đăng xuất kèm giải thích đều có. Riêng ảnh 23 cho phép sửa tên hiển thị; brief mô tả tên và SĐT trong hồ sơ là chỉ đọc. Xem A1-01. |

## Findings

| ID | Mức | Màn | Mô tả | Căn cứ | Đề xuất sửa |
|---|---|---|---|---|---|
| A1-01 | MINOR | 23 — Web · Tài khoản · Cài đặt tài khoản | Trường “Tên hiển thị” là ô nhập và có nút “Lưu tên”, trong khi outbox mô tả hồ sơ gồm tên và SĐT chỉ đọc. | Outbox 01, mục (6); ảnh 23. | Hiển thị tên như thông tin chỉ đọc, bỏ nút “Lưu tên”. Nếu muốn cho sửa tên, cần cập nhật yêu cầu trước khi giữ hành vi này. |
| A1-02 | MINOR | 11 — Mobile · Tài khoản · Cài đặt · Phụ huynh | Tên hồ sơ ghi “Me của Minh Anh”, thiếu dấu tiếng Việt. | Brief yêu cầu chữ tiếng Việt đúng dấu; ảnh 11. | Sửa thành “Mẹ của Minh Anh”. |

Không thấy BLOCKER hoặc MAJOR. Không ghi nhận SĐT hay mật khẩu thật trong báo cáo; các SĐT mẫu của nhóm Tài khoản nhất quán với brief.

## Chỗ Claude Design tự quyết

- **ĐỒNG Ý:** Dải gợi ý độ mạnh mật khẩu và các chỉ báo tối thiểu 8 ký tự làm rõ yêu cầu trong form đăng ký/đổi mật khẩu.
- **ĐỒNG Ý:** Màn quên mật khẩu phụ huynh trình bày các bước xử lý và nêu rõ không gửi mã; màn giáo viên nêu liên hệ quản trị viên.
- **KHÔNG ĐỒNG Ý:** Cho sửa tên hiển thị ngay trong Cài đặt web (ảnh 23), vì outbox yêu cầu hồ sơ chỉ đọc; đề nghị sửa theo A1-01.

## Đã kiểm, đạt

- Không thấy OTP, SMS, mã xác nhận gửi qua tin nhắn, link mời, QR/link chung lớp, duyệt yêu cầu hoặc màn kích hoạt trong 24 ảnh mới. Câu “Không có mã nào được gửi đến điện thoại của bạn” ở ảnh 07–08 và 20–21 là lời xác nhận không gửi mã, phù hợp outbox.
- Không thấy bài giảng, học phí, lương, nhân sự/mời nhân sự hoặc điểm trung bình trong nhóm ảnh Tài khoản.
- Mẫu giáo viên “Cô Lan” và SĐT `+84 900 000 001`; phụ huynh `+84 900 000 002`; tên Minh Anh, Gia Bảo và lớp 6A/7B được dùng nhất quán ở các màn liên quan. Không thấy mật khẩu thật.
- Lỗi đăng nhập và khóa tạm có trạng thái phân biệt rõ; trên ảnh mobile, nút chính và các thẻ thao tác có kích thước dễ chạm. Bố cục mobile/web cùng ngôn ngữ và cùng hệ thống màu; xanh chính dùng trong ảnh phù hợp sắc xanh prototype, không tính sai khác xanh nhỏ đã nêu trong brief.
- Các màn cũ không nằm trong danh sách 24 target mới; không có màn mới nào trong ảnh nhắc luồng mời cũ.

## Delta Chi tiết lớp

So sánh ba ảnh được nêu trong brief giữa round-2 và round-3; không đánh giá lại các điểm đã chốt trong `decisions.md`.

| Ảnh | Thay đổi quan sát được | Quy tắc cấm / nhất quán dữ liệu |
|---|---|---|
| 11 — Xóa bài kiểm tra chưa có điểm | Nội dung hộp xác nhận và màn nền không đổi nhìn thấy được; chỉ có khác biệt vài pixel sát mép dưới trái của ảnh, không tạo thành thay đổi giao diện đọc được. | Không thấy điểm trung bình, “Vắng thi”, bài giảng, mời hoặc OTP. |
| 13 — Bảng điểm | Phần giao diện và dữ liệu bảng điểm trùng round-2; khác biệt chỉ nằm ở dải tiêu đề ảnh. | Không có cột điểm trung bình hoặc “Vắng thi”. Điểm và tên học sinh tương ứng với dữ liệu báo cáo ở ảnh 15. |
| 15 — Báo cáo | Phần giao diện và dữ liệu báo cáo trùng round-2; khác biệt chỉ nằm ở dải tiêu đề ảnh. | Không có điểm trung bình, “Vắng thi”, bài giảng, mời hoặc OTP. Tổng 10 học sinh, 8/10 sẵn sàng, 2 thiếu dữ liệu và phát hành 7 báo cáo phù hợp ảnh 14; số buổi và điểm gần nhất của Gia Bảo phù hợp ảnh 13. |

**Kết luận thiết kế: APPROVED** — không còn BLOCKER/MAJOR theo ngưỡng brief; đề nghị xử lý hai finding MINOR A1-01 và A1-02.

Status: DONE_WITH_CONCERNS
Summary: Đã hoàn tất đối chiếu 24 ảnh Tài khoản và delta Chi tiết lớp round-2 → round-3; không thấy vi phạm quy tắc cấm trong phạm vi ảnh được yêu cầu. Có hai finding MINOR về tên hồ sơ web đang cho sửa và lỗi dấu “Me” ở ảnh 11; kết luận thiết kế là APPROVED theo tiêu chí brief.
