# Testcase: Phụ huynh xem kết quả của con (GRD)

Phạm vi: spec 20, 27, 164–177, 221. "Học sinh" trong lời người dùng = con của phụ huynh. Bài giảng và học phí không thuộc Bản đầu nên không kiểm. Tài khoản: PH-A (1 con: HS-1), PH-B (2 con: HS-2, HS-6), PH-0 (chưa liên kết). Cài PWA (hướng dẫn, "mở bằng Safari") ngoài phạm vi Bản đầu ở mục 8, chỉ ghi chú.

### TC-GRD-001 · Tổng quan: chuyên cần, điểm bài mới nhất, nhận xét mới nhất
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:168, 221
- Tiền điều kiện + dữ liệu: HS-1 có điểm danh, ≥ 1 bài có điểm, ≥ 1 phiếu đã gửi.
- Các bước:
  1. Đăng nhập PH-A, mở Tổng quan.
- Kết quả mong đợi: Hiện chuyên cần, điểm bài mới nhất, nhận xét mới nhất của HS-1; không có điểm trung bình.
- Flow tự động: (chưa gán)

### TC-GRD-002 · Chuyển giữa các con
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:167, 221
- Tiền điều kiện + dữ liệu: PH-B có hai con (HS-2, HS-6).
- Các bước:
  1. Đăng nhập PH-B, chuyển từ HS-2 sang HS-6.
- Kết quả mong đợi: Dữ liệu (tổng quan, điểm danh, điểm, nhận xét, BTVN, báo cáo) đổi theo đúng con được chọn.
- Flow tự động: (chưa gán)

### TC-GRD-003 · Điểm danh theo tháng, thống kê, ghi chú từng buổi
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:169
- Tiền điều kiện + dữ liệu: HS-1 có điểm danh nhiều trạng thái trong tháng.
- Các bước:
  1. Mở Điểm danh, đổi tháng, mở một buổi.
- Kết quả mong đợi: Xem theo tháng với thống kê (Có mặt/Muộn/Vắng; không còn Có phép, dòng cũ hiện Vắng) và ghi chú từng buổi (Muộn không còn giờ đến và ghi chú); chỉ đọc.
- Flow tự động: (chưa gán)

### TC-GRD-004 · Điểm số: từng bài và xu hướng
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:170, 186
- Tiền điều kiện + dữ liệu: HS-1: bài A 10 điểm, bài B 12 điểm (ngày sau A), một bài "Chưa có điểm", một bài đã lưu trữ.
- Các bước:
  1. Mở Điểm số.
- Kết quả mong đợi: Hiện điểm từng bài (chỉ điểm, không có "/điểm tối đa"); xu hướng/chênh lệch (nếu có) theo % so với điểm bài trước (A→B = +20%), bài trước 0 điểm thì không hiện %; bài "Chưa có điểm" hiện đúng chữ đó và không tính vào đâu; bài lưu trữ không hiện; không có "TB lớp".
- Flow tự động: (chưa gán)

### TC-GRD-005 · Nhận xét từng buổi (x/5 sao, một đoạn nhận xét)
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:171, 51–55
- Tiền điều kiện + dữ liệu: Phiếu buổi HS-1 đã gửi (4 sao, câu tự sinh + phần giáo viên gõ thêm; thêm một phiếu cũ có câu và ghi chú riêng nếu có).
- Các bước:
  1. Mở Nhận xét.
- Kết quả mong đợi: Hiện số sao dạng x/5 (4/5), nội dung nhận xét như một đoạn (câu tự sinh rồi phần gõ thêm; phiếu cũ: câu, ghi chú xuống dòng sau); không có danh sách tiêu chí; chỉ phiếu đã gửi. Phiếu cũ thang 3 sao hiện x/3.
- Flow tự động: (chưa gán)

### TC-GRD-006 · BTVN: đề ngay, kết quả sau khi gửi
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:172, 74
- Tiền điều kiện + dữ liệu: Xem `homework.md` TC-HW-003, TC-HW-013.
- Các bước:
  1. Mở BTVN trước và sau khi phiếu buổi chấm được gửi.
- Kết quả mong đợi: Đề có ngay; kết quả chấm chỉ sau khi giáo viên gửi; phần chưa chấm hiện "Chưa chấm".
- Flow tự động: (chưa gán)

### TC-GRD-007 · Báo cáo: chỉ báo cáo đã phát hành
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:64, 175
- Tiền điều kiện + dữ liệu: HS-1 có một báo cáo đã phát hành, một bản nháp.
- Các bước:
  1. Mở Báo cáo, mở báo cáo đã phát hành.
- Kết quả mong đợi: Danh sách chỉ có báo cáo đã phát hành (theo tháng, ví dụ "Tháng 10/2026"; báo cáo cũ giữ tên khoảng buổi); bản nháp không hiện; mở xem từ bản chụp lúc phát hành.
- Flow tự động: (chưa gán)

### TC-GRD-008 · Phụ huynh không sửa được dữ liệu
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:20, 91
- Tiền điều kiện + dữ liệu: PH-A.
- Các bước:
  1. Duyệt mọi màn: Tổng quan, Điểm danh, Điểm số, Nhận xét, BTVN, Báo cáo.
- Kết quả mong đợi: Không có nút/ô nhập để sửa điểm danh, điểm, nhận xét, BTVN; chỉ đọc.
- Flow tự động: (chưa gán)

### TC-GRD-009 · Chỉ thấy con được liên kết
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:20, 183
- Tiền điều kiện + dữ liệu: PH-A liên kết HS-1; lớp có HS-2..4 liên kết phụ huynh khác.
- Các bước:
  1. PH-A duyệt các màn; chuyển con (chỉ có HS-1).
- Kết quả mong đợi: Chỉ HS-1; không thấy tên/điểm/nhận xét của học sinh khác trong lớp; không thấy buổi/lớp khác.
- Flow tự động: (chưa gán)

### TC-GRD-010 · Chưa có con nào được liên kết
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:125, 164
- Tiền điều kiện + dữ liệu: PH-0 là tài khoản phụ huynh cũ chưa có con liên kết (tạo trước 2026-10-26; hoặc con bị gỡ SĐT).
- Các bước:
  1. Đăng nhập PH-0 (2 bước: SĐT rồi mật khẩu).
- Kết quả mong đợi: App báo "chưa có con nào được liên kết"; vẫn vào được Cài đặt (đổi mật khẩu, đăng xuất).
- Flow tự động: (chưa gán)

### TC-GRD-011 · Cài đặt phụ huynh: hồ sơ, đổi mật khẩu, đăng xuất
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:177, 165
- Tiền điều kiện + dữ liệu: PH-A.
- Các bước:
  1. Mở Cài đặt; đổi mật khẩu, lưu email; đăng xuất.
- Kết quả mong đợi: Có hồ sơ, đổi mật khẩu, lưu email, đăng xuất; Việt/Anh: giao diện tiếng Anh thuộc "Làm sau" nên không kiểm.
- Flow tự động: (chưa gán)

### TC-GRD-012 · Xem dữ liệu đã tải kèm thời gian cập nhật khi mất mạng
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: PH-A đã mở dữ liệu khi có mạng; sau đó tắt mạng.
- Các bước:
  1. Mở lại app khi mất mạng; xem Tổng quan.
- Kết quả mong đợi: Vẫn xem được dữ liệu đã tải, kèm thời gian cập nhật.
- Flow tự động: (chưa gán)

### TC-GRD-013 · Đăng ký phụ huynh: mật khẩu ngắn, nhập lại không khớp, số chưa khai, số đã có tài khoản
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:124–125 (độ dài mật khẩu: docs/architecture.md:104)
- Tiền điều kiện + dữ liệu: PH-A đã đăng ký; PH-B chưa tài khoản, đã khai cho HS-2; PH-N chưa khai.
- Các bước:
  1. PH-B ở màn đặt mật khẩu lần đầu: mật khẩu 7 ký tự; rồi nhập lại không khớp.
  2. Nhập PH-A ở bước SĐT.
  3. Gọi đăng ký phụ huynh bằng PH-N (HTTP, chỉ khi GL cho phép).
- Kết quả mong đợi: Bước 1 bị từ chối kèm lỗi. Bước 2: nhánh đăng nhập (đã có tài khoản), không tạo mới. Bước 3: từ chối `phone_not_declared`.
- Flow tự động: (chưa gán)

