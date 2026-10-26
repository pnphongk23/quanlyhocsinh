# Quyết định design (lọc finding reviewer)

Người lọc: General Lead. Mỗi finding đã đối chiếu với ảnh và spec trước khi chấp nhận hay từ chối.

## Vòng 1 · Web · Chi tiết lớp (review 1/3, reviewer codex `gpt-6-luna`, báo cáo `round-1/review-r1.md`)

| ID | Mức gốc | Quyết định | Lý do và căn cứ |
|---|---|---|---|
| R1-01 | BLOCKER | CHẤP NHẬN | Ảnh 03: thẻ "Người dạy" có nút "Đổi người dạy". Dạy thay thuộc Nhân sự (spec mục 4 "Phân công và dạy thay"), chưa thuộc Bản đầu. Bỏ nút; giữ thẻ chỉ đọc (tên người dạy) vì brief gốc yêu cầu thẻ. |
| R1-02 | BLOCKER | CHẤP NHẬN | Ảnh 14: "Đã mời / Chưa mời", "Gửi lại", "Mời" là luồng mời đã bỏ (lead-brief mục 1). Thay bằng trạng thái tài khoản phụ huynh theo luồng "Cấp mật khẩu". Luồng này là đề xuất chưa được người dùng xác nhận (status.md, câu hỏi mở 1): nếu bị bác, chỉ đổi nhãn và nút này. |
| R1-03 | BLOCKER | CHẤP NHẬN | Ảnh 15: "3 tháng gần nhất". Spec mục 8 Bản đầu chỉ có báo cáo theo tháng, báo cáo 3 tháng nằm ở Làm sau. Thay bằng chọn tháng. |
| R1-04 | MAJOR | TỪ CHỐI | Màn Báo cáo (ảnh 15) là bảng chọn học sinh, tạo nháp và phát hành; brief mục (7) bảo dùng lại nội dung màn Báo cáo hiện có, không thiết kế lại. Nội dung báo cáo (điểm từng bài, sao, BTVN theo phần) nằm ở "Xem trước PDF", không phải màn này. Việc rà "Xem trước PDF" ghi vào design/todo.md (mục 07). |
| R1-05 | MAJOR | CHẤP NHẬN | Ảnh 14: tiêu đề cột và các dòng dính thành một đoạn chữ, bảng vỡ bố cục. Đã xem ảnh, các màn khác bình thường nên đây là lỗi riêng màn này. |
| R1-06 | MAJOR | CHẤP NHẬN | Đã đối chiếu: ảnh 15 ghi Trần Gia Bảo "Unit 5 · 11/15", ảnh 13 cho Unit 5 Test = 12 (11 là điểm Từ vựng Unit 4); bài gần nhất có điểm của em là "Kiểm tra nói Unit 6" 14/20. |
| R1-07 | MINOR | CHẤP NHẬN | Ảnh 04 thiếu emoji sao. Lỗi bắt nguồn từ brief gửi Claude Design (câu mẫu không có emoji), spec mục 4 thắng. Cả ba câu phải khớp nguyên văn spec. |

### Ba chỗ Claude Design tự quyết

1. "Kiểm tra gần nhất" thay "Điểm trung bình" ở Báo cáo: GIỮ nhãn, không phải trung bình trá hình (một điểm của một bài, có "/max"); sửa dữ liệu theo R1-06.
2. Các nút phụ ở góc phải đầu trang: giữ "…" (Sửa lớp, Sửa lịch, Lưu trữ) và "+ Thêm học sinh"; BỎ "Thêm từ lớp khác" (spec mục 8 Làm sau: "thêm học sinh từ lớp khác"). Hàng chọn kỳ "Tháng 10 | 3 tháng gần nhất": xem R1-03.
3. Khung sửa phần BTVN cạnh danh sách (ảnh 06): ĐỒNG Ý, đúng brief (thêm, sửa, xoá; khoá xoá khi đã chấm).

### Finding bổ sung của General Lead (reviewer bỏ sót)

| ID | Mức | Màn | Mô tả | Căn cứ |
|---|---|---|---|---|
| GL-01 | MAJOR | 01 | Buổi bị hủy ghi "Buổi 6 · Đã hủy" có số buổi; các buổi sau (7, 8, 9, 10) đếm cả buổi hủy. | Spec mục 4: "Số buổi chỉ đếm buổi đã diễn ra"; commit `3d4645a` "cancelled sessions have no session number". Buổi hủy hiện không số ("Buổi đã hủy"), các buổi sau đánh số lại liên tục (buổi 11/10 thành Buổi 6, 12/10 Buổi 7, 14/10 Buổi 8, 19/10 Buổi 9; Buổi hiện tại là Buổi 10). |
| GL-02 | MINOR | 01 | "Buổi hiện tại" là Chủ Nhật 25/10 (buổi lẻ) trong khi hôm nay Thứ Ba 20/10 và lịch lặp có Thứ Tư 21/10 18:00. Dữ liệu mẫu từ brief gốc chưa hợp lý. | Spec mục 8: buổi hiện tại là buổi gần nhất sắp tới. Đổi thành Thứ Tư 21/10 18:00, bỏ chip "Buổi lẻ" ở thẻ, "Sửa buổi lẻ" chỉ hiện cho buổi lẻ. |

Hệ quả GL-01 cho các màn khác: tiêu đề "Buổi 10 · Thứ Hai, 19 tháng 10" ở ảnh 03 đến 07 đổi thành "Buổi 9 · Thứ Hai, 19 tháng 10 · 18:00" (nếu Claude Design giữ nguyên số buổi cũ thì nhất quán với ảnh 01 là yêu cầu bắt buộc, chọn một cách đánh số duy nhất).

## Ghi chú vận hành

- Chấp nhận R1-01, 02, 03, 05, 06, 07 và GL-01, GL-02 → cần vòng sửa: `outbox/02-sua-vong-1-chi-tiet-lop.md`.
- Chưa phán quyết "Phiếu 5/10" ở buổi 10 và các số mẫu khác: đã đối chiếu ảnh 01 và 04 (5 phiếu "Đã gửi") khớp.
- Lỗi chồng chữ ở nhãn khung đầu ảnh 01 là artefact của bảng thiết kế (nhãn khung), không phải màn; bỏ qua.
- Huy hiệu "Made with Claude Design" ở ảnh 04 là của công cụ, bỏ qua.

## Vòng 2 · Web · Chi tiết lớp (review 2/3, báo cáo `round-2/review-r2.md`)

Kết luận reviewer: CHANGES_REQUESTED. Đã sửa đúng: R1-01, 02, 03, 05, 06, GL-01, GL-02. R1-07 chỉ sửa câu 2 sao (xem R2-02).

| ID | Mức | Quyết định | Lý do và căn cứ |
|---|---|---|---|
| R2-01 | MAJOR | CHẤP NHẬN | Ảnh 01: buổi lẻ Chủ Nhật 25/10 không còn ở bảng hay thẻ, chỉ còn ghi chú ở Lịch lặp; không có đường xem, sửa, hủy buổi lẻ sắp tới. Spec mục 8: thêm buổi lẻ ngoài lịch lặp. Sửa: thêm thẻ "Buổi lẻ sắp tới" ở cột phải, giữa Buổi hiện tại và Lịch lặp, đánh số liên tục (Buổi 11). Đây cũng là lỗi tôi gây ra ở outbox 02 mục (6) vì không nói chỗ hiển thị buổi lẻ. |
| R2-02 | MINOR | CHẤP NHẬN | Tôi tự tìm trong HTML round-2: câu 1 sao (`Con chỉ đạt 1 sao`) có 0 kết quả, câu 2 sao và 3 sao đúng nguyên văn. Yêu cầu bổ sung. Chọn thêm đúng một biến thể màn Nhận xét ở mức 1 sao (nhẹ, thấy được trạng thái sao thấp), không thêm màn cho 3 sao. |

Ý kiến về bốn chỗ tự quyết: (a) ĐỒNG Ý (đã đếm: 10 em; Dũng, Kiệt thiếu dữ liệu; 8/10 sẵn sàng gồm Minh Anh đã phát hành; 7 báo cáo chưa phát hành khớp "Phát hành 7"); (b) ĐỒNG Ý; (c) ĐỒNG Ý, không thêm màn cho mỗi mức, chỉ thêm biến thể 1 sao theo R2-02; (d) KHÔNG ĐỒNG Ý, xem R2-01.

Ghi chú: cột "Unit 7 Test" ở ảnh 13 bị cắt ở mép phải, bảng cuộn ngang nên không phải lỗi; khi làm prototype phải bảo đảm cột cuối truy cập được.

→ Vòng sửa 2: `outbox/03-sua-vong-2-chi-tiet-lop.md`. Sau đó review vòng 3 (cuối); hết vòng 3 còn CHANGES_REQUESTED thì dừng và báo controller.

## Tài khoản vòng 1 (round-3, review `auth-r1/review-r1.md`)

Kết luận reviewer: APPROVED (không BLOCKER/MAJOR). Đối chiếu 6 mục outbox 01: đúng cả; không thấy OTP, SMS, mời, link/QR chung, duyệt, kích hoạt, bài giảng, học phí, lương, nhân sự, trung bình. Delta Chi tiết lớp round-2 → round-3 (ảnh 11, 13, 15): không đổi nội dung nhìn thấy, chỉ khác vài pixel/dải tiêu đề; dữ liệu 13, 14, 15 vẫn khớp.

| ID | Mức | Quyết định | Lý do |
|---|---|---|---|
| A1-01 | MINOR | CHẤP NHẬN | Ảnh 23: ô "Tên hiển thị" sửa được + nút "Lưu tên". Spec không có tính năng sửa hồ sơ người dùng ở Bản đầu và sẽ kéo theo endpoint mới; thiết kế chỉ đọc (YAGNI). Chỗ mơ hồ ("tên, SĐT chỉ đọc") do outbox 01 của tôi. |
| A1-02 | MINOR | CHẤP NHẬN | Ảnh 11: "Me của Minh Anh" thiếu dấu, sửa thành "Mẹ của Minh Anh". |

Chỗ tự quyết: dải độ mạnh mật khẩu và chỉ báo tối thiểu 8 ký tự: ĐỒNG Ý. Hai màn quên mật khẩu: ĐỒNG Ý. Tên sửa được ở web: KHÔNG ĐỒNG Ý (A1-01).

Nghiệp vụ đăng nhập (Cấp mật khẩu tạm, quên mật khẩu giáo viên/Admin, đăng ký không xác minh SĐT) vẫn CHỜ người dùng: thiết kế này là đề xuất, không chốt.

→ Sửa nhỏ: `outbox/03b-sua-tai-khoan-nho.md` (gửi cùng chat sau outbox 03, hoặc gộp chung).

## Vòng 4 (round-4, outbox 03 + 03b): kết luận DONE (tôi tự xác minh, không mở reviewer)

Xác minh trực tiếp trên ảnh và HTML (chụp lại bằng script, đối chiếu ảnh round-3):

- R2-01 ĐÃ SỬA ĐÚNG: ảnh 01 có thẻ "Buổi lẻ sắp tới" (chip Buổi lẻ, Buổi 11 · Chủ Nhật, 25 tháng 10 · 17:00, Xem buổi / Sửa buổi lẻ / Hủy buổi) giữa "Buổi hiện tại" (Buổi 10 · Thứ Tư 21/10) và "Lịch lặp"; thẻ Buổi hiện tại chỉ còn Xem buổi, Hủy buổi. Ảnh 02 đổi theo.
- A1-01 ĐÃ SỬA ĐÚNG: ảnh 23 (web Cài đặt tài khoản): Tên hiển thị và SĐT đều chỉ đọc, không còn nút "Lưu tên". Ảnh 24 đổi theo.
- A1-02: "Mẹ của Minh Anh" đã đúng từ round-3 (HTML round-3 và round-4 đều có "Mẹ của Minh Anh", 0 chỗ "Me của"): reviewer đọc nhầm, không có gì phải sửa.
- Không chồng lấn trên bảng thiết kế: kiểm hộp giới hạn (bounding box) 17 màn "Web · Chi tiết lớp": chỉ nhãn nhóm "Web · Chi tiết lớp" nằm đè khung đầu của màn Buổi học (đã có từ round-1, thuộc bảng thiết kế, không phải màn). Màn "Nhận xét · 1 sao" không đè màn Báo cáo.
- R2-02 CHƯA ĐẠT: ảnh `04b-nhan-xet-1-sao.png` sai: danh sách bên trái cho Bùi Tuấn Kiệt 1 sao (Nháp), nhưng khung bên phải vẫn chọn "2 sao" và hiện câu mẫu 2 sao; HTML không có câu "Con chỉ đạt 1 sao". Quyết định: KHÔNG gửi thêm vòng sửa (tốn lượt Claude Design, chỉ là màn minh hoạ); coi màn 04b là không dùng. Câu mẫu 1 sao lấy nguyên văn từ `docs/spec.md` mục 4: "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ."; prototype cho ba mức theo `stars`. Đây là chỗ lệch còn lại giữa design và prototype.
- Ghi chú: ảnh 04 đủ để làm màn Nhận xét (mức 2 sao), ba mức đổi theo lựa chọn.

**Design DONE** cho Web · Chi tiết lớp (ảnh `design/round-4/01…15`, bỏ 04b) và Tài khoản (ảnh `design/auth-r4/01…24`; Tài khoản là đề xuất, nghiệp vụ đăng nhập vẫn chờ người dùng). Bước kế: cập nhật prototype `design/prototype` (briefs/30, 31).

## Màn phụ huynh · prototype (Lead Design phụ huynh, 2026-10-22)

Claude Design không truy cập được (chưa đăng nhập claude.ai, người dùng vắng). Theo chỉ đạo GL: inventory từ export cục bộ `source/round-4` + prototype; màn thiếu thiết kế thẳng trong prototype bằng hệ thống hiện có. **Các màn mới (đăng ký phụ huynh, "chưa có con nào được liên kết", tóm tắt con ở Cài đặt phụ huynh) CHƯA qua Claude Design, cần người dùng duyệt khi về.** Chi tiết: `guardian/inventory.md`, ảnh `prototype-shots/p4/`, chữ `guardian/strings.md`.

Reviewer codex `gpt-6-luna` high, vòng 1 (`guardian/review-r1.md`): CHANGES_REQUESTED.

| Finding | Quyết định | Căn cứ |
|---|---|---|
| Nút "3 tháng gần nhất" (disabled) ở Báo cáo, MAJOR | CHẤP NHẬN, đã bỏ cả nhóm chọn kỳ + sửa test | Spec mục 8: báo cáo 3 tháng thuộc Làm sau; 74 mục 4-5. |
| Ghép SĐT và quyền xem con chỉ kiểm chứng tĩnh, chưa trên API thật, MAJOR | GHI NHẬN cho backend/iOS, không đổi prototype | Prototype có test (11 test mới); xác minh trên Worker thuộc lead backend. |
| Form đăng ký dài, cân nhắc CTA cố định đáy, MINOR | TỪ CHỐI | Giữ mật độ và bố cục như form giáo viên đã duyệt (auth-r4/04); YAGNI. |
| Nhãn "Chỉ đọc" cạnh tên/SĐT ở Cài đặt phụ huynh, MINOR | TỪ CHỐI | Ảnh duyệt auth-r4/11 chỉ có icon khoá; strings không yêu cầu. |
| Inventory chưa cập nhật, MINOR | CHẤP NHẬN, đã cập nhật | |
| Thiếu ảnh đăng nhập/quên mật khẩu, MINOR | CHẤP NHẬN, đã thêm p4/11, p4/12 | Đã kiểm: không nhắc mật khẩu tạm/cấp mật khẩu. |
| Nhãn "Trung bình" ở ảnh đăng ký | KHÔNG PHẢI LỖI | Là độ mạnh mật khẩu. |
| Các MINOR còn lại (giữ nguyên) | GIỮ | Reviewer xác nhận đúng. |

Sau vòng sửa: `npm test` 546/546, `npm run build` xanh. Chưa cần vòng 2 (không còn BLOCKER/MAJOR chưa xử lý trong phạm vi prototype).

Vòng 2 (cuối, `guardian/review-r2.md`): DONE, không còn BLOCKER/MAJOR trong phạm vi prototype. Lưu ý MINOR: luồng "Tải PDF về máy" cần xác nhận trên thiết bị thật (iOS/web), không đổi prototype. Backend/API thật ngoài phạm vi (ghi riêng trong review-r2).
