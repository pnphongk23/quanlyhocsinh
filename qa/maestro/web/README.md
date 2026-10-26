# Maestro web — giới hạn đã kiểm chứng và phạm vi chưa xác nhận

- Maestro CLI 2.2.0. `url:` + `launchApp` mở được URL staging trên Chromium headless; `assertVisible` tìm thấy tiêu đề “Đăng nhập”.
- `maestro test --platform web ...` báo không có thiết bị kết nối, nên không dùng cờ đó. Lệnh web mặc định với `--headless --screen-size WxH` khởi chạy được.
- `takeScreenshot` sinh PNG 1×1 px. Ảnh Maestro không làm bằng chứng giao diện.
- Probe Maestro tap/nhập không kết thúc được trong thời hạn lượt chạy. Chưa xác nhận tương tác phần tử, nhập liệu, upload, đổi viewport, offline hoặc nhiều tab bằng Maestro.
- Playwright/Node đã mở staging headless, thao tác locator UI và ghi JUnit. Chỉ các thao tác đã ghi rõ trong `progress.md` và `status.tsv` được xem là đã chạy. Lead đã cho phép tiếp tục chạy theo nhóm nhỏ sau khi dung lượng được phục hồi.
- Playwright có thể kiểm tra DOM, form, dialog, request trình duyệt và tải file. Offline có thể mô phỏng bằng BrowserContext; cần khôi phục mạng trong `finally`. Upload chỉ kiểm tra được khi có fixture file nhỏ; đổi viewport chỉ kiểm chứng ở kích thước đã yêu cầu; nhiều tab dùng được nhưng chia sẻ context/cookie nếu cùng context. Chưa có bằng chứng thực chạy cho các giới hạn đó trong lượt này.
- Thay thế hợp lệ cho phần Maestro chưa làm được: Playwright/Node trong thư mục này, thao tác trên UI staging, lưu JUnit vào `plans/20261021-mvp/qa/runs/`. Không seed IndexedDB, mock API hay dùng app local/demo.
