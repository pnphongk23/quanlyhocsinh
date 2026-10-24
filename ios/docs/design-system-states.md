# Trạng thái dùng chung (ux-v2)

Nguồn chuẩn: `design/ux-v2/rules.md` mục 6 và `design/tokens/tokens.css`. Màn hình chỉ gọi các thành phần dưới đây, không tự vẽ trạng thái.

## Token (`Core/DesignSystem/Tokens.swift`)
- `AppState`: `selectedBg/Fg`, `hoverBg`, `pressedBg`, `disabledOpacity` (0,5), `successBg/Fg`, `errorBg/Fg`, `pendingBg/Fg`, `pressedScale` (0,98).
- `AppDuration`: `loadingMin` 0,4 s, `successHold` 1,6 s, `pendingAfter` 1,0 s, `press` 0,1 s.
- `AppMetrics.emptyMascot` 96, `emptyMascotCompact` 56.

## Thành phần
- `AppEmptyState(title:description:mascot:size:) { extra }` và `AppEmptyState(..., actionTitle:action:)`: empty duy nhất, có Mít (`.regular` / `.compact`). Chữ ký cũ `AppEmptyState(title:) { }` vẫn dùng được.
- `AppMascot(pose:height:)`, `MascotPose` (`main, cho, chao, khen, dangTai`): WebP trong `Resources/Mascot` (asset catalog không nhận WebP). Chỉ dùng ở empty/trạng thái chờ.
- `AppSaveController` + `AppSaveButton(title:controller:isEnabled:) { try await ... }`: idle → saving (≥ 400 ms, giữ bề rộng, vòng quay) → saved (check + "Đã lưu", 1,6 s, VoiceOver announcement) → idle. Lỗi: về idle, `controller.error` có giá trị; màn giữ dữ liệu và editor mở, hiện lỗi bằng `AppSaveStatus(kind: .error)`.
- `AppSaveStatusSource(store:)` + `AppSaveStatus(kind:)`: `.savedLocal` "Đã lưu trên máy", `.pending` pill "Chờ đồng bộ" (hàng đợi chưa rỗng > 1 s), `.offline` "Đã lưu trên máy · sẽ đồng bộ khi có mạng", `.error`. Nguồn chỉ đọc `LocalStore.pendingCommandCount`, `ConnectivityMonitor`, `SyncStatusCenter`. Màn gọi `await source.refresh()` sau mỗi lần lưu và khi sync kết thúc.
- Selected = nền, không viền: `AppSegmented`, `AppCard(selected:)`, `AppChip(selected:)`.
- `AppButtonStyle`: pressed scale 0,98; disabled nền `neutralSoft` chữ `muted`.
- `AppInitials.of(_:)`: chữ tắt avatar, bỏ phần trong ngoặc và ký tự không phải chữ ("Cô Hương (demo)" → "CH"); rỗng thì màn tự chọn dự phòng ("GV", "–").
- `AppSpinner`: đứng yên khi bật Reduce Motion.

Chuỗi nằm ở `Resources/DesignSystem.xcstrings` (`String(localized:table:"DesignSystem")`).
