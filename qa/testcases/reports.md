# Testcase: Báo cáo theo tháng (RPT)

Phạm vi: spec 64–67, 188, 220 (cập nhật theo spec 2026-10-25, main 3dab010: báo cáo theo tháng thay khoảng buổi; xoá báo cáo; không còn số buổi; sao 0–5). Báo cáo cũ tạo theo khoảng buổi giữ tên cũ. Phía phụ huynh xem báo cáo: `guardian.md`. Tạo PDF trên thiết bị là hành vi của thiết bị (Bản đầu chỉ PDF).

### TC-RPT-001 · Thêm báo cáo: chọn tháng, mặc định tháng hiện tại
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:66, 220
- Tiền điều kiện + dữ liệu: Lớp có buổi đã diễn ra trong tháng hiện tại và tháng trước.
- Các bước:
  1. Tab Báo cáo → "Thêm báo cáo".
  2. Đọc bộ chọn; chọn tháng trước rồi tháng hiện tại.
- Kết quả mong đợi: Có bộ chọn tháng (không còn chọn buổi bắt đầu/kết thúc, không có số buổi); mặc định là tháng hiện tại; tên báo cáo "Tháng MM/YYYY".
- Flow tự động: (chưa gán)

### TC-RPT-002 · Một lần thêm tạo bản nháp cho mỗi học sinh đang học trong tháng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:66
- Tiền điều kiện + dữ liệu: Lớp 4 học sinh đang học và 1 học sinh đã nghỉ trước tháng chọn.
- Các bước:
  1. Thêm báo cáo với tháng mặc định, xác nhận.
- Kết quả mong đợi: Một bản nháp riêng cho mỗi học sinh đang học trong tháng (4 bản); em đã nghỉ trước tháng không có bản. Tên báo cáo "Tháng MM/YYYY".
- Flow tự động: (chưa gán)

### TC-RPT-003 · Chọn tháng khác, dữ liệu chỉ lấy các buổi của tháng đó
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:66
- Tiền điều kiện + dữ liệu: Lớp có buổi đã diễn ra ở hai tháng liền kề.
- Các bước:
  1. Thêm báo cáo chọn tháng trước; xem trước một bản nháp.
- Kết quả mong đợi: Chuyên cần, điểm, sao, BTVN chỉ tính các buổi thuộc tháng đã chọn.
- Flow tự động: (chưa gán)

### TC-RPT-004 · [Đã bỏ] Khoảng buổi không hợp lệ
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:66 (thay thế 2026-10-25)
- Tiền điều kiện + dữ liệu: Không áp dụng: báo cáo theo tháng không còn chọn khoảng buổi.
- Các bước:
  1. Không có bước.
- Kết quả mong đợi: Không kiểm (ca Q-07 hết hiệu lực vì không còn khoảng buổi bắt đầu/kết thúc).
- Flow tự động: thủ công: không áp dụng.

### TC-RPT-005 · Được thêm nhiều báo cáo cùng tháng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:66
- Tiền điều kiện + dữ liệu: Đã có báo cáo "Tháng 10/2026".
- Các bước:
  1. Thêm báo cáo mới cùng tháng.
- Kết quả mong đợi: Tạo được; hai báo cáo cùng tháng cùng tồn tại trong danh sách, mỗi báo cáo có bản nháp riêng.
- Flow tự động: (chưa gán)

### TC-RPT-006 · Nội dung báo cáo gồm chuyên cần, điểm, sao (0–5), BTVN
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:65, 220
- Tiền điều kiện + dữ liệu: HS-1 có điểm danh, điểm ≥ 1 bài, 3 phiếu 5 sao / 4 sao / 3 sao trong tháng, BTVN đã chấm; HS-5 có 1 phiếu cũ thang 3 sao (nếu có dữ liệu).
- Các bước:
  1. Mở bản nháp của HS-1, xem trước.
- Kết quả mong đợi: Số buổi theo số sao: 5 sao ×1, 4 sao ×1, 3 sao ×1, còn lại 0; phiếu thang 3 sao cũ (nếu có) đếm riêng theo thang cũ. Có chuyên cần, điểm từng bài (chỉ điểm, không "/điểm tối đa"), kết quả BTVN theo từng phần (Hoàn thành tốt / Hoàn thành / Chưa hoàn thành), ô nhận xét chung. BTVN không quy ra điểm; không có điểm trung bình.
- Flow tự động: (chưa gán)

### TC-RPT-007 · Dữ liệu chỉ tính các buổi trong tháng, bỏ qua buổi hủy
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:66
- Tiền điều kiện + dữ liệu: Bốn buổi: d1, d2 (cuối tháng 9), d3 d4 (đầu tháng 10 trở đi): d1 HS-1 Có mặt, d2 hủy, d3 Vắng, d4 Có mặt; báo cáo chọn đúng tháng chứa d3, d4 (và một tháng chứa d1).
- Các bước:
  1. Thêm báo cáo tháng chứa d1 (và d2) rồi xem trước HS-1.
  2. Thêm báo cáo tháng chứa d3, d4 rồi xem trước HS-1.
- Kết quả mong đợi: Tháng của d1: chuyên cần chỉ tính d1; buổi hủy d2 bỏ qua. Tháng của d3, d4: chỉ tính d3 (Vắng) và d4 (Có mặt). Không lẫn dữ liệu giữa hai tháng.
- Flow tự động: (chưa gán)

### TC-RPT-008 · Nhận xét chung (cần mạng) và xem trước trong popup
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:67, 66
- Tiền điều kiện + dữ liệu: Bản nháp HS-1.
- Các bước:
  1. Viết nhận xét chung, lưu khi có mạng.
  2. Bấm xem trước.
- Kết quả mong đợi: Lưu nhận xét chung cần mạng (spec:191): mất mạng thì không lưu được và hiện báo cần mạng (xem TC-RPT-017). Xem trước mở trong popup (hộp thoại trên web desktop; sheet toàn màn trên mobile/iOS), không hiện nối bên dưới danh sách; có nhận xét chung đã viết.
- Flow tự động: (chưa gán)

### TC-RPT-009 · Phát hành từng em
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:64, 66
- Tiền điều kiện + dữ liệu: Bản nháp HS-1, HS-2.
- Các bước:
  1. Phát hành báo cáo HS-1.
  2. Đăng nhập PH-A (HS-1), PH-B (HS-2) xem danh sách báo cáo.
- Kết quả mong đợi: PH-A thấy báo cáo HS-1; PH-B chưa thấy báo cáo HS-2 (chỉ phụ huynh thấy sau khi phát hành). Phát hành cần mạng.
- Flow tự động: (chưa gán)

### TC-RPT-010 · Phát hành cả lớp
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:66
- Tiền điều kiện + dữ liệu: Các bản nháp của lớp.
- Các bước:
  1. Chọn phát hành cả lớp, xác nhận.
- Kết quả mong đợi: Mọi bản nháp chuyển sang đã phát hành; phụ huynh các em thấy báo cáo.
- Flow tự động: (chưa gán)

### TC-RPT-011 · Phát hành lại sau khi sửa
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:65, 66, 47
- Tiền điều kiện + dữ liệu: Báo cáo HS-1 đã phát hành; điểm HS-1 sau đó được sửa (TC-TST-013).
- Các bước:
  1. Giáo viên phát hành lại báo cáo HS-1.
  2. Phụ huynh mở báo cáo.
- Kết quả mong đợi: Báo cáo cập nhật theo dữ liệu mới; ghi chú "điểm có cập nhật, cần phát hành lại" không còn.
- Flow tự động: (chưa gán)

### TC-RPT-012 · Báo cáo phụ huynh xem là bản chụp lúc phát hành
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:188, 220, 47
- Tiền điều kiện + dữ liệu: Báo cáo HS-1 đã phát hành với dữ liệu D1.
- Các bước:
  1. Giáo viên sửa điểm danh một buổi trong tháng, không phát hành lại.
  2. Phụ huynh mở báo cáo.
- Kết quả mong đợi: Báo cáo phụ huynh xem vẫn là dữ liệu lúc phát hành (bản chụp), chưa đổi cho tới khi phát hành lại.
- Flow tự động: (chưa gán)

### TC-RPT-013 · Tải PDF tạo trên thiết bị (Bản đầu chỉ PDF, không ảnh)
- Vai: Giáo viên hoặc Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:188, 220 (Bản đầu chỉ tải PDF; ảnh thuộc Làm sau)
- Tiền điều kiện + dữ liệu: Báo cáo đã phát hành, đang xem.
- Các bước:
  1. Bấm nút tải báo cáo.
- Kết quả mong đợi: Bản đầu chỉ có tải PDF (spec:188, 220), không có tải ảnh. PDF tạo ngay trên thiết bị khi bấm; không tải lên máy chủ (không có yêu cầu tải lên/tải về PDF tới API).
- Flow tự động: thủ công: hộp thoại chia sẻ/tải của hệ điều hành ngoài tầm Maestro; kiểm "không gọi API tải PDF" bằng mạng trình duyệt (web) nếu có thể.

### TC-RPT-014 · Phát hành khi mất mạng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Bản nháp; mất mạng.
- Các bước:
  1. Thử phát hành.
- Kết quả mong đợi: Phát hành cần mạng: không phát hành được khi mất mạng, hiện lỗi; báo cáo vẫn là nháp.
- Flow tự động: (chưa gán)

### TC-RPT-015 · Chỉ thấy báo cáo của học sinh đang học trong tháng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:66
- Tiền điều kiện + dữ liệu: Học sinh vào lớp giữa tháng; báo cáo tháng trước đó.
- Các bước:
  1. Thêm báo cáo tháng trước ngày em vào lớp.
- Kết quả mong đợi: Em vào lớp sau tháng đó không có bản nháp (không đang học trong tháng).
- Flow tự động: (chưa gán)

### TC-RPT-016 · Học sinh nghỉ giữa khoảng vẫn có báo cáo
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:66, 28
- Tiền điều kiện + dữ liệu: HS-2 đang học từ đầu tháng, đánh dấu nghỉ giữa tháng (ngày rời lớp trong tháng); báo cáo của tháng đó.
- Các bước:
  1. Thêm báo cáo tháng đó; mở bản nháp HS-2.
- Kết quả mong đợi: HS-2 có bản nháp (đang học trong một phần khoảng); số liệu chỉ gồm các buổi em đang học (đến ngày rời lớp).
- Flow tự động: (chưa gán)

### TC-RPT-017 · Mất mạng: không viết/lưu được nhận xét chung của báo cáo
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191 (lưu nhận xét chung của báo cáo cần mạng)
- Tiền điều kiện + dữ liệu: Bản nháp báo cáo HS-1; mất mạng.
- Các bước:
  1. Mở bản nháp, nhập nhận xét chung, bấm Lưu.
- Kết quả mong đợi: Không lưu được; hiện báo cần mạng; nội dung đang soạn giữ để thử lại khi có mạng.
- Flow tự động: (chưa gán)

### TC-RPT-018 · Báo cáo cũ theo khoảng buổi giữ nguyên tên cũ
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:66 (báo cáo đã tạo theo khoảng buổi giữ tên cũ)
- Tiền điều kiện + dữ liệu: Workspace có báo cáo tạo theo khoảng buổi trước 2026-10-25 (QA smoke mới có thể không có).
- Các bước:
  1. Mở danh sách báo cáo của giáo viên và phụ huynh.
- Kết quả mong đợi: Báo cáo cũ giữ tên cũ ("Buổi 1–8 · …"), vẫn xem được; báo cáo mới tên "Tháng MM/YYYY".
- Flow tự động: thủ công: cần dữ liệu cũ khoảng buổi.

### TC-RPT-019 · Xoá báo cáo nháp: có xác nhận, ẩn cả đợt
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md (Xoá báo cáo, 2026-10-25)
- Tiền điều kiện + dữ liệu: Báo cáo "Tháng 10/2026" gồm bản nháp của 3 học sinh, chưa phát hành.
- Các bước:
  1. Menu của báo cáo → Xoá.
  2. Bấm Huỷ ở hộp xác nhận.
  3. Xoá lại, xác nhận.
- Kết quả mong đợi: Có hộp xác nhận; Huỷ không đổi gì. Xác nhận thì cả đợt (bản của mọi học sinh) biến khỏi danh sách báo cáo của giáo viên; dữ liệu nháp không còn mở được.
- Flow tự động: (chưa gán)

### TC-RPT-020 · Xoá báo cáo đã phát hành: xác nhận nêu rõ phụ huynh sẽ không còn thấy
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md (Xoá báo cáo, 2026-10-25)
- Tiền điều kiện + dữ liệu: Báo cáo đã phát hành cho HS-1 (PH-A xem được).
- Các bước:
  1. Giáo viên: menu báo cáo → Xoá; đọc nội dung hộp xác nhận.
  2. Xác nhận xoá.
  3. PH-A mở danh sách báo cáo của con, tải lại; mở đường dẫn trực tiếp tới báo cáo đã xoá.
- Kết quả mong đợi: Hộp xác nhận nói rõ phụ huynh sẽ không còn thấy báo cáo này. Sau khi xoá: giáo viên không thấy trong danh sách; PH-A không thấy trong danh sách (kể cả sau tải lại, kể cả bản trong cache), mở trực tiếp không xem được nội dung.
- Flow tự động: (chưa gán)

### TC-RPT-021 · Xoá báo cáo cần mạng: offline bị khoá, không xếp hàng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md (Xoá báo cáo: cần có mạng, không xếp hàng)
- Tiền điều kiện + dữ liệu: Có báo cáo bất kỳ; mất mạng.
- Các bước:
  1. Mở menu báo cáo khi offline; thử Xoá.
  2. Bật mạng lại; kiểm báo cáo.
- Kết quả mong đợi: Khi offline nút Xoá bị khoá hoặc báo cần mạng, báo cáo giữ nguyên; không có lệnh xoá nằm chờ trong hàng đợi, bật mạng lại không tự xoá.
- Flow tự động: (chưa gán)

### TC-RPT-022 · Xoá mềm: xoá báo cáo rồi thêm lại cùng tháng không ảnh hưởng báo cáo khác
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md (Xoá báo cáo; được thêm nhiều báo cáo cùng tháng)
- Tiền điều kiện + dữ liệu: Hai báo cáo cùng tháng A và B.
- Các bước:
  1. Xoá A; thêm báo cáo C cùng tháng.
- Kết quả mong đợi: B còn nguyên (nháp/đã phát hành giữ nguyên); C tạo được độc lập; A không xuất hiện lại.
- Flow tự động: (chưa gán)


### TC-RPT-023 · Phụ huynh không còn thấy báo cáo đã phát hành sau khi giáo viên xoá và đồng bộ chập chờn
- Vai: Giáo viên + Phụ huynh
- Nền tảng: iOS
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:65–67 (xoá báo cáo đã phát hành và đồng bộ)
- Tiền điều kiện + dữ liệu: Báo cáo `QA-iOS-RPT-023` đã phát hành cho một học sinh QA-iOS; có phụ huynh liên kết đăng nhập được và hai client để giữ màn báo cáo phía phụ huynh trong lúc giáo viên xoá.
- Các bước:
  1. Phụ huynh mở báo cáo đã phát hành và giữ client ở trạng thái có thể đồng bộ lại.
  2. Giáo viên xoá báo cáo; làm mạng/sync chập chờn trong lúc thay đổi đồng bộ.
  3. Phụ huynh đồng bộ lại/mở danh sách báo cáo.
- Kết quả mong đợi: Báo cáo đã xoá không còn trong danh sách hoặc chi tiết phía phụ huynh sau khi đồng bộ; không xuất hiện lại khi mạng ổn định.
- Flow tự động: `qa/maestro/ios/reports/TC-RPT-023.yaml` (blocked nếu không có PH khả dụng và client đồng thời).
