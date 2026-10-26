# FCM B2 r1 — reviewer hợp đồng

Agent: 1cac84f4-7d0b-4c1e-8bbe-a5929067612a. Candidate SHA256(manifest): 0936ec365dbfedc22eac53d55aaedbd7df1c82a9836b352bb02192464ad8e706. Kết quả nhận qua finish notification; parent lưu, không chỉnh verdict.

VERDICT: CHANGES_REQUIRED

- REQUIRED | plans/20261021-mvp/backend/candidates/fcm-b2-r1/plans/20261021-mvp/backend/offline-plan.md:42 | Khi offline, việc gỡ hoặc chuyển token chỉ được xếp hàng; API chỉ cập nhật đăng ký khi có mạng (api-spec.md:373–385), còn phiên cũ có thể tiếp tục hoạt động tới 180 ngày (api-spec.md:104). Vì vậy token vẫn có thể nhận push của chủ cũ sau khi người dùng chuyển tài khoản hoặc vai trò trên thiết bị. | Quy định cách chặn chuyển tài khoản/vai trò cho tới khi máy chủ xác nhận thu hồi hoặc chuyển token, hoặc thiết kế cơ chế khác bảo đảm token cũ không còn nhận push trước khi thiết bị dùng cho chủ mới.

Uncertainty:
- Danh tính ứng viên khớp hash nêu trên.
- SQLite chỉ kiểm DDL cục bộ, không trigger/backend/API runtime; không suy evidence vượt mức đó.

## Xử lý của General Lead

Đã nhận và ghi finding C-01; chưa giao sửa khi lens bảo mật/vận hành còn review cùng candidate. Không thay đổi nguồn hay snapshot trong lúc review mở. Sau khi nhận đủ hai lens sẽ lọc/gộp findings, giao một packet sửa và freeze candidate mới.
