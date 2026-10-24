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
Prototype `design/prototype/`: chưa kiểm, không sửa.
