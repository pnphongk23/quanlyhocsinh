# Testcase: Buổi học và điểm danh (ATT)

Phạm vi: spec 34–39, 57, 216. Lịch sử điểm danh (màn xem) thuộc "Làm sau"; chỉ kiểm sửa sau lưu và việc ghi lịch sử không có màn. Lớp/lịch: `classes-schedule.md`.

### TC-ATT-001 · Điểm danh đủ ba trạng thái và lưu
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:33, 226 (3 trạng thái, đã chốt 2026-10-26)
- Tiền điều kiện + dữ liệu: Buổi hôm nay của `QA-Lớp A`, 3 học sinh đang học (HS-1..3).
- Các bước:
  1. Mở buổi, tab Điểm danh.
  2. Chọn HS-1 Có mặt, HS-2 Muộn, HS-3 Vắng.
  3. Bấm Lưu.
- Kết quả mong đợi: Chỉ có ba trạng thái Có mặt, Muộn, Vắng để chọn (không còn Có phép); Muộn không có ô giờ đến hay ghi chú; sau lưu hiện "Đã lưu"; mở lại buổi thấy đúng trạng thái đã chọn.
- Flow tự động: (chưa gán)

### TC-ATT-002 · Sửa điểm danh sau khi lưu
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:38, 216
- Tiền điều kiện + dữ liệu: Buổi hôm nay đã lưu điểm danh (TC-ATT-001).
- Các bước:
  1. Đổi HS-4 từ Vắng sang Có mặt, Lưu.
  2. Mở lại buổi.
- Kết quả mong đợi: HS-4 hiện Có mặt. Lịch sử thay đổi được ghi ở máy chủ (không có màn xem ở Bản đầu).
- Flow tự động: (chưa gán)

### TC-ATT-003 · Buổi chưa tới ngày không điểm danh được
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:39
- Tiền điều kiện + dữ liệu: Buổi ngày mai.
- Các bước:
  1. Mở buổi, tab Điểm danh.
  2. Thử chọn trạng thái.
- Kết quả mong đợi: Chỉ xem hoặc hủy; không lưu được điểm danh.
- Flow tự động: (chưa gán)

### TC-ATT-004 · Điểm danh buổi đã qua
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:39
- Tiền điều kiện + dữ liệu: Buổi hôm qua chưa điểm danh.
- Các bước:
  1. Điểm danh và lưu.
- Kết quả mong đợi: Lưu được (từ ngày học trở đi).
- Flow tự động: (chưa gán)

### TC-ATT-005 · Cảnh báo vắng hai buổi đã diễn ra gần nhất liên tiếp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:36, 216
- Tiền điều kiện + dữ liệu: Lớp có 3 buổi đã diễn ra; HS-4 Vắng ở 2 buổi gần nhất.
- Các bước:
  1. Mở điểm danh buổi gần nhất / tổng quan lớp nơi hiện cảnh báo.
- Kết quả mong đợi: Hiện cảnh báo cho HS-4 (vắng 2 buổi đã diễn ra gần nhất liên tiếp).
- Flow tự động: (chưa gán)

### TC-ATT-006 · Muộn không tính vào cảnh báo; dòng cũ Có phép đã thành Vắng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:35, 36
- Tiền điều kiện + dữ liệu: HS-2: một buổi Vắng rồi buổi sau Muộn. HS-3: một buổi Vắng và buổi gần nhất vốn là Có phép trước migration (nay là Vắng, dữ liệu cũ; chỉ có trên staging sau migration, nếu không có thì ghi "chưa kiểm").
- Các bước:
  1. Xem cảnh báo.
- Kết quả mong đợi: Không cảnh báo HS-2 (Muộn không tính). HS-3 được cảnh báo vì dòng Có phép cũ đã thành Vắng và tính vào hai buổi Vắng liên tiếp (spec 2026-10-26).
- Flow tự động: (chưa gán)

### TC-ATT-007 · Buổi hủy bị bỏ qua khi tính cảnh báo
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:36, 216
- Tiền điều kiện + dữ liệu: HS-4 Vắng buổi d1, buổi d2 bị hủy, Vắng buổi d3 (d1<d2<d3 theo ngày).
- Các bước:
  1. Xem cảnh báo.
- Kết quả mong đợi: Có cảnh báo cho HS-4 (buổi hủy bỏ qua, d1 và d3 là hai buổi đã diễn ra gần nhất).
- Flow tự động: (chưa gán)

### TC-ATT-008 · Muộn tính là có đi học
- Vai: Giáo viên (kiểm số liệu ở màn Phụ huynh)
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:35
- Tiền điều kiện + dữ liệu: HS-2 Muộn một buổi.
- Các bước:
  1. Xem thống kê chuyên cần của HS-2 (màn phụ huynh / báo cáo).
- Kết quả mong đợi: Buổi Muộn được tính là có đi học.
- Flow tự động: (chưa gán)

### TC-ATT-009 · Cảnh báo khi rời màn còn nhập dở chưa Lưu
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:139 (mục 5.1; Bản đầu 216 không nhắc riêng)
- Tiền điều kiện + dữ liệu: Buổi hôm nay.
- Các bước:
  1. Chọn vài trạng thái, chưa bấm Lưu.
  2. Rời màn (quay lại/chuyển tab).
- Kết quả mong đợi: Có cảnh báo còn nhập dở. Chưa rõ có thuộc Bản đầu: xem `../open-questions.md` (Q-04).
- Flow tự động: thủ công: chưa chốt phạm vi (Q-04), không tính vào coverage/pass-fail Bản đầu.

### TC-ATT-010 · Màn buổi học có 3 tab ngang hàng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:64
- Tiền điều kiện + dữ liệu: Buổi bất kỳ.
- Các bước:
  1. Mở buổi học.
- Kết quả mong đợi: Ba tab ngang hàng theo đúng thứ tự trái sang phải: Điểm danh, Bài tập về nhà, Nhận xét (đổi thứ tự 2026-10-26), cả web và iOS.
- Flow tự động: (chưa gán)

### TC-ATT-011 · Điểm danh khi mất mạng rồi tự đồng bộ
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:191, 224
- Tiền điều kiện + dữ liệu: Buổi hôm nay; tắt mạng.
- Các bước:
  1. Điểm danh, bấm Lưu khi mất mạng.
  2. Bật mạng lại; chờ.
  3. Mở dữ liệu từ thiết bị/phiên khác.
- Kết quả mong đợi: Lúc mất mạng hiện "Đã lưu trên máy · sẽ đồng bộ khi có mạng"; có mạng lại thì tự đồng bộ ngầm, máy khác thấy đúng dữ liệu. Chi tiết trạng thái lưu: `offline-sync.md`.
- Flow tự động: (chưa gán)

### TC-ATT-012 · Hai thiết bị sửa cùng một ô: thay đổi tới máy chủ sau cùng thắng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Hai phiên (web + iOS hoặc hai tab) cùng mở một buổi.
- Các bước:
  1. Phiên A đặt HS-1 Vắng, Lưu.
  2. Phiên B (không làm mới) đặt HS-1 Muộn, Lưu sau A.
  3. Mở lại cả hai.
- Kết quả mong đợi: Cả hai thấy Muộn (giá trị tới máy chủ sau cùng); không có cờ chọn giữa hai giá trị.
- Flow tự động: thủ công: cần điều phối hai thiết bị; có thể dùng web + iOS cùng lúc.

### TC-ATT-013 · Buổi hủy không điểm danh
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:37, 215
- Tiền điều kiện + dữ liệu: Buổi đã hủy.
- Các bước:
  1. Mở buổi hủy.
- Kết quả mong đợi: Buổi hiện đã hủy, không có số; không điểm danh được.
- Flow tự động: (chưa gán)

### TC-ATT-014 · iOS: vuốt trái một dòng học sinh hiện Có mặt / Muộn / Vắng
- Vai: Giáo viên
- Nền tảng: iOS
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:36
- Tiền điều kiện + dữ liệu: Buổi hôm nay, tab Điểm danh, HS-1..3 đang học, chưa lưu.
- Các bước:
  1. Vuốt trái dòng HS-1: quan sát các nút; chạm Muộn.
  2. Vuốt trái dòng HS-2; chạm Vắng. Vuốt trái dòng HS-3, chạm Có mặt.
  3. Chạm thẳng nhãn trạng thái của HS-1 để đổi sang Có mặt.
  4. Lưu và mở lại buổi.
- Kết quả mong đợi: Vuốt trái hiện đúng ba nút Có mặt / Muộn / Vắng (không có Có phép), chạm nút đổi trạng thái dòng đó và đóng vuốt; chạm nhãn vẫn đổi được; sau lưu và mở lại giữ đúng trạng thái. Vuốt trên dòng không làm cuộn nhầm danh sách.
- Flow tự động: `qa/maestro/ios/attendance/TC-ATT-014.yaml` (chưa viết, chờ iOS build có vuốt và id dòng học sinh)

### TC-ATT-015 · Web: chạm chọn chỉ còn 3 lựa chọn; Muộn không có ô giờ và ghi chú
- Vai: Giáo viên
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:33, 36
- Tiền điều kiện + dữ liệu: Như TC-ATT-001 trên web.
- Các bước:
  1. Chọn Muộn cho HS-2; tìm ô giờ đến và ô ghi chú.
  2. Lưu, mở lại.
- Kết quả mong đợi: Mỗi dòng có đúng ba lựa chọn; chọn Muộn không hiện ô giờ đến hay ghi chú; lưu và mở lại đúng. Phụ huynh xem điểm danh tháng không có Có phép, không có giờ đến hay ghi chú Muộn (TC-GRD-003).
- Flow tự động: (chưa gán)

### TC-ATT-016 · Lệnh `excused` cũ bị từ chối; dòng Có phép cũ thành Vắng
- Vai: Hệ thống (QA kiểm bằng API/staging)
- Nền tảng: Web
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:226
- Tiền điều kiện + dữ liệu: Staging smoke sau migration 0011 (chưa chạy: chờ GL duyệt); dữ liệu giả; không đụng workspace demo.
- Các bước:
  1. Gửi `attendance.set` với `status = excused` cho một dòng QA (script HTTP, SĐT/token không ghi log).
  2. Đọc lại điểm danh buổi QA có dòng Có phép cũ (nếu fixture có).
- Kết quả mong đợi: Lệnh `excused` bị từ chối với `validation_error` (trạng thái `rejected` trong hàng đợi, người dùng thấy lỗi sửa được, không kẹt hàng đợi). Dòng cũ Có phép đọc ra Vắng; không còn `excused` trong response/pull/snapshot; `note`/`late_at` không còn trong response.
- Flow tự động: thủ công/kịch bản HTTP: chạy sau khi backend deploy migration 0011 và GL cấp lượt; hiện chưa chạy được.
