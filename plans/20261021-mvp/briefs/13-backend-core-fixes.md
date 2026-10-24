# Việc B3: chốt spec backend D1 (sửa các finding còn mở, một lượt, không mở vòng review nhỏ)

Người giao: General Lead. Chỉ dẫn của controller/người dùng: tiết kiệm token, KHÔNG mở thêm vòng review cho sub-contract nhỏ. Việc này sửa gọn các finding còn mở rồi tự kiểm bằng script; sau đó chỉ có MỘT review tổng thể (tối đa 2 vòng) do General Lead giao. Backend giữ Cloudflare Worker + D1; Firebase chỉ cho FCM.

## Ghi được

Chỉ `plans/20261021-mvp/backend/` (kể cả `check-fcm-ddl.py`, có thể đổi tên thành script kiểm chung nếu tiện, nhưng giữ chạy được bằng một lệnh). KHÔNG sửa `docs/`, KHÔNG git checkout/reset/stash/commit/push. Dùng `srcwalk` thay `rg/grep/cat`. Candidate cũ `backend/candidates/*` và `backend/reviews/*` giữ nguyên (hồ sơ, không sửa).

## Đọc

`AGENTS.md`, `docs/spec.md`, `docs/architecture.md`, `plans/20261021-mvp/lead-brief.md` mục 1, 2.B; `backend/review-r1.md` (B-01..B-05), `backend/reviews/fcm-b2-final-handoff.md` và `backend/reviews/fcm-b2-r3-correctness.md` (C3-01), `backend/fcm-b2-fix-r1.md` mục RQ-03; `data-model.md`, `api-spec.md`, `authz-matrix.md`, `stack-and-cpu.md`.

## Sửa (cách sửa đã chốt, không cần hỏi lại)

1. **C3-01** (fanout thiếu quyền nhóm và liên kết con): giữ nguyên thiết kế "phân trang trước, lọc sau"; thêm vào projection của trang fanout các cột/điều kiện quyền nhóm (comments_reports hoặc scores/sessions_attendance theo loại sự kiện, mức ≥ read) và liên kết `guardian_student` còn hiệu lực, dùng làm tiêu chí đủ điều kiện sau khi trang đã lấy (không đẩy vào WHERE trước LIMIT). Thêm ca kiểm "quyền/liên kết bị thu hồi trước fanout thì không tạo delivery". Sender vẫn kiểm lại trước khi gửi.
2. **B-01**: cấp mật khẩu tạm cho một SĐT chỉ được khi tài khoản đích (a) không có membership nhân sự nào ở bất kỳ workspace nào, và (b) mọi membership của nó là role `linked_students` trong CHÍNH workspace của giáo viên gọi. Ngược lại trả `409 account_not_resettable` (không lộ thông tin gì thêm). Cập nhật `api-spec.md` mục 4 và Q2 (tạm chốt theo cách này vì không đổi nghiệp vụ; câu hỏi chủ sở hữu SĐT vẫn ghi mở), `authz-matrix.md`.
3. **B-02**: ranh giới atomic của đồng bộ = MỖI LỆNH một `batch` D1 (ghi dữ liệu + `applied_commands` + `change_log` + lịch sử); lô HTTP gồm nhiều lệnh KHÔNG atomic toàn bộ; lệnh bị từ chối (quyền, xung đột, trùng UUID) không chặn lệnh khác; lệnh áp dụng thành công không bị hoàn lại khi lệnh sau thất bại. Sửa mô tả ở `api-spec.md` mục 6, `offline-plan.md`, và nêu rõ hệ quả (client xoá từng lệnh khi nhận xác nhận của riêng nó).
4. **B-03**: thêm `change_log.created_at` (INTEGER giây Unix, NOT NULL) và chỉ mục theo `created_at` dùng cho dọn dẹp cron (xoá dòng cũ hơn 120 ngày theo lô nhỏ để không vượt CPU); client có cursor cũ hơn cửa sổ giữ lại nhận `snapshot_required` (đã có `epoch/snapshot`, nối đúng vào đó).
5. **B-04**: ràng buộc cùng lớp (không chỉ cùng workspace) cho các quan hệ liên bảng: điểm danh (buổi và học sinh cùng lớp), điểm (bài kiểm tra và học sinh cùng lớp), chấm BTVN (phần và học sinh cùng lớp), phiếu buổi (buổi và học sinh cùng lớp). Thể hiện bằng cột `class_id` + khoá ngoại phức hợp tới khoá duy nhất `(class_id, id)` của bảng cha, hoặc trigger kiểm nếu khoá phức hợp không dùng được; chọn cách gọn nhất và nêu lý do. Thêm ca kiểm trong script: chèn chéo lớp bị chặn, chèn đúng lớp qua. Học sinh đã rời lớp vẫn giữ lịch sử (không phá ràng buộc này).
6. **B-05**: `GET /calendar` nêu rõ phạm vi cho phụ huynh (chỉ lớp của các con được liên kết; không lộ buổi/lớp khác) hoặc nêu rõ phụ huynh không dùng endpoint này (nếu có endpoint riêng); `authz-matrix.md` và `api-spec.md` phải khớp nhau.
7. **RQ-03**: `GET /notifications` trả `report_id` cho `report_published` và `test_id` cho `score_updated` (DDL đã có cột); cập nhật ví dụ.
8. **Rà đủ cốt lõi** (không viết lại từ đầu): xác nhận `data-model.md` và `api-spec.md` có đủ bảng, endpoint, ví dụ, phân quyền cho lớp, học sinh, buổi học (sinh theo lịch lặp, hủy, buổi lẻ), điểm danh 4 trạng thái, BTVN theo phần và chấm 3 mức, bài kiểm tra và điểm (`max` mỗi bài, `archived`, KHÔNG trung bình), nhận xét/phiếu buổi học (sao 1..3, ghi chú, gửi), báo cáo tháng (nháp, phát hành, bản chụp PDF), auth SĐT + mật khẩu (đăng ký workspace, đăng nhập, đổi mật khẩu, cấp mật khẩu, phiên), phân quyền. Mục nào thiếu hoặc mơ hồ thì bổ sung; mục nào thừa phạm vi MVP (bài giảng, học phí, lương, mời, OTP, nhân sự) thì loại hoặc ghi rõ "không làm". Liệt kê kết quả rà thành bảng ngắn (nhóm tính năng, bảng, endpoint) trong `report-b1.md` mục "Cập nhật B3".
9. Cập nhật `report-b1.md`: mục "Cập nhật B3" và danh sách "Điểm cần sửa ở `docs/architecture.md` khi đồng bộ" (đầy đủ, để sau review một người khác đồng bộ).

## Tự kiểm (bắt buộc, dán lệnh và kết quả vào báo cáo)

- Chạy script kiểm DDL/ca mô phỏng bằng SQLite cục bộ: tất cả ca cũ vẫn PASS và các ca mới (C3-01, B-04, B-03 dọn dẹp theo `created_at`, B-01 điều kiện đủ/không đủ nếu mô phỏng được bằng SQL) PASS. Thử ít nhất 2 đột biến (bỏ ràng buộc, bỏ điều kiện) để chắc script bắt được.
- Tìm chéo bằng `srcwalk`: không còn chỗ nào mâu thuẫn giữa `data-model.md`, `api-spec.md`, `authz-matrix.md`, `offline-plan.md` về các điểm 1 đến 7; không còn nhắc VAPID tự gửi, APNs trực tiếp, mời, OTP, trung bình điểm, vắng thi.
- Không bịa số đo; điều chưa đo ghi "chưa đo". Không SĐT, mật khẩu, khoá thật.

## Không làm

Không mở vòng review, không tạo candidate/snapshot mới, không sinh brief con. Không đụng quyết định đã chốt ở `lead-brief.md` mục 1. Chỗ spec không rõ: ghi "Câu hỏi mở" trong `api-spec.md`, không tự đoán nghiệp vụ.

Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
