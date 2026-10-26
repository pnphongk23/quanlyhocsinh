# Việc review: Web · Chi tiết lớp, vòng 2

Bạn là reviewer độc lập (chỉ đọc; chỉ ghi file báo cáo). Repo: `/Users/phamnhuphong/Git/quanlyhocsinh`.

## Đọc

1. `plans/20261021-mvp/design/round-1/review-brief.md`: toàn bộ quy tắc kiểm vẫn áp dụng (cấm điểm trung bình, Vắng thi, bài giảng, mời/OTP, v.v.). Đọc và áp dụng lại cho vòng 2.
2. `plans/20261021-mvp/design/decisions.md`: finding vòng 1 đã chấp nhận (R1-01, 02, 03, 05, 06, 07, GL-01, GL-02) và lý do.
3. `plans/20261021-mvp/design/outbox/02-sua-vong-1-chi-tiet-lop.md`: yêu cầu sửa đã gửi Claude Design (6 mục).
4. `plans/20261021-mvp/design/round-2/INDEX.md`: chỗ Claude Design tự quyết (a) đến (d).
5. Ảnh vòng 2: `plans/20261021-mvp/design/round-2/01…15-*.png` (tên như vòng 1). Ảnh vòng 1 ở `../round-1/` để so (chỉ khi cần).
6. `docs/spec.md` (nguồn chuẩn, mục 3, 4, 8) và `docs/architecture.md` mục 1 (web desktop nay thuộc Bản đầu).
7. HTML nguồn `plans/20261021-mvp/design/source/round-2/Tat ca man hinh.dc.html` rất lớn (2 MB): chỉ dùng `srcwalk` hoặc tìm chuỗi để xác nhận một chi tiết (ví dụ câu mẫu trong mã), KHÔNG đọc cả file.

## Kiểm

A. **Đối chiếu từng mục đã yêu cầu**: với mỗi finding R1-01, R1-02, R1-03, R1-05, R1-06, R1-07, GL-01, GL-02 nêu `ĐÃ SỬA ĐÚNG / SỬA SAI / CHƯA SỬA` kèm số ảnh và bằng chứng. Chú ý:
 - R1-02: màn Học sinh không còn "Đã mời/Chưa mời/Gửi lại/Mời"; có cột "Tài khoản phụ huynh" với ba trạng thái và nút "Cấp mật khẩu"/"Cấp lại"; thống kê khớp 10 em; menu "…" có Sửa SĐT, Cấp lại mật khẩu, Đánh dấu nghỉ; bảng đã đúng cột, không dính chữ (R1-05); bỏ "Thêm từ lớp khác".
 - R1-03/R1-06: Báo cáo chọn tháng một lựa chọn; "Kiểm tra gần nhất" của Trần Gia Bảo là "Kiểm tra nói Unit 6 · 14/20" và mọi số mẫu khớp màn Điểm (13) và Học sinh (14).
 - R1-07: câu mẫu 3 sao, 2 sao, 1 sao khớp NGUYÊN VĂN `docs/spec.md` mục 4 (kể cả emoji 🌟 và dấu câu). Màn chỉ hiện mức đang chọn: tìm câu của hai mức còn lại trong HTML nguồn để biết có đúng nguyên văn không.
 - GL-01/GL-02: buổi hủy không số; các buổi sau đánh số liên tục (Buổi 5 Thứ Hai 5/10; buổi hủy 7/10; Chủ Nhật 11/10 học bù = Buổi 6; 12/10 = Buổi 7; 14/10 = Buổi 8; 19/10 = Buổi 9; Buổi hiện tại = Buổi 10 Thứ Tư 21/10 18:00); tiêu đề và breadcrumb của mọi màn chi tiết buổi nhất quán với ảnh 01.
B. **Bốn chỗ tự quyết (a) đến (d)**: mỗi chỗ nêu ĐỒNG Ý / KHÔNG ĐỒNG Ý + lý do theo spec. Riêng:
 - (a) số liệu "Sẵn sàng 8/10", "Thiếu dữ liệu 2 em", "Phát hành 7 báo cáo" có nhất quán với nhau và với danh sách em (đếm lại) và với màn Điểm (13) không; gợi ý nhận xét của Bảo "2/1/1 sao" có khớp dữ liệu buổi (04, 03) không.
 - (c) có cần thêm màn cho mỗi mức sao không? Spec đã ghi cố định ba câu mẫu, màn thiết kế chỉ cần cho thấy câu theo mức đang chọn. Cho ý kiến, không bắt buộc.
 - (d) buổi lẻ Chủ Nhật 25/10 (sắp tới, ngoài lịch lặp) không hiện ở bảng "Các buổi đã qua" và không ở thẻ Buổi hiện tại: người dùng có còn thấy, sửa, hủy được buổi lẻ sắp tới không? Spec mục 8: thêm buổi lẻ ngoài lịch lặp; màn Buổi học chia "buổi hiện tại" và "các buổi đã qua". Đề xuất cách hiển thị tối thiểu phù hợp spec (không thêm tính năng ngoài MVP).
C. **Hồi quy**: so 15 màn với vòng 1, có chỗ nào vòng 2 làm hỏng cái đang đúng (bố cục hai cột, khung sửa BTVN, các màn Bài kiểm tra/Điểm, chip) hoặc thêm chỗ vi phạm cấm; menu "…" mở sẵn ở dòng Dũng (ảnh 14) có che nội dung quan trọng hay có mục ngoài MVP không.
D. **Chất lượng UI**: chữ tràn/cắt, chồng chữ, căn lề, tương phản, chữ tiếng Việt, nhất quán số liệu mẫu (lớp 6A, 10 học sinh, hôm nay Thứ Ba 20/10).

## Ra

`plans/20261021-mvp/design/round-2/review-r2.md`: bảng đối chiếu mục A; finding mới (ID R2-01…, Mức BLOCKER/MAJOR/MINOR/NIT, Màn, Mô tả, Căn cứ, Đề xuất sửa); mục B (a) đến (d); mục "Đã kiểm, đạt"; kết luận `CHANGES_REQUESTED` hoặc `APPROVED` (APPROVED khi không còn BLOCKER hoặc MAJOR). Không bịa lỗi: chỉ báo điều thấy; chỗ spec không rõ ghi "Spec chưa rõ".

Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
