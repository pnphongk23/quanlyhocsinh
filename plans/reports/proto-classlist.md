# Báo cáo worker proto-classlist

## Tóm tắt

- Biến toàn bộ thẻ lớp thành liên kết tới trang buổi học của lớp, có focus ring khi dùng bàn phím.
- Giữ tên lớp, số học sinh và chuyên cần; bỏ lịch học, trạng thái buổi tiếp, nút “Mở lớp” và nội dung giải thích.
- Dọn import và CSS không còn dùng trên màn danh sách lớp.

## File đã sửa

- `design/prototype/src/features/classes/ClassListPage.tsx`
- `design/prototype/src/features/classes/classes.module.css`
- `plans/reports/proto-classlist.md`

## Kiểm chứng

- `cd design/prototype && npx tsc --noEmit` — đạt.
- `cd design/prototype && npx vitest run src/features/classes/classes.test.ts` — đạt, 1 file / 3 test.
- Mở Vite tại cổng 5202 và xem `/lop` trên Chrome ở viewport 390px; ảnh và cây accessibility xác nhận thẻ lớp là liên kết, chỉ còn tên lớp, số học sinh và chuyên cần.
