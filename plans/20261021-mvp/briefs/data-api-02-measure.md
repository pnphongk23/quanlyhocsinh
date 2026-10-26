# DA-2 · Đo thật trên staging: số request, thời gian, CPU/D1

Đọc `data-api-00-common.md` trước. Chỉ đọc/đo, KHÔNG ghi dữ liệu (không bấm Lưu).

## Việc
Dùng Playwright (node, script ở `/tmp/qlh-data-api/measure/`, có thể tham khảo `mvp-web/scripts/e2e-staging-ui.mjs`) với tài khoản GIÁO VIÊN demo (và phụ huynh demo cho chọn vai trò/màn phụ huynh nếu cần) trên `https://qlh-staging-web.pages.dev`. Hai cấu hình mạng: không giới hạn và giả lập 4G (CDP `Network.emulateNetworkConditions` ~ 20 ms RTT thêm 150 ms, 9 Mbps down / 1.5 up; ghi rõ thông số). Mỗi kịch bản chạy ≥ 3 lần (warm), ghi trung vị:
1. Đăng nhập → Chọn vai trò → vào trang đầu giáo viên: thời gian từ bấm chọn vai trò tới nội dung hiện (dùng selector cụ thể), danh sách request.
2. Mở lớp 6A.
3. Mở một buổi học có dữ liệu → tab Điểm danh; chuyển Nhận xét; chuyển BTVN; quay lại Điểm danh. Mỗi lần chuyển: số request, endpoint, thời gian request, thời gian tới khi nội dung tab hiện (không spinner).
4. Mở lại cùng buổi lần 2 (có cache chưa?).
Ghi mọi request tới API: method, path (che id nếu muốn), status, thời gian (timing), kích thước response.

Song song chạy `npx wrangler tail qlh-staging-api --format json` (trong `mvp-backend/worker`, env staging nếu cần `--env staging`) lưu ra `/tmp/qlh-data-api/tail.jsonl` trong lúc đo; tổng hợp theo endpoint: `cpuTime`, `wallTime` (trung vị, max), số lần gọi. Nếu muốn thời gian D1, dùng `npx wrangler d1 insights qlh-staging-db --env staging` hoặc meta `duration` (nếu tail không có, ghi rõ không có).

Ghi `plans/20261021-mvp/data-api/measure-before.md` (repo chính): bảng theo kịch bản và theo endpoint, kết luận 5 dòng chỗ nào chậm nhất (mạng tuần tự? CPU Worker? D1? render chờ?), đường dẫn script để chạy lại sau sửa. Script phải chạy lại được bằng một lệnh (biến môi trường cho file creds), không in secret.

## Ranh giới
Không sửa repo ngoài file `data-api/measure-before.md`. Script ở `/tmp/qlh-data-api/measure/`.
