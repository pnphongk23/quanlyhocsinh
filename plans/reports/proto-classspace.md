# Báo cáo worker proto-classspace

- Status: DONE
- File sửa trong WRITE-SET: `design/prototype/src/features/class-space/ClassSpaceLayout.tsx`, `design/prototype/src/features/class-space/classSpace.module.css`.
- Bỏ dropdown chuyển lớp và eyebrow số học sinh khỏi header; tên lớp là tiêu đề thuần.
- Bỏ hàng “Lịch lặp” và nút “Sửa lịch”; giữ mục “Sửa lịch học” trong menu “...”.
- Dọn import và CSS chỉ phục vụ bố cục đã bỏ. Không sửa `PageHeader` dùng chung.
- Kiểm chứng: `npx tsc --noEmit` thành công; `npx vitest run src/features/classes/classes.test.ts` thành công (3 tests); `git diff --check` thành công.
- Kiểm tra trình duyệt: chạy Vite trên `127.0.0.1:5203`, mở lớp 6A tại viewport 390×844. Header hiện nút quay lại, tên lớp và nút “Tuỳ chọn lớp”; các tab hiển thị ngay dưới, không còn dropdown hay hàng lịch lặp.
