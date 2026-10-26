# Dữ liệu mẫu cho ảnh App Store

`build-fixtures.mjs` dựng dữ liệu qua API (fetch, không trình duyệt, không cài thư viện), chỉ cần Node ≥ 18.

- 2 lớp ("Lớp Tiếng Anh 6A", "Lớp Giao Tiếp 7B"), 8 học sinh mỗi lớp, tên giả.
- Mỗi lớp: buổi hôm qua (điểm danh, 2 phần BTVN đã chấm, phiếu đã gửi để phụ huynh xem) và buổi hôm nay (điểm danh có đủ present/late/absent, phiếu nháp 5 tiêu chí + sao), 1 bài kiểm tra có điểm.

## Chạy
```
node build-fixtures.mjs --dry-run   # in kế hoạch, không gọi mạng
node build-fixtures.mjs             # gọi API thật
```
Biến môi trường (người chạy tự đặt; script không đọc file nào và không in giá trị):

| Biến | Ý nghĩa |
|---|---|
| `QLH_API_BASE` | gốc API, ví dụ `https://<host>/v1` |
| `QLH_PHONE`, `QLH_PASSWORD` | tài khoản giáo viên của workspace smoke |
| `QLH_GUARDIAN_PHONE` | tuỳ chọn: gắn làm SĐT phụ huynh của học sinh đầu lớp đầu, để chụp màn phụ huynh |

Chạy lại sẽ tạo thêm lớp trùng tên (id mới mỗi lần), nên chỉ chạy một lần cho mỗi workspace.

## Trạng thái
Mới kiểm cú pháp (`node --check`) và `--dry-run`. Chưa chạy lên staging nên chưa biết API có từ chối chỗ nào (ví dụ tạo buổi ở ngày hôm qua, các lệnh `sync/push`).
