# Báo cáo I-1 — Core + design system

Status: NEEDS_CONTEXT

## Đã làm

- Đọc brief, kiểm tra nhánh `mvp-ios`, khảo sát Core hiện có bằng `srcwalk guide`, `overview`, `show`.
- Đối chiếu spec nguồn trong thư mục chính (chỉ đọc) với API mục 6 và data-model.
- Chưa sửa mã Core, chưa tạo milestone 1; dừng theo AGENTS.md dòng 13 vì mâu thuẫn quy tắc đánh số buổi.
- File `ios/docs/report-c1.md` đã có sẵn ở trạng thái untracked, không thuộc thay đổi này.

## Lệnh và kết quả

- `git branch --show-current`: `mvp-ios`.
- `srcwalk show /Users/phamnhuphong/Git/quanlyhocsinh/docs/spec.md --section 25-45 --budget 2500`: dòng 37 quy định “Số buổi chỉ đếm buổi đã diễn ra”.
- `srcwalk show /Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/data-model.md --section 266-452 --budget 7000` và lần đọc đầy đủ data-model: mục 2.2 dòng 223 quy định đếm cả `planned` lẫn `held`, bỏ buổi hủy.
- `srcwalk show /Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/api-spec.md --section 446-503 --budget 4000`: Q16 xác nhận mâu thuẫn này còn mở, cần người dùng quyết định.
- Chưa chạy `xcodegen generate` / build / test vì chưa triển khai. Tôi không thể xác minh điều này hoạt động vì công việc đang dừng chờ chốt quy tắc, chưa có mã mới để kiểm chứng.

## Câu hỏi

Chốt `sessionNumber` theo cách nào: (A) chỉ buổi đã diễn ra (`held`) theo spec, hay (B) cả buổi sắp tới (`planned`) và đã diễn ra theo API/data-model? Cả hai cách đều không đánh số buổi hủy. Không tự chọn hay sửa spec trước khi có trả lời.
