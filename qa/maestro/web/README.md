# Maestro web — giới hạn đã kiểm chứng và phạm vi chưa xác nhận

- Mặc định target là DEV. Script Node import `./config.mjs`; cấu hình bằng `QLH_WEB_BASE` / `QLH_API_BASE`. Guard từ chối URL chứa `staging`, trừ khi `QLH_ALLOW_STAGING=1` được đặt tường minh. CẤM dùng staging vì staging là PROD. Có thể ghim asset bundle bằng `QLH_EXPECTED_WEB_BUNDLE`; mặc định không ghim hash từ lượt QA cũ.
- Maestro CLI 2.2.0. `url:` + `launchApp` đã được thử trong một lượt QA cũ; kết quả lịch sử không xác nhận target DEV hiện tại.
- `maestro test --platform web ...` báo không có thiết bị kết nối, nên không dùng cờ đó. Lệnh web mặc định với `--headless --screen-size WxH` khởi chạy được.
- `takeScreenshot` sinh PNG 1×1 px. Ảnh Maestro không làm bằng chứng giao diện.
- Probe Maestro tap/nhập không kết thúc được trong thời hạn lượt chạy. Chưa xác nhận tương tác phần tử, nhập liệu, upload, đổi viewport, offline hoặc nhiều tab bằng Maestro.
- Các báo cáo run cũ phản ánh môi trường tại thời điểm chạy; không dùng chúng để chọn target hiện tại. Script đọc credentials từ `~/.config/qlh/dev-qa.txt` lúc chạy.
- Playwright có thể kiểm tra DOM, form, dialog, request trình duyệt và tải file. Offline có thể mô phỏng bằng BrowserContext; cần khôi phục mạng trong `finally`. Upload chỉ kiểm tra được khi có fixture file nhỏ; đổi viewport chỉ kiểm chứng ở kích thước đã yêu cầu; nhiều tab dùng được nhưng chia sẻ context/cookie nếu cùng context. Chưa có bằng chứng thực chạy cho các giới hạn đó trong lượt này.
- Thay thế cho phần Maestro chưa làm được: Playwright/Node trong thư mục này, thao tác trên UI DEV, lưu JUnit vào `plans/20261021-mvp/qa/runs/`. Không seed IndexedDB, mock API hay dùng app local/demo.
