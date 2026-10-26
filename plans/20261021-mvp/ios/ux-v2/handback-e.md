Status: DONE_WITH_CONCERNS · Commit `1dda0c1c4271acbd81953cc7c1a2ff51cba93efb`.

E1: sửa safe area và ghim header lớp lên đầu viewport. Test Staging: 151 passed, 2 skipped, 0 failures. Ảnh tab Điểm iPhone 16/SE 3: `shots/after/e1-p16-scores.png`, `shots/after/e1-se3-scores.png` (fixture demo tổng hợp).

E2: kết luận mã nguồn nghiêng về **(ii)**: `AuthService.swift:105-117` gọi `GET me` khi có token, catch đưa app về đăng nhập; endpoint HTTP bị từ chối ở `APIClient.swift:100`. Lượt đăng nhập thử mới không vào app; dừng sau một lần nên chưa xác nhận trực tiếp Keychain trong phép cài đè.

E3: chưa có video/ảnh spinner hoặc “Đã lưu”; thiếu phiên đăng nhập để thao tác và hoàn tác an toàn. Không có thay đổi thật trên dữ liệu staging. Chi tiết: `verify-e.md`.
