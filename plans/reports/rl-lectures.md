# Báo cáo worker rl-lectures (bài giảng)

- Status: DONE
- Cổng dev: 5302 (`cd design/prototype && npm run dev -- --port 5302 --host 127.0.0.1`)
- Nguồn: `docs/spec.md` mục 4 (Bài giảng, Phân quyền và role), mục 5.1; `plans/prototype-roles-lectures-contract.md`. Không đổi chữ ký API, không sửa docs/spec.

## Đã làm

- `features/lectures/LibraryPage.tsx`: thẻ bài giảng (tên, số phần, số buổi đang dùng qua `lectureUsageCount`, người tạo + ngày), ô tìm kiếm (khớp tên bài và tên phần, bỏ dấu tiếng Việt), `Segmented` lọc Của tôi / Tất cả / Đã lưu trữ, `Fab` tạo mới (ẩn khi không có `lectures:write`), trạng thái rỗng riêng cho từng bộ lọc và cho tìm kiếm, `NoAccess` khi không có `lectures:read`.
- `features/lectures/LectureEditorPage.tsx` (tạo và sửa): tên bài giảng; danh sách phần thêm/xoá/đổi thứ tự (nút ↑ ↓ 44px, disable ở biên); mỗi phần có Tên, Mô tả, tệp đính kèm giả lập (`input[type=file]` chỉ lưu `name`, `size`, `type`, không lưu nội dung), gỡ tệp; cảnh báo offline: "phần chữ vẫn lưu được, tệp cần mạng" và input file bị khoá khi mất mạng; khi sửa bài giảng đã có mà offline thì nút Lưu bị khoá kèm giải thích (vì `updateLecture` yêu cầu mạng theo hợp đồng dữ liệu để tránh xung đột).
- `features/lectures/LectureDetailPage.tsx` (chỉ xem): tiêu đề, người tạo + ngày, pill "Đã lưu trữ", dòng "Đang dùng ở N buổi" mở `Sheet` danh sách buổi (lớp, số buổi, ngày, link tới buổi), các phần + tệp (tên, dung lượng), ghi chú tệp cần mạng; menu "..." có Sửa và Lưu trữ kèm `Modal` xác nhận; bản đã lưu trữ có thêm Khôi phục (dùng `restoreLecture`).
- `features/lectures/SessionLecturesPanel.tsx`: khu "Bài giảng" của buổi — danh sách đã gắn (link tới chi tiết, nút Gỡ liên kết), nút "+ Thêm" mở `Sheet` chọn nhiều bài giảng có tìm kiếm và tick sẵn bài đã gắn, dòng nhắc nhẹ khi chưa có bài giảng; ẩn mọi nút ghi khi thiếu `lectures:write`; buổi đã huỷ chỉ xem.
- `features/class-space/SessionDetailPage.tsx`: gọi `useAccess()`, chèn `SessionLecturesPanel` (chỉ khi có `lectures:read`, truyền `locked` khi buổi đã huỷ).
- `features/lectures/lectureFormat.ts` + `lectureFormat.test.ts`: định dạng dung lượng tệp, tìm kiếm bỏ dấu, nhãn số phần/số buổi.

## File trong WRITE-SET

Mới: `design/prototype/src/features/lectures/LibraryPage.tsx`, `LectureEditorPage.tsx`, `LectureDetailPage.tsx`, `SessionLecturesPanel.tsx`, `lectureFormat.ts`, `lectureFormat.test.ts`, `library.module.css`, `lectureEditor.module.css`, `lectureDetail.module.css`, `sessionLectures.module.css`.
Sửa: `design/prototype/src/features/class-space/SessionDetailPage.tsx`.
Không cần sửa: `design/prototype/src/features/class-space/sessionDetail.module.css` (khu bài giảng là `Card` trong luồng `gap` sẵn có, không cần CSS mới).

## Kiểm chứng

- `npx tsc --noEmit` → OK (không lỗi).
- `npx vitest run` → 15 file, 86 test pass (gồm `lectureFormat.test.ts` 4 test).
- Chạy `npm run dev -- --port 5302` và kiểm tra bằng Chrome headless qua CDP ở viewport 390×844 (`innerWidth 390`, `scrollWidth 390`, `deviceScaleFactor 2`):
  - Thư viện: 2 thẻ đúng dữ liệu seed; tìm "travel" → 1, "hoi thoai" (không dấu, khớp tên phần) → 1, "hội thoại" → 1, từ khoá rỗng kết quả → hiện "Không tìm thấy bài giảng", xoá ô tìm kiếm → 2 thẻ.
  - Tạo bài giảng khi offline: hiện cảnh báo, `input[type=file]` bị khoá, lưu được phần chữ (bài giảng mới có phần "Phần thử"), điều hướng sang trang chi tiết, có 1 lệnh trong hàng đợi.
  - Sửa bài giảng khi offline: cảnh báo đúng nội dung, nút Lưu bị khoá, input file bị khoá.
  - Sửa bài giảng khi online: đổi tên, đưa phần 2 lên, xoá phần 3 → lưu đúng vào store và trang chi tiết hiện nội dung mới; buổi đang dùng đọc cùng bản ghi nên thấy nội dung mới.
  - Gắn/gỡ bài giảng ở buổi: sheet mở, tick sẵn bài đã gắn, "Gắn 2 bài giảng" → store có đủ 2 liên kết; bấm "Gỡ" → còn 1 liên kết, không có lỗi.
  - Lưu trữ: menu "..." → "Lưu trữ bài giảng" → modal xác nhận → `archived: true`, điều hướng về `/bai-giang`; lọc "Đã lưu trữ" hiện thẻ có pill; mở lại chi tiết → "Khôi phục bài giảng" → `archived: false`.
  - Sheet "Đang dùng ở 2 buổi" liệt kê đúng 2 buổi kèm link `/lop/6a/buoi-hoc/...`.
  - Phân quyền (đổi `activeMemberId` sang Cô Thu Trang, role Trợ giảng, `lectures: read`): thư viện hiện danh sách nhưng không có FAB; khu Bài giảng ở buổi không có "+ Thêm" và không có "Gỡ". Đặt `role-assistant.permissions.lectures = "none"`: `/bai-giang` hiện `NoAccess`, khu Bài giảng ở buổi biến mất hoàn toàn.
  - Desktop 1280px: thư viện 2 cột, FAB ở góc phải dưới 24px; trang chi tiết căn giữa tối đa 900px.

## Cần bạn xác nhận / lưu ý

1. Bộ lọc mặc định của thư viện là **Tất cả** (tab "Của tôi" vẫn đứng đầu). Lý do: membership mặc định khi mở app là Cô Lan – Admin, mà bài giảng seed do Cô Lan – Giáo viên và Thầy Minh tạo, nên "Của tôi" sẽ trống ngay lần đầu mở. Trạng thái rỗng của "Của tôi" có nút "Xem tất cả bài giảng" và ngược lại. Nếu bạn muốn mặc định "Của tôi", chỉ cần đổi một dòng `useState`.
2. Trang chi tiết có thêm mục **Khôi phục** cho bài giảng đã lưu trữ (hợp đồng dữ liệu có `restoreLecture`, spec yêu cầu lưu trữ chứ không xoá cứng). Nếu không muốn, gỡ nút này.
3. Nút `Fab` bị ẩn ở tab "Đã lưu trữ" (tránh tạo mới trong ngữ cảnh đang xem lưu trữ).
4. Loại tệp được lưu (`type`) đúng hợp đồng nhưng giao diện chỉ hiện tên + dung lượng.
5. Ngoài write-set: mẫu `.page { max-width: …; margin: 0 auto; min-width: 0 }` bên trong `.content` (flex column) làm trang bị co về `fit-content` khi nội dung ngắn — gặp ở `features/students/StudentsPage.tsx` và các trang cũ. Tôi xử lý trong 3 module của mình bằng `width: 100%`; các trang ngoài write-set vẫn còn hiện tượng này, không tự sửa.
6. `pinchtab` không dùng được trong máy này (`~/.pinchtab/bin/pinchtab-darwin-arm64` thiếu, cần `npm rebuild pinchtab`), nên tôi kiểm tra bằng Chrome headless + CDP với `Emulation.setDeviceMetricsOverride(390×844, dpr 2, mobile)`. Đã xem ảnh chụp từng màn; chưa kiểm tra bằng thiết bị thật/VoiceOver.
