# Báo cáo iOS I-9 · Localization tiếng Việt cho Features

## Phạm vi

- Chuyển chuỗi tiếng Việt hiển thị trong `Features/**` sang khóa `feature.*` dùng `String(localized:)` hoặc `String.localizedStringWithFormat`.
- Giữ nguyên nội dung tiếng Việt trong catalog; chuỗi có nội suy dùng `%@` và giữ nguyên giá trị hiển thị.
- Bổ sung `LocalizationCatalogTests`: quét mã nguồn Features, xác nhận mọi khóa `feature.*` có trong catalog tiếng Việt và không còn literal tiếng Việt trực tiếp.
- Không đổi hành vi.

## Kiểm chứng

| Lệnh | Kết quả |
|---|---|
| `xcodegen generate` | OK |
| `xcodebuild ... -destination 'platform=iOS Simulator,name=iPhone 16' ... build` | `BUILD SUCCEEDED` |
| `xcodebuild ... -destination 'platform=iOS Simulator,name=iPhone 16' ... test` | `TEST SUCCEEDED`: 105 passed, 2 skipped, 0 failed |
| `LocalizationCatalogTests.testFeatureLocalizedKeysExistInVietnameseCatalog()` | Passed |
| `git diff --check` | OK |

Hai test bị skip là kiểm thử Keychain cần host app ký và kiểm thử chụp màn hình khi chưa đặt `QLH_SCREENSHOT_DIR`.

Catalog có `sourceLanguage: vi`, tổng cộng 696 khóa sau khi thêm Features. Dùng riêng `/tmp/qlh-dd-i9`; đã xóa sau lượt build/test.

Status: DONE
