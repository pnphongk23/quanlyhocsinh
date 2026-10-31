# Cổng kiểm UI mobile (iOS)

Mọi thay đổi giao diện iOS phải qua cổng này trước khi báo xong. Ảnh phải chụp từ **app thật**
(đăng nhập staging), không dùng `DemoScreens` (chỉ để đối chiếu prototype, không chứng minh app thật đúng).

## 1. Ma trận ảnh bắt buộc

Máy: **iPhone 16** và **iPhone SE (3rd gen)**. Mỗi màn một ảnh mỗi máy, lưu ở `plans/.../shots/{before,after-pN}/`.

| Vai | Màn |
|---|---|
| Giáo viên | Lớp, Lịch, Cài đặt, 5 tab chi tiết lớp, chi tiết buổi học, tạo lớp, menu "…" |
| Phụ huynh | 3 tab (Lớp học của con, Nhận xét của cô, Cài đặt) + màn con (Điểm, Báo cáo, Phiếu buổi học, Đổi mật khẩu) |

Thiếu ô nào trong ma trận thì ghi rõ ô đó "chưa chụp" và lý do; không coi là đạt.

## 2. Cách chụp

- Build bản sao ở `/tmp` (`xcodebuild -derivedDataPath /tmp/<tên>`), cài bằng `xcrun simctl install`.
  **Không chạy `xcodegen generate` trong worktree** khi người dùng đang mở `QuanLyLop.xcodeproj`.
- Đăng nhập **chỉ bằng Maestro** (`-e STAGING_PHONE=… -e STAGING_PASSWORD=…`, đọc từ
  `~/.config/qlh/staging-demo.txt` bằng `sed` ngay trong lệnh, không in ra). Không dán qua clipboard GUI.
- Tối đa **2 lần bấm đăng nhập mỗi máy**; sai thì dừng, tài khoản khoá 15 phút. Không thử lại vòng lặp.
- Flow tham chiếu: `ios/maestro/staging/01-login.yaml`, `03-guardian-read.yaml`. Flow dùng màn demo
  chạy qua `ios/maestro/run.sh` (dòng `# demo:`) chỉ là kiểm nhanh, không thay ảnh app thật.
- Tab bar hệ thống không có `accessibilityIdentifier`: chọn tab theo nhãn; quay lại bằng vuốt cạnh trái.
- Không in SĐT hay nội dung nhận xét vào log/báo cáo; che hoặc ghi chú ảnh có SĐT.

## 3. Checklist HIG / safe area

- [ ] Mỗi tab đúng một `NavigationStack`; chi tiết là màn con đẩy vào.
- [ ] Tab gốc không có nút quay lại.
- [ ] Không dựng header riêng trùng với thanh điều hướng hệ thống (dùng `navigationTitle`).
- [ ] Không `ignoresSafeArea` ngoài lớp nền.
- [ ] Mọi nội dung cuộn có padding theo token (`TeacherMetrics`/`AppMetrics`…) và inset đáy
  (không bị tab bar hoặc nút nổi che dòng cuối).
- [ ] Bảng/hàng dùng hàng chung của design system, không tự vẽ lại từng màn.
- [ ] Tab bar là `TabView` hệ thống; menu "…" là `Menu` hệ thống.
- [ ] Kiểm cả iPhone SE 3: không cắt chữ, không tràn ngang, Dynamic Type mặc định.

## 4. Reviewer

Reviewer phải **xem ảnh ma trận trước/sau**, không chỉ đọc diff. Báo cáo reviewer ghi: ô nào đã xem,
ô nào lệch, ô nào thiếu. Chưa có ảnh app thật thì không duyệt.
