# iOS-29: buổi không có số không hiện "Buổi 0"

## Kết quả
Mọi chỗ dùng `sessionNumber ?? 0` đã bỏ (`srcwalk discover 'sessionNumber ?? 0'` trong `QuanLyLop` = 0 kết quả). Helper dùng chung `Core/Models/SessionLabel.swift`, theo `sessionPrefix` của prototype (`sessions.ts`):

- `title(for:)`: "Buổi 9"; không số ⇒ "Buổi bù" nếu `isMakeup`, ngược lại "Buổi học".
- `inline(for:)`: dạng chữ thường để chèn giữa câu ("Gửi phiếu buổi bù?").
- `inlineBefore(_:)`: nhãn buổi liền trước (câu "Phiếu buổi N-1 trở về trước"); không có buổi trước thì dùng nhãn của chính buổi.

`TeacherFeatureData.sessionPrefix` và `GuardianFormat.sessionPrefix` gọi helper này. Các chuỗi có "buổi %@" nay nhận nhãn đầy đủ ("%@"), nên catalog `Localizable.xcstrings` đổi theo; ba khóa `core.session.label.*` thay các khóa `buoi`/`buoi.bu`/`buoi.hoc` của Classes và Guardian, và bỏ `feature.homework.sessionNumber`, `feature.homework.nextSession` (không còn dùng).

## ĐỎ trước khi sửa
`xcodebuild build-for-testing` sau khi thêm `SessionLabelTests`:
```
SessionLabelTests.swift:12:24: error: cannot find 'SessionLabel' in scope
... (9 lỗi, cùng nội dung)
** TEST BUILD FAILED **
```
Test quét nguồn `Features` tìm `sessionNumber ?? 0` cũng sẽ đỏ trước sửa (17 chỗ, lệnh `srcwalk discover` ở đầu phiên).

## XANH sau khi sửa
Staging `build test`: 132 test, 0 lỗi (2 test bỏ qua, có từ trước) ⇒ TEST SUCCEEDED. Production build OK.

## Lưu ý
- `GuardianFormat.sessionPrefix` trước đây xét `origin == .manual` cho "Buổi bù"; nay theo prototype là `isMakeup`.
- Nhãn trợ năng "Mở phiếu buổi học buổi %@" thành "Mở phiếu %@" (không có chữ nào trong prototype để theo).
- Chưa mở thử giao diện trên simulator; kiểm bằng test đơn vị và build.
