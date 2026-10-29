# Màu trạng thái: đặc vừa phải

Giữ nguyên màu thương hiệu Mít và các token màu cơ sở. Selected, badge và chip dùng nền đặc + chữ trắng. Card/banner trạng thái dùng nền mềm với viền và chữ đậm. Selected tiếp tục không có viền theo quy tắc giao diện. Tokens đã đồng bộ sang web và prototype trong worktree; mapping iOS là tài liệu, chưa áp dụng vào `Tokens.swift`.

## Token trước → bản đã chọn

| Token | Trước | Đặc vừa phải |
|---|---|---|
| `--state-selected-bg` | `--color-primary-soft` (`#e8eefe`) | `--color-primary` (`#2f5bea`) |
| `--state-selected-fg` | `--color-primary-ink` (`#1e43b8`) | `--color-on-primary` (`#ffffff`) |
| `--state-success-bg` | `--color-success-soft` (`#e7f6ec`) | `--color-success` (`#14663f`) |
| `--state-success-fg` | `--color-success` (`#14663f`) | `--color-on-primary` (`#ffffff`) |
| `--state-error-bg` | `--color-error-soft` (`#fdecec`) | `--color-error` (`#b42318`) |
| `--state-error-fg` | `--color-error` (`#b42318`) | `--color-on-primary` (`#ffffff`) |
| `--state-pending-bg` | `--color-warning-soft` (`#fff3d6`) | `--color-warning` (`#8a5300`) |
| `--state-pending-fg` | `--color-warning` (`#8a5300`) | `--color-on-primary` (`#ffffff`) |
| `--card-success-bg/border/fg` | Chưa có | `#e7f6ec` / `#14663f` / `#14663f` |
| `--card-error-bg/border/fg` | Chưa có | `#fdecec` / `#b42318` / `#b42318` |
| `--card-pending-bg/border/fg` | Chưa có | `#fff3d6` / `#8a5300` / `#8a5300` |

## Tương phản

Tính bằng `node check-contrast.mjs`, theo công thức WCAG relative luminance và `(L sáng + 0.05) / (L tối + 0.05)`. Cột cuối của bảng state là tương phản nền trạng thái đặc với bề mặt trắng, dùng để kiểm tra thành phần UI.

| Trạng thái | Cặp cũ | Cũ | Cặp đã chọn | Mới | Nền mới / trắng |
|---|---|---:|---|---:|---:|
| Selected | `#e8eefe` / `#1e43b8` | 7.09:1 | `#2f5bea` / `#ffffff` | 5.52:1 | 5.52:1 |
| Thành công | `#e7f6ec` / `#14663f` | 6.26:1 | `#14663f` / `#ffffff` | 7.00:1 | 7.00:1 |
| Lỗi | `#fdecec` / `#b42318` | 5.76:1 | `#b42318` / `#ffffff` | 6.57:1 | 6.57:1 |
| Chờ đồng bộ | `#fff3d6` / `#8a5300` | 5.74:1 | `#8a5300` / `#ffffff` | 6.33:1 | 6.33:1 |

Các cặp chữ/nền đều vượt 4.5:1; nền trạng thái so với trắng đều vượt 3:1. Việc hiển thị chữ trắng được minh họa trong demo. Màu cơ sở và màu thương hiệu không đổi.

| Card | Nền/chữ | Chữ/nền | Viền/nền |
|---|---|---:|---:|
| Thành công | `#e7f6ec` / `#14663f` | 6.26:1 | 6.26:1 |
| Lỗi | `#fdecec` / `#b42318` | 5.76:1 | 5.76:1 |
| Chờ đồng bộ | `#fff3d6` / `#8a5300` | 5.74:1 | 5.74:1 |

## Ảnh và demo

`demo.html` nạp `tokens-before.css` hoặc `tokens-after.css` theo `?palette=before|after`, không gọi mạng ngoài.

- `before-390.png`
- `after-390.png`
- `before-1440.png`
- `after-1440.png`

## Đồng bộ và phần còn lại

- Tokens đã chép vào `src/shared/styles/tokens.css` (giữ ba khối `@font-face`) và `design/prototype/src/shared/styles/tokens.css` trong worktree web.
- Áp dụng các giá trị hex trong `ios-mapping.md` vào `Tokens.swift` của app iOS.
- Đã đổi badge/chip sang state tokens và card/banner sang card tokens trong: `features/attendance/{AttendanceDesktop,AttendancePanel}.module.css`; `features/auth/auth.module.css`; `features/class-space/{classSpace,desktop,sessionDetail,sessions}.module.css`; `features/classes/{editClassSchedule,today}.module.css`; `features/comments/{CommentsDesktop,CommentsPanel}.module.css`; `features/homework/{HomeworkDesktop,HomeworkPanel}.module.css`; `features/schedule/schedule.module.css`; `features/scores/scores.module.css`; `features/settings/{emailSettings,settings}.module.css`; `features/staff/staff.module.css`; `features/students/{StudentsDesktop,importStudents}.module.css`; `roles/guardian/guardian.module.css`; `shared/SaveStatus/{RejectedBanner,SaveStatus}.module.css`; `shared/ui/ui.module.css`.
- Không sửa `notesImport.module.css` và `CriteriaMode.module.css` theo chỉ dẫn; chúng còn status block dùng `--state-*`, cần worker sở hữu áp card token nếu đó là khối lớn.

## Rủi ro

- Thành phần dùng `--state-*` đều có nền đặc và chữ trắng; card lớn cần dùng riêng `--card-*-*` để giữ nền mềm.
- `guardian.module.css` giữ `noteBox` vàng nhạt vì là nội dung chia sẻ, không phải status card.

## Kiểm chứng

- `node check-contrast.mjs`: đã tính lại cặp state và card từ `tokens.json`; chữ/nền đạt 4.5:1 và viền/nền đạt 3:1.
- Đối chiếu các token trạng thái trong `tokens.css` và `tokens.json`: khớp; JSON hợp lệ.
- `demo.html` mở bằng Chrome hệ thống và đã chụp đủ bốn ảnh ở 390 × 844 và 1440 × 1000.
- Trong worktree web sau đồng bộ: `npx tsc --noEmit` qua; `npx vitest run` có 802 passed, 4 skipped, không lỗi; `VITE_API_BASE_URL=… npm run build` qua. Build có cảnh báo chunk về `src/data/auth/index.ts` được import tĩnh và động.
