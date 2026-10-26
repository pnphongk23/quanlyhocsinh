# Review contract: FCM B2, vòng 1

General Lead 9682fb5f-0e95-45f1-9e40-8dd05a9c931a, workspace wks_5d1bc443eaa9f683.
Candidate duy nhất: /Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/candidates/fcm-b2-r1/, SHA256(manifest.sha256) = 0936ec365dbfedc22eac53d55aaedbd7df1c82a9836b352bb02192464ad8e706. General Lead đã kiểm manifest 9/9 OK. Đọc các file trong snapshot, không lấy bản live thay snapshot.

Yêu cầu người dùng đã chốt:
- Backend Worker + D1; Firebase chỉ FCM, không Firestore. iOS native FCM qua APNs/Firebase Messaging, PWA/web FCM token.
- Token theo user và membership, ios|web, created/updated, dọn token invalid; chỉ chủ được đăng ký/gỡ. Chuyển user/role không gửi dữ liệu chủ cũ cho chủ mới.
- FCM HTTP v1, OAuth JWT RS256 service account secret (không commit/log), cache access token ~50 phút, đo CPU thực trước release. Chưa được coi CPU hay FCM đầu cuối đã xác minh.
- Payload chỉ tiêu đề và mã tham chiếu, không nhận xét/điểm/mức sao. Chỉ gửi khi bấm gửi phiếu, phát hành báo cáo, giao BTVN, có điểm mới. Điểm gộp theo phụ huynh+học sinh+bài, sau 5 phút không nhập thêm; BTVN gộp phần trong một lần giao, sửa nội dung đề đã giao không push mới.
- Đăng nhập/mật khẩu tạm/Q1/Q2/Q3/Q8 CHỜ theo người dùng; không quyết hoặc implement auth. Review FCM được phép chỉ ra chỗ phụ thuộc auth/sync chặn triển khai nhưng không yêu cầu chốt thay người dùng. Chỉ MVP theo snapshot docs/spec mục 8.

Evidence thô được bàn giao: script SQLite cục bộ exit0 47/47; 11 block SQL, 29 bảng; FK check rỗng. Đối chứng bỏ open-group index exit1 45/47; bỏ UNIQUE token exit1 46/47. Link checker exit0 122 tham chiếu/0 hỏng; git diff --check exit0 chỉ trên tracked files. Đây là evidence được báo, không verdict. Trigger chưa có SQL; chưa có backend/D1/API/cron runtime/FCM credential; RS256 chưa đo vì /genkey HTTP403. Cleanup Worker thử được bàn giao exit0 delete, deployments list code10007 không tồn tại, không phải reviewer chạy.

Chỉ xem nguồn contract trong snapshot và evidence trên; KHÔNG đọc resume-verification.md (có ý kiến implementer), report-b1.md, review-r1.md, status.md hay review khác trước verdict. Không giao sẵn danh sách lỗi/phương án sửa cho bạn. Dùng srcwalk guide và exact reads. Nếu cần fact nền tảng thay đổi, dùng nguồn chính thức và phân biệt fact với giả định; không credential/deploy/secret.

Mục tiêu: đủ chặt để triển khai gói FCM trong tương lai sau các cổng runtime, không phải formal approval backend/app. Trả verdict CLEAR|CHANGES_REQUIRED|BLOCKED, severity/file:line (trong snapshot)/evidence/action, <=6 findings, <=3 uncertainties, <=500 từ. Không sửa bất kỳ file nào, không agent con, không gọi worker thật; trả kết quả trong final để parent lưu. Không dùng verdict implementer. Không lặp test nghi thức; chỉ chạy check có câu hỏi cụ thể.
