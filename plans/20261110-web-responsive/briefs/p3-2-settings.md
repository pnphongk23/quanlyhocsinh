# Packet P3-2 · Cài đặt: menu, Đổi mật khẩu, Email (mẫu FormPage)

Đọc trước `briefs/p3-common.md`. Chạy sau P3-1 (dùng lại cách làm đã chốt ở đó).

Màn mock: `settings`, `password`, `email`.

## Write-set
- `src/features/settings/**` (SettingsPage, ChangePasswordPage, EmailSettings, css, test).
- `src/shared/layout/**` nếu FormPage/PageShell thiếu khả năng (kèm test) — không đổi hợp đồng đang dùng ở Bộ tiêu chí.
- `src/test/layoutAllowlist.ts` (dòng của các file trên).

## Yêu cầu (theo mock đã duyệt)
- Menu Cài đặt: PageShell, danh sách mục căn trái, rộng theo `--form-max` (không trải hết 1440, không căn giữa); mỗi dòng `data-measure="row"`, vùng bấm 44.
- Đổi mật khẩu / Email: FormPage, cột `--form-max` căn trái; breadcrumb desktop/tablet, mobile `backTo`; nút rộng theo nội dung ở desktop/tablet, căn phải theo lề form; mobile ghim đáy (`--sticky-bottom`, safe-area). Ô nhập ≥16px.
- Bỏ `useIsDesktop` và `@media` bề rộng trong `src/features/settings/**`.
- Giữ nguyên luồng xác thực/lỗi/thông báo hiện có.

## Nghiệm thu
Theo p3-common; G2 `/cai-dat`, `/cai-dat/doi-mat-khau`, email × 3 khổ = 0 vi phạm. Ảnh `/tmp/qlh-evidence/ql-004/p3/settings/`.
