# Web D — Gửi nhận xét

## Kết quả

- Thêm kiểu quyền `send_comments` vào quyền role và response membership. Quyền chỉ có `none`/`write`; `can()` và `useAccess` suy ra giá trị từ `comments_reports` khi khóa vắng trên máy chủ cũ.
- Ẩn hành động gửi ở màn Nhận xét mobile và desktop khi thiếu quyền, giữ nguyên các thao tác soạn và gán mặc định. Repository cũng kiểm quyền trước khi tạo lệnh `slip.send`.
- Thêm hàng “Gửi nhận xét” vào ma trận Giáo viên/Trợ giảng, chỉ có “Không” và “Sửa”. Dữ liệu GET cũ thiếu khóa được hiển thị theo `comments_reports`; payload PUT chỉ gồm quyền đã đổi.
- Cập nhật quyền mặc định cục bộ: Giáo viên có quyền gửi; Trợ giảng và Phụ huynh không có. Thêm nhãn “Phiếu nhận xét” cho lỗi `slip.send` bị từ chối trong banner hiện có. Lệnh bị từ chối không được tính là đang chờ gửi khi kho cục bộ tải lại.
- Điểm vào “Nhập danh sách” đã kiểm tra sẵn quyền Học sinh: Sửa và quyền truy cập lớp; các kiểm thử hiện có xác nhận ẩn khi thiếu một trong hai điều kiện.
- Điều chỉnh fixture báo cáo để kiểm thử trường hợp không có quyền một cách tường minh; mặc định Trợ giảng mới có `comments_reports: write` theo spec.

## File của phần D

- `src/data/api/types.ts`, `src/data/types.ts`, `src/data/defaults.ts`
- `src/data/repositories/access.ts` và `access.test.ts`
- `src/data/repositories/comments.ts`
- `src/features/comments/CommentsPanel.tsx`, `CommentsDesktop.tsx`, `CommentsPanel.permissions.test.tsx`
- `src/features/staff/PermissionMatrix.tsx`, `staffModel.ts`, `staffModel.test.ts`, `staff.test.tsx`
- `src/shared/SaveStatus/RejectedBanner.tsx`
- `src/features/reports/reportsPreview.test.tsx` (chỉ fixture quyền)

Các file `NotesImport*`, `notesParser*`, `CriteriaMode*` và `src/data/outbox.ts` có thay đổi khác trong worktree dùng chung; không sửa các phần đó trong task D.

## Kiểm chứng

- `npx vitest run src/data/repositories/access.test.ts src/data/repositories/comments-offline.test.ts src/features/comments/CommentsPanel.permissions.test.tsx src/features/staff/staffModel.test.ts src/features/staff/staff.test.tsx src/features/students/ImportStudentsAction.test.tsx`: **6 file, 43 test qua**.
- `npx vitest run src/features/reports/reportsPreview.test.tsx`: **31 test qua** sau khi fixture trường hợp thiếu quyền được đặt tường minh.
- Suite toàn bộ đã chạy một lần: **101 file qua, 1 file lỗi, 2 bỏ qua; 797 test qua, 1 lỗi, 4 bỏ qua**. Lỗi duy nhất là fixture trên vừa nêu; test file chạy lại riêng đã qua.
- `npx tsc --noEmit` và build staging không qua do lỗi kiểu trong `src/features/comments/NotesImportDialog.tsx` (state kết quả lưu được gán `{ saved, errors }` nhưng khai báo là `number | null`, sau đó đọc thuộc tính `.saved/.errors`). Đây là phần import đang được làm song song và nằm ngoài phạm vi chỉnh sửa D.
- Không commit, push hay deploy.

## Còn lại

- Cần sửa lỗi kiểu `NotesImportDialog.tsx` ở phần Nhập từ ghi chú rồi chạy lại TypeScript và build. Không chạy lại suite toàn bộ vì brief yêu cầu chỉ chạy `npx vitest run` toàn bộ một lần; suite đã chạy một lần và lỗi test duy nhất đã được xác nhận riêng sau khi cập nhật fixture.
