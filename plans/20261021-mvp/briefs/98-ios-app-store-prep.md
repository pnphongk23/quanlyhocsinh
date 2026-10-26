# Brief 98 · Chuẩn bị hồ sơ App Store cho app iOS (metadata + ảnh chụp)

Người dùng giao 2026-10-27: chuẩn bị metadata và ảnh chụp đẹp để submit app iOS. Spec mục 6: app iOS cài từ App Store.
**Phạm vi chỉ là chuẩn bị.** Không tạo app, không upload, không submit lên App Store Connect, không đổi bundle id/signing khi chưa được GL và người dùng duyệt.

## Đầu ra (ở repo chính, thư mục `plans/20261021-mvp/ios/app-store/`)
1. `metadata-vi.md`, tiếng Việt, đúng giới hạn ký tự App Store (ghi số ký tự cạnh từng mục):
   - Tên app (≤30) và Phụ đề (≤30), mỗi mục 2–3 phương án.
   - Promotional text (≤170), Mô tả (≤4000), Từ khoá (≤100, phân cách dấu phẩy, không lặp tên app).
   - Danh mục chính/phụ đề xuất (Education / Productivity), độ tuổi đề xuất.
   - Support URL, Marketing URL, Privacy Policy URL: bắt buộc phải có. Nếu dự án chưa có trang nào thì ghi rõ "THIẾU". Không bịa URL.
   - Copyright.
   - Bản nháp trả lời **App Privacy**: dữ liệu thu thập (SĐT, tên, nội dung nhận xét, push token…), mục đích, có gắn với danh tính không. Đối chiếu `docs/architecture.md` và code thật.
   - Ghi chú cho reviewer (App Review notes): cách đăng nhập 2 bước, tài khoản demo cho reviewer **để trống `[cần tài khoản reviewer]`**. Không ghi SĐT hay mật khẩu thật hoặc staging vào file.
   - Nội dung đúng spec mục 8 "Bản đầu". Không quảng cáo tính năng "Làm sau" hay "Chưa nên làm" (học phí, bài giảng, nhân sự…).
2. Kiểm tra sẵn sàng: icon 1024 (brief 85), `Info.plist` có đủ usage description cho quyền đang dùng, phiên bản/build, export compliance (mã hoá). Liệt kê thiếu gì. **Chỉ đọc 4 file người dùng đang sửa, không sửa.**
3. Ảnh chụp App Store ("làm cho đẹp"):
   - 5–6 ảnh marketing cỡ **1320×2868** (iPhone 6.9", cỡ bắt buộc hiện nay). Mỗi ảnh gồm: nền + tiêu đề ngắn tiếng Việt (≤ ~6 từ) + ảnh app thật đặt trong khung máy, có thể kèm Mít trang trí.
   - Màu, chữ và bo góc lấy từ `design/tokens/` và `design/ux-v2/rules.md`. Không ghi cứng giá trị; cần màu nền marketing mới thì thêm token trước.
   - Màn đề xuất: danh sách lớp/lịch; điểm danh 3 trạng thái (vuốt); phiếu nhận xét 5 tiêu chí + sao + Mít; chấm BTVN; nhập điểm; màn phụ huynh xem phiếu.
   - Ảnh gốc chụp từ **app thật trên simulator "iPhone 16"**, bản Staging HEAD hiện tại. Không dùng harness/DemoScreens. Lấy 1179×2556 rồi ghép vào khung 1320×2868. Không đổi sang simulator khác.
   - Dữ liệu chụp: workspace smoke với fixture dựng bằng API (fetch, không mở trình duyệt). Tên học sinh/lớp giả nhưng tự nhiên. Không có SĐT thật. Không đọc `staging-demo.txt`. Đặt giờ status bar gọn (`xcrun simctl status_bar … override --time 9:41`, pin đầy, sóng đầy).
   - Không chụp màn đang bật hiện mật khẩu. Không mở log Maestro thô.
   - Đầu ra: `screenshots/raw/` (ảnh gốc) và `screenshots/final/` (ảnh ghép). Script ghép đặt trong thư mục này, có thể chạy lại.
   - Kèm 1 ảnh `contact-sheet.png` gom cả bộ để người dùng duyệt nhanh.

## Quy trình
- Làm metadata và kiểm tra sẵn sàng trước, không cần simulator.
- Xin GL lượt simulator để chụp. QA có thể đang giữ máy; simulator và Chromium không chạy song song. Trần 45 phút mỗi lượt. Đăng nhập tối đa 2 lần submit, bằng Maestro + biến môi trường.
- Worker UI dùng sonnet 5.5. Không cần sol. GL và người dùng duyệt bằng mắt contact sheet.
- Commit chỉ thư mục `app-store/` (và token mới nếu có). Không push. Không xcodegen ở main. Đĩa ≥4 GiB.
- Báo GL ≤200 từ: danh sách file, phương án tên/phụ đề, mục THIẾU, đường dẫn contact sheet.
