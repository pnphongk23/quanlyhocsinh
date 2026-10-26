# Phần chung: đối chiếu prototype-vs-simulator (I-8A/B/C)

Build xanh (HEAD b2ce7db, 43 test). Giờ phải làm giao diện iOS KHỚP prototype. Đọc `briefs/ios-common-feature.md` và `briefs/ios-ui-rule.md` (bắt buộc). Prototype ĐÃ XONG giai đoạn Tài khoản: ảnh `plans/20261021-mvp/design/prototype-shots/p2/`, báo cáo `p2/report.md`.

## Cách chụp
- Chạy prototype: `cd /Users/phamnhuphong/Git/quanlyhocsinh/design/prototype && npm run dev -- --port <cổng riêng của bạn>` (chỉ đọc mã; không sửa prototype). Chụp từng màn mobile ở 390×844 (Chrome headless/Playwright hoặc công cụ có sẵn), vai trò đúng (giáo viên/phụ huynh; xem `src/roles`, `src/app/router.tsx`).
- iOS: simulator iPhone cỡ gần nhất (`iPhone 16`, hoặc tạo bản riêng `xcrun simctl create`), `xcrun simctl io <udid> screenshot`. Màn cần dữ liệu: dùng `StubAPIClient.demo` hoặc harness xem trước có sẵn (xem `docs/report-i1.md`: `SIMCTL_CHILD_QLH_DESIGN_GALLERY=1`; thêm cờ debug cho màn của bạn CHỈ trong Features của bạn, không lọt vào bản Production).
- Mỗi màn: ảnh prototype + ảnh simulator đặt cạnh nhau, lưu `ios/docs/screens/<nhóm>/<tên>-proto.png` và `-ios.png`. Bao gồm trạng thái: rỗng, lỗi, tải, khoá, nháp/đã gửi, sheet/modal có trong prototype.
- Bảng khác biệt trong `ios/docs/report-<gói>.md`: màn | khác gì | đã sửa/chưa | lý do. Sửa mọi khác biệt nhìn thấy (bố cục, khoảng cách, màu, chữ từng ký tự, nhãn, thứ tự). Chỉ khác ở hành vi iOS bản địa. Khác khác không sửa được → ghi rõ để lead xin duyệt.

## Ràng buộc
Chỉ sửa file dưới `Features/<nhóm của bạn>/**` và `QuanLyLopTests/<nhóm>/**`. Cần ở Core/App → ghi vào báo cáo. Build/test mỗi lần với derivedData riêng `/tmp/qlh-dd-<gói>`; xanh trước khi commit. Commit gọn (tiếng Anh, conventional, không nhắc AI), chỉ file của bạn. Không SĐT/mật khẩu/nội dung nhận xét thật. Kết thúc `Status: ...` + 2 câu.

## Chụp & điều khiển simulator bằng Maestro (người dùng yêu cầu)
Dùng Maestro CLI 2.2.0 (`~/.maestro/bin/maestro`) để lái app trên simulator (iPhone 16 đã boot) và chụp từng màn, thay cho `ImageRenderer`. Mẫu tham khảo (chỉ đọc): `/Users/phamnhuphong/Git/ai-pose/plans/260925-server-authoritative-jobs/reports/maestro-account-a/` và các báo cáo e2e Maestro cùng thư mục cha; kỹ năng `app-design` (kiểm chứng trên thiết bị chạy) và `mobilewright` nếu Maestro không đủ. Viết flow YAML dưới `ios/maestro/<nhóm>/*.yaml` (appId `vn.quanlylop.app`; `launchApp` + `takeScreenshot` + `tapOn`/`assertVisible`), chạy `maestro test` (hoặc `maestro --device <udid> test`). Màn cần dữ liệu: khởi chạy bằng biến môi trường/cờ demo `QLH_DEMO_SCREEN=<tên>` (Stub, chỉ cấu hình Staging/Debug, KHÔNG có ở Production) qua `launchApp: { arguments / env }`. Ảnh đặt `ios/docs/screens/<nhóm>/<tên>-ios.png`, cạnh `-proto.png` chụp từ prototype (Chrome headless 390×844). Mỗi nhóm ghi lệnh Maestro đã chạy + kết quả (PASS/FAIL) vào báo cáo; flow lưu trong repo để chạy lại. Không đăng nhập thật bằng mật khẩu in ra. Disk: ảnh PNG vừa phải, xoá `~/.maestro/tests` cũ sau khi chép ảnh cần.
