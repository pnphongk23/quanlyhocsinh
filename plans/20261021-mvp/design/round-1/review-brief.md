# Việc review: thiết kế Web · Chi tiết lớp, vòng 1

Bạn là reviewer độc lập (chỉ đọc, KHÔNG sửa file nào ngoài file báo cáo). Thư mục repo: `/Users/phamnhuphong/Git/quanlyhocsinh`.

## Đọc

1. `docs/spec.md` (nguồn chuẩn). Chú ý mục 3, 4 (Điểm, Nhận xét, BTVN, Điểm danh), 8 (phạm vi), và quyết định 2026-10-20: không điểm trung bình ở bất kỳ đâu, không "Vắng thi", điểm tối đa theo từng bài (số nguyên 1..1000, mặc định 15), xoá bài: chưa có điểm thì xoá hẳn, đã có điểm thì lưu trữ, bài giảng để phiên bản sau.
2. `design/claude-design-web-class-detail-prompt.md`: brief đã gửi cho Claude Design (kiểm thiết kế có đúng brief không).
3. `plans/20261021-mvp/lead-brief.md` mục 1 (quyết định MVP: BTVN 3 mức, bỏ mọi luồng mời/OTP, phụ huynh đăng nhập SĐT + mật khẩu).
4. Ảnh 15 màn trong `plans/20261021-mvp/design/round-1/` (01 đến 15, xem `INDEX.md` để biết màn nào ứng mục nào của brief). Ảnh là nguồn chính. Nguồn HTML ở `../source/round-1/Tat ca man hinh.dc.html` rất lớn (2 MB, 293+ màn), chỉ tra cứu khi cần xác nhận một chi tiết; dùng `srcwalk`/tìm theo tên màn "Web · Chi tiết lớp", không đọc cả file.

## Kiểm theo spec và brief

- Cấm tuyệt đối: điểm trung bình (cột, hàng, ô, biểu đồ, chữ "TB"), ô/trạng thái "Vắng thi", bài giảng, học phí, lương, nhân sự, mời/link mời/OTP/duyệt yêu cầu.
- Điểm danh đúng 4 trạng thái: Có mặt, Muộn, Có phép, Vắng. Chỉ điểm danh từ ngày học trở đi; buổi chưa tới chỉ xem hoặc hủy.
- BTVN: tối đa 4 phần, mỗi loại một phần (Luyện từ vựng, Luyện đọc, Luyện nói, Bài tập), tiêu đề + mô tả không bắt buộc, không tệp đính kèm; chấm 3 mức (Hoàn thành tốt / Hoàn thành / Chưa hoàn thành), ô chưa chấm "Chưa chấm"; xoá phần bị khoá nếu đã chấm; "Bài tập buổi trước" mặc định mở.
- Nhận xét: 3 mức sao với câu mẫu cố định không sửa, ghi chú tùy chọn, bắt buộc chọn sao mới gửi, "Gửi phiếu cả lớp", bộ lọc Tất cả / Chưa chọn sao / Chưa gửi, KHÔNG bottom sheet trên web, kết quả BTVN buổi trước chỉ đọc. Câu mẫu đúng chữ theo spec mục 4 (kể cả emoji sao nếu spec có).
- Bài kiểm tra/Điểm: điểm tối đa theo từng bài, mặc định 15, tiêu đề cột ghi "/điểm tối đa", ô trống "Chưa có điểm", hộp xác nhận xoá nói rõ "xoá hẳn" hay "lưu trữ", sửa không hạ điểm tối đa dưới điểm cao nhất đã nhập.
- Chi tiết lớp: khung đầu trang dùng chung, tab đang chọn rõ, hai cột ở màn Buổi học (không một cột kéo hết ngang), thẻ Buổi hiện tại và Lịch lặp đúng nội dung brief, chip trạng thái, nhất quán số liệu mẫu (lớp 6A, 10 học sinh, Thứ Ba 20/10, lịch Thứ Hai/Thứ Tư 18:00, buổi lẻ Chủ Nhật 17:00).
- Chất lượng UI: chữ tràn/cắt, độ tương phản, kích thước vùng bấm, căn lề, chữ tiếng Việt sai dấu, nhất quán với design system Web hiện có.

## Ba chỗ Claude Design tự quyết, cần ý kiến rõ (ĐỒNG Ý / KHÔNG ĐỒNG Ý + lý do theo spec)

1. Màn Báo cáo (15): ô "Điểm trung bình" đã đổi thành "Kiểm tra gần nhất". Có hợp spec không (báo cáo tháng gồm chuyên cần, điểm từng bài, sao, BTVN)? Có lộ trung bình trá hình không?
2. Ba nút phụ ở góc phải đầu trang (nhìn các ảnh 01 đến 15): nút gì, có thuộc phạm vi MVP và brief không, có thừa không.
3. Màn BTVN giao (06): khung sửa phần BTVN đặt cạnh danh sách. Có đúng brief (thêm, sửa, xoá phần; xoá khoá khi đã chấm) không.

## Ra

Ghi `plans/20261021-mvp/design/round-1/review-r1.md`:

- Mỗi finding một mục: `ID` (R1-01...), `Mức` (BLOCKER = vi phạm spec/brief; MAJOR; MINOR; NIT), `Màn` (số ảnh), `Mô tả` (một hai câu), `Căn cứ` (trích đúng mục spec hoặc brief), `Đề xuất sửa`.
- Mục riêng "Ba chỗ tự quyết" với kết luận từng chỗ.
- Mục "Đã kiểm, đạt" liệt kê ngắn các điểm đúng.
- Kết luận cuối: `CHANGES_REQUESTED` (còn BLOCKER hoặc MAJOR) hoặc `APPROVED`.
- Không bịa lỗi: chỉ báo điều thấy được trong ảnh/HTML. Spec không rõ thì ghi "Spec chưa rõ" thay vì phán.

Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
