# Báo cáo B — Nhập từ ghi chú (Web)

## Trạng thái: DONE_WITH_CONCERNS

### Kết quả

- Thêm parser thuần dùng roster của buổi, phân tầng khớp tên, gợi ý tên chưa khớp, cảnh báo cả lớp/Vắng, phân loại cụm lý do và ghép ghi chú không trùng.
- Thêm hộp nhập cho mobile và desktop. Có xem trước qua `CriteriaMode`, chỉnh tiêu chí theo cụm và chip theo học sinh, tuỳ chọn thêm câu khen/sửa phiếu đã gửi/tạo phiếu mặc định. Huỷ hoặc đóng không ghi dữ liệu.
- Ghi toàn đợt qua `composePlans`/`runDurably` trong một giao dịch IndexedDB. Tái dùng `planAssignDefaultSlips`; sync chia lô tối đa 50 lệnh. Kết quả phân biệt số lưu cục bộ, chờ đồng bộ, đã áp dụng và bị từ chối; lệnh bị từ chối vẫn ở outbox.
- Phiếu thang 3 luôn bị bỏ qua với `legacy_scale` theo scope. Ca vàng main commit `120a3ef` đã đồng bộ quy tắc; test đọc JSON tuyệt đối và so khớp nguyên văn đủ 23 ca.
- Đã sửa bốn điểm trong review-sol-web: lúc Lưu chỉ gửi intent bỏ tiêu chí/nối câu và rebase lên phiếu mới nhất bằng phép AND cùng kiểm trùng; preview khóa chip phiếu sent/queued khi chưa bật `includeSent`, đồng thời dùng chung xác nhận và cảnh báo câu sửa tay; số “em chưa đạt” lấy từ `preview.criteriaByStudent`; kết quả lưu tách bốn trạng thái, không tính pending là đã áp dụng.
- Thêm hồi quy cho rebase khi phiếu và note nền đổi trước lúc Lưu, bỏ câu đã có ở note mới nhất, pending do lỗi mạng, rejected, chip sent/queued, cảnh báo câu sửa tay và số chưa đạt trong preview.

### File thuộc phần B

- `src/features/comments/notesParser.ts`, `notesParser.test.ts`
- `src/features/comments/NotesImportDialog.tsx`, `notesImport.module.css`, `NotesImportDialog.test.tsx`
- `src/features/comments/CriteriaMode.tsx`, `CriteriaMode.module.css`, `CriteriaMode.test.tsx`, `criteriaModel.ts`
- `src/features/comments/CommentsPanel.tsx`, `CommentsDesktop.tsx`
- `src/data/repositories/comments.ts`, `src/data/repositories/notesImportBatch.test.ts`, `src/data/outbox.ts`

### Kiểm chứng

- Test liên quan: 3 file, 14 test đạt; gồm regression race/pending/rejected/UI, 20 phiếu = 1 request và 120 phiếu = 3 request.
- `npx tsc --noEmit`: đạt.
- Build: đạt; còn cảnh báo Vite import tĩnh/động ở `src/data/auth/index.ts`.
- `npx vitest run`: 102 file đạt, 2 file bỏ qua; 802 test đạt, 4 test bỏ qua (suite chạy toàn bộ một lần).
- `git diff --check`: đạt. Không chạy staging, không commit. Chưa thử trên trình duyệt/thiết bị thật.
