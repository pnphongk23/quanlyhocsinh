# Testcase: Học sinh (STU)

Phạm vi: spec 214 (Học sinh), 28 (nghỉ giữ lịch sử), 63 (phiếu chỉ gồm học sinh đang học), 115 (liên kết phụ huynh theo SĐT). Chuyển lớp, thêm từ lớp khác, hồ sơ chi tiết thuộc "Làm sau", không kiểm.

### TC-STU-001 · Thêm học sinh kèm SĐT phụ huynh
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:214
- Tiền điều kiện + dữ liệu: Lớp `QA-Lớp A`.
- Các bước:
  1. Tab Học sinh → Thêm học sinh.
  2. Nhập tên `QA-HS 1`, SĐT phụ huynh PH-A (ô nói rõ số này dùng để phụ huynh đăng ký và đăng nhập).
  3. Lưu.
- Kết quả mong đợi: Học sinh hiện trong danh sách lớp; có trong điểm danh của các buổi từ ngày vào lớp.
- Flow tự động: (chưa gán)

### TC-STU-002 · Thêm học sinh thiếu tên
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:214
- Tiền điều kiện + dữ liệu: Form thêm học sinh mở.
- Các bước:
  1. Để trống tên, bấm Lưu.
- Kết quả mong đợi: Không thêm; báo lỗi trên ô tên.
- Flow tự động: (chưa gán)

### TC-STU-003 · Thêm học sinh không có SĐT phụ huynh
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:115, 214
- Tiền điều kiện + dữ liệu: Lớp `QA-Lớp A`.
- Các bước:
  1. Thêm học sinh `QA-HS 5` bỏ trống SĐT phụ huynh.
- Kết quả mong đợi: (Chỉ kiểm nếu thêm được; nếu SĐT bắt buộc thì hiện lỗi) Spec nói "thêm (kèm SĐT phụ huynh)" nhưng chưa nêu SĐT có bắt buộc không: xem `../open-questions.md` (Q-03).
- Flow tự động: thủ công: chờ trả lời Q-03.

### TC-STU-004 · Sửa SĐT phụ huynh trên hồ sơ
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:214, 115
- Tiền điều kiện + dữ liệu: `QA-HS 1` đang liên kết phụ huynh PH-A (tài khoản đã có).
- Các bước:
  1. Mở hồ sơ `QA-HS 1`, đổi SĐT phụ huynh sang số PH-B, lưu.
  2. Đăng nhập PH-A kiểm tra; đăng nhập PH-B kiểm tra.
- Kết quả mong đợi: PH-A không còn thấy `QA-HS 1` (gỡ liên kết phụ huynh cũ); PH-B thấy `QA-HS 1`. Sửa SĐT cần mạng.
- Flow tự động: (chưa gán)

### TC-STU-005 · Đánh dấu học sinh nghỉ, giữ lịch sử
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:28, 214
- Tiền điều kiện + dữ liệu: `QA-HS 2` đã có điểm danh và điểm ở vài buổi/bài.
- Các bước:
  1. Mở hồ sơ `QA-HS 2`, đánh dấu nghỉ học.
  2. Xem lại điểm danh buổi cũ và bảng điểm.
- Kết quả mong đợi: Học sinh hiện "đã nghỉ", có ngày rời lớp (và ngày vào lớp); điểm danh, điểm cũ không bị xoá.
- Flow tự động: (chưa gán)

### TC-STU-006 · Học sinh đã nghỉ không có mặt ở buổi sau ngày rời lớp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:63, 28
- Tiền điều kiện + dữ liệu: `QA-HS 2` đã nghỉ (TC-STU-005); buổi N (ngày sau ngày rời lớp); buổi M (ngày trước ngày rời lớp).
- Các bước:
  1. Mở tab Nhận xét của buổi sau ngày rời lớp và của buổi trước ngày rời lớp.
- Kết quả mong đợi: Buổi N không có phiếu cho `QA-HS 2`; phiếu cũ ở buổi M (nếu đã có) vẫn giữ.
- Flow tự động: (chưa gán)

### TC-STU-007 · Học sinh vào lớp muộn: chỉ thuộc các buổi từ ngày vào lớp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:63, 46
- Tiền điều kiện + dữ liệu: Lớp đã có 3 buổi đã diễn ra; thêm `QA-HS Muộn` sau buổi thứ ba (theo ngày).
- Các bước:
  1. Mở tab Nhận xét của buổi thứ hai (theo ngày) và buổi sau ngày vào lớp.
- Kết quả mong đợi: Buổi thứ hai không có phiếu cho `QA-HS Muộn`; các buổi từ ngày vào lớp có. (Điểm: xem `scores.md`, bài kiểm tra trước ngày vào lớp vẫn nhập được.)
- Flow tự động: (chưa gán)

### TC-STU-008 · Học sinh đã nghỉ không dùng cho cảnh báo vắng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:216
- Tiền điều kiện + dữ liệu: `QA-HS 2` đã nghỉ, vắng 2 buổi gần nhất trước khi nghỉ.
- Các bước:
  1. Mở màn điểm danh của buổi gần nhất.
- Kết quả mong đợi: Không có cảnh báo vắng liên tiếp cho học sinh đã nghỉ (chỉ học sinh đang học).
- Flow tự động: (chưa gán)

### TC-STU-009 · Hồ sơ cơ bản hiển thị đúng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:214
- Tiền điều kiện + dữ liệu: `QA-HS 1`.
- Các bước:
  1. Mở hồ sơ học sinh.
- Kết quả mong đợi: Hiện tên, SĐT phụ huynh đã khai, trạng thái học (đang học/đã nghỉ).
- Flow tự động: (chưa gán)
