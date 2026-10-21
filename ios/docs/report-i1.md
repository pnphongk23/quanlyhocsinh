# Báo cáo I-1 / I-1b — Lõi iOS + design system

Nhánh `mvp-ios`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, thư mục `ios/`.
Ngày 2026-10-21. Nguồn chuẩn: `docs/spec.md`, `plans/20261021-mvp/backend/api-spec.md`, `design/prototype/src`.

## Đã làm

**Sửa 4 test hỏng (nguyên nhân thật, không nới assert)**

| Test | Nguyên nhân thật | Cách sửa |
|---|---|---|
| `testBearerVersionedPathAndSnakeCaseBody` | `URLSession` giao body cho `URLProtocol` dưới dạng `httpBodyStream`, nên `request.httpBody` luôn `nil` khi bắt request | Fixture của test đọc `httpBodyStream` và dựng lại `httpBody` trước khi ghi nhận; assert giữ nguyên (`base_version == 3`) |
| `testErrorMappingRetryAfterAndSafeUserMessage`, `testPublicRequest204AndOffline` | **Lỗi thật trong mã sản phẩm**: `parts.queryItems = []` làm URL có thêm `?` rỗng (`…/limited?`), nên không khớp fixture và request đi ra ngoài (mất mạng → `.offline`) | `APIClient` chỉ đặt `queryItems` khi có query; thêm assert URL không có `?` thừa |
| `testKeychainRoundTripUpdateAndScopedDelete` | App không có `CODE_SIGN_ENTITLEMENTS`; tiến trình chạy test không có quyền keychain (`-34018`) | Thêm `QuanLyLop/Resources/QuanLyLop.entitlements` (`keychain-access-groups = $(AppIdentifierPrefix)vn.quanlylop.app`) + `CODE_SIGN_ENTITLEMENTS` trong `project.yml`. Build có ký: test **qua đủ**. Build `CODE_SIGNING_ALLOWED=NO` (không ký, OS cấm keychain): test `XCTSkip` kèm lý do, không xoá và không nới assert |

**Rà 7 mục của `ios-01-core.md` và hoàn thiện phần thiếu**

1. `APIClient`: đã đúng Bearer, ánh xạ lỗi theo `api-spec.md` mục 1, `base_version`/idempotency UUID, `StubAPIClient` + `StubAPIClient.demo` nạp `Fixtures/CoreFixtures.json` (dữ liệu tổng hợp, không SĐT/mật khẩu/nhận xét thật). Sửa lỗi query rỗng.
2. Token: `TokenStore`, `InMemoryTokenStore`, `KeychainTokenStore` (không log token); thêm entitlement để keychain chạy thật.
3. Mô hình `Codable` đủ thực thể MVP theo `api-spec.md` 6.4/`data-model.md`: `ClassSession.sessionNumber` chỉ từ server và `nil` khi buổi hủy (Q16), điểm danh 4 trạng thái, `TestDefinition.maxScore` mặc định 15 (decode thiếu `max` → 15), `Stars` 1..3 + câu mẫu khớp `STAR_TEMPLATES`, BTVN 3 mức/4 loại, báo cáo tháng + bản phát hành, membership/vai trò. Không có điểm trung bình, không "Vắng thi".
4. `SQLiteStore` + `LocalStore`: transaction gộp bản ghi + lệnh chờ, `UNIQUE(scope,id)`, gộp lệnh "ô" chưa từng gửi, `claimBatch` giữ thứ tự (≤50), `acknowledge` theo từng lệnh, `retry` backoff + `Retry-After`, `apply`/`installSnapshot`/`resetCache` theo mục 6. **Sửa thêm**: `duplicate` thiếu `original_status` trước đây để lệnh kẹt ở `sending` vĩnh viễn → nay đưa lại hàng đợi với cùng UUID (có test). `pendingCommandCount` đếm mọi membership của user (chặn đăng xuất không lách được bằng đổi vai trò).
5. Design system: **làm lại từ token prototype** (bảng dưới), thêm font Plus Jakarta Sans biến thiên (khai `UIAppFonts`, chọn độ đậm theo trục `wght`), segmented, list row, spinner; có `#Preview` và màn thư viện thành phần để chụp ảnh.
6. Staging/Production qua xcconfig (giữ nguyên), `PushRegistrar` + `NoOpPushRegistrar` (chưa Firebase).
7. Test: 22 test (14 Core, 4 design system, 4 networking) — xem lệnh dưới.

**Tài liệu**: `docs/core-api.md` (hợp đồng cho I-2..I-5), báo cáo này, ảnh trong `docs/screens/`.
Thay đổi duy nhất ở `App/`: `ContentView` hiện thư viện thành phần khi chạy với `SIMCTL_CHILD_QLH_DESIGN_GALLERY=1|sheet` (harness để chụp ảnh, không vào đường dùng thật).

## Lệnh và kết quả

```
$ cd ios && xcodegen generate
Created project at …/ios/QuanLyLop.xcodeproj

$ xcodebuild -scheme QuanLyLop -configuration Staging \
    -destination 'platform=iOS Simulator,name=iPhone 16' \
    -derivedDataPath /tmp/qlh-dd-i1 CODE_SIGNING_ALLOWED=NO build test
** BUILD SUCCEEDED **
Test Suite 'CoreTests'                Executed 14 tests, with 0 failures
Test Suite 'DesignSystemTests'        Executed  4 tests, with 0 failures
Test Suite 'NetworkingTests'          Executed  4 tests, with 1 test skipped and 0 failures
** TEST SUCCEEDED **                  (22 test, 1 skipped, 0 lỗi)
```

Cảnh báo khi build: chỉ 2 dòng `appintentsmetadataprocessor: Metadata extraction skipped. No
AppIntents.framework dependency found.` (có từ trước, không phải cảnh báo Swift). Không có cảnh báo Swift mới.

Kiểm riêng keychain trên build **có ký** (không có `CODE_SIGNING_ALLOWED=NO`):

```
$ xcodebuild … -derivedDataPath /tmp/qlh-dd-i1b test -only-testing:QuanLyLopTests/NetworkingTests
testKeychainRoundTripUpdateAndScopedDelete … passed
Executed 4 tests, with 0 failures     ** TEST SUCCEEDED **
```

Ảnh đối chiếu (simulator iPhone 16, 393×852 pt ≈ 390×844 của prototype):

```
$ xcrun simctl install booted …/QuanLyLop.app
$ SIMCTL_CHILD_QLH_DESIGN_GALLERY=1 xcrun simctl launch booted vn.quanlylop.app
$ xcrun simctl io booted screenshot ios/docs/screens/design-system-390x844.png          (1179×2556)
$ SIMCTL_CHILD_QLH_DESIGN_GALLERY=sheet … → ios/docs/screens/design-system-sheet-390x844.png
```

## Design system: token prototype → Swift

Nguồn: `design/prototype/src/shared/styles/tokens.css`, `src/shared/ui/ui.module.css`, `src/shared/styles/reset.css`.
Prototype chỉ có giao diện sáng, nên các màu dưới đây là **giá trị cố định** (không đổi theo dark mode).
Test `DesignSystemTests` đọc lại từng màu và so hex, nên bảng này không thể lệch âm thầm.

| Token prototype | Giá trị | Swift |
|---|---|---|
| `--color-canvas` | `#EAECF1` | `AppColors.canvas` |
| `--color-bg` | `#F6F7F9` | `AppColors.background` |
| `--color-surface` | `#FFFFFF` | `AppColors.surface` |
| `--color-border` | `#E6E9EE` | `AppColors.border` |
| `--color-divider` | `#EEF0F3` | `AppColors.divider` |
| `--color-input-border` | `#D2D7DF` | `AppColors.inputBorder` |
| `--color-input-border-strong` | `#B7BEC9` | `AppColors.inputBorderStrong` |
| `--color-text` | `#14181F` | `AppColors.text` |
| `--color-muted` | `#4A5361` | `AppColors.muted` |
| `--color-placeholder` | `#6B7280` | `AppColors.placeholder` |
| `--color-primary` | `#2F5BEA` | `AppColors.primary` |
| `--color-primary-ink` | `#1E43B8` | `AppColors.primaryInk` |
| `--color-primary-soft` | `#E8EEFE` | `AppColors.primarySoft` |
| `--color-on-primary` | `#FFFFFF` | `AppColors.onPrimary` |
| `--color-success` | `#14663F` | `AppColors.success` |
| `--color-success-soft` | `#E7F6EC` | `AppColors.successSoft` |
| `--color-warning` | `#8A5300` | `AppColors.warning` |
| `--color-warning-soft` | `#FFF3D6` | `AppColors.warningSoft` |
| `--color-error` | `#B42318` | `AppColors.error` |
| `--color-error-soft` | `#FDECEC` | `AppColors.errorSoft` |
| `--color-neutral-soft` | `#F0F2F5` | `AppColors.neutralSoft` |
| `--color-scrim` | `rgb(20 24 31 / .4)` | `AppColors.scrim` |
| `--font-sans` | Plus Jakarta Sans | `AppFont.postScriptName = "PlusJakartaSans-Regular"`, trục `wght` cho độ đậm |
| `--radius-card` | 16px | `AppRadius.card` |
| `--radius-row` | 14px | `AppRadius.row` |
| `--radius-control` | 14px | `AppRadius.control` |
| `--radius-button` | 12px | `AppRadius.button` |
| `--radius-chip` | 10px | `AppRadius.chip` |
| `--radius-pill` | 999px | `AppRadius.pill` |
| `--tap` | 44px | `AppMetrics.tap` |
| `body` | 16px / 1.5 | `AppText.body` |
| `h1` | 26px / 700 / 1.15 / letter-spacing -0.01em | `AppText.title` (compact 22px: `AppText.titleCompact`) |
| `h2` | 18px / 700 | `AppText.heading` |
| `h3` | 16px / 700 | `AppText.subheading` |
| `.eyebrow`, `.field > label` | 14px / 600 | `AppText.label` (chữ 14/400: `AppText.muted`) |
| `.tab` | 12px / 600 | `AppText.caption` |
| `.chip` | 14px, padding 8/10, radius 10, nền `--color-bg` | `AppText.chip`, `AppChip`, `AppMetrics.chipPadding*` |
| `.pill` | 13px / 600, padding 5/10, radius pill | `AppText.pill`, `AppPill`, `AppMetrics.pillPadding*` |
| `.button` | 14px / 600, min-height 44, padding 0 16, radius 12 | `AppText.buttonSmall`, `AppButtonStyle(.small)` |
| `.md` | 15px / 600, min-height 48, padding 0 20, radius 14 | `AppText.buttonMedium`, `AppButtonStyle(.medium)` |
| `.lg` | 16px / 600, min-height 52, rộng 100%, radius 14 | `AppText.buttonLarge`, `AppButtonStyle(.large)` |
| `.button:disabled` | opacity .6 | `AppButtonStyle` |
| `.input` | min-height 52, padding 0 16, viền 1.5 `--color-input-border`, radius 14, 16px | `AppTextField`, `AppMetrics.inputHeight/borderWidth` |
| `.input:focus` | viền `--color-primary` + vòng 3px `--color-primary-soft` | `AppTextField` (overlay 3pt) |
| `.field` / `.fieldError` | gap 6; lỗi 14px `--color-error` | `AppMetrics.fieldGap`, `AppText.fieldError` |
| `.card` | padding 14/16, radius 16, nền surface, không viền | `AppCard` |
| `.cardSelected` | outline 2px `--color-primary` | `AppCard(selected: true)` |
| `.row` | gap 12, min-height 52, padding 10/12, radius 14 | `AppListRow` |
| `.segmented` / `.segment` | track `--color-border` radius 12 padding 3; segment min-height 44, radius 10, 15px/600 | `AppSegmented`, `AppText.segment` |
| `.empty` / `.emptyTitle` | padding 24/16, radius 16, surface, chữ muted; title 16/700 text | `AppEmptyState`, `AppText.emptyTitle` |
| `.dialog` / `.sheet` | radius 16 (sheet 20 trên), padding 24, header + "Đóng", footer cột gap 8, kẻ trên | `AppSheet`, `AppRadius.sheet` |
| `.spinner` | 24×24, viền 3px `--color-border`, cung `--color-primary`, 1s | `AppSpinner` |
| `.present/.late/.excused/.absent` | success / warning / **primary** / error (nền `*-soft`, chữ `*`) | `AttendanceStatus.pill` |
| `.level_excellent/.level_done/.level_not_done` | success / primary-ink / error | `HomeworkLevel.pill`, `AppHomeworkLevelControl` |
| `.levelButton` | 12px / 600 / line-height 1.2, min-height 44, radius 10 | `AppText.homeworkLevel` |
| `.pendingChip` | "Chưa chấm", neutral-soft, 13/600 | `AppHomeworkPill(level: nil)` |

## Khác biệt so với prototype và cách xử lý

Không có màn nghiệp vụ nào ở gói I-1 (I-2..I-5 mới dựng màn), nên đối chiếu ở mức **thành phần**:
ảnh simulator `docs/screens/design-system-390x844.png`, `…-sheet-…png` so với
`src/shared/ui/*` + `ui.module.css`/`tokens.css`. Đối chiếu theo màn bắt đầu từ gói I-2.

| Hạng mục | Trước | Đã sửa | Ghi chú |
|---|---|---|---|
| Bảng màu | tự đặt, thiếu 10 token (canvas, divider, input-border, placeholder, primary-ink, primary-soft, neutral-soft, scrim…) | có | test so hex từng màu |
| Kiểu chữ | font hệ thống + Dynamic Type (`title2/headline/body/caption`) | có: Plus Jakarta Sans, cỡ/đậm/line-height/tracking theo prototype | file font có sẵn nhưng chưa khai `UIAppFonts`; nay đã khai + test tải font |
| Nút | `secondary` nền trắng chữ xanh (sai), 1 cỡ, font 17, không có surface/neutral/ghost | có: 6 variant × 3 size đúng số đo | |
| Ô nhập | padding 12, viền 1px, chữ 17 | có: 52 cao, padding 16, viền 1.5, chữ 16, focus xanh + vòng 3px | |
| Chip / pill | gộp 1 `StatusChip` (radius 10, 13/600, tone soft) | tách `AppChip` (14/400, 8/10, radius 10) và `AppPill` (13/600, 5/10, radius 999) | |
| Điểm danh | "Có phép" = neutral | có: `excused` = primary-soft/primary-ink | |
| BTVN | "Hoàn thành" và "Hoàn thành tốt" cùng tông success, thiếu bộ chọn 3 nút | có: success/primary-ink/error + `AppHomeworkLevelControl` + "Chưa chấm" | |
| Thẻ | padding 16 + viền border | có: 14/16, không viền, `selected` 2px primary | |
| Trạng thái rỗng/lỗi | `ContentUnavailableView` (kiểu iOS) | có: thẻ trắng giữa, title 16/700, chữ muted theo `.empty` | prototype không có thành phần lỗi → lỗi dùng lại khung `.empty` + nút "Thử lại" |
| Sheet | `NavigationStack` + "Đóng" trên thanh điều hướng | có: header trong thân (18/700 + "Đóng" secondary), footer dính kẻ trên | góc bo/scrim do sheet hệ thống iOS (khác prototype, thuộc ngoại lệ "hành vi bản địa") |
| Thiếu thành phần | không có segmented, list row, spinner | có | |
| Dark mode | màu thích ứng hệ thống | bỏ thích ứng: giữ đúng màu prototype ở mọi chế độ | xem Câu hỏi 2 |

## Câu hỏi

1. **Q16 (đã có quyết định của lead, ghi lại)**: client không tự tính số buổi; `sessionNumber` chỉ lấy từ
   server, `nil` khi buổi hủy, gom một chỗ ở `ClassSession.sessionNumber`. Mâu thuẫn gốc giữa spec mục 3
   ("chỉ đếm buổi đã diễn ra") và `data-model.md` mục 2.2 ("đếm cả `planned`") vẫn nên được sửa ở tài liệu
   backend để ba client không lệch nhau.
2. **Dark mode**: prototype chỉ có giao diện sáng; iOS nay giữ nguyên màu prototype kể cả khi máy ở dark mode.
   Có cần bảng màu tối riêng không? (Nếu có, cần prototype bổ sung trước, không tự sáng tạo.)
3. **Thành phần lỗi**: prototype không có màn/khối lỗi; tôi dùng khung `.empty` + nút "Thử lại" (chữ
   "Đã xảy ra lỗi", "Không thể tải dữ liệu. Vui lòng thử lại."). Cần duyệt mẫu này trước khi I-2 dùng cho đăng nhập.

## Ghi chú / rủi ro

- Test keychain chỉ chạy đủ trên build **có ký**; lệnh kiểm bắt buộc có `CODE_SIGNING_ALLOWED=NO` nên ở đó
  test tự skip (1/22). Khi có Team ký thật, kiểm lại bằng lệnh không có cờ đó.
- Hàng đợi cục bộ chưa có mã hoá at-rest cho `local_json` (chỉ dựa vào file protection của iOS); dữ liệu
  nhận xét nằm trong DB. Cần quyết định khi làm báo cáo/nhận xét (I-4).
- Fixture demo không chứa SĐT/mật khẩu/nhận xét thật; `StubAPIClient.demo` chỉ để xem giao diện và test.
- `swift-format`/lint chưa có trong repo; định dạng theo mã hiện có.

Status: DONE_WITH_CONCERNS
Summary: Đã sửa tận gốc 4 test hỏng (body qua `httpBodyStream`, lỗi thật `?` rỗng trong `APIClient`, entitlement keychain), rà đủ 7 mục I-1, dựng lại design system theo token prototype (có bảng token → Swift, test so hex và font), thêm 5 test (22 test, 0 lỗi), và viết `docs/core-api.md` + báo cáo này. Lệnh tiêu chí `xcodebuild … CODE_SIGNING_ALLOWED=NO build test` xanh; hai điều cần lead biết: test keychain chỉ chạy đủ trên build có ký (ở lệnh bắt buộc thì skip có lý do), và đối chiếu ảnh theo màn chưa làm được vì I-1 chưa có màn nào (mới đối chiếu ở mức thành phần).
