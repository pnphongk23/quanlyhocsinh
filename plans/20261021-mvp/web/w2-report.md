# W-2 · Giáo viên mobile/PWA

## Phạm vi đã làm

- Đồng bộ các màn thuộc `classes`, `students`, `attendance`, `comments`, `homework`, `schedule` theo prototype hiện tại; thêm các màn CSS/TSX desktop `StudentsDesktop`, `AttendanceDesktop`, `CommentsDesktop`, `HomeworkDesktop` và các file phụ thuộc trong sáu thư mục sở hữu.
- Nối route `/lop`, `/lop/moi`, `/lich`, và màn Học sinh với các màn tính năng tải lười. Schedule dùng helper `sessionGroups.ts` cục bộ vì hợp đồng Phase A chưa có `src/data/sessionGroups.ts`.
- Giữ logic ghi qua repository, trạng thái lưu chỉ hiện lỗi, chuỗi P3 còn áp dụng cho phần được giao. Loại thẻ “Người dạy” khỏi bản desktop vì nội dung phân công nhân sự ngoài phạm vi Bản đầu.
- Thêm `matchMedia` stub cho test route W-2 và đổi các kỳ vọng placeholder thành màn W-2. `src/test/routes.test.tsx` là file dùng chung, chưa đưa vào commit theo brief.

## Đối chiếu prototype

| Màn | Prototype | Bản thật | Khác biệt / ghi chú |
|---|---|---|---|
| Lớp | Lớp mẫu 6A và số liệu chuyên cần | Chuyển tới Đăng nhập, hiện “Màn hình đang được xây dựng.” | Auth guard chặn route thật; chưa có fixture dev để vào app. |
| Tạo lớp | Form tên, ngày, giờ | Chuyển tới Đăng nhập | Không thể kiểm tra tương tác lưu với repository hiện tại. |
| Lịch | Ngày/tháng và buổi mẫu | Chuyển tới Đăng nhập | Chưa có phiên đăng nhập thử để vào danh sách buổi. |
| Học sinh | Danh sách học sinh | Chuyển tới Đăng nhập | Chưa thể kiểm tra màn với lớp mẫu trong app thật. |
| Buổi học | Tab Điểm danh / Nhận xét / Bài tập về nhà | Chuyển tới Đăng nhập | Chưa thể kiểm tra nội dung tab trong app thật. |
| Mascot trạng thái rỗng | Dùng asset prototype | Đã khôi phục import `shared/ui/Mascot` và `EmptyState.mascot` | Component shared được W-1 cập nhật trong lúc làm. |

Ảnh prototype và bản thật nằm trong `plans/20261021-mvp/web/shots/w2/`. Có ảnh mobile 390×844 và desktop 1360×934 cho Lớp, Tạo lớp, Lịch, Học sinh, Buổi học; ảnh prototype Buổi học thể hiện tab Điểm danh. Chưa có ảnh riêng tab Nhận xét và Bài tập về nhà vì auth guard hiện chuyển mọi route thật sang màn Đăng nhập.

## Kiểm chứng

- `npm run typecheck`: đạt.
- `npm run build`: đạt; bundle ban đầu 104,102 byte gzip JS và 1,214 byte gzip CSS, dưới ngưỡng cấu hình.
- W-2 route mapping và model tests: 32/32 đạt (`routes.test.tsx -t 'W-2 route'`, `classes.test.tsx`, `commentsModel.test.ts`, `homeworkModel.test.ts`, `scheduleModel.test.ts`).
- `npm test` toàn repo: 106 đạt, 29 thất bại ở `foundation.test.tsx`, `class-space/desktopHeader.test.ts`, `class-space/sessionDetailTabs.test.tsx`, `class-space/desktopRender.test.tsx`, `reports/reportsPreview.test.tsx`; các failure hiện tại tập trung ở nền W-1 và màn W-3 ngoài quyền sở hữu W-2.
- Không commit vì brief yêu cầu chỉ commit khi xanh toàn bộ. Không stage file W-1/W-3; route test dùng chung cũng để lại cho lead.

## Cần xử lý trước DONE

1. W-1 cần có fixture dev/test không PII và đường vào app thử nghiệm để role có quyền truy cập, lớp, học sinh và buổi mẫu; khi đó mới so sánh được màn thật với prototype.
2. W-1/W-3 xử lý 29 test thất bại ở các suite kể trên; sau đó chạy lại `npm test` toàn repo.
3. Sau khi có đường vào app, chụp riêng tab Nhận xét và Bài tập về nhà ở 390×844 và 1360×934, cập nhật bảng khác biệt, rồi lead commit route/test dùng chung và W-2 khi toàn bộ kiểm tra xanh.
