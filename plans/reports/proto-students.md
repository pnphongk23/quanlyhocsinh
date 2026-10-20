# Báo cáo worker proto-students

## Status: DONE

- Đã bỏ heading/nút thêm học sinh khỏi nội dung trang; chuyển thao tác thêm sang FAB dùng chung.
- Đưa thống kê thành một dòng chữ phụ dưới hàng tab lớp.
- Mỗi thẻ mobile có nút tuỳ chọn vùng chạm 44×44px, `aria-label` theo tên học sinh. Sheet cho phép mở luồng xác nhận nghỉ hiện có; dữ liệu và lịch sử tiếp tục được giữ nguyên.
- Bỏ wrapper trạng thái lưu thừa. Component `SaveStatus` không hiển thị khi không có lỗi.

## File

- `design/prototype/src/features/students/StudentsPage.tsx`
- `design/prototype/src/features/students/students.module.css`

## Kiểm chứng

- `cd design/prototype && npx tsc --noEmit` — đạt.
- `cd design/prototype && npx vitest run src/data/repositories/repositories.test.ts` — đạt, 13 tests.
- Mở Vite ở cổng 5206 và kiểm tra trang `/lop/6a/hoc-sinh` tại viewport 390×844. Screenshot/DOM xác nhận subtitle, FAB và menu Sheet. Đo lường DOM: `innerWidth=390`, `scrollWidth=390`, `role=status` không xuất hiện khi không có lỗi.
- Không tìm thấy test riêng cho màn Students.
