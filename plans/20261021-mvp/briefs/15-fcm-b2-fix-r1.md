# Packet sửa FCM B2 sau review r1

Parent General Lead 9682fb5f-0e95-45f1-9e40-8dd05a9c931a, workspace wks_5d1bc443eaa9f683. Đọc 15-fcm-b2-r1-decisions.md và hai review trong backend/reviews/ (r1 correctness/risk). Tiếp tục từ brief13 và gói đã freeze; không sửa snapshot fcm-b2-r1.

Write-set: docs/spec.md, docs/architecture.md (chỉ vòng đời token cần mạng và fanout nếu cần); backend/data-model.md, api-spec.md, authz-matrix.md, offline-plan.md, stack-and-cpu.md, firebase-setup-checklist.md, report-b1.md, check-fcm-ddl.py. Báo cáo backend/fcm-b2-fix-r1.md. Snapshot mới backend/candidates/fcm-b2-r2/ + manifest, không tự ghi đè r1. Không sửa status, brief, reviewer reports, iOS/prototype/auth business. Không agent con/commit/push/merge/deploy/secret.

Làm đúng hướng kỹ thuật trong decisions, resolve C-01+R-01/R-02; cập nhật các tầng tài liệu/các ca kiểm lifecycle/fanout/group freeze cho nhất quán. Việc cần online để đổi identity phải là rule cụ thể, không chỉ nói server kiểm quyền chung; role API đổi membership/gỡ token cùng batch, account/logout acknowledge trước UI đổi identity. Push đã in-flight phải có caveat đúng khả năng FCM/OS.

Thực thi test DDL có ý nghĩa cho cột/state/index mới và paging contract SQL ở SQLite; kịch bản >20 thiết bị/1 inbox, nhiều inbox chạm quota, cron nối tiếp không bỏ/trùng PK, job nhóm freeze vs update mới; không gọi đó là test API/FCM concurrent thực. Lifecycle chưa có code thì ghi ca bắt buộc, không dựng giả rồi nói runtime pass. Chạy check-fcm-ddl.py, link check, whitespace, manifest và cmp source-snapshot. Dùng srcwalk guide. Không đo RSA/FCM lại; giữ nhãn chưa kiểm chứng.

Freeze sau mọi sửa: manifest SHA256 9 nguồn như r1, script phải tái chạy trên r2. Handback <=400 từ, Status và Summary 2 câu: mapping findings -> sửa/evidence, files, lệnh/exit/counts, candidate hash, residual. Không tự review thành APPROVED; parent sẽ giao reviewer độc lập.
