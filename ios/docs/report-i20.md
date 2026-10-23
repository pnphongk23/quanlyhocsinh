# Báo cáo iOS-20 · ID tạo mới, lịch pull, cursor snapshot

Ngày: 2026-10-23 · Worktree `mvp-ios`.

## Kết quả

1. **ID client cho lớp, học sinh và buổi lẻ:** đã sửa. Mỗi form cấp một `ClientGeneratedID` khi bấm lưu lần đầu; form giữ ID khi request lỗi và thử lại, mở form mới tạo ID mới. Request gửi ID chữ thường; dữ liệu dùng thân server trả về. `URLSessionAPIClient` đã chấp nhận mọi mã 2xx, nên cả 200 và 201 đều thành công. Lỗi 409 tiếp tục dùng thông báo chung của form, không tự thử với ID khác. `CreateRequestIDTests` kiểm tra chữ thường và mã hóa lại cùng ID.

2. **Lịch pull:** đã sửa. `SyncScheduler` chạy ngay khi phiên có role vào foreground hoặc mạng trở lại, lặp mỗi 60 giây khi app active và có mạng, rồi hủy timer khi app inactive/nền, mất mạng hoặc không còn phiên hợp lệ. Đổi mật khẩu bắt buộc không kích hoạt scheduler. `SyncRunGate` dùng chung theo cache scope để các coordinator ở nhiều màn không chồng nhau. Test scheduler kiểm tra kích hoạt tức thì, tick, dừng, trạng thái offline và khóa đồng bộ.

3. **Cursor snapshot:** luồng cũ đã đợi tải mọi trang/thực thể trước `installSnapshot`; `SQLiteStore.installSnapshot` ghi records và cursor trong cùng transaction. Đã thêm test lỗi trang thứ hai không ghi cursor, lần chạy lại cài đủ records rồi mới có cursor, cùng test rollback transaction khi cài snapshot lỗi.

4. **Đổi mật khẩu:** luồng cũ đã coi POST thành công là thành công, cập nhật hồ sơ/phiên đã biết và không gọi GET `/me` sau đó. Đã thêm test stub xác nhận màn hình thoát khỏi form bắt buộc và không có follow-up `/me`.

## Kiểm chứng

- `xcodegen generate`: OK.
- Staging simulator, `build test`: **112 tests**, 2 skipped, 0 failures (`** TEST SUCCEEDED **`). Hai skip hiện có: Keychain cần host app ký và screenshot chạy riêng.
- Production simulator `build`: **BUILD SUCCEEDED**.
- Staging signed ad-hoc build + Maestro iPhone 16: đăng nhập, tạo một lớp thử và một học sinh qua UI; không hiện save-error.
- Staging API đọc lại: lớp `id=40436e7e-44f5-42e9-a0f8-0ac0895ad0eb`, version 1; học sinh `id=a515d394-d4c5-44bb-9c89-56fb63fed225`, version 1. Hai ID trả chữ thường. Gửi lại cùng ID cho lớp và học sinh đều trả **200**; dùng ID lớp cho học sinh trả **409 `id_conflict`**. GET sau phát lại cho thấy đúng một lớp và một học sinh.
- Dọn dữ liệu thử qua API: đánh dấu học sinh nghỉ (**200**) và lưu trữ lớp (**200**); GET xác nhận lớp archived version 2 và học sinh còn đúng một bản ghi.
- Simulator đã được xóa trước smoke, rồi xóa và tắt lại sau khi hoàn tất. Không ghi SĐT, mật khẩu hoặc token vào repo/log.

## Còn lại

Không còn thay đổi nghiệp vụ iOS-20 cần làm. Hai test bị skip là các skip theo cấu hình đã có từ trước.

Status: DONE
