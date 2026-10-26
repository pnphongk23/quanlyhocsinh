# Testcase: Nhận xét sau buổi, 5 tiêu chí và sao (CMT)

Phạm vi: spec 51–63, 218 (cập nhật theo spec 2026-10-26, main 34bdf69: 5 tiêu chí = 5 sao, câu tự sinh theo tiêu chí trong một ô nhận xét gộp, BTVN tự tích, bỏ số buổi, bỏ nút "Dùng câu mặc định"). Năm tiêu chí: Chú ý nghe giảng; Ghi chép đầy đủ; Tham gia hoạt động sôi nổi; Không mất trật tự; Hoàn thành bài tập về nhà. Chấm BTVN nằm ở `homework.md`. Brief 96 (2026-10-26, spec 50003f7): câu tự sinh sửa tay được, câu do app sinh (server chỉ lưu), chấm lại BTVN do client tự sửa phiếu nháp buổi kế, "Gán tất cả mặc định", nhãn "Buổi trước chưa có BTVN" (TC-CMT-018..023).

### TC-CMT-001 · Năm tiêu chí = 0–5 sao, phiếu mới mặc định 5 sao, câu tự sinh theo tiêu chí
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:51–55
- Tiền điều kiện + dữ liệu: Buổi hôm nay có HS-1..4; buổi trước không giao BTVN (tiêu chí BTVN giữ mặc định tích).
- Các bước:
  1. Tab Nhận xét, mở phiếu HS-1; đọc số sao, các tiêu chí và ô nhận xét.
  2. Bỏ tích "Không mất trật tự"; đọc ô nhận xét; tích lại.
  3. Bỏ tích cả 5 tiêu chí; đọc ô nhận xét.
  4. Tích lại đúng 2 tiêu chí (Chú ý nghe giảng, Ghi chép đầy đủ); đọc ô nhận xét và số sao.
- Kết quả mong đợi: Phiếu mới có 5 tiêu chí đều đạt (5 sao), ô nhận xét: "Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà." Câu đổi ngay theo từng lần tích/bỏ tích, đúng thứ tự tiêu chí. Thiếu Không mất trật tự (4 sao): "Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và hoàn thành tốt bài tập về nhà, nhưng còn mất trật tự." Không đạt tiêu chí nào (0 sao): "Con chưa chú ý nghe giảng, chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà." 2 đạt (2 sao): đạt trước, chưa đạt dồn cuối sau ", nhưng", hai mục cuối nối bằng "và", kết thúc dấu chấm: "Con chú ý nghe giảng và ghi bài đầy đủ, nhưng chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà." Số sao = số tiêu chí đạt. Không có nút "Dùng câu mặc định".
- Flow tự động: (chưa gán)

### TC-CMT-002 · Một ô nhận xét gộp: câu tự sinh sửa tay được, tích lại thì ghi đè; phần gõ thêm không bắt buộc
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:57
- Tiền điều kiện + dữ liệu: Phiếu HS-1 mặc định 5 sao chưa gửi.
- Các bước:
  1. Lưu phiếu không gõ thêm gì; mở lại phiếu.
  2. Ngay sau câu tự sinh, gõ thêm `QA-gõ thêm`; lưu; mở lại.
  3. Bỏ tích 1 tiêu chí rồi tích lại; đọc ô nhận xét.
  4. Sửa tay vào giữa phần câu tự sinh (chi tiết ghi đè: TC-CMT-018).
- Kết quả mong đợi: Chỉ có một ô nhận xét (không còn ô ghi chú riêng). Lưu được cả khi không gõ thêm; mở lại thấy đúng nội dung. Phần `QA-gõ thêm` được giữ nguyên khi tích/bỏ tích, chỉ phần câu tự sinh đổi theo. Phần câu tự sinh sửa tay được (đã chốt 2026-10-26). Không bắt buộc gõ thêm.
- Flow tự động: (chưa gán)

### TC-CMT-003 · Gửi phiếu cả lớp gửi mọi phiếu chưa gửi (không còn bước chọn sao)
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:56, 58
- Tiền điều kiện + dữ liệu: HS-1..2 đã gửi; HS-3 sửa còn 4 sao chưa gửi; HS-4 giữ mặc định 5 sao chưa gửi.
- Các bước:
  1. Bấm "Gửi phiếu cả lớp", xác nhận.
- Kết quả mong đợi: Mọi phiếu chưa gửi (HS-3, HS-4 kể cả phiếu mặc định 5 sao chưa sửa) chuyển sang đã gửi; phiếu đã gửi không bị gửi lại. Em Có mặt/Muộn chưa có phiếu cũng được gửi phiếu mặc định (5 sao, có câu tự sinh không rỗng, do app gửi `defaults`); xem TC-CMT-021.
- Flow tự động: (chưa gán)

### TC-CMT-004 · Danh sách Nhận xét và bộ lọc Tất cả / Chưa gửi
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:58
- Tiền điều kiện + dữ liệu: HS-1..2 đã gửi; HS-3, HS-4 chưa gửi.
- Các bước:
  1. Mở tab Nhận xét; dùng bộ lọc.
- Kết quả mong đợi: Danh sách có số sao, trạng thái phiếu, tóm tắt BTVN buổi trước. Bộ lọc chỉ có "Tất cả" và "Chưa gửi" (không còn "Chưa chọn sao"): "Chưa gửi" gồm HS-3, HS-4; "Tất cả" đủ bốn em.
- Flow tự động: (chưa gán)

### TC-CMT-005 · Chạm một em mở bottom sheet: Mít + sao, tiêu chí lưới 2 cột, một ô nhận xét (mobile)
- Vai: Giáo viên
- Nền tảng: iOS (và web ở viewport mobile/PWA)
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:58
- Tiền điều kiện + dữ liệu: Tab Nhận xét có học sinh.
- Các bước:
  1. Chạm một em.
- Kết quả mong đợi: Mở bottom sheet theo thiết kế slip-sheet-v4: khối Mít + số sao "x/5 sao · bấm tiêu chí để đổi" (Mít đổi dáng theo số sao), 5 tiêu chí là ô chọn lưới 2 cột (ô BTVN nằm hàng riêng, nhãn "Theo chấm BTVN" khi đang tự theo chấm), một ô nhận xét gộp (không còn nhãn "Tự sinh theo tiêu chí"; ô "Thêm nhận xét riêng (không bắt buộc)…"), chân sheet có trạng thái lưu và nút Lưu; không có ô ghi chú riêng, không có nút "Dùng câu mặc định"; không có chấm BTVN trong sheet.
- Flow tự động: web: `qa/maestro/web/slip-v4-smoke.mjs` (desktop); iOS: chưa gán

### TC-CMT-006 · Gửi phiếu cả lớp một lần
- Vai: Giáo viên (kiểm lại với Phụ huynh)
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:56, 60
- Tiền điều kiện + dữ liệu: HS-1..3 đã chọn sao; phụ huynh PH-A (HS-1) đã liên kết.
- Các bước:
  1. Bấm "Gửi phiếu cả lớp", xác nhận.
  2. Đăng nhập PH-A, mở nhận xét của HS-1.
- Kết quả mong đợi: Trạng thái các phiếu là đã gửi; phụ huynh thấy số sao (x/5) và nội dung ô nhận xét như một đoạn (câu tự sinh rồi phần gõ thêm), không thấy danh sách tiêu chí. Phụ huynh chỉ nhận một thông báo cho mỗi buổi (thông báo thật: thủ công, xem NTF ở `offline-sync.md`).
- Flow tự động: (chưa gán)

### TC-CMT-007 · Nhận xét chưa gửi thì phụ huynh chưa thấy
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:60, 74 (nguyên tắc chỉ thấy nội dung đã gửi: 91)
- Tiền điều kiện + dữ liệu: Phiếu HS-1 đã lưu chưa gửi.
- Các bước:
  1. Đăng nhập PH-A, mở mục Nhận xét.
- Kết quả mong đợi: Không thấy phiếu của buổi đó.
- Flow tự động: (chưa gán)

### TC-CMT-008 · Sửa phiếu sau khi gửi: phụ huynh thấy ngay, không gửi lại
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:61
- Tiền điều kiện + dữ liệu: Phiếu HS-1 đã gửi (5 sao).
- Các bước:
  1. Giáo viên bỏ tích 1 tiêu chí của HS-1 (4 sao, câu tự sinh đổi theo), gõ thêm phần riêng, lưu (không bấm gửi lại).
  2. Phụ huynh mở lại nhận xét.
- Kết quả mong đợi: Phụ huynh thấy bản sửa ngay (4 sao); trạng thái phiếu vẫn "đã gửi"; không có bước gửi lại.
- Flow tự động: (chưa gán)

### TC-CMT-009 · Gửi phiếu khi còn BTVN chưa chấm
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:62
- Tiền điều kiện + dữ liệu: Buổi N−1 có BTVN; ở buổi N còn phần chưa chấm cho HS-1; HS-1 có phiếu mặc định.
- Các bước:
  1. Bấm "Gửi phiếu cả lớp".
  2. Đọc hộp xác nhận; xác nhận gửi.
  3. Phụ huynh xem kết quả BTVN.
- Kết quả mong đợi: Gửi được; hộp xác nhận nhắc số phần chưa chấm; phụ huynh thấy "Chưa chấm" cho tới khi giáo viên chấm.
- Flow tự động: (chưa gán)

### TC-CMT-010 · Phiếu chỉ gồm học sinh đang học vào ngày buổi
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:63
- Tiền điều kiện + dữ liệu: Có học sinh vào lớp sau buổi M và học sinh nghỉ trước buổi N (xem `students.md`).
- Các bước:
  1. Mở tab Nhận xét của buổi M và buổi N.
- Kết quả mong đợi: Chỉ học sinh có ngày vào lớp ≤ ngày buổi ≤ ngày rời lớp có phiếu; phiếu cũ của em đã nghỉ được giữ.
- Flow tự động: (chưa gán)

### TC-CMT-011 · Phiếu hiển thị kết quả BTVN buổi trước
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:56, 65
- Tiền điều kiện + dữ liệu: Buổi N giao BTVN, chấm ở buổi N+1, phiếu buổi N+1 đã gửi.
- Các bước:
  1. Phụ huynh mở phiếu buổi N+1.
- Kết quả mong đợi: Phiếu gồm số sao, ô nhận xét (câu tự sinh + phần gõ thêm) và kết quả chấm BTVN buổi trước; kết quả chấm đi theo phiếu, không gửi riêng.
- Flow tự động: (chưa gán)

### TC-CMT-012 · Mất mạng: soạn phiếu vẫn lưu, Gửi phiếu cả lớp bị khoá
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191, 56
- Tiền điều kiện + dữ liệu: Buổi hôm nay, HS-1 có phiếu mặc định chưa gửi; mất mạng.
- Các bước:
  1. Bỏ tích 1 tiêu chí, gõ thêm vào ô nhận xét, lưu phiếu khi mất mạng.
  2. Xem nút "Gửi phiếu cả lớp".
  3. Bật mạng, mở lại buổi, bấm Gửi phiếu cả lớp.
- Kết quả mong đợi: Soạn lưu được ("Đã lưu trên máy · sẽ đồng bộ khi có mạng"). Gửi phiếu cả lớp bắt buộc có mạng, không xếp hàng: lúc mất mạng nút bị khoá kèm báo cần mạng; phiếu đã soạn giữ nguyên. Có mạng lại thì gửi được và phụ huynh thấy. (Người dùng chốt theo spec:191; web hiện còn hành vi cũ: fail thì ghi bug.)
- Flow tự động: (chưa gán)

### TC-CMT-013 · Sửa phiếu sau khi đã gửi: phụ huynh thấy ngay, không push mới; chấm lại BTVN không đổi phiếu đã gửi
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:61, 187
- Tiền điều kiện + dữ liệu: Phiếu buổi N+1 của HS-1 đã gửi; một phần BTVN buổi N chưa chấm cho HS-1.
- Các bước:
  1. Giáo viên chấm phần BTVN còn lại cho HS-1 ("Chưa hoàn thành"); mở lại phiếu HS-1 đã gửi, đọc tiêu chí BTVN, số sao, câu.
  2. Giáo viên tự bỏ tích một tiêu chí và gõ thêm phần riêng; lưu, không bấm gửi lại.
  3. Phụ huynh mở lại phiếu/BTVN; mở inbox thông báo (nếu có).
- Kết quả mong đợi: Bước 1: phiếu đã gửi giữ nguyên tiêu chí, số sao và câu như lúc gửi (không tự bỏ tích BTVN theo chấm mới; app không gửi `slip.set` cho phiếu đã gửi); kết quả chấm BTVN mới vẫn hiện cho phụ huynh. Bước 2–3: phụ huynh thấy nhận xét mới ngay; không có bước gửi lại; không có thông báo mới cho lần sửa.
- Flow tự động: web: `qa/maestro/web/slip-homework-regrade.mjs`; iOS: chưa gán

### TC-CMT-014 · Tiêu chí BTVN tự tích theo chấm buổi trước (chỉ phiếu chưa gửi); đổi tay thì giữ
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:51–61
- Tiền điều kiện + dữ liệu: Buổi trước có BTVN. HS-1: chấm có phần "Chưa hoàn thành". HS-2: mọi phần đã chấm "Hoàn thành tốt"/"Hoàn thành". HS-3: chưa chấm phần nào. HS-4: buổi trước không giao BTVN (hoặc lớp chưa có buổi trước).
- Các bước:
  1. Mở phiếu buổi hiện tại của HS-1, HS-2, HS-3, HS-4; xem tiêu chí "Hoàn thành bài tập về nhà", số sao và ô nhận xét.
  2. HS-2: bỏ tích tay "Hoàn thành bài tập về nhà", lưu; quay lại buổi trước đổi chấm HS-2 sang "Chưa hoàn thành"; mở lại phiếu HS-2.
  3. HS-1: tích tay tiêu chí BTVN, lưu; quay lại buổi trước đổi chấm HS-1 thành tất cả "Hoàn thành"; mở lại phiếu HS-1.
  4. Gửi phiếu HS-3; quay lại buổi trước chấm HS-3 "Chưa hoàn thành"; mở lại phiếu HS-3 đã gửi.
- Kết quả mong đợi: Chỉ áp dụng cho phiếu chưa gửi. Bước 1: HS-1 tự bỏ tích BTVN (4 sao, câu có "chưa hoàn thành bài tập về nhà"); HS-2 tự tích; HS-3 và HS-4 giữ mặc định (tích). Bước 2–3: lựa chọn tay được giữ, không tự đổi theo chấm nữa. Bước 4: phiếu đã gửi giữ nguyên tiêu chí, số sao và câu (không tự bỏ tích BTVN). Câu nhận xét luôn khớp các ô đang tích (câu do app sinh, xem TC-CMT-019/020). Sửa phiếu em này không ảnh hưởng phiếu em khác. Không còn nút "Dùng câu mặc định". Nhãn BTVN: "Buổi trước chưa có BTVN" ở TC-CMT-023.
- Flow tự động: web: `qa/maestro/web/slip-homework-regrade.mjs`; iOS: chưa gán

### TC-CMT-015 · Phiếu cũ: hiện một đoạn; đổi tiêu chí thì câu tự sinh thay câu cũ; phiếu thang 3 sao giữ nguyên x/3
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:60–63 (phiếu cũ theo thang 3 sao và phiếu có câu + ghi chú riêng)
- Tiền điều kiện + dữ liệu: Dữ liệu cũ có (a) phiếu thang 5 sao đã gửi có câu và ghi chú riêng, (b) phiếu 3/2/1 sao lưu trước thay đổi (chỉ có ở workspace cũ, QA smoke có thể không có).
- Các bước:
  1. Mở phiếu (a) ở tab Nhận xét; phụ huynh mở cùng phiếu.
  2. Giáo viên đổi một tiêu chí của phiếu (a); đọc ô nhận xét.
  3. Mở phiếu (b) ở tab Nhận xét; phụ huynh mở cùng phiếu.
- Kết quả mong đợi: (a) hiện thành một đoạn: câu cũ, ghi chú cũ xuống dòng sau, không mất nội dung; phụ huynh thấy cùng một đoạn. Sau khi đổi tiêu chí: câu cũ được thay bằng câu tự sinh theo tiêu chí, ghi chú cũ thành phần gõ thêm. (b) số sao và câu đã lưu giữ nguyên, hiện theo thang cũ (x/3), không đổi thành x/5; báo cáo đếm riêng thang cũ (xem TC-RPT-006).
- Flow tự động: thủ công: cần dữ liệu cũ, nằm ngoài workspace smoke mới.

### TC-CMT-016 · Mít có dáng riêng theo mức 0–5 sao (khối Mít + sao đầu sheet)
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:235
- Tiền điều kiện + dữ liệu: Mở phiếu nhận xét có thể chọn mức từ 0 đến 5 sao.
- Các bước:
  1. Chọn lần lượt 0, 1, 2, 3, 4 và 5 sao.
  2. Quan sát mascot Mít ở mỗi mức; chụp ảnh nhỏ chỉ phần mascot.
- Kết quả mong đợi: Mỗi mức sao có dáng Mít riêng; mascot chỉ trang trí và không làm đổi luồng hay nghiệp vụ.
- Flow tự động: web: `qa/maestro/web/slip-v4-smoke.mjs`; đánh giá trực quan vẫn thủ công


### TC-CMT-017 · Dán đoạn dài (1000 ký tự): giữ nguyên, không bộ đếm, lưu được
- Vai: Giáo viên
- Nền tảng: iOS
- Ưu tiên: P0
- Nguồn spec: docs/spec.md (câu nhận xét không giới hạn ký tự, Q-16 đã chốt 2026-10-25)
- Tiền điều kiện + dữ liệu: Phiếu nhận xét QA-iOS đang mở, trường câu nhận xét có nội dung mặc định; dùng chuỗi kiểm thử giả gồm 1000 ký tự `Z`, không dùng nhận xét thật.
- Các bước:
  1. Chọn tất cả nội dung trường câu nhận xét và dán chuỗi kiểm thử 1000 ký tự.
  2. Quan sát toàn bộ nội dung, có bộ đếm hay cảnh báo quá dài không.
  3. Bấm Lưu.
- Kết quả mong đợi: Toàn bộ 1000 ký tự còn nguyên; không có bộ đếm ký tự, không có cảnh báo "quá dài"; nút Lưu bật và lưu được phiếu ("Đã lưu").
- Flow tự động: `qa/maestro/ios/comments/TC-CMT-017.yaml` (chờ runtime xác nhận menu "Chọn tất cả", id comment.sentence và copyTextFrom).

### TC-CMT-018 · Sửa tay câu tự sinh rồi tích/bỏ tích lại: câu bị ghi đè, phần gõ thêm giữ
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:57
- Tiền điều kiện + dữ liệu: Phiếu HS-1 chưa gửi, mặc định 5 sao; đã gõ thêm `QA-gõ thêm`.
- Các bước:
  1. Sửa tay phần câu tự sinh thành `QA-câu sửa tay`; lưu; mở lại.
  2. Bỏ tích một tiêu chí; đọc ô nhận xét.
  3. Sửa tay lần nữa; lưu; tích lại tiêu chí vừa bỏ; đọc; lưu và mở lại.
  4. Sửa tay rồi gõ vào ô gõ thêm mà không tích/bỏ tích.
- Kết quả mong đợi: Bước 1: câu sửa tay lưu và mở lại đúng (không bị sinh lại). Bước 2–3: mỗi lần tích/bỏ tích câu tự sinh lại đúng theo ô đang tích và ghi đè hoàn toàn phần sửa tay; `QA-gõ thêm` giữ nguyên. Bước 4: câu sửa tay không bị đổi khi chỉ gõ thêm. Số sao luôn theo số tiêu chí tích.
- Flow tự động: (chưa gán) web: mở rộng `slip-v4-smoke.mjs` sau khi web có câu sửa tay

### TC-CMT-019 · Web và iOS sinh câu giống hệt nhau cho cùng bộ tiêu chí
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:54–56 (câu do app sinh theo cùng quy tắc, đã chốt 2026-10-26)
- Tiền điều kiện + dữ liệu: Phiếu nháp HS-1 trên web và HS-1 trên iOS (cùng phiếu, hoặc hai em cùng bộ tiêu chí).
- Các bước:
  1. Với từng mặt nạ trong bảng sau, đặt các ô tích đúng như mặt nạ trên mỗi nền tảng, đọc nguyên văn ô nhận xét (không gõ thêm): 11111 (5 sao), 11101 (thiếu Không mất trật tự... theo thứ tự tiêu chí 1..5, bit1..5), 00000 (0 sao), 11000 (2 sao), 00001 (chỉ BTVN), 10101, 01110, 11110 (BTVN chưa đạt).
  2. So sánh từng chuỗi web và iOS ký tự theo ký tự (dấu phẩy, "và", ", nhưng", dấu chấm cuối, không khoảng trắng thừa).
  3. Mở phiếu đã lưu trên nền tảng kia và so lại.
- Kết quả mong đợi: Hai nền tảng cho chuỗi trùng khít, và trùng các ví dụ trong spec (5 sao, thiếu Không mất trật tự, 0 sao). Máy chủ chỉ lưu câu app gửi: mở phiếu do nền tảng kia lưu thấy đúng câu đó, không bị đổi. Lệch ký tự nào là lỗi (ghi bug, nêu cả hai chuỗi, chuỗi là câu tiêu chí, không phải nội dung nhận xét thật).
- Flow tự động: so sánh bằng script đọc hai nguồn: web `qa/maestro/web/slip-sentence-matrix.mjs` + iOS `qa/maestro/ios/comments/TC-CMT-019.yaml` (chưa viết, cần id câu nhận xét iOS); chưa chạy.

### TC-CMT-020 · Chấm lại BTVN: app tự sửa phiếu NHÁP buổi kế, đúng điều kiện
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:57–58 (BTVN tự theo chấm, app sinh lại câu), docs/contract C8 v2 mục 2
- Tiền điều kiện + dữ liệu: Lớp có buổi N (BTVN đã giao), buổi N+1 là buổi kế (không huỷ, hôm nay), các phiếu N+1: HS-1 nháp `hw_manual` tắt; HS-2 nháp đã tích tay BTVN (`hw_manual` bật); HS-3 đã gửi; HS-4 nháp đang trong hàng đợi gửi (hoặc chờ đồng bộ); lớp có thêm buổi N+2.
- Các bước:
  1. Ở buổi N chấm HS-1, HS-2, HS-3, HS-4 "Chưa hoàn thành" (một phần).
  2. Mở phiếu N+1 của từng em; đọc tiêu chí BTVN, sao, câu.
  3. Mở phiếu N+2 của HS-1.
  4. Chấm lại HS-1 thành "Hoàn thành"; đọc phiếu N+1 HS-1.
  5. Lặp bước 1 khi mất mạng rồi bật lại mạng.
- Kết quả mong đợi: Chỉ HS-1 (nháp, thang 5, chưa gửi, không trong hàng đợi gửi, `hw_manual` tắt): N+1 tự bỏ tích BTVN (4 sao, câu có "chưa hoàn thành bài tập về nhà", do app sinh); bước 4 tích lại và câu đổi theo. HS-2 giữ lựa chọn tay; HS-3 đã gửi và HS-4 đang chờ gửi không đổi; N+2 không bị đổi (chỉ "buổi kế" tức buổi không huỷ đầu tiên sau N). Buổi N+1 bị huỷ thì buổi kế là N+2. Offline: việc tự sửa nằm trong hàng đợi, đồng bộ khi có mạng, không lỗi "Máy chủ từ chối" (kiểu WEB-009). Server không tự sửa nữa: mở phiếu trên thiết bị chưa chạy client mới không có bước tự đổi.
- Flow tự động: web: `qa/maestro/web/slip-homework-regrade.mjs` (cần sửa cho N+2, hàng đợi gửi, HS-2/HS-4); iOS: chưa gán (cần fixture BTVN buổi trước, xem `qa/maestro/ios/fixtures-brief96.md`)

### TC-CMT-021 · "Gửi phiếu cả lớp": em chưa có phiếu nhận phiếu mặc định có câu (defaults)
- Vai: Giáo viên (kiểm lại với Phụ huynh)
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:58 (dòng "Phiếu buổi học"), docs/contract C8 v2 mục 3
- Tiền điều kiện + dữ liệu: Buổi hôm nay; HS-1 Có mặt chưa có phiếu; HS-2 Muộn chưa có phiếu; HS-3 Vắng chưa có phiếu; HS-4 chưa điểm danh; HS-5 đã có phiếu nháp 4 sao; HS-6 phiếu thang 3 sao cũ chưa gửi (nếu có); buổi trước có BTVN, HS-1 chấm "Chưa hoàn thành".
- Các bước:
  1. Bấm "Gửi phiếu cả lớp", xem hộp xác nhận (số phiếu và số em bỏ qua), xác nhận.
  2. Đọc phiếu đã gửi của HS-1, HS-2, HS-5 và kết quả HS-3, HS-4.
  3. Phụ huynh của HS-1 mở nhận xét.
- Kết quả mong đợi: Hộp xác nhận đúng số (HS-3, HS-4 bỏ qua) rồi đóng khi gửi xong (không treo như IOS-001). HS-1, HS-2 có phiếu 5 sao hoặc theo chấm BTVN (HS-1 có câu "chưa hoàn thành bài tập về nhà"), câu không rỗng do app sinh; HS-5 gửi nguyên 4 sao; HS-6 (nếu có) nhận phiếu mặc định như em chưa có phiếu hoặc bị bỏ qua có lý do rõ (đối chiếu spec; không rõ thì hỏi GL). HS-3/HS-4 không có phiếu. Phụ huynh thấy x/5 và đoạn nhận xét.
- Flow tự động: (chưa gán) web: bổ sung vào `brief91-teacher-smoke.mjs`

### TC-CMT-022 · "Gán tất cả mặc định": xác nhận, đưa phiếu chưa gửi về mặc định, giữ phần gõ thêm
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:63
- Tiền điều kiện + dữ liệu: Buổi hôm nay có HS-1 nháp (bỏ 2 tiêu chí, câu sửa tay, `QA-gõ thêm`, BTVN tích tay); HS-2 nháp giữ mặc định; HS-3 đã gửi (đã sửa tiêu chí sau gửi); HS-4 đang chờ gửi/chờ đồng bộ; buổi trước HS-1 "Chưa hoàn thành".
- Các bước:
  1. Tìm nút "Gán tất cả mặc định" (web cạnh "Gửi phiếu cả lớp"; iOS cùng khu vực nút gửi cả lớp); bấm.
  2. Ở hộp xác nhận bấm Huỷ; kiểm tra không đổi gì.
  3. Bấm lại, xác nhận; đọc phiếu HS-1..4.
  4. Mở lại HS-1: tích tay BTVN còn giữ không; đổi chấm buổi trước.
  5. Lặp bước 3 khi mất mạng; bật mạng lại.
- Kết quả mong đợi: Có hộp xác nhận; Huỷ không đổi gì. Xác nhận: HS-1, HS-2 tích đủ 5 tiêu chí theo quy tắc (BTVN theo chấm: HS-1 bỏ tích vì "Chưa hoàn thành"; `hw_manual` tắt), câu tự sinh lại, ghi đè câu sửa tay, `QA-gõ thêm` giữ. HS-3 (đã gửi) và HS-4 (chờ gửi) không đổi. Sau đó đổi chấm buổi trước thì HS-1 tự theo chấm (vì đã bỏ chọn tay). Mất mạng: ghi được, hiện "Đã lưu trên máy", đồng bộ khi có mạng, không lỗi từ chối.
- Flow tự động: (chưa gán)

### TC-CMT-023 · Nhãn BTVN: "Buổi trước chưa có BTVN" khi buổi trước không giao; tiêu chí vẫn mặc định tích
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:57
- Tiền điều kiện + dữ liệu: HS-1 ở lớp có buổi trước không giao BTVN (hoặc lớp chưa có buổi trước); HS-2 ở lớp có BTVN buổi trước đã chấm; HS-3 buổi trước có BTVN chưa chấm.
- Các bước:
  1. Mở phiếu HS-1; đọc nhãn dưới ô "Hoàn thành BTVN" và trạng thái tích.
  2. Mở phiếu HS-2, HS-3; đọc nhãn.
  3. Giáo viên bỏ tích tay tiêu chí BTVN của HS-1.
- Kết quả mong đợi: HS-1: nhãn "Buổi trước chưa có BTVN" (không phải "Theo chấm BTVN"), tiêu chí mặc định tích. HS-2/HS-3: nhãn "Theo chấm BTVN". Bước 3 đổi được; app iOS đã thấy cùng trạng thái này trên màn thật (ảnh `plans/20261021-mvp/ios/ux-v3-mobile-fix/shots/qa-slip/42-homework-tab.png` hiện "Buổi trước không giao BTVN" ở tab BTVN).
- Flow tự động: (chưa gán)
