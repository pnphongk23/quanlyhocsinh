# DA-3 · Kịch bản 2 thiết bị trên staging

Đọc `data-api-00-common.md` trước.

## Việc
Dùng Playwright (node, script `/tmp/qlh-data-api/two-device/`) mở HAI context trình duyệt độc lập (A, B) trên `https://qlh-staging-web.pages.dev`, cùng MỘT tài khoản giáo viên của workspace RIÊNG: đăng ký mới qua UI hoặc `POST /v1/workspaces` với SĐT giả dạng `+849000xxxxx` không trùng demo (đọc api-spec mục đăng ký; tối đa 5 đăng ký/giờ/IP; ghi mật khẩu giả vào `/tmp/qlh-data-api/two-device/creds.json` chmod 600, không in). KHÔNG dùng workspace demo để ghi.

Với từng loại dữ liệu: lớp (tạo, sửa lịch), học sinh (thêm, sửa), buổi (buổi lẻ, huỷ), điểm danh, bài kiểm tra (tạo), điểm, phiếu nhận xét (nháp/gửi), BTVN (giao, chấm), báo cáo (phát hành nếu có thể):
1. A thực hiện thao tác qua UI, chờ A báo lưu xong (không lỗi).
2. B (đã mở sẵn trang liên quan): (a) không làm gì 0/30/70/130 s, (b) chuyển trang đi rồi quay lại, (c) reload, (d) focus lại tab (giả lập `visibilitychange`/`focus`). Ghi B thấy thay đổi ở bước nào, sau bao lâu, hay không bao giờ.
3. Ghi request mạng của B trong lúc đó (có `sync/pull` không, có REST GET không).
Đồng thời ghi mỗi thao tác của A đi request nào (`sync/push` lệnh gì hay REST) và kết quả (`applied`/status).

Ghi `plans/20261021-mvp/data-api/two-device-before.md` (repo chính): bảng loại dữ liệu × (đường ghi của A, B thấy ở bước nào, thời gian, request B), kết luận, cách chạy lại script bằng một lệnh. Nếu UI thiếu thao tác nào, ghi "không có trong UI" và thử qua API nếu đơn giản.

## Ranh giới
Không sửa repo ngoài file báo cáo. Script ở `/tmp/qlh-data-api/two-device/`. Nếu bị khoá/throttle: dừng, báo BLOCKED kèm thời điểm.
