# Báo cáo worker proto-attendance

## Đã làm

- Nút trạng thái xoay vòng theo thứ tự Có mặt → Vắng → Muộn → Có phép → Có mặt.
- Vuốt ngang trên từng dòng học sinh: vuốt trái đánh dấu Muộn, vuốt phải đánh dấu Vắng; hint hiện khi kéo, ngưỡng 64 px và `touch-action: pan-y` để giữ cuộn dọc.
- Giữ `saveAttendanceBatch` và luồng nhật ký sửa điểm danh hiện có.
- Header chi tiết đã có tên lớp ở dòng eyebrow phía trên tiêu đề buổi. Không có chip trạng thái thường nào do màn này tự dựng; `SaveStatus` vẫn được giữ để lỗi lưu hiển thị.

## Kiểm chứng

- `cd design/prototype && npx tsc --noEmit` — đạt.
- `npx vitest run src/features/attendance/attendanceBatch.test.ts src/features/attendance/sessionRoster.test.ts` — 2 test files, 3 tests đạt.
- Mở route chi tiết buổi học trong prototype qua Vite cổng 5205; accessibility tree xác nhận có tên lớp, các nút trạng thái, hướng dẫn vuốt và nút “Lưu điểm danh”.
- Chưa đặt được viewport chính xác 390 px: môi trường trình duyệt hiện tại không cung cấp in-app browser hoặc điều khiển viewport cho tab Chrome. Vì vậy chưa xác minh trực quan ở kích thước mobile yêu cầu.

## File đã sửa

- `design/prototype/src/features/attendance/AttendancePanel.tsx`
- `design/prototype/src/features/attendance/AttendancePanel.module.css`
- `plans/reports/proto-attendance.md`
