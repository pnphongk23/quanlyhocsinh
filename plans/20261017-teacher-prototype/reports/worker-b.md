# Worker B: điểm danh và điểm số

Ngày thực hiện: 2026-10-17.

## Kết quả

- Thay stub trong `src/features/attendance` bằng màn điểm danh cho mobile và desktop: chọn buổi, bốn trạng thái, giờ đến muộn và ghi chú, đánh dấu cả lớp có mặt, lưu qua repository, hủy buổi chưa diễn ra, tóm tắt buổi gần đây và cảnh báo vắng liên tiếp. Muộn được tính là đi học; có phép không trừ chuyên cần.
- Thay stub trong `src/features/scores` bằng bảng điểm desktop và nhập điểm theo bài trên mobile. Có trạng thái vắng thi/chưa có điểm, trung bình riêng mỗi học sinh theo trung bình cộng đơn giản, kiểm tra điểm trong khoảng 0–10 và lưu qua repository. Không có hệ số hay trung bình lớp.
- Hoàn thiện form tạo bài kiểm tra: tên, ngày, thang điểm cố định 10; tạo xong chuyển tới bảng điểm.
- Dùng `useSaveStatus` cho thay đổi chưa lưu, lưu trên máy, đồng bộ và lỗi. Tránh ghi lịch sử điểm danh nếu dữ liệu không thay đổi. Lịch sử sửa điểm/điểm danh được repository hiện có ghi lại.
- Chỉ sửa trong hai thư mục được giao và file báo cáo này. Không thêm thư viện; không cần đổi API Foundation.

## Kiểm chứng

- `npm run typecheck`: thành công.
- `npm run build`: thành công; 93 modules, có chunk riêng cho Điểm danh, Điểm số và Tạo bài kiểm tra.
- Mở thử bằng Paseo ở 390×844 và 1280×900: Điểm danh và Điểm số tải được ở cả hai cỡ; form Tạo bài kiểm tra tải được ở cả hai cỡ. Không tràn ngang ở các route đã kiểm tra.
- Thử thao tác: đổi cả lớp sang Có mặt rồi lưu, trạng thái hiển thị “Đã lưu trên máy”, hàng chờ tăng và cảnh báo vắng được tính lại; tạo bài kiểm tra thử và thấy bài mới ở bảng điểm. Sau đó dùng Cài đặt → Đặt lại dữ liệu mẫu để khôi phục dữ liệu ban đầu.
- Console trình duyệt không có lỗi; chỉ có log kết nối Vite và thông báo React DevTools.

## Vòng sửa

- **R01 — Đã sửa.** Draft điểm được lưu theo `classId`; thao tác lưu chỉ đọc và xóa draft của lớp hiện trên màn hình, còn draft lớp khác được giữ lại kèm liên kết quay lại lớp đó. Sau khi lưu có thông báo tên lớp. Test `scoreDrafts.test.ts` kiểm tra lấy/xóa draft riêng theo lớp. Paseo 390px: sửa điểm 6A thành 9.7, chuyển sang IELTS và bấm lưu; localStorage vẫn giữ nguyên các điểm 6A, số pending là 0, khi về 6A draft còn nguyên và có cảnh báo quay lại lớp.
- **R02 — Đã sửa.** Roster dùng ngày buổi học, gồm học sinh đã nghỉ sau buổi và loại học sinh nhập học sau buổi. `saveAttendanceBatch` kiểm tra toàn bộ input trước khi commit, ghi các dòng và đổi buổi sang `held` trong một snapshot/outbox. Test `sessionRoster.test.ts` và `attendanceBatch.test.ts` xác minh roster, batch lỗi không ghi một phần, batch hợp lệ chỉ tạo một pending và giữ lịch sử sửa. Paseo: thêm học sinh có ngày vào 17/10; buổi 14/10 hiện 9 em, buổi 19/10 hiện 10 em.
- **R09 — Attendance — Đã sửa.** Ô giờ đến muộn, ghi chú và select chọn buổi đạt 44px; nút trạng thái đã là 44px. Đo DOM bằng Paseo: hai ô trên mobile lần lượt cao 44px; select trên desktop cao 44px.
- **R11 — Attendance — Đã sửa.** Trên mobile, nút “Lưu điểm danh” chuyển xuống thanh dính dưới màn, cao 52px và vẫn hiện sau khi cuộn cuối danh sách. Giảm padding lồng để nội dung bắt đầu ở x=16px. Đo DOM tại 390px: trang không tràn ngang, thanh lưu dính, nút cao 52px.

Kiểm chứng sau vòng sửa: `npm run typecheck`, `npm run build`, `npm test` (7 files, 25 tests) đều thành công. Console trình duyệt không có lỗi ứng dụng.

Status: DONE
