# Packet P2-B · khung + mẫu trang (tầng 3)

Đọc trước `briefs/p2-common.md`.

## Mục tiêu
Tạo `src/shared/layout/` là nơi DUY NHẤT biết mốc; khung staff chạy đúng 3 khổ (tab bar / rail / sidebar) theo mock.

## Write-set
- mới `src/shared/layout/**`: `AppShell.tsx` (+ css), `navItems.ts` (MỘT nguồn mục điều hướng staff: nhãn, icon, đường dẫn, nhóm con, quyền), `PageShell.tsx` (slot `breadcrumb?`, `eyebrow?`, `title`, `subtitle?`, `actions?`, `backTo?`, `children`), `FormPage.tsx`, `MasterDetailPage.tsx` (slot `master`, `detail?`, `detailOpen`, `onCloseDetail`, `detailTitle`, `footer?`; desktop 2 cột `minmax(0,1fr) var(--detail-w)` panel sticky; tablet sheet phải fixed full-height, scrim phủ cả rail; mobile `mobileDetail="sheet"|"push"`, sheet đáy trên tab bar), `useLayout.ts` (`"mobile"|"tablet"|"desktop"`, chỉ cho hành vi, không cho style), `index.ts`, test cho từng cái.
- `src/app/shell.module.css`, `src/roles/staff/StaffShell.tsx`: StaffShell dùng AppShell + navItems; gỡ mọi `@media` bề rộng khỏi `shell.module.css` (chuyển vào layout).
- `src/shared/styles/tokens.css`, `design/prototype/src/shared/styles/tokens.css`: chép token đã duyệt.
- test liên quan khung: `src/test/staff-shell-nav.test.tsx` và test khác chỉ khi đổi hợp đồng (xem p2-common).
KHÔNG sửa `src/shared/ui/**` (packet C), `src/features/**` (Pha 3).

## Nghiệm thu
- 390: tab bar dưới, màn chi tiết ẩn tab bar như cũ (`data-staff-detail`); 834: rail icon trái `--rail-w`, nhãn ngắn, vùng bấm ≥44, `--tabbar-total` = 0 hoạt động đúng (không mất đệm đáy); 1440: sidebar như hiện tại (chọn lớp, nhóm con).
- PageShell: breadcrumb/eyebrow/tiêu đề/nội dung cùng lề trái, `max-width: var(--page-max)`, không `margin-inline:auto`; mobile breadcrumb → nút quay lại `backTo`; actions cùng hàng tiêu đề (desktop/tablet), mobile theo mock.
- FormPage: cột `max-width: var(--form-max)` căn trái; footer nút căn phải theo lề form, desktop nút rộng theo nội dung, mobile ghim đáy (`--sticky-bottom`, safe-area).
- Màn hiện có vẫn chạy y như trước (chưa chuyển màn): ảnh 3 khổ của `/lop`, `/cai-dat`, chi tiết buổi trước/sau không vỡ khung.
- `npm test`, `npm run build` 0 fail. Ảnh `/tmp/qlh-evidence/ql-004/p2/b/`.
