# Tiếp quản: hoàn thiện và kiểm chứng tài liệu D1 + FCM

Parent General Lead: 9682fb5f-0e95-45f1-9e40-8dd05a9c931a, workspace wks_5d1bc443eaa9f683. Phiên cũ abdfe90c hết quota; không gọi lại agent Claude cũ.

## Đọc và quyết định hiện hành

Đọc AGENTS.md, toàn bộ docs/spec.md, docs/architecture.md, lead-brief.md; brief 12-backend-fcm-update.md và 02-docs-fcm.md để hiểu phạm vi. Dùng srcwalk guide trước khi tìm. Tài liệu FCM hiện đã được General Lead tiếp quản sửa trước khi user nhắc quy trình, chưa qua independent review. Đây là working candidate, không tin báo cáo DONE cũ là bằng chứng.

Người dùng vừa chốt trong phiên hiện tại:
- Giữ phần đăng nhập ở trạng thái CHỜ: chưa chốt mật khẩu tạm, Q1/Q2/Q3/Q8; chỉ làm phần độc lập. Không implement auth, không chốt các phương án tạm trong B1 thành quyết định.
- Điểm mới gộp theo phụ huynh + học sinh + bài kiểm tra, gửi sau 5 phút không nhập thêm; BTVN gộp các phần trong một lần giao, sửa nội dung đề đã giao không phát push mới. Q7/Q12 đã chốt.
- Backend Worker + D1, Firebase chỉ cho FCM; iOS FCM qua APNs, web FCM token; payload không có nhận xét/điểm/mức sao; OAuth RS256 service account chỉ secret, cache D1 ~50 phút.

## Một packet, write-set

Chỉ sửa nếu cần để khớp quyết định đã chốt: docs/spec.md, docs/architecture.md; plans/20261021-mvp/backend/{data-model,api-spec,authz-matrix,offline-plan,stack-and-cpu,report-b1,firebase-setup-checklist}.md; briefs/02-docs-fcm.report.md. Ghi báo cáo mới backend/resume-verification.md và script kiểm chứng tái chạy được backend/check-fcm-ddl.py (chỉ thư viện chuẩn Python, dữ liệu giả, không in SĐT/token/khoá/nội dung nhận xét).

Không viết app/backend thật; không chạm prototype, iOS, status/lead-brief/outbox hoặc thay đổi của người dùng khác. Không tự chọn nghiệp vụ, mở rộng kiến trúc, thay lịch/lớp/đăng nhập. B-01..05 trong review-r1.md là findings cũ chưa giải quyết, không tự sửa các phần ngoài FCM trong packet này; báo parent. Nếu phát hiện FCM contract đòi lựa chọn kỹ thuật mới, nêu blocker và đề xuất ngắn, không tự mở interface mới. Không agent con, không commit/push/merge/deploy/login/secret.

## Việc làm và evidence

1. Rà tính nhất quán gói FCM/docs với quyết định và điều kiện của brief 12. Những điểm từng đổi gần nhất: notifications.group_key/ready_at/event_version, homework.assign atomic 1..4 phần, device registration_version/owner/phiên, deliveries theo thiết bị, OAuth cache lease. Chỉ sửa lỗi cơ học/mâu thuẫn rõ, nêu thay đổi. Không tự review rồi kết luận APPROVED.
2. Viết và chạy script kiểm DDL SQL trong markdown trên SQLite :memory: với foreign_keys=ON. Kiểm schema nạp được; FK user/membership; token UNIQUE/platform; notifications kind và event idempotency; một nhóm điểm mở rồi cho nhóm mới sau expand; FK membership của delivery; xoá device cascade. Không giả lập tầng db/trigger chưa có rồi gọi runtime đã test. Ghi lệnh, exit, counts và giới hạn kiểm.
3. Kiểm git diff --check và link Markdown nội bộ mới. Kiểm không còn lựa chọn Web Push VAPID tự gửi/APNs chưa chốt trong docs active; phép đo Web Push B1 chỉ được giữ dưới nhãn lịch sử. Sửa nhãn báo cáo B1 nếu người đọc có thể nhầm với B2.
4. Không đo RS256 lại: đã thử GET /genkey trả HTTP 403, không có số CPU. Cleanup đã thực hiện: wrangler delete --name qlh-staging-rs256 --force exit0; deployments list cùng tên exit1 code10007 This Worker does not exist on your account. Ghi là bằng chứng bàn giao, không phải do bạn tự chạy. Không nói đã gửi FCM vì chưa có Firebase project/credential/mã.
5. Freeze candidate: backend/candidates/fcm-b2-r1/ chứa bản sao 2 docs nguồn và các file backend thuộc packet (loại review/report cũ nếu không là nguồn contract); manifest SHA256 path -> hash, overall candidate hash. Không sửa nguồn sau khi freeze. Ghi paths/hashes và acceptance evidence cho parent launch reviewer độc lập. Snapshot không chứa secret hay fixture thật.

Handback <=400 từ: file thay đổi, lệnh/exit/counts, candidate identity, blockers/uncertainty, bước kế tiếp. Kết thúc Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT và Summary 2 câu. Finish notification bật, không polling/sleep.
