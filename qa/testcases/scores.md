# Testcase: Bài kiểm tra và điểm (TST)

Phạm vi: spec 27, 42–48, 186, 217 (cập nhật theo spec 2026-10-25: bài kiểm tra không có điểm tối đa; điểm 0..1000 bước 0,5; nút "Gán điểm mặc định"). Báo cáo điểm từng học sinh/tổng hợp lớp (108–110) là "đề xuất, chờ duyệt", không thuộc Bản đầu nên không kiểm; chỉ kiểm quy tắc "không có điểm trung bình" (27, 186).

### TC-TST-001 · Tạo bài kiểm tra chỉ có tên và ngày, không có điểm tối đa
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:43, 217
- Tiền điều kiện + dữ liệu: Lớp `QA-Lớp A`.
- Các bước:
  1. Tab Bài kiểm tra → tạo bài.
  2. Nhập tên `QA-KT1`, ngày hôm nay.
  3. Lưu.
- Kết quả mong đợi: Form chỉ có tên và ngày, không có ô điểm tối đa, không có ô hệ số; bài tạo xong và hiện ở danh sách; ô điểm của mọi học sinh là "Chưa có điểm".
- Flow tự động: (chưa gán)

### TC-TST-002 · Biên điểm 0 và 1000, bước 0,5
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:43
- Tiền điều kiện + dữ liệu: Bài `QA-KT1`, HS-1..4.
- Các bước:
  1. Nhập HS-1 = 0; HS-2 = 1000; HS-3 = 0,5.
  2. Thử HS-4 = 1000,5; 1001; 0,25; −0,5.
- Kết quả mong đợi: 0, 1000, 0,5 lưu được; 1000,5, 1001, 0,25, −0,5 bị từ chối. Không có giới hạn theo "điểm tối đa của bài".
- Flow tự động: (chưa gán)

### TC-TST-003 · Nhập điểm theo bước 0,5 trong 0..1000
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:43, 217
- Tiền điều kiện + dữ liệu: Bài `QA-KT1`, HS-1..4.
- Các bước:
  1. Nhập HS-1 = 12,5; HS-2 = 0; HS-3 = 15.
  2. Thử HS-4 = 12,3; HS-4 = 1001; HS-4 = −1.
  3. Lưu.
- Kết quả mong đợi: 12,5, 0, 15 được lưu (0 là điểm hợp lệ, không phải "Chưa có điểm"); 12,3 (không phải bước 0,5), 1001 (> 1000), −1 bị từ chối.
- Flow tự động: (chưa gán)

### TC-TST-004 · Ô trống là "Chưa có điểm", không có "Vắng thi"
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:42
- Tiền điều kiện + dữ liệu: Bài `QA-KT1` chưa nhập điểm cho HS-4.
- Các bước:
  1. Mở bảng điểm/nhập điểm; xem ô HS-4.
- Kết quả mong đợi: Ô HS-4 là "Chưa có điểm"; không có lựa chọn "Vắng thi" ở nhập điểm, bảng điểm, báo cáo.
- Flow tự động: (chưa gán)

### TC-TST-005 · Không có điểm trung bình ở bất kỳ đâu
- Vai: Giáo viên, Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:27, 186, 110
- Tiền điều kiện + dữ liệu: Lớp có ≥ 2 bài đã nhập điểm.
- Các bước:
  1. Xem bảng điểm lớp (giáo viên), điểm số phụ huynh, tổng quan phụ huynh, báo cáo.
- Kết quả mong đợi: Không có điểm trung bình lớp, trung bình từng bài, "TB lớp" ở bất kỳ màn nào.
- Flow tự động: (chưa gán)

### TC-TST-006 · Sửa tên, ngày bài kiểm tra
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:44
- Tiền điều kiện + dữ liệu: Bài `QA-KT1` đã có điểm.
- Các bước:
  1. Sửa bài, đổi tên thành `QA-KT1b`, đổi ngày; lưu.
- Kết quả mong đợi: Tên, ngày mới hiện ở danh sách bài, bảng điểm; điểm đã nhập giữ nguyên.
- Flow tự động: (chưa gán)

### TC-TST-007 · Form sửa bài chỉ có tên và ngày
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:44
- Tiền điều kiện + dữ liệu: `QA-KT1` đã có điểm (có điểm 15).
- Các bước:
  1. Mở sửa bài.
- Kết quả mong đợi: Chỉ có tên và ngày, không có ô điểm tối đa; sửa tên/ngày xong điểm cũ giữ nguyên (15, không hiện "/điểm tối đa").
- Flow tự động: (chưa gán)

### TC-TST-008 · Điểm lớn (ví dụ 20, 100) vẫn lưu được vì không còn trần theo bài
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:43, docs/architecture.md (bỏ điểm tối đa)
- Tiền điều kiện + dữ liệu: Bài `QA-KT1` mới, HS-1, HS-2.
- Các bước:
  1. Nhập HS-1 = 20; HS-2 = 100; lưu; tải lại.
- Kết quả mong đợi: Cả hai lưu được, hiện "20" và "100", không có "/15" hay "/điểm tối đa" ở bảng điểm.
- Flow tự động: (chưa gán)

### TC-TST-009 · Xoá bài chưa có điểm nào: xoá hẳn
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:45
- Tiền điều kiện + dữ liệu: Bài `QA-KT-Xoá` mới tạo, mọi ô "Chưa có điểm".
- Các bước:
  1. Chọn xoá bài; đọc hộp xác nhận; xác nhận.
- Kết quả mong đợi: Hộp xác nhận nói rõ sẽ xoá; bài biến mất khỏi danh sách.
- Flow tự động: (chưa gán)

### TC-TST-010 · Xoá bài đã có điểm: lưu trữ, ẩn khỏi mọi nơi
- Vai: Giáo viên (kiểm lại với Phụ huynh)
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:45, 186
- Tiền điều kiện + dữ liệu: Bài `QA-KT-LT` có ít nhất một điểm (kể cả điểm 0), đã vào báo cáo nháp (tuỳ chọn).
- Các bước:
  1. Chọn xoá bài; đọc hộp xác nhận; xác nhận.
  2. Kiểm tra danh sách bài, bảng điểm, nhập điểm, xem trước báo cáo mới, app phụ huynh.
- Kết quả mong đợi: Hộp xác nhận nói rõ sẽ lưu trữ (không xoá cứng); bài ẩn khỏi bảng điểm, nhập điểm, báo cáo, app phụ huynh và không tính vào đâu; không có màn khôi phục.
- Flow tự động: (chưa gán)

### TC-TST-011 · Bài chỉ có điểm 0 vẫn được lưu trữ, không xoá hẳn
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:45
- Tiền điều kiện + dữ liệu: Bài `QA-KT-0` chỉ có một ô điểm = 0, còn lại "Chưa có điểm".
- Các bước:
  1. Xoá bài, đọc hộp xác nhận.
- Kết quả mong đợi: Hộp xác nhận nói lưu trữ (điểm 0 là đã có điểm).
- Flow tự động: (chưa gán)

### TC-TST-012 · Học sinh vào lớp sau ngày bài kiểm tra vẫn nhập điểm được
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:46
- Tiền điều kiện + dữ liệu: Bài `QA-KT1` ngày D; `QA-HS Muộn` có ngày vào lớp sau D.
- Các bước:
  1. Mở bảng điểm/nhập điểm của `QA-KT1`.
  2. Để ô `QA-HS Muộn` trống, xem báo cáo.
  3. Nhập điểm 10 cho `QA-HS Muộn`; xem báo cáo và app phụ huynh.
- Kết quả mong đợi: `QA-HS Muộn` vẫn hiện trong bảng điểm bài đó; ô trống là "Chưa có điểm" và không tính vào đâu; sau khi có điểm, báo cáo và app phụ huynh tính bài đó như mọi bài khác (không loại theo ngày vào lớp).
- Flow tự động: (chưa gán)

### TC-TST-013 · Sửa điểm sau khi báo cáo đã phát hành
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:47
- Tiền điều kiện + dữ liệu: Báo cáo của HS-1 đã phát hành với điểm 12,5 ở `QA-KT1`.
- Các bước:
  1. Giáo viên sửa điểm HS-1 thành 14.
  2. Phụ huynh xem điểm số; giáo viên mở báo cáo đã phát hành.
- Kết quả mong đợi: Phụ huynh thấy điểm mới ngay ở mục điểm; báo cáo đã phát hành ghi chú "điểm có cập nhật, cần phát hành lại".
- Flow tự động: (chưa gán)

### TC-TST-014 · Sửa điểm được ghi lịch sử (không có màn xem)
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:48, 217, 235
- Tiền điều kiện + dữ liệu: HS-1 có điểm 12,5.
- Các bước:
  1. Sửa điểm HS-1 thành 13.
  2. Kiểm tra giao diện (không có màn lịch sử điểm).
- Kết quả mong đợi: Sửa được; lịch sử trước/sau ghi ở máy chủ (DB), không hiện cho phụ huynh và không có màn lịch sử ở Bản đầu.
- Flow tự động: thủ công: lịch sử chỉ ở DB, UI không có màn; kiểm cần truy vấn D1 (ngoài `qa/`), xem `../open-questions.md` (Q-06).

### TC-TST-015 · Nhập điểm khi mất mạng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:191, 224
- Tiền điều kiện + dữ liệu: Mất mạng, bài `QA-KT1`.
- Các bước:
  1. Nhập điểm, lưu khi mất mạng; bật mạng lại.
- Kết quả mong đợi: Ghi được khi mất mạng ("Đã lưu trên máy · sẽ đồng bộ khi có mạng"), tự đồng bộ khi có mạng, máy khác thấy điểm.
- Flow tự động: (chưa gán)

### TC-TST-016 · Tạo bài kiểm tra khi mất mạng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Mất mạng.
- Các bước:
  1. Tạo bài kiểm tra; bật mạng lại.
- Kết quả mong đợi: Tạo được lúc mất mạng; sau đồng bộ bài có trên máy khác, không trùng.
- Flow tự động: (chưa gán)

### TC-TST-017 · Điểm đã nhập chỉ phụ huynh của em thấy
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:27, 20
- Tiền điều kiện + dữ liệu: HS-1 (PH-A) và HS-2 (PH-B) đều có điểm.
- Các bước:
  1. PH-A mở điểm số.
- Kết quả mong đợi: Chỉ thấy điểm HS-1 (chỉ hiện điểm, không có "/điểm tối đa"); không thấy điểm HS-2.
- Flow tự động: (chưa gán)

### TC-TST-018 · Gán điểm mặc định: có xác nhận, ghi 15 cho mọi em đang hiện, ghi đè điểm đã nhập
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:44 (Điểm), 217
- Tiền điều kiện + dữ liệu: Bài `QA-KT1`; HS-1 đã nhập 12; HS-2 chưa nhập; HS-3 đã nghỉ (không hiện trong bảng điểm).
- Các bước:
  1. Màn nhập điểm của `QA-KT1` bấm "Gán điểm mặc định".
  2. Bấm Huỷ ở hộp xác nhận.
  3. Bấm lại, xác nhận.
  4. Tải lại trang.
- Kết quả mong đợi: Bước 2: dữ liệu không đổi. Bước 3: mọi học sinh đang hiện trong bảng điểm có điểm 15, kể cả HS-1 (ghi đè 12); em không hiện (HS-3) không bị gán. Bước 4: điểm vẫn là 15; trạng thái lưu hiện như sửa điểm thường.
- Flow tự động: (chưa gán)

### TC-TST-019 · Gán điểm mặc định khi mất mạng, đồng bộ khi có mạng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:44, 191
- Tiền điều kiện + dữ liệu: Bài `QA-KT1`, vài học sinh; mất mạng.
- Các bước:
  1. Bấm "Gán điểm mặc định", xác nhận khi offline.
  2. Bật mạng lại; chờ đồng bộ; tải lại ở phiên khác.
- Kết quả mong đợi: Bước 1 vẫn gán được, hiện "Đã lưu trên máy · sẽ đồng bộ khi có mạng" (nút không bị khoá cần mạng). Bước 2: điểm 15 lên máy chủ đúng một lần; lịch sử sửa điểm được ghi như sửa thường.
- Flow tự động: (chưa gán)

### TC-TST-020 · [Danh sách theo dõi, báo cáo điểm là đề xuất chờ duyệt] Chênh lệch % so với điểm bài trước
- Vai: Giáo viên, Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:110 (đề xuất, chờ duyệt)
- Tiền điều kiện + dữ liệu: HS-1: bài trước 10, bài sau 11,3; HS-2: bài trước 0, bài sau 5; HS-3: bài trước 20, bài sau 15.
- Các bước:
  1. Mở báo cáo điểm (nếu có trong bản đang kiểm).
- Kết quả mong đợi: HS-1 "+13%" ((11,3−10)/10); HS-2 không hiện % (bài trước 0); HS-3 "−25%" và vào "Cần chú ý" (giảm ≥ 20% so với điểm bài trước); báo cáo chỉ hiện điểm, không "/điểm tối đa". Chỉ kiểm khi báo cáo điểm vào Bản đầu.
- Flow tự động: thủ công: ngoài Bản đầu (spec 110).
