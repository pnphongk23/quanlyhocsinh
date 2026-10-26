# Việc review: spec backend D1 + FCM, tổng thể (vòng 1 trong tối đa 2)

Bạn là reviewer độc lập (chỉ đọc; chỉ ghi file báo cáo). Repo: `/Users/phamnhuphong/Git/quanlyhocsinh`. Dùng `srcwalk` thay `rg/grep/cat`; tài liệu dài, đọc theo mục.

## Bối cảnh (quan trọng)

Đây là review tổng thể DUY NHẤT cho toàn bộ spec backend (người dùng yêu cầu tiết kiệm: không mở thêm vòng review nhỏ). Backend giữ Cloudflare Worker + D1; Firebase chỉ cho FCM. Spec đã qua nhiều vòng review riêng cho hợp đồng FCM (hồ sơ ở `plans/20261021-mvp/backend/reviews/`, `fcm-b2-fix-r1.md`, `fcm-b2-fix-r2.md`, `reviews/fcm-b2-final-handoff.md`) và một lượt sửa gần nhất (B3, ghi ở `report-b1.md` mục "Cập nhật B3") đã xử lý: C3-01, B-01 đến B-05 (từ `review-r1.md`), RQ-03. Việc của bạn:

1. Kiểm các sửa B3 có đúng và nhất quán không (không phải bàn lại thiết kế FCM đã qua 3 vòng, chỉ báo nếu thấy lỗi làm rò dữ liệu, sai nghiệp vụ hoặc không thể implement).
2. Rà TỔNG THỂ phần lõi còn lại chưa từng được review đủ: lớp, học sinh, buổi học (sinh theo lịch lặp, hủy, buổi lẻ), điểm danh, BTVN, bài kiểm tra và điểm, phiếu buổi học/nhận xét, báo cáo tháng, auth SĐT + mật khẩu, phân quyền, đồng bộ idempotent.

## Đọc

`AGENTS.md`, `docs/spec.md` (nguồn chuẩn, bản mới nhất), `docs/architecture.md`, `plans/20261021-mvp/lead-brief.md` mục 1 và 2.B, và trong `plans/20261021-mvp/backend/`: `data-model.md`, `api-spec.md`, `authz-matrix.md`, `stack-and-cpu.md`, `offline-plan.md`, `report-b1.md`, `firebase-setup-checklist.md`, `check-fcm-ddl.py` (script kiểm, chạy được: `python3 -I plans/20261021-mvp/backend/check-fcm-ddl.py`, bạn có thể chạy lại).

## Tiêu chí kiểm (như `briefs/11-review-backend-spec.md`; đọc file đó để lấy danh sách chi tiết 9 mục)

Ưu tiên: (1) phân quyền và rò dữ liệu; (2) xác thực; (3) đồng bộ idempotent; (4) đúng nghiệp vụ spec (đặc biệt: buổi hủy không có số buổi; BTVN 0..4 phần, 3 mức; bài kiểm tra `max` 1..1000 mặc định 15, `archived`; phiếu sao 1..3; KHÔNG điểm trung bình, KHÔNG vắng thi; báo cáo theo tháng); (5) phạm vi MVP (không bài giảng, học phí, lương, mời, OTP, nhân sự); (6) dữ liệu/hiệu năng (chỉ mục, CPU 10 ms, subrequest); (7) nhất quán giữa các tài liệu và với docs; (8) offline-plan; (9) danh sách điểm cần đồng bộ vào `docs/architecture.md` có đủ không.

## Quy tắc báo cáo

- Chỉ nâng thành BLOCKER/MAJOR khi thật sự: rò dữ liệu/vi phạm quyền, vi phạm quyết định đã chốt hoặc spec, mâu thuẫn làm không thể implement, mất dữ liệu khi đồng bộ. Còn lại là MINOR/NIT, gộp tối đa 10 mục.
- Không bác quyết định đã chốt ở `lead-brief.md` mục 1; rủi ro cần người dùng quyết ghi ở mục riêng "Rủi ro cần người dùng quyết" (Q1, Q2, Q3, Q8 vẫn chờ người dùng, không tính lỗi).
- Không đòi viết mã; không sửa file nào ngoài báo cáo. Không bịa lỗi; chỗ spec chưa rõ ghi "Spec chưa rõ". Chứng minh mỗi BLOCKER/MAJOR bằng trích dẫn tài liệu (file:mục) và kịch bản lỗi cụ thể.

## Ra

`plans/20261021-mvp/backend/review-overall-r1.md`: bảng kiểm các sửa B3 (ĐÚNG/SAI/THIẾU, kèm bằng chứng); finding (ID O-01…, Mức, File:mục, Mô tả, Căn cứ, Kịch bản lỗi, Đề xuất sửa); "Đã kiểm, đạt"; "Rủi ro cần người dùng quyết"; kết luận `APPROVED` (không còn BLOCKER/MAJOR) hoặc `CHANGES_REQUESTED`.

Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
