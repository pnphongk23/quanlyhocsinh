# Đề xuất bổ sung skill `app-design`: trạng thái thành phần tương tác

Người soạn: lead UI 24/10 (`8237ac1e-1925-4ba5-8ecc-3d896af02bda`). Trạng thái: **ĐỀ XUẤT**. GL trình người dùng duyệt rồi mới sửa `~/.claude/skills/app-design`. Lead không tự sửa skill.

## Vì sao
Phản hồi người dùng 24/10 cho thấy ba lỗi lặp lại mà skill hiện chưa chặn:
1. Hai kiểu "đang chọn" cùng tồn tại: nav dùng nền tô, thẻ dùng viền đậm (ảnh 03).
2. Bấm lưu không có phản hồi. Đo thật (`f8-measure.md`): 10/10 tổ hợp lưu cục bộ có 0 frame spinner và 0 chữ "Đã lưu", vì ghi IndexedDB xong trong vài ms.
3. Empty state lệch nhau: một chỗ có mascot, tiêu đề và hành động, chỗ khác chỉ là một dòng chữ trơn (ảnh 07).

Hiện skill chỉ nói chung chung: "Design applicable initial, loading, content, empty, error, updating, success, and offline states" (`SKILL.md`, `references/visual-interaction-performance.md` mục State and feedback).

## Đề xuất thay đổi

### A. `references/visual-interaction-performance.md`: thêm mục "Interactive component states"
```markdown
## Interactive component states

Define one state contract per component type (primary/secondary/destructive
button, nav item, selectable card, chip/segmented, list row, text input,
grid cell, dialog/sheet) × state (default, hover, pressed, focus-visible,
selected, disabled, loading, success, error, empty). Store values as role
tokens (`state-selected-bg`, `state-success-fg`, …) in the project's token
source; components reference tokens only.

- Selected: one treatment app-wide, a fill (background tint plus foreground
  colour). Do not use a border or stroke for selection; keep the focus ring for
  keyboard focus only.
- Local-first saves: when the write completes faster than a frame, keep the
  loading state visible for a minimum duration (≈400 ms) without delaying the
  write itself, then show a short success confirmation (≈1.5 s, text plus
  icon, announced politely). Separate "saved on device" from "synced". Show a
  pending-sync or offline indicator when the queue does not drain quickly.
- Errors keep the user's input and the editor open, and offer retry.
- Empty: one component app-wide (illustration or mascot, title, one-line
  reason, optional action) with a compact variant for small containers. Never
  ship a bare text line as an empty state.
- Verify with a script that observes painted frames (busy attribute + rAF),
  not by reading code.
```

### B. `SKILL.md`: thêm vào danh sách kiểm tra cuối (gần dòng 110)
```markdown
- one selected treatment (fill, not stroke) across nav, cards, chips, rows;
- every save/send/create action shows visible loading, success, error and
  pending-sync states, measured in a running build;
- every empty state uses the shared empty component with illustration.
```

## Phạm vi và rủi ro
- Đề xuất này chỉ thêm, không đổi quy tắc cũ. Áp dụng được cho web, PWA và native vì quy tắc dựa trên token vai trò, không gắn với framework nào.
- Rủi ro: thời gian loading tối thiểu làm chậm điều hướng sau khi lưu khoảng 400 ms. Ghi chú này cần nằm luôn trong skill để người dùng chấp nhận có ý thức.
- Bằng chứng áp dụng thực tế: `plan.md` mục 4, `design/ux-v2/rules.md` mục 6 (khi gói T xong).
