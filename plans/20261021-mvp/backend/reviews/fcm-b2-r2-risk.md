# FCM B2 r2 — reviewer bảo mật/vận hành

Agent 401b8555-1e56-43fb-940e-0a81d5ce69af. Candidate manifest SHA256589d9769c6b76688c20d3a4ac8939f6ab182e86a4c91748dd4431bc0954531c4. Parent lưu từ finish notification.

VERDICT: CHANGES_REQUIRED

- REQUIRED | data-model.md:530 (snapshot r2) | Inbox được chọn khi ready_at tới, điểm mới có thể dời hạn trước claim; UPDATE mẫu không kiểm lại ready_at<=now hoặc event_version. Có thể freeze/fanout sớm trái gộp5phút. | Thêm cutoff/version vào UPDATE claim; chỉ freeze khi còn khớp; kiểm điểm nhập xen giữa đọc/claim.
- REQUIRED | data-model.md:532 | Sender kiểm phiên còn hạn/membership khớp nhưng không yêu cầu membership còn active ngay trước gửi; disable sau fanout vẫn có delivery chờ. | Check membership active trước mỗi gửi, skip nếu vô hiệu.
- REQUIRED | data-model.md:530 | UPDATE mẫu gán expansion_started_at=now mỗi claim, lease hết lấy lại có thể đổi mốc dù yêu cầu đặt1lần. | Khởi tạo nếuNULL, giữ nguyên khi reclaim; cập nhật cursor/kết thúc chỉ lease hiện hành.

Uncertainty: SQL chỉ mô phỏng tuần tự, chưa chứng minh request/cron concurrent; chưa Worker/FCM/thiết bị runtime. Next: sửa contract/schema-plan, candidate/manifest mới, review exact identity mới.

General Lead: chấp nhận3 findings; gộp với C2-01 vào một packet sửa nhỏ, tạo r3 cuối theo lead-brief. Không sửa snapshotr2.
