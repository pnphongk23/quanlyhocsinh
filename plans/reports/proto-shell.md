# Báo cáo worker proto-shell

- `SaveStatus` giữ nguyên `useSaveStatus` và API hiện có; component chỉ render cảnh báo khi trạng thái là `error`.
- Shell mobile không còn hàng trạng thái rỗng; shell desktop và mobile chỉ gắn `SaveStatus`, không hiển thị số thay đổi chờ hay trạng thái mạng/đồng bộ.
- Logic chặn đăng xuất vẫn còn ở `src/features/settings/SettingsPage.tsx`: nút bị vô hiệu hóa khi `pending > 0`, và gọi `logout()` sau khi qua kiểm tra đó.

## Mâu thuẫn tài liệu

- `AGENTS.md` dòng 24 yêu cầu giao diện luôn hiện rõ các trạng thái lưu, gồm chưa lưu, lưu trên máy, đã đồng bộ và lỗi.
- `docs/spec.md` dòng 114 yêu cầu hiện rõ “Đã lưu trên máy” và “Đã đồng bộ”; dòng 142 yêu cầu báo trạng thái lưu.
- `docs/architecture.md` dòng 93 yêu cầu luôn hiện số thay đổi chưa đồng bộ.
- Các yêu cầu này mâu thuẫn với quyết định chung hiện tại: ẩn mọi trạng thái lưu/đồng bộ và chỉ hiện khi lỗi. Không sửa tài liệu theo phạm vi được giao.

## Kiểm chứng

- `cd design/prototype && npx tsc --noEmit` — đạt ở lần chạy cuối. Lần chạy trước từng báo thiếu `Button` trong `src/features/class-space/ClassSpaceLayout.tsx` (ngoài WRITE-SET); lỗi đã hết ở lần chạy cuối, không sửa file đó.
- `npx vitest run src/data/repositories/repositories.test.ts` — 1 test file, 13 tests đạt.
- Mở prototype bằng Vite trên cổng 5201 và xem viewport 390×844: trang lớp không có hàng trạng thái rỗng; thanh tab vẫn ở đáy. Trạng thái lỗi được xác nhận qua nhánh render trong component, chưa kích hoạt lỗi lưu trên giao diện.

## File trong WRITE-SET

- `design/prototype/src/shared/SaveStatus/index.tsx`
- `design/prototype/src/app/TeacherShell.tsx`
- `design/prototype/src/app/shell.module.css`
