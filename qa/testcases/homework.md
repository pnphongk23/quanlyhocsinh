# Testcase: Bài tập về nhà (HW)

Phạm vi: spec 59, 70–76, 219. BTVN không quy ra điểm.

Lưu ý tên gọi (spec 2026-10-25): giao diện không hiện số buổi; "buổi N / N+1" trong testcase chỉ là cách gọi theo thứ tự ngày. Giao diện dùng "Bài tập buổi trước" / "Bài tập hôm nay" hoặc "BTVN ngày dd/mm", và không được có chữ "Buổi N".

### TC-HW-001 · Giao BTVN theo phần ở buổi N
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:70, 219
- Tiền điều kiện + dữ liệu: Buổi N hôm nay, chưa có BTVN.
- Các bước:
  1. Tab Bài tập về nhà → "Bài tập hôm nay" → thêm phần.
  2. Chọn loại Luyện từ vựng, nhập tiêu đề `QA-Từ vựng U1`, mô tả tuỳ chọn; lưu.
- Kết quả mong đợi: Phần được lưu với tiêu đề (mô tả không bắt buộc); không có chỗ đính kèm tệp.
- Flow tự động: (chưa gán)

### TC-HW-002 · Bốn loại phần, mỗi loại tối đa một phần
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:70
- Tiền điều kiện + dữ liệu: Buổi N.
- Các bước:
  1. Thêm lần lượt Luyện từ vựng, Luyện đọc, Luyện nói, Bài tập.
  2. Thử thêm phần thứ hai cùng loại.
- Kết quả mong đợi: Thêm được tối đa 4 phần, mỗi loại một; không thêm được phần trùng loại (nút/lựa chọn bị khoá hoặc báo lỗi). Buổi có 0 phần vẫn hợp lệ.
- Flow tự động: (chưa gán)

### TC-HW-003 · Phụ huynh thấy đề BTVN ngay khi lưu
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:74, 172
- Tiền điều kiện + dữ liệu: Giáo viên vừa lưu phần BTVN ở buổi N; chưa gửi phiếu.
- Các bước:
  1. Đăng nhập PH-A, mở mục BTVN.
- Kết quả mong đợi: Thấy đề (tiêu đề, mô tả) mà giáo viên không cần bấm gửi.
- Flow tự động: (chưa gán)

### TC-HW-004 · Sửa tiêu đề, mô tả phần BTVN, phụ huynh thấy ngay
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:72
- Tiền điều kiện + dữ liệu: Phần BTVN đã chấm cho vài em.
- Các bước:
  1. Sửa tiêu đề và mô tả, lưu.
  2. Phụ huynh mở lại đề.
- Kết quả mong đợi: Sửa được kể cả khi đã chấm; phụ huynh thấy nội dung mới ngay.
- Flow tự động: (chưa gán)

### TC-HW-005 · Xoá phần chưa chấm cho em nào
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:72, 59
- Tiền điều kiện + dữ liệu: Phần BTVN mới, chưa chấm cho học sinh nào.
- Các bước:
  1. Xoá phần.
- Kết quả mong đợi: Phần bị xoá khỏi "Bài tập hôm nay".
- Flow tự động: (chưa gán)

### TC-HW-006 · Không xoá được phần đã chấm cho ít nhất một em
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:72
- Tiền điều kiện + dữ liệu: Phần BTVN đã chấm cho một em.
- Các bước:
  1. Thử xoá phần.
- Kết quả mong đợi: Không xoá được (bị chặn/báo lỗi); phần và kết quả chấm giữ nguyên.
- Flow tự động: (chưa gán)

### TC-HW-007 · Phần "Bài tập buổi trước" và "Bài tập hôm nay", mặc định buổi trước
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:59, 72
- Tiền điều kiện + dữ liệu: Buổi N có BTVN; mở buổi N+1.
- Các bước:
  1. Mở tab Bài tập về nhà của buổi N+1.
- Kết quả mong đợi: Hai phần "Bài tập buổi trước" (BTVN của buổi N, để chấm) và "Bài tập hôm nay" (giao mới); mặc định mở "Bài tập buổi trước".
- Flow tự động: (chưa gán)

### TC-HW-008 · Chấm từng học sinh, ba mức
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:73, 59
- Tiền điều kiện + dữ liệu: Buổi N+1, phần "Luyện đọc" của buổi N; HS-1..3.
- Các bước:
  1. Chọn phần Luyện đọc, chấm HS-1 Hoàn thành tốt, HS-2 Hoàn thành, HS-3 Chưa hoàn thành.
  2. Lưu và mở lại.
- Kết quả mong đợi: Ba mức đúng tên; ô chưa chấm hiện "Chưa chấm"; kết quả giữ sau khi mở lại. Chấm theo từng phần, cả lớp trong một danh sách.
- Flow tự động: (chưa gán)

### TC-HW-009 · Đánh dấu cả lớp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:59
- Tiền điều kiện + dữ liệu: Phần BTVN chưa chấm.
- Các bước:
  1. Dùng thao tác đánh dấu cả lớp là Hoàn thành.
- Kết quả mong đợi: Mọi học sinh trong danh sách được đặt mức đã chọn; sửa lẻ từng em được sau đó.
- Flow tự động: (chưa gán)

### TC-HW-010 · Em vắng buổi giao bài vẫn chấm được
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:73
- Tiền điều kiện + dữ liệu: HS-4 Vắng ở buổi N.
- Các bước:
  1. Ở buổi N+1 chấm phần BTVN buổi N cho HS-4.
- Kết quả mong đợi: HS-4 có trong danh sách chấm và chấm bình thường.
- Flow tự động: (chưa gán)

### TC-HW-011 · Buổi chấm chuyển sang buổi kế tiếp khi N+1 bị hủy
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:71
- Tiền điều kiện + dữ liệu: Buổi N có BTVN; buổi N+1 và N+2 chưa hủy.
- Các bước:
  1. Hủy buổi N+1.
  2. Mở tab BTVN của buổi N+2 (buổi chưa hủy kế tiếp).
- Kết quả mong đợi: Buổi N+2 có "Bài tập buổi trước" là BTVN của buổi N; buổi hủy không phải buổi chấm.
- Flow tự động: (chưa gán)

### TC-HW-012 · Chưa có buổi sau để chấm
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:71
- Tiền điều kiện + dữ liệu: Buổi N là buổi cuối chưa hủy của lịch (không còn buổi sau).
- Các bước:
  1. Xem thông tin chấm của BTVN buổi N.
- Kết quả mong đợi: Hiện "Chưa có buổi chấm".
- Flow tự động: thủ công: khó dựng buổi cuối của lịch lặp vô hạn trên staging; xem `../open-questions.md` (Q-05).

### TC-HW-013 · Phụ huynh chỉ thấy kết quả chấm sau khi giáo viên gửi phiếu
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:74
- Tiền điều kiện + dữ liệu: HS-1 đã chấm BTVN; phiếu buổi chấm chưa gửi.
- Các bước:
  1. PH-A xem BTVN của HS-1.
  2. Giáo viên gửi phiếu; PH-A xem lại.
- Kết quả mong đợi: Bước 1 thấy đề, chưa thấy kết quả chấm; bước 2 thấy kết quả chấm.
- Flow tự động: (chưa gán)

### TC-HW-014 · Giao và chấm BTVN khi mất mạng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:76, 191, 224
- Tiền điều kiện + dữ liệu: Mất mạng.
- Các bước:
  1. Giao một phần BTVN và chấm một em khi mất mạng.
  2. Bật mạng lại.
- Kết quả mong đợi: Ghi được khi mất mạng; có mạng lại thì tự đồng bộ; dữ liệu có trên máy khác.
- Flow tự động: (chưa gán)

### TC-HW-015 · Thuộc nhóm quyền Nhận xét và báo cáo
- Vai: Giáo viên (role bị thu quyền nhóm đó)
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:75, 94
- Tiền điều kiện + dữ liệu: Tài khoản có role mà nhóm Nhận xét và báo cáo không có mức Sửa. Màn quản lý role chưa có ở Bản đầu nên cần dựng dữ liệu qua máy chủ.
- Các bước:
  1. Thử giao hoặc chấm BTVN.
- Kết quả mong đợi: Máy chủ từ chối ghi.
- Flow tự động: thủ công: Bản đầu không có màn tạo role; xem `permissions.md`.
