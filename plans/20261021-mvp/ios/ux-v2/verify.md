# Mốc C — xác minh iOS ux-v2

- HEAD: `114646aadb0aa117a5d663d25f223bf2c479b479` (`mvp-ios`).
- Worktree có bốn thay đổi người dùng (`Info.plist`, `Localizable.xcstrings`, hai entitlements); giữ nguyên. Snapshot `/tmp/qlh-c-src` gồm trạng thái worktree đó.
- Lượt 1: dùng khóa build `/tmp/qlh-build.lock`; đã nhả khóa và dọn snapshot, DerivedData, log, Maestro artifacts trong `/tmp`. Simulator QLH-A2-SE đã xóa theo brief; iPhone 16 đã tắt.

## Build/test

- `xcodegen generate`: thành công trên snapshot.
- Staging `build test`, iPhone 16 Simulator, `CODE_SIGNING_ALLOWED=NO`: **151 tests, 2 skipped, 0 failures**; `TEST SUCCEEDED`.
- Skips: keychain signing test; screenshot-only test (`QLH_SCREENSHOT_DIR` chưa đặt).
- Cảnh báo compile: `QuanLyLopTests/DesignSystemStatesTests.swift` — `count`, `online`, `failed` mutated after capture by sendable closure; App Intents metadata skipped vì không có dependency `AppIntents`.
- Build ad-hoc với `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`: thành công.

## Ảnh after (lượt 1: 3)

- `shots/after/p16-gv-login.png` — form đăng nhập chung.
- `shots/after/p16-ph-login.png` — cùng form đăng nhập phụ huynh.
- `shots/after/p16-ph-register.png` — flow Maestro xác nhận title và bốn trường; không gửi đăng ký.
- Không chụp được các mã sau đăng nhập, gồm năm màn SE yêu cầu trong brief.

## Flow thật (lượt 1)

1. Chưa kiểm — chi tiết buổi; đăng nhập GV chưa vào app chính.
2. Chưa kiểm — lưu/hoàn tác điểm danh; không đổi dữ liệu demo.
3. Chưa kiểm — lỗi/ngoại tuyến và đồng bộ lại; chưa cài build lỗi.
4. Chưa kiểm — bảng điểm lớp 6A.
5. Chưa kiểm — đăng nhập PH, 2 tab/chọn con/cài đặt/đổi mật khẩu/đăng xuất/chưa có con; không tạo tài khoản hay đổi mật khẩu.
6. Chưa kiểm — các empty có Mít.
7. Chưa kiểm — selected fill.
8. Chưa kiểm — Dynamic Type extra-extra-large.
9. Chưa kiểm — ẩn ô email trong Cài đặt GV/PH.

## Phát hiện (lượt 1)

- **Chặn xác minh:** iPhone 16 và QLH-A2-SE đều ở lại form sau một lượt submit đăng nhập demo; UI không hiện banner lỗi hay trạng thái khóa. Log Maestro xác nhận đúng UDID và nút submit đã được tap. Không thử thêm để tránh khóa tài khoản sau nhiều lần sai.
- Staging host phản hồi HTTP 401 ở `/v1` không xác thực (kết nối TCP 0,095 giây), nên host truy cập được từ máy chạy; nguyên nhân login chưa phân biệt được giữa tài khoản/xác thực và endpoint staging. Không ghi SĐT, mật khẩu hay nội dung nhận xét.


## Lượt chạy lại (24/10/2026, HEAD 114646a)

- Giữ nguyên bốn file người dùng đang sửa; không sửa Swift. `xcodegen generate` trên `/tmp/qlh-c-src` và build Staging ad-hoc đều thành công. Build với endpoint lỗi cũng thành công. Bỏ qua `build test` theo brief vì lượt 1 đã xanh và lượt này không sửa mã.
- Đăng nhập GV trên iPhone 16 và SE 3 vào được màn chính, mỗi máy một lần. Đăng nhập PH trên iPhone 16 và SE 3 cũng vào được màn chính, mỗi máy một lần. PH trên SE hiện hai tab và bộ chọn có hai con; đã chọn con còn lại, mở Cài đặt qua avatar, mở Đổi mật khẩu và gửi đúng một lần mật khẩu hiện tại sai. Ứng dụng báo “Mật khẩu hiện tại không đúng”; không đổi mật khẩu thật. PH trên iPhone 16 đăng xuất về màn đăng nhập. Sau đăng xuất PH trên SE, app mở lại màn GV; chưa xác nhận đăng xuất sạch trên máy này.
- Có **24 ảnh** trong `shots/after/`, gồm màn GV lớp/chi tiết buổi/điểm/bảng điểm/cài đặt/trạng thái lưu, màn PH lớp/nhận xét/cài đặt/đổi mật khẩu, năm màn SE theo brief (GV classes/session-attendance/scores, PH class/comments) và ảnh Dynamic Type. `p16-gv-state-error.png` là banner lỗi kết nối ở màn đăng nhập khi cài build endpoint lỗi, không phải lỗi lưu.
- Dọn xong: dữ liệu điểm danh trả về tất cả có mặt; simulator SE tạo thêm đã xóa; iPhone 16 đã tắt; khóa, snapshot, DerivedData và toàn bộ `/tmp/qlh-c-*` đã xóa.

## Flow thật (lượt 2, theo brief)

1. **Đạt một phần:** chi tiết buổi hiển thị thứ, ngày và giờ bắt đầu ở `p16-gv-session-attendance.png`/`se-gv-session-attendance.png`; chưa thấy giờ kết thúc như định dạng yêu cầu.
2. **Đạt một phần:** lưu một thay đổi điểm danh thấy spinner trong video tạm `/tmp/qlh-c-attendance-save.mp4` (đã xóa theo bước dọn); sau đó lưu lại “Tất cả có mặt”, xác nhận 8 học sinh đều “Có mặt” và nút ở trạng thái “Chưa có thay đổi để lưu”. Đã hoàn tác dữ liệu demo. Khung video tại khoảng 14 giây cho thấy spinner; khoảng 16 giây nút đã về trạng thái thường. Không bắt được riêng khoảng hiển thị xác nhận thành công.
3. **Chưa kiểm được phần lưu lỗi/ngoại tuyến:** build endpoint lỗi mở ra banner “Không thể kết nối dịch vụ” ngay ở màn đăng nhập; không có phiên hoạt động để thử lưu. Cài đè lại build thường thành công và vào lại màn GV. Không thử đăng nhập thêm.
4. **Chưa đạt:** bảng điểm lớp 6A hiển thị ở cả 390 pt và 375 pt nhưng các cột bên phải bị cắt ngang (`p16-gv-scores.png`, `se-gv-scores.png`). Dữ liệu bảng không có cặp điểm `82`/`7,5` cần đối chiếu trong brief.
5. **Đạt một phần:** PH có hai tab, chọn được con, mở được Cài đặt/Đổi mật khẩu, lỗi mật khẩu cũ sai giữ form; đăng xuất PH trên iPhone 16 về đăng nhập. Không có tài khoản không con để kiểm tra, không tạo tài khoản mới. Email không xuất hiện trong Cài đặt GV/PH.
6. **Đạt một phần:** có Mít ở trạng thái “Hôm nay không có buổi học” (`p16-gv-classes.png`); chưa tạo lớp thử và chưa kiểm hai empty condition còn lại.
7. **Đạt:** selected tab GV và PH dùng nền fill, thấy trong ảnh lớp.
8. **Đạt một phần:** SE GV `extra-extra-large` không thấy chữ bị cắt ở màn lớp (`se-gv-classes-dynamic-type.png`); chưa kiểm PH. Đã trả cỡ chữ simulator về `large`.
9. **Đạt:** không thấy trường email trong Cài đặt GV/PH; hierarchy cả hai màn không có nhãn email.

## Phát hiện lượt 2

- **Cao:** bảng điểm vẫn tràn ngang ở cả iPhone 16 và SE.
- **Vừa:** ngày buổi có thứ/ngày/giờ bắt đầu nhưng thiếu giờ kết thúc.
- **Vừa, chưa xác minh đủ:** loading điểm danh thấy được; không xác nhận được nhãn thành công riêng trong khung hình. Bản endpoint lỗi không vào tới flow lưu nên chưa xác minh editor giữ mở, dữ liệu giữ nguyên, “Chờ đồng bộ” hay ngoại tuyến.
- Phần Dynamic Type của PH, hai empty condition còn lại, màn PH chưa có con, luồng lỗi lưu và đồng bộ lại vẫn chưa được kiểm.

Không ghi SĐT, mật khẩu, token hoặc nội dung nhận xét vào báo cáo.
