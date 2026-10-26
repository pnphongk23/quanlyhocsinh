# Review contract: FCM B2, vòng 3 (cuối)

General Lead 9682fb5f-0e95-45f1-9e40-8dd05a9c931a, workspace wks_5d1bc443eaa9f683.
Candidate duy nhất: /Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/candidates/fcm-b2-r3/, SHA256(manifest.sha256) = 9621026a28fdc9a545222f11bd255fbdcdd34df8482636996823920365e2eaa7. General Lead đã kiểm manifest 9/9 OK. Đọc các file trong snapshot, không lấy bản live thay snapshot.

Yêu cầu người dùng đã chốt:
- Backend Worker + D1; Firebase chỉ FCM, không Firestore. iOS native FCM qua APNs/Firebase Messaging, PWA/web FCM token.
- Token theo user và membership, ios|web, created/updated, dọn token invalid; chỉ chủ được đăng ký/gỡ. Chuyển user/role không gửi dữ liệu chủ cũ cho chủ mới.
- FCM HTTP v1, OAuth JWT RS256 service account secret (không commit/log), cache access token ~50 phút, đo CPU thực trước release. Chưa được coi CPU hay FCM đầu cuối đã xác minh.
- Payload chỉ tiêu đề và mã tham chiếu, không nhận xét/điểm/mức sao. Chỉ gửi khi bấm gửi phiếu, phát hành báo cáo, giao BTVN, có điểm mới. Điểm gộp theo phụ huynh+học sinh+bài, sau 5 phút không nhập thêm; BTVN gộp phần trong một lần giao, sửa nội dung đề đã giao không push mới.
- Đăng nhập/mật khẩu tạm/Q1/Q2/Q3/Q8 CHỜ theo người dùng; không quyết hoặc implement auth. Review FCM được phép chỉ ra chỗ phụ thuộc auth/sync chặn triển khai nhưng không yêu cầu chốt thay người dùng. Chỉ MVP theo snapshot docs/spec mục 8.

Evidence thô bàn giao r3: script SQLite exit0 101/101; tests budget-skipped/stale-claim/version-ready/disable-after-fanout/reclaim-freeze/stale-owner, các ca chỉ SQL tuần tự. Mutation trên bản sao script: S1 predicate WHERE→5FAIL, S2 bỏCAS→2FAIL, S3 bỏactive→2FAIL, S4 reclaim đổi freeze→1FAIL, S5 bỏleaseguard→1FAIL; bản gốc exit0. Link check12file/181refs/0hỏng, tracked diffcheck exit0, trailingwhitespace0. Candidate9file manifest khớp, cmp nguồn sạch theo handback; parent kiểm overall và9/9manifest. Không có backend/D1/Worker/FCM/cronconcurrent/CPU thật; evidence không phải verdict.
Raw diff r2→r3 tại briefs/18-fcm-b2-r3.diff. Review phần đổi và ảnh hưởng trong FCM contract, không review toàn bộ backend/auth B1. Không đọc report implementer, verdict/lỗi reviewer khác trước first pass. Đây là vòng cuối theo brief người dùng.

Chỉ xem nguồn contract trong snapshot và evidence trên; KHÔNG đọc resume-verification.md, fcm-b2-fix-r1.md, fcm-b2-fix-r2.md (có ý kiến implementer), report-b1.md, review-r1.md, status.md hay review khác trước verdict. Không giao sẵn danh sách lỗi/phương án sửa cho bạn. Dùng srcwalk guide và exact reads. Nếu cần fact nền tảng thay đổi, dùng nguồn chính thức và phân biệt fact với giả định; không credential/deploy/secret.

Mục tiêu: đủ chặt để triển khai gói FCM trong tương lai sau các cổng runtime, không phải formal approval backend/app. Trả verdict CLEAR|CHANGES_REQUIRED|BLOCKED, severity/file:line (trong snapshot)/evidence/action, <=6 findings, <=3 uncertainties, <=500 từ. Không sửa bất kỳ file nào, không agent con, không gọi worker thật; trả kết quả trong final để parent lưu. Không dùng verdict implementer. Không lặp test nghi thức; chỉ chạy check có câu hỏi cụ thể.
