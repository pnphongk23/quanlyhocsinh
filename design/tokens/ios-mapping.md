# Token → iOS (`Tokens.swift`)

Chỉ tài liệu. `Tokens.swift` (mvp-ios `ios/QuanLyLop/Core/DesignSystem/Tokens.swift`) chưa sửa. "Chưa có" = token web đã có, iOS chưa có tên tương ứng.

| Token web | iOS hiện có | Ghi chú |
|---|---|---|
| `--color-*` (22 màu) | `AppColors.*` (canvas, background, surface, border, divider, inputBorder, inputBorderStrong, text, muted, placeholder, primary, primaryInk, primarySoft, onPrimary, success(Soft), warning(Soft), error(Soft), neutralSoft, scrim) | Khớp 1-1 |
| `--radius-card/row/control/button/chip/pill/sheet` | `AppRadius.card/row/control/button/chip/pill/sheet` | Khớp |
| `--tap` 44 | `AppMetrics.tap` | Khớp |
| `--control-h` 52 | `AppMetrics.inputHeight` | Khớp |
| `--button-h-sm/md/lg` 44/48/52 | `AppMetrics.buttonHeightSmall/Medium/Large` | Khớp |
| `--text-xs…--text-2xl` (12,13,14,16,18,22,26) | `AppText.caption/pill/muted/body/heading/titleCompact/title` | iOS gắn kèm weight và line-height; web tách cỡ chữ |
| `--text-control` 15 | `AppText.segment`, `buttonMedium` | Khớp cỡ |
| `--text-3xl` 30 (h1 desktop) | Chưa có | iOS không có desktop |
| `--leading-tight/base`, `--weight-*` | `AppTextStyle.lineHeight`, `AppFontWeight` | Khớp |
| `--card-pad` 16 | `AppMetrics.cardPaddingHorizontal` | iOS thêm `cardPaddingVertical` 14 (web giữ 14/18 cố định) |
| `--space-2/4/8/12/16/20/24/32/48` | Chưa có (chỉ `fieldGap` 6) | Đề xuất `AppSpace` |
| `--page-x` 20, `--page-top` 12, `--page-bottom` 16, `--page-gap` 12, `--title-gap`, `--section-gap`, `--card-gap` | Chưa có | Đề xuất `AppLayout`; chỉ giá trị mobile |
| `--shadow-sm/menu/frame/fab` | Chưa có | SwiftUI `.shadow` khi cần |
| `--focus-ring` 3 | `AppMetrics.focusRing` | Khớp |
| `--z-*` | Không áp dụng | SwiftUI dùng thứ tự view |
| `--tabbar-height` 64, `--safe-*`, `--tabbar-total` | Hệ thống (TabView, safe area) | Không cần token |
| `--fab-size` 56, `--fab-inset` 16 | Chưa có | Chỉ khi iOS dùng FAB |
| `--dur-*`, `--ease-*` | Chưa có | Đề xuất `AppMotion` |
| `--tap-desktop`, `--button-min-w-desktop`, `--sidebar-width`, `--content-max`, `--form-max`, `--guardian-max`, breakpoint 1024 | Không áp dụng | Chỉ web |
