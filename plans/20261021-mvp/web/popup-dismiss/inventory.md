# Popup dismiss inventory (mvp-web)

| Popup | File | Trước | Sau |
|---|---|---|---|
| Menu ⋯ bài kiểm tra (desktop) | features/scores/TestsDesktop.tsx | tự làm, KHÔNG có đóng ngoài/Esc (gốc lỗi) | useDismiss |
| Chọn lớp sidebar (listbox) | roles/staff/StaffShell.tsx | không đóng ngoài/Esc | useDismiss |
| Menu ⋯ lớp, buổi, học sinh | features/classes/ClassOptionsMenu.tsx | scrim + Esc riêng, không trả focus | scrim giữ, Esc/focus qua useDismiss |
| Sheet/Modal (Tuỳ chọn buổi, bài KT, HS mobile, dialog) | shared/ui/Modal.tsx, Sheet.tsx | `<dialog>`: Esc + bấm nền + guard | không đổi |
| ConfirmDialog, SendTicketsDialog | features/classes, features/comments | Esc riêng + scrim | không đổi |
| Guardian child picker | roles/guardian/GuardianShell.tsx | dialog, đã có bấm nền | không đổi |

Gốc: mỗi chỗ tự làm menu; menu tự dựng trong TestsDesktop và listbox StaffShell thiếu listener ngoài. Sửa: `shared/hooks/useDismiss.ts`.
## Prototype

| Popup | File:dòng | Có lỗi đóng ngoài/Esc? | Ghi chú |
|---|---|---|---|
| Menu tuỳ chọn lớp (⋯) | `design/prototype/src/features/classes/ClassOptionsMenu.tsx:43-55` | Không | Escape gọi `onClose`; scrim phủ nền có `onClick={onClose}` nên bấm ngoài menu đóng được. Mã tĩnh cho thấy xử lý này. |
| Bộ chọn lớp / dropdown / listbox | — | Không thấy trong mã đã rà | Không tìm thấy popup chọn lớp dùng `role="listbox"`/`combobox`; kết luận giới hạn trong mã prototype đã rà. |
