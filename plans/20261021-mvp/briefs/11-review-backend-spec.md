# Việc review: spec backend MVP (vòng 1)

Bạn là reviewer độc lập (chỉ đọc; chỉ ghi file báo cáo). Thư mục: `/Users/phamnhuphong/Git/quanlyhocsinh`. Dùng `srcwalk` thay `rg/grep/cat` để tìm; các file backend dài (~40 KB mỗi file), đọc theo mục.

## Đọc

1. `AGENTS.md`, `docs/spec.md`, `docs/architecture.md` (bản đã đồng bộ MVP ngày 2026-10-21; spec là nguồn chuẩn).
2. `plans/20261021-mvp/lead-brief.md` mục 1, 2.B (quyết định đã chốt và ràng buộc).
3. Cần review: `plans/20261021-mvp/backend/` gồm `data-model.md`, `api-spec.md`, `authz-matrix.md`, `stack-and-cpu.md`, `offline-plan.md`, và `report-b1.md` (tác giả tóm tắt).

## Kiểm (theo thứ tự ưu tiên)

1. **Phân quyền và rò rỉ dữ liệu** (rủi ro số 1, không có RLS): phụ huynh chỉ thấy con của mình; chỉ thấy phiếu/nhận xét/kết quả BTVN đã gửi, báo cáo đã phát hành, đề BTVN ngay khi lưu (spec mục 4); không thấy bài kiểm tra `archived`; mọi truy vấn có `workspace_id`; khóa ngoại cùng workspace; role phụ huynh luôn `read`; Admin duy nhất làm được thao tác quản trị; luôn còn một Admin. So `authz-matrix.md` với `api-spec.md` từng endpoint: có endpoint nào cho phép nhiều hơn ma trận, hay thiếu kiểm quyền.
2. **Xác thực**: SĐT + mật khẩu, không OTP/SMS/mời. Cấp mật khẩu tạm (đề xuất, chờ xác nhận), buộc đổi lần đầu, giới hạn thử, phiên là token ngẫu nhiên lưu băm. Đánh giá Q1, Q2, Q3 trong `api-spec.md` mục 10: mặc định tạm của tác giả có chấp nhận được không, có lỗ hổng chiếm tài khoản nào khác không (ví dụ cấp mật khẩu cho SĐT đã là giáo viên). Không ghi mật khẩu, SĐT, nhận xét vào log.
3. **Đồng bộ idempotent**: lệnh có UUID, `base_version`, bảng lệnh đã áp dụng, xung đột giữ hai giá trị, kéo thay đổi (cursor), xử lý lệnh bị từ chối do quyền; mọi lệnh gộp trong `batch` atomic; chỉ xoá lệnh khi máy chủ xác nhận. Có kịch bản hỏng: gửi lại cùng UUID, hai thiết bị cùng sửa một ô, mất mạng giữa chừng.
4. **Đúng nghiệp vụ spec**: điểm danh 4 trạng thái; buổi hủy không có số buổi (số buổi chỉ đếm buổi không hủy; xem `docs/spec.md` mục 4 và commit `3d4645a`); BTVN 0..4 phần mỗi loại một, 3 mức, buổi chấm là buổi kế tiếp chưa hủy (suy ra khi đọc), xoá phần bị chặn khi đã chấm; bài kiểm tra `max` 1..1000 mặc định 15, không hạ `max` dưới điểm cao nhất, xoá hẳn nếu chưa có điểm và `archived` nếu đã có; phiếu sao 1..3, bắt buộc chọn sao mới gửi, sửa sau gửi giữ trạng thái đã gửi; học sinh nghỉ giữ lịch sử, ngày vào/rời lớp; báo cáo tháng (không 3 tháng), nháp/phát hành/phát hành lại, bản chụp; KHÔNG điểm trung bình ở bất kỳ endpoint hay cột nào; không "vắng thi".
5. **Phạm vi**: chỉ "Bản đầu" ở spec mục 8. Không có bài giảng (trừ nhóm quyền `lectures` giữ trong ma trận theo lược đồ), học phí, lương, mời, OTP, nhân sự. Báo mọi bảng/endpoint thừa.
6. **Dữ liệu và hiệu năng**: DDL có khóa chính/ngoại hợp lý, chỉ mục cho các truy vấn chính (danh sách lớp, buổi theo ngày, điểm danh theo buổi, bảng điểm, danh sách theo phụ huynh), không quét bảng; trigger lịch sử mô tả đủ (điểm danh, điểm) và đã nói rõ chưa viết SQL; cron sinh buổi. Số liệu đo CPU trong `stack-and-cpu.md`: phương pháp đo có tin được không, kết luận 100.000 vòng ~29 ms vs ngân sách 10 ms và đề xuất (Q8) có hợp lý; kế hoạch dự phòng. Tác giả có thừa nhận rõ phần chưa kiểm chứng không.
7. **Nhất quán** giữa 5 file và với docs: tên bảng/cột/endpoint khớp nhau; ví dụ request/response khớp schema; lỗi và phân trang thống nhất; ví dụ không dùng SĐT/mật khẩu thật.
8. `offline-plan.md`: thứ tự triển khai hợp lý cho web (Dexie) và iOS (SwiftData/SQLite), dùng chung hợp đồng đồng bộ; ngắn gọn.
9. Các điểm cần sửa ở `docs/architecture.md` khi đồng bộ (tác giả ghi ở Q9 và chỗ khác): liệt kê đủ chưa.

## Không phải việc của bạn

Không sửa file nào ngoài báo cáo. Không đòi viết mã. Không bác quyết định đã chốt ở lead-brief mục 1 (nếu thấy rủi ro, nêu như "Rủi ro cần người dùng quyết", không coi là lỗi).

## Ra

`plans/20261021-mvp/backend/review-r1.md`: mỗi finding: ID (B-01...), Mức (BLOCKER = rò dữ liệu/vi phạm spec/không thể implement; MAJOR; MINOR; NIT), File:mục, Mô tả, Căn cứ (trích spec hoặc dòng tài liệu), Đề xuất sửa. Mục "Đã kiểm, đạt". Mục "Rủi ro cần người dùng quyết" (ngoài finding). Kết luận `APPROVED` hoặc `CHANGES_REQUESTED`. Không bịa lỗi: chỉ báo điều thấy trong tài liệu; chỗ spec chưa rõ ghi "Spec chưa rõ".

Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
