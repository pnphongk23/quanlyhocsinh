# Review contract: FCM B2, vòng 2

General Lead 9682fb5f-0e95-45f1-9e40-8dd05a9c931a, workspace wks_5d1bc443eaa9f683.
Candidate duy nhất: /Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/candidates/fcm-b2-r2/, SHA256(manifest.sha256) = 589d9769c6b76688c20d3a4ac8939f6ab182e86a4c91748dd4431bc0954531c4. General Lead đã kiểm manifest 9/9 OK. Đọc các file trong snapshot, không lấy bản live thay snapshot.

Yêu cầu người dùng đã chốt:
- Backend Worker + D1; Firebase chỉ FCM, không Firestore. iOS native FCM qua APNs/Firebase Messaging, PWA/web FCM token.
- Token theo user và membership, ios|web, created/updated, dọn token invalid; chỉ chủ được đăng ký/gỡ. Chuyển user/role không gửi dữ liệu chủ cũ cho chủ mới.
- FCM HTTP v1, OAuth JWT RS256 service account secret (không commit/log), cache access token ~50 phút, đo CPU thực trước release. Chưa được coi CPU hay FCM đầu cuối đã xác minh.
- Payload chỉ tiêu đề và mã tham chiếu, không nhận xét/điểm/mức sao. Chỉ gửi khi bấm gửi phiếu, phát hành báo cáo, giao BTVN, có điểm mới. Điểm gộp theo phụ huynh+học sinh+bài, sau 5 phút không nhập thêm; BTVN gộp phần trong một lần giao, sửa nội dung đề đã giao không push mới.
- Đăng nhập/mật khẩu tạm/Q1/Q2/Q3/Q8 CHỜ theo người dùng; không quyết hoặc implement auth. Review FCM được phép chỉ ra chỗ phụ thuộc auth/sync chặn triển khai nhưng không yêu cầu chốt thay người dùng. Chỉ MVP theo snapshot docs/spec mục 8.

Evidence thô bàn giao r2: script SQLite exit0 78/78, 11 block SQL, 29 bảng. Kiểm nhóm freeze/lifecycle/fanout gồm 25 registrations chia20+5,6 inbox chia5+1, crash/resume không trùng PK, binding cutoff. M1 đổi index đóng nhóm về cột cũ ->5FAIL, M2 bound_at nullable ->FAIL, M3 index thiếu id ->FAIL; bản gốc exit0. Link check 11file/153refs/0 hỏng; whitespace 0 hit; script trên snapshot78/78,9/9 cmp nguồn. Đây là evidence được báo, không verdict; các ca là SQL tuần tự, không phải API/FCM/concurrency thật. Trigger chưa có SQL; chưa có runtime/credential/RS256. Parent kiểm manifest9/9 và overall khớp.
Raw diff r1→r2: briefs/16-fcm-b2-r2.diff. Chỉ review phần đổi và ảnh hưởng trong cùng contract FCM; không mở review toàn backend/auth B1. Không nhận report worker hoặc reviewer cũ ở first pass.

Chỉ xem nguồn contract trong snapshot và evidence trên; KHÔNG đọc resume-verification.md, fcm-b2-fix-r1.md (có ý kiến implementer), report-b1.md, review-r1.md, status.md hay review khác trước verdict. Không giao sẵn danh sách lỗi/phương án sửa cho bạn. Dùng srcwalk guide và exact reads. Nếu cần fact nền tảng thay đổi, dùng nguồn chính thức và phân biệt fact với giả định; không credential/deploy/secret.

Mục tiêu: đủ chặt để triển khai gói FCM trong tương lai sau các cổng runtime, không phải formal approval backend/app. Trả verdict CLEAR|CHANGES_REQUIRED|BLOCKED, severity/file:line (trong snapshot)/evidence/action, <=6 findings, <=3 uncertainties, <=500 từ. Không sửa bất kỳ file nào, không agent con, không gọi worker thật; trả kết quả trong final để parent lưu. Không dùng verdict implementer. Không lặp test nghi thức; chỉ chạy check có câu hỏi cụ thể.
