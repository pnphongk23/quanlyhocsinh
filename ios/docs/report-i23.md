# iOS-23 · Giải mã `report_publication` từng bản (giáo viên)

## Nguyên nhân
`I4FeatureStore.refresh()` (`Features/Scores/ScoresFeatureStore.swift`, dùng cho màn Điểm/Báo cáo) đọc `report_publication` bằng `records` nghiêm ngặt. Một bản cũ sai hình dạng (`snapshot.homework[0] = {count, kind, level}`) làm cả `refresh()` rơi vào `catch` ⇒ "Không tải được dữ liệu đã lưu". (Brief gọi hàm này là `load()`; tên thật là `refresh()`.)

## Thay đổi
- `I4FeatureStore.refresh()`: `report_publication` dùng `SQLiteStore.recordsSkippingInvalid` (helper của iOS-22, không chép logic), lấy `.values`. Các thực thể khác giữ nghiêm ngặt. Số bản bị bỏ không được log; không in nội dung.
- Test mới `ScoresPublicationDecodeTests`: 3 bản cùng học sinh/tháng (#1 sai, #2/#3 đúng) ⇒ `isReady`, không `errorMessage`, `publications` = [2, 3], lớp/học sinh còn đủ, `publication(studentID:month:)` trả bản 3.

## Kiểm
- ĐỎ trước sửa: 4 assertion lỗi (`isReady` false, `errorMessage` = "Không tải được dữ liệu đã lưu.", `publications` = [] thay vì [2, 3], `publication(...)` nil).
- XANH sau sửa: `Executed 115 tests, with 2 tests skipped and 0 failures` → TEST SUCCEEDED (Staging). Production build (`generic/platform=iOS Simulator`) → BUILD SUCCEEDED.

## Rà `ReportPublication` / `report_publication` trong `ios/QuanLyLop`
| File:dòng | Trước | Sau |
| --- | --- | --- |
| `Features/Scores/ScoresFeatureStore.swift:77` | `records` nghiêm ngặt | `recordsSkippingInvalid(...).values` |
| `Features/Guardian/GuardianRepository.swift:425` | khoan dung (iOS-22) | giữ nguyên |
| `QuanLyLopTests/CoreTests.swift:214` | `records` nghiêm ngặt (test dữ liệu fixture hợp lệ) | giữ nguyên, không phải đường chạy app |
| `Core/Sync/SyncCoordinator.swift:9`, `Core/Models/Entities.swift:178`, `Guardian*View/PDF/Demo`, `CoreFixtures.json` | chỉ tên thực thể/kiểu/dữ liệu mẫu, không đọc kho | không đổi |

Không còn chỗ đọc kho nghiêm ngặt nào khác.

## Chưa làm
Không smoke staging (ngoài phạm vi); chỉ kiểm bằng fixture cùng hình dạng lỗi.
