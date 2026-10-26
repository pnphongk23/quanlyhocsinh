# Review tổng thể backend D1 + FCM — vòng 1

Ngày: 2026-10-21  
Phạm vi: review tài liệu thiết kế, chỉ đọc; không đánh giá mã Worker/API vì repo chưa có mã backend.

## Bảng kiểm các sửa B3

| Sửa | Kết quả | Bằng chứng và nhận xét |
|---|---|---|
| C3-01 — kiểm quyền nhóm và liên kết con ở projection fanout | ĐÚNG | `data-model.md` 2.7, `api-spec.md` 7 và `authz-matrix.md` T/F20 yêu cầu lọc trong projection sau khi lấy trang; dòng bị bỏ qua vẫn tính vào trần/cursor; sender kiểm lại trước gửi. Nhất quán với nhau. |
| B-01 — chặn cấp lại mật khẩu cho tài khoản nhân sự/ngoài workspace | ĐÚNG | `api-spec.md` 4/Q2, `data-model.md` 3–4, `authz-matrix.md` 2.1/T23 đều chặn trước khi ghi và trả `409 account_not_resettable` không tiết lộ role/workspace. |
| B-02 — xác định ranh giới atomic và retry | ĐÚNG | `api-spec.md` 6.1, `data-model.md` 4, `offline-plan.md` Hợp đồng chung và `stack-and-cpu.md` 6 đều xác định một D1 batch mỗi lệnh; HTTP batch không atomic; client xử lý xác nhận từng lệnh, replay trả `duplicate`. |
| B-03 — retention của change log | ĐÚNG | `data-model.md` 1/2.8/3, `api-spec.md` 1/6.3, `offline-plan.md` Hợp đồng chung và `authz-matrix.md` T35 khớp về 120 ngày, dọn theo lô, `change_floor`, `snapshot_required` tách khỏi `resync_required`. |
| B-04 — ràng buộc cùng lớp | ĐÚNG | `data-model.md` 1/2.2–2.5 dùng khóa ngoại phức hợp cho điểm danh, điểm, phiếu và chấm BTVN; bao gồm phần BTVN thuộc buổi cùng lớp. `authz-matrix.md` T37 kiểm các ca chéo lớp. |
| B-05 — phạm vi lịch của phụ huynh | ĐÚNG | `api-spec.md` 5.3 và `authz-matrix.md` 2.2/T34 giới hạn lịch theo lớp có con liên kết, bỏ `note` và dữ liệu lớp khác. |
| RQ-03 — ID liên quan trong inbox | ĐÚNG | `report-b1.md` B3 và `api-spec.md` 7 ghi `report_id`/`test_id` theo loại thông báo; ID không thay quyền truy cập, payload không chứa nội dung nhạy cảm. |

## Findings

Không có finding BLOCKER, MAJOR, MINOR hoặc NIT trong phạm vi review tài liệu vòng này. Không có bằng chứng về endpoint/bảng ngoài MVP; nhóm `lectures` được giữ trong lược đồ nhưng các tài liệu đều ghi rõ không có endpoint hay tính năng trong MVP.

## Đã kiểm, đạt

- **Phân quyền và riêng tư:** `authz-matrix.md` đối chiếu được với endpoint/lệnh trong `api-spec.md`; phụ huynh chỉ đọc dữ liệu của con, nội dung phiếu/kết quả BTVN/báo cáo có điều kiện gửi hoặc phát hành, bài `archived` bị ẩn. Các truy vấn/khóa ngoại cùng workspace và các ca đổi membership, gỡ liên kết, thu hồi quyền được nêu rõ. BTVN lộ kết quả theo phiếu của buổi chấm; khi buổi bị hủy, hợp đồng yêu cầu phát lại thay đổi.
- **Xác thực:** đăng nhập SĐT + mật khẩu, không OTP/SMS; mật khẩu tạm hiện một lần, bắt buộc đổi; phiên lưu hash token ngẫu nhiên; giới hạn thử và thông điệp lỗi không tiết lộ tài khoản đích. Điều kiện B-01 không mở đường đặt lại tài khoản nhân sự.
- **Đồng bộ:** UUID lệnh, `base_version`, `applied_commands`, cursor/epoch, xung đột giữ giá trị hai phía, lệnh bị từ chối vẫn ở outbox và batch nhiều lệnh không rollback lệnh đã commit được mô tả khớp giữa API, model và offline plan.
- **Nghiệp vụ:** có 4 trạng thái điểm danh; buổi hủy không được tính số thứ tự; BTVN 0–4 phần/4 loại, ba mức, chấm ở buổi kế tiếp chưa hủy và xóa phần bị chặn khi đã có điểm; bài kiểm tra `max` 1–1000 mặc định 15 và `archived`; phiếu sao 1–3; báo cáo theo tháng, có nháp/phát hành lại/bản chụp. Không có điểm trung bình hay trạng thái “vắng thi” trong hợp đồng.
- **Dữ liệu/hiệu năng:** DDL có chỉ mục cho các truy vấn chính; mô tả trigger lịch sử và ghi rõ chưa viết SQL; cron sinh buổi có giới hạn theo lô. Phương pháp và mẫu đo CPU được nêu; PBKDF2 100.000 vòng khoảng 29 ms, vượt ngân sách 10 ms, phương án dự phòng và cổng đo trước khi implement được công khai. CPU 50 lệnh nhỏ, FCM/RS256, trần fanout và chi phí chỉ mục B-04 được đánh dấu chưa đo.
- **Offline và nhất quán:** hai client dùng chung hợp đồng sync; thứ tự triển khai, xử lý outbox, snapshot/pull, thu hồi quyền và rủi ro lưu trữ được ghi. Danh sách 15 điểm cập nhật `docs/architecture.md` ở `report-b1.md` mục 3 bao quát các quyết định B1–B3; việc đồng bộ tài liệu kiến trúc được ghi là bước sau review.
- **Kiểm tra được phép:** `python3 -I plans/20261021-mvp/backend/check-fcm-ddl.py` trả `PASS 134/134`, exit 0. Phạm vi chỉ là DDL/mô phỏng SQL tuần tự trên SQLite `:memory:`; không chứng minh API, Worker/D1, trigger, cron đồng thời hoặc gửi FCM hoạt động.

## Rủi ro cần người dùng quyết

- **Q1:** quên mật khẩu giáo viên/Admin chưa có quy trình tự phục vụ; hiện chưa có endpoint.
- **Q2:** điều kiện B-01 là quy tắc tạm đã được siết an toàn, nhưng quyết định/hệ quả nghiệp vụ vẫn chờ người dùng; còn tình huống đổi chủ/nhập sai SĐT và phụ huynh có con ở nhiều workspace.
- **Q3:** đăng ký workspace chưa xác minh quyền sở hữu SĐT; phương án `registration_code` và quyết định có chấp nhận rủi ro hay không vẫn chờ.
- **Q8:** chọn vận hành với PBKDF2 100.000 vòng trên staging và theo dõi, nâng gói ngay, hay giảm vòng; không tự coi số đo mẫu nhỏ là bằng chứng đã qua cổng CPU.
- **Q6/Q15:** điểm thập phân và định nghĩa “vắng 2 buổi liên tiếp” chưa chốt; hiện tài liệu không tự suy diễn nghiệp vụ, Q15 tính cảnh báo ở client.

## Kết luận

**APPROVED** — không có BLOCKER/MAJOR trong review tổng thể này. Approval áp dụng cho tính nhất quán của spec; các quyết định đang chờ và giới hạn chưa kiểm chứng nêu trên vẫn cần được giữ trước khi triển khai phần liên quan.

Status: DONE_WITH_CONCERNS
Summary: Review vòng 1 không tìm thấy finding cần sửa; các sửa B3 nhất quán với spec, ma trận quyền và hợp đồng backend, còn danh sách cập nhật `docs/architecture.md` là đủ cho các thay đổi đã review. Script DDL PASS 134/134 nhưng chưa xác minh runtime; Q1, Q2, Q3, Q8 cùng Q6/Q15 vẫn là rủi ro hoặc quyết định cần người dùng xử lý.
