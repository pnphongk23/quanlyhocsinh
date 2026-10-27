# Report 99 · Tài khoản demo cho Apple App Review (staging)

Ngày 2026-10-28. API: `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1` (production dùng chung server này theo quyết định người dùng 2026-10-28).

## Kết quả
- Đã tạo workspace "Lớp Cô Demo" (giáo viên hiển thị "Cô Demo") qua `POST /auth/register`, và 1 tài khoản phụ huynh hoàn tất đặt mật khẩu lần đầu qua `phone-check` → `register-guardian`.
- Thông tin đăng nhập nằm ở `~/.config/qlh/staging-appreview.txt` (chmod 600, hai mục "Giáo viên" và "Phụ huynh", mỗi mục `phone:` và `password:`). Không có giá trị bí mật trong repo hay báo cáo này.
- Dữ liệu: 2 lớp có lịch lặp tuần (lớp 1 có buổi hôm nay theo giờ VN), 10 học sinh (5/lớp), 9 buổi đã qua (8 buổi tháng trước + 1 buổi hôm qua) đã điểm danh, buổi hôm nay của lớp 1 đã điểm danh, 4 bài kiểm tra có điểm, BTVN 2 mục mỗi lớp đã chấm, 3 buổi/lớp có phiếu nhận xét đã gửi, báo cáo tháng trước đã phát hành cho cả 10 học sinh.
- Phụ huynh: SĐT khai cho 1 học sinh ở mỗi lớp (2 con, 2 lớp).

## Kiểm chứng (đếm, chạy `verify-appreview.mjs`)
- Đăng nhập giáo viên 200, phụ huynh 200.
- Giáo viên: 2 lớp, 10 học sinh. Phụ huynh: 2 lớp, 2 con, 2 báo cáo đã phát hành, 6 phiếu đã gửi.
- Lệnh sync bị từ chối: 0.

## Lưu ý
- Lần seed đầu: báo cáo tháng tạo xong ở trạng thái nháp vì script dùng sai tên trường (`rep.id` thay `rep.report_id`) khi điền nhận xét chung, nên `publish` không phát hành gì. Đã sửa script, điền nhận xét và phát hành lại bằng một script tạm; phụ huynh thấy báo cáo sau đó.
- Các buổi quá khứ là buổi lẻ (`origin=manual`), buổi lặp chỉ sinh từ hôm nay trở đi.
- Script: `seed-appreview.mjs` (từ chối chạy nếu file creds đã có), `verify-appreview.mjs`.
