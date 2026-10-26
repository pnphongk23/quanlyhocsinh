# FCM B2 r1 — reviewer bảo mật/vận hành

Agent cc9b07c3-4a80-4642-aee3-2834d521a8e0, candidate manifest hash 0936ec365dbfedc22eac53d55aaedbd7df1c82a9836b352bb02192464ad8e706. Parent lưu nguyên nội dung finding từ finish notification.

VERDICT: CHANGES_REQUIRED

- REQUIRED | data-model.md:520-523 (snapshot r1) | PUT /session/membership đổi membership trên phiên hiện tại (api-spec.md:128-133), nhưng token vẫn gắn membership cũ. Sender chỉ kiểm phiên và membership còn hiệu lực, chưa yêu cầu chúng khớp nhau; token có thể tiếp tục nhận push role cũ. | Khi đổi membership gỡ/đăng ký lại token; trước gửi xác nhận membership token trùng membership hiện hành phiên, bỏ delivery mismatch.
- REQUIRED | stack-and-cpu.md:186 (snapshot r1) | Claim gửi giới hạn 5 delivery/2 kết nối nhưng mở rộng inbox chỉ nói chia lô, không bound inbox/thiết bị mỗi invocation; fanout lớn có thể vượt CPU/hạn mức. | Bound số hàng mở rộng và có cách tiếp tục ở cron sau.

Uncertainties:
- Manifest hash khớp và đủ9 file.
- CPU RS256/cache miss và FCM đầu cuối chưa đo; vẫn là cổng trước phát hành.

General Lead chấp nhận cả hai, gộp R-01 với C-01; quyết định tại briefs/15-fcm-b2-r1-decisions.md. Không sửa snapshot r1.
