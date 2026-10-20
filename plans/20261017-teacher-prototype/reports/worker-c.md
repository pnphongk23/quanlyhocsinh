# Worker C: comments, reports

Ngày thực hiện: 2026-10-17.

## Kết quả

- Thay stub Comments bằng màn nhận xét theo buổi: chọn buổi, lọc tất cả/chưa nhập/chưa gửi, chọn học sinh, chèn câu mẫu, lưu nháp và gửi. Có trạng thái lưu và chế độ mô phỏng offline; khi offline, nội dung được lưu thành nháp và hiện “Đã lưu trên máy · sẽ gửi khi có mạng”.
- Thay stub Reports bằng báo cáo theo tháng: trạng thái sẵn sàng từng học sinh, điểm danh, điểm từng bài, trung bình cộng, nhận xét đã gửi; lưu trạng thái nháp, phát hành/phát hành lại từng báo cáo hoặc các báo cáo đủ dữ liệu. Bản xem trước HTML có nút in và CSS `@media print`.
- Bản Comments desktop dùng danh sách và editor hai cột. Báo cáo desktop có danh sách học sinh và phần xem chi tiết; mobile xếp theo cột, dùng được ở chiều rộng nhỏ.
- Không thêm thư viện, không sửa API chung, không làm báo cáo 3 tháng hoặc gợi ý AI. Dữ liệu đọc/ghi qua repositories.

## Cần Foundation

- `Report`/`saveReport` chỉ lưu metadata (lớp, học sinh, tháng, trạng thái, cờ phát hành lại), chưa có chỗ lưu bản nháp nội dung hoặc snapshot nội dung đã phát hành. Bản in hiện dựng từ dữ liệu điểm danh, điểm và nhận xét đã gửi tại thời điểm xem/in. Cần bổ sung repository cho nội dung/snapshot nếu muốn giữ đúng phiên bản báo cáo đã phát hành.

## Kiểm chứng

- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; Vite tạo chunk riêng cho Comments/Reports.
- `npm test -- --run`: 3 test files, 16/16 tests passed. Thêm 3 test cho kỳ báo cáo: bỏ buổi chưa diễn ra, vắng thi không tính trung bình nhưng vẫn đủ dữ liệu, thiếu điểm danh/điểm/nhận xét, và thời gian theo học.
- `git diff --check`: exit 0.
- Chrome: mở cả `/lop/6a/nhan-xet` và `/lop/6a/bao-cao` ở viewport 390×844 và 1280×900; không tràn ngang. Console không có lỗi.
- Đã thử lưu nhận xét trong chế độ mô phỏng offline; nội dung hiển thị là nháp cùng trạng thái “sẽ gửi khi có mạng”. Đã xem preview, phát hành báo cáo, sửa điểm sau phát hành và xác nhận báo cáo hiện “Điểm có cập nhật, cần phát hành lại”.

## Vòng sửa

- **R03 — Đã sửa.** Bản nháp đang gõ được giữ theo lớp/buổi/học sinh; khi đổi học sinh, buổi hoặc rời route, cleanup lưu qua `saveComment` repository. Tái hiện trên Chrome: gõ nội dung chưa lưu, đổi sang học sinh khác rồi quay lại; sau đó đổi buổi đi-về và điều hướng sang Điểm rồi trở lại Nhận xét. Nội dung giữ nguyên trong cả ba kịch bản.
- **R05 — Đã sửa.** Khi mô phỏng offline, thông báo nay là “Đã lưu nháp trên máy; hãy bấm gửi khi có mạng.” Đã bấm “Lưu và gửi”, tắt mô phỏng, xác nhận bản ghi vẫn là nháp và thông báo không hứa tự gửi. Đây đúng với `sendComment` hiện yêu cầu online; không thêm ý định gửi tự động.
- **R06 — Đã sửa.** Báo cáo đánh dấu thiếu dữ liệu khi score không tồn tại hoặc `value === null && absent === false`; score vắng thi (`absent === true`) vẫn đủ trạng thái và không vào trung bình. Vitest mới xác nhận điểm null không phải vắng thi khiến `ready=false` và thêm lý do thiếu điểm.
- **R07 — Đã sửa.** Danh sách bài kiểm tra báo cáo lọc theo tháng và thời gian theo học (`date >= enrolledAt`, `date <= leftAt`), cùng điều kiện với repository scores. Vitest mới dùng fixture học sinh vào giữa tháng, với bài trước/trong/sau thời gian học; chỉ bài trong thời gian học được tính và báo cáo đủ dữ liệu.
- **Kiểm chứng vòng sửa:** `npm run typecheck` exit 0; `npm run build` exit 0; `npm test -- --run` exit 0, 7 test files/25 tests qua (gồm test R06/R07); `git diff --check` exit 0. R03/R05 được tái hiện lại trên trình duyệt, không lỗi console.

Status: DONE_WITH_CONCERNS
