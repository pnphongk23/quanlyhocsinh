# Lane F — khôi phục phiên offline

- Nền: HEAD `19a9ba8fd196f6ad60c9e0d74d1c167d2165cc91`.
- Test đỏ trước khi cài logic: `RestoreSessionOfflineTests` — 4 test, 8 assertion failures. Các failure xác nhận offline chưa dùng cache/chưa recheck `/me`, 401 chưa xoá token/cache và 403 chưa ẩn membership.
- Test xanh mục tiêu: 4 test, 0 failure.
- Staging `xcodebuild test`, iPhone 16 Simulator: **160 tests, 2 skipped, 0 failures; TEST SUCCEEDED**. Hai test skipped là Keychain signing và screenshot-only (`QLH_SCREENSHOT_DIR` chưa đặt).
- UI Staging chưa xác minh: CUA liệt kê Simulator nhưng `getApp("Simulator")` timeout hai lần. Không đăng nhập, không cài endpoint-lỗi, không thao tác dữ liệu demo; không có ảnh/video hoặc bằng chứng runtime cho màn lớp và trạng thái “Đã lưu”.
- Dữ liệu demo không bị ghi. Không có lớp ZZ thử được tạo nên không cần dọn dữ liệu.
- `git diff --check`: đạt trước lượt tích hợp cuối.
- Commit: `5991ede` (`fix(ios): restore session offline from cached identity`).
