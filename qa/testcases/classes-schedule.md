# Testcase: Lớp và lịch buổi học (CLS)

Phạm vi: spec 213 (Lớp), 215 (Buổi học), 37 (bỏ đánh số buổi, 2026-10-25), 226 (web desktop). Quy ước: `../README.md`.

### TC-CLS-001 · Tạo lớp với tên và lịch lặp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:213, 215
- Tiền điều kiện + dữ liệu: Đã đăng nhập, workspace smoke.
- Các bước:
  1. Ở danh sách lớp bấm tạo lớp.
  2. Nhập tên `QA-Lớp A`, chọn ngày giờ học (ví dụ Thứ 2 và Thứ 5, 18:00).
  3. Lưu.
- Kết quả mong đợi: Lớp xuất hiện trong "Lớp của tôi"; buổi học tự sinh theo lịch lặp.
- Flow tự động: (chưa gán)

### TC-CLS-002 · Tạo lớp thiếu tên bị chặn
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:213
- Tiền điều kiện + dữ liệu: Màn tạo lớp mở.
- Các bước:
  1. Để trống tên lớp, bấm Lưu.
- Kết quả mong đợi: Không tạo lớp; hiện báo lỗi trên ô tên.
- Flow tự động: (chưa gán)

### TC-CLS-003 · Sửa tên và thông tin lớp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:213
- Tiền điều kiện + dữ liệu: Lớp `QA-Lớp A` đã có.
- Các bước:
  1. Mở lớp → sửa lớp, đổi tên thành `QA-Lớp A2`.
  2. Lưu.
- Kết quả mong đợi: Tên mới hiện ở danh sách lớp và chi tiết lớp; học sinh, buổi học, điểm giữ nguyên.
- Flow tự động: (chưa gán)

### TC-CLS-004 · Lưu trữ lớp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:213, 87 (lưu trữ thay cho xoá cứng), docs/architecture.md:122 (cần mạng)
- Tiền điều kiện + dữ liệu: Lớp `QA-Lớp Lưu trữ` có vài dữ liệu (điểm danh, điểm).
- Các bước:
  1. Mở lớp, chọn lưu trữ lớp, xác nhận.
- Kết quả mong đợi: Lớp được lưu trữ (không xoá cứng; dữ liệu điểm danh, điểm còn nguyên). Lưu trữ lớp cần mạng. Phản ứng giao diện sau lưu trữ (ẩn khỏi danh sách hay không): spec chưa nêu, xem `../open-questions.md` (Q-01).
- Flow tự động: (chưa gán)

### TC-CLS-005 · Lưu trữ lớp khi mất mạng bị chặn
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/architecture.md:122
- Tiền điều kiện + dữ liệu: Mất mạng, lớp bất kỳ.
- Các bước:
  1. Thử lưu trữ lớp.
- Kết quả mong đợi: Không lưu trữ được, hiện lỗi/giải thích cần mạng; lớp giữ nguyên.
- Flow tự động: (chưa gán)

### TC-CLS-006 · Buổi học tự sinh theo lịch lặp, hiện thứ và ngày (không số buổi)
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:215, 37, 216 (không đánh số buổi, 2026-10-25)
- Tiền điều kiện + dữ liệu: Lớp có lịch lặp 2 buổi/tuần, chưa hủy buổi nào.
- Các bước:
  1. Mở tab Buổi học của lớp, đọc các buổi theo thứ tự ngày.
- Kết quả mong đợi: Các buổi tự sinh theo lịch, hiện bằng thứ và ngày (ví dụ "T3 · 21/10"); không có "Buổi 1, Buổi 2…" ở bất kỳ chỗ nào.
- Flow tự động: (chưa gán)

### TC-CLS-007 · Hủy buổi bằng một nút, buổi hủy hiện trạng thái hủy
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:215, 37, 216
- Tiền điều kiện + dữ liệu: Lớp có ít nhất 4 buổi liên tiếp chưa hủy.
- Các bước:
  1. Mở buổi thứ hai theo ngày, bấm hủy buổi.
  2. Xem lại danh sách buổi.
- Kết quả mong đợi: Buổi đó hiện là "hủy"; các buổi khác giữ nguyên thứ/ngày, không có số buổi nào bị đánh lại hay hiện ở đâu.
- Flow tự động: (chưa gán)

### TC-CLS-008 · Màn Buổi học chia "buổi hiện tại" và "các buổi đã qua"
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:215
- Tiền điều kiện + dữ liệu: Lớp có buổi đã diễn ra và buổi sắp tới.
- Các bước:
  1. Mở tab Buổi học.
- Kết quả mong đợi: Hai phần "buổi hiện tại" và "các buổi đã qua", mỗi buổi nằm đúng phần.
- Flow tự động: (chưa gán)

### TC-CLS-009 · Thêm buổi lẻ ngoài lịch lặp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:215, 37
- Tiền điều kiện + dữ liệu: Lớp có lịch lặp; chọn một ngày không thuộc lịch lặp và chưa có buổi.
- Các bước:
  1. Bấm thêm buổi lẻ, chọn ngày đó, lưu.
- Kết quả mong đợi: Buổi lẻ xuất hiện đúng ngày, hiển thị dạng "T3 · 21/10" (không có số thứ tự buổi).
- Flow tự động: (chưa gán)

### TC-CLS-010 · Tab Lịch xem theo ngày và theo tháng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:215
- Tiền điều kiện + dữ liệu: Lớp có buổi trong tháng này.
- Các bước:
  1. Mở tab Lịch.
  2. Chuyển giữa chế độ ngày và tháng.
- Kết quả mong đợi: Cả hai chế độ hiển thị các buổi của lớp đúng ngày; buổi hủy được đánh dấu hủy.
- Flow tự động: (chưa gán)

### TC-CLS-011 · Sửa lịch lặp áp dụng buổi mới
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:215
- Tiền điều kiện + dữ liệu: Lớp lịch Thứ 2 + Thứ 5; hôm nay chưa có dữ liệu buổi nào.
- Các bước:
  1. Sửa lịch lặp thành Thứ 3 + Thứ 6, lưu.
  2. Xem các buổi sắp tới.
- Kết quả mong đợi: Buổi sắp tới sinh theo lịch mới; buổi đã diễn ra, buổi hủy và buổi lẻ được giữ nguyên.
- Flow tự động: (chưa gán)

### TC-CLS-012 · Sửa lịch lặp khi buổi hôm nay đã có dữ liệu
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:215, docs/architecture.md:91
- Tiền điều kiện + dữ liệu: Hôm nay lớp có buổi đã điểm danh (có dữ liệu).
- Các bước:
  1. Sửa lịch lặp, lưu.
- Kết quả mong đợi: Buổi hôm nay giữ nguyên (thành buổi lẻ); lịch mới áp từ ngày mai.
- Flow tự động: (chưa gán)

### TC-CLS-013 · Không sinh thêm buổi vào ngày lớp đã có buổi
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:215
- Tiền điều kiện + dữ liệu: Lớp có buổi lẻ ở ngày X; sửa lịch lặp sao cho ngày X cũng thuộc lịch lặp mới.
- Các bước:
  1. Sửa lịch lặp để có ngày X, lưu; xem ngày X.
- Kết quả mong đợi: Ngày X chỉ có một buổi, không bị nhân đôi.
- Flow tự động: (chưa gán)

### TC-CLS-014 · Chuyển nhanh giữa các lớp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:132 (cột TK ◐, có trong mục 5.1)
- Tiền điều kiện + dữ liệu: Ít nhất hai lớp.
- Các bước:
  1. Từ chi tiết lớp A chuyển sang lớp B bằng thao tác chuyển lớp nhanh.
- Kết quả mong đợi: Hiện đúng dữ liệu lớp B.
- Flow tự động: thủ công: chưa chốt phạm vi (Q-02), không tính vào coverage/pass-fail Bản đầu.

### TC-CLS-015 · Web: Chi tiết lớp có đủ các tab Bản đầu
- Vai: Giáo viên
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:226
- Tiền điều kiện + dữ liệu: Màn hình rộng (desktop), lớp bất kỳ.
- Các bước:
  1. Mở chi tiết lớp.
- Kết quả mong đợi: Có các tab Buổi học, Bài kiểm tra, Điểm, Học sinh, Báo cáo.
- Flow tự động: (chưa gán)

### TC-CLS-016 · Buổi chưa tới ngày chỉ xem hoặc hủy
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:39
- Tiền điều kiện + dữ liệu: Buổi sắp tới (ngày sau hôm nay).
- Các bước:
  1. Mở buổi đó, tab Điểm danh.
- Kết quả mong đợi: Không điểm danh được (nút chọn trạng thái/Lưu bị khoá hoặc không có); vẫn xem và hủy được. Chi tiết điểm danh: `attendance.md`.
- Flow tự động: (chưa gán)

### TC-CLS-017 · Tạo lớp chỉ học Chủ nhật
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:213, 215
- Tiền điều kiện + dữ liệu: Đã đăng nhập; màn tạo lớp.
- Các bước:
  1. Nhập tên `QA-Lớp CN`, chỉ chọn Chủ nhật, giờ 18:00.
  2. Bấm Tạo lớp.
- Kết quả mong đợi: Lớp được tạo; buổi học sinh ra vào các Chủ nhật. (Hợp đồng backend dùng 1–7, Chủ nhật = 7; web từng gửi 0 nên lỗi, xem WEB-002.)
- Flow tự động: (chưa gán)
