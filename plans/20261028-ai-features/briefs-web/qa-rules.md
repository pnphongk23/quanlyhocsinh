# Quy tắc chạy QA / chụp ảnh trên staging (web)

Lý do: mỗi context Playwright mới là một IndexedDB mới, đăng nhập mới kéo lại snapshot đầy đủ từ D1 (class, student, class_session, ...). D1 staging có hạn mức đọc miễn phí theo ngày.

1. MỘT context bền cho cả lượt QA: đăng nhập một lần, lưu `storageState` (cookie/localStorage) và dùng lại; IndexedDB phải giữ nguyên (dùng `launchPersistentContext` với thư mục profile cố định ngoài repo, không chứa credential trong repo), không tạo context mới cho từng ảnh/từng bước.
2. Gom mọi ảnh/kiểm tra vào một script, một lượt; không chạy lại cả script chỉ để chụp thêm một ảnh.
3. Không chạy lặp vô tận/không poll staging; đóng context ngay khi xong (sync nền vẫn đọc D1 khi tab mở).
4. Khi D1 đã gần hạn mức (GL báo), dừng mọi lượt chạy staging tới khi GL cho phép; ưu tiên test cục bộ (vitest, mock).
5. Không in credential, token, SĐT; xoá SĐT khỏi ảnh.
