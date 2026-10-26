# Dữ liệu mẫu cho ảnh App Store

`build-fixtures.mjs` dựng dữ liệu qua API (fetch, không trình duyệt, không cài thư viện), chỉ cần Node ≥ 18.

- 2 lớp ("Lớp Tiếng Anh 6A", "Lớp Giao Tiếp 7B"), 8 học sinh mỗi lớp, tên giả.
- Mỗi lớp: buổi hôm qua (điểm danh, 2 phần BTVN đã chấm, phiếu đã gửi để phụ huynh xem) và buổi hôm nay (điểm danh có đủ present/late/absent, phiếu nháp 5 tiêu chí + sao), 1 bài kiểm tra có điểm.

## Chạy
```
node build-fixtures.mjs --dry-run   # in kế hoạch, không gọi mạng, không đăng ký
node build-fixtures.mjs             # gọi API thật
```
Lần đầu script đăng ký một workspace giáo viên mới và sạch trên staging (SĐT giả, mật khẩu ngẫu nhiên), ghi `phone`, `password`, `guardian_phone` vào `~/.config/qlh/staging-appstore.txt` (mode 600, ngoài repo, không in). Có file rồi thì chỉ đăng nhập; lớp đã có theo tên thì bỏ qua, nên chạy lại không tạo trùng. Buổi hôm nay lấy từ lịch lặp do máy chủ tự sinh; buổi hôm qua tạo buổi lẻ. `QLH_API_BASE` tuỳ chọn (mặc định API staging). `guardian_phone` là SĐT phụ huynh giả gắn cho học sinh đầu của lớp đầu, dùng cho màn phụ huynh.

## Trạng thái
Đã chạy thật trên staging một lần: 2 lớp, 16 học sinh, điểm danh, BTVN, bài kiểm tra, phiếu hôm nay và phiếu đã gửi hôm qua.
