# Review web A/B/C/D

Status: CHANGES REQUESTED

Phạm vi: nhánh mvp-web, diff `ab79a88^..b366b77`; chỉ đọc mã, không sửa worktree, không commit. Báo cáo này là file duy nhất được ghi. Đối chiếu scope-1.2, spec, architecture, hợp đồng quyền d87e941, quy tắc UI và token chuẩn.

## Phát hiện (theo mức nghiêm trọng)

### P1 — B ghi đè phần gõ thêm và tự tích lại tiêu chí khi dữ liệu nền đổi sau xem trước
- `src/features/comments/NotesImportDialog.tsx:53-66,98-111,120-125`; `src/data/repositories/comments.ts:59`.
- Kịch bản: mở xem trước khi phiếu có criteria=31, note cũ; trong lúc hộp thoại mở, sync/chấm BTVN hoặc thao tác khác cập nhật phiếu thành criteria=15 và thêm note mới. Draft vẫn giữ criteria=30, note cũ. Bấm Lưu tạo plan từ phiếu hiện tại nhưng gửi criteria/note của snapshot cũ, nên có thể tích lại BTVN và mất phần note vừa thêm. Đây không chỉ là conflict server: plan lấy base_version hiện tại nên thay đổi cũ được gửi với version mới.
- Sửa: lưu intent (tiêu chí cần bỏ, dòng cần nối), rebase vào phiếu mới nhất lúc lưu; dùng phép AND để chỉ bỏ tích và nối sau kiểm trùng. Nếu snapshot đổi cần kiểm tra lại xem trước; không gửi cả note/criteria cũ như bản thay thế.
- Bằng chứng: đọc đường dữ liệu từ makeDrafts qua dirtyDrafts tới planComment; chưa chạy ca tương tác race.

### P2 — B cho sửa phiếu đã gửi/chờ gửi dù chưa bật cho phép
- `src/features/comments/CriteriaMode.tsx:112`; `src/features/comments/NotesImportDialog.tsx:98-105,185`.
- Kịch bản: giữ “Cho phép sửa phiếu đã gửi hoặc đang chờ gửi” tắt, xem trước một ghi chú. Parser bỏ qua phiếu đã gửi nhưng lưới vẫn cho chạm chip của em đó. onToggle đi thẳng vào toggleCriterion, chỉ chặn scale=3, tạo draft và lưu được. Đường preview còn bỏ qua xác nhận/cảnh báo câu sửa tay ở CriteriaMode.toggle.
- Sửa: kiểm tra includeSent trong handler preview, không cho tạo draft của phiếu bị bỏ qua; yêu cầu bật lại rõ ràng. Dùng chung cơ chế xác nhận/cảnh báo khi áp dụng với phiếu đã gửi và câu sửa tay.
- Bằng chứng: nhánh click preview không đi qua toggle() có window.confirm; toggleCriterion không kiểm tra trạng thái gửi.

### P2 — B báo thành công cả những lệnh vẫn pending do mất mạng/lỗi mạng
- `src/data/repositories/comments.ts:65-68`; `src/data/sync.ts:182-186,234-257`; `src/features/comments/NotesImportDialog.tsx:128-130,153`.
- Kịch bản: lưu offline hoặc mạng lỗi khi push. syncNow trả về bình thường (offline trả ngay, lỗi được syncRound bắt), lệnh vẫn pending. Hàm chỉ đếm rejected nên trả “đã lưu N, 0 phiếu lỗi”, xoá input và bỏ preview. Với mạng lỗi, không thể phân biệt số đã đồng bộ với số chưa gửi trong kết quả đợt nhập; lỗi phát sinh sau đó không cập nhật saved.
- Sửa: trả riêng số lưu cục bộ/chờ đồng bộ/đã áp dụng/bị từ chối; cập nhật kết quả theo trạng thái command. Không trình bày số pending như kết quả máy chủ đã chốt.
- Bằng chứng: offline guard và catch trong sync, đối chiếu công thức batchEntries.length - rejected. Dữ liệu pending vẫn còn, không khẳng định bị mất.

### P2 — Số em chưa đạt trong preview không theo các chip đang chọn
- `src/features/comments/CriteriaMode.tsx:92,99`.
- Kịch bản: tất cả phiếu nền đạt Chú ý, dán “Mất tập trung: <một tên khớp>”. Chip preview của em chuyển chưa đạt nhưng tiêu đề vẫn “0 em chưa đạt”; tiếp tục chạm chip vẫn không đổi số.
- Sửa: tính số từ preview.criteriaByStudent khi có preview, dùng cùng nguồn criteria với phần render chip.
- Bằng chứng: tiêu đề luôn gọi criteriaUnmetCount(rows, ...), còn chip đọc preview trước.

## Đã kiểm và thấy ổn

- `npx tsc --noEmit`: đạt, exit 0.
- 8 file test mục tiêu, 49 test đạt: CriteriaMode, NotesImportDialog, notesParser, importModel, ImportStudentsDialog, notesImportBatch, CommentsPanel.permissions, staffModel. Không chạy toàn bộ 798 test.
- Parser notes và import test đọc thẳng hai JSON ca vàng được yêu cầu; toàn bộ ca trong hai test đó đạt. Test hiện dùng đường dẫn tuyệt đối tới checkout chính, nên chưa có bằng chứng chạy được trên CI/máy khác.
- Test lô xác nhận 20 phiếu một request, 120 phiếu thành 50/50/20; rejected giữ trong outbox và trả số lỗi. persistSlipCommands dùng một transaction IndexedDB cho slips/outbox/meta.
- C giữ UUID của từng row qua lần thử lại, gọi REST tuần tự, chặn offline trước và giữa lô; đánh giá/chuẩn hoá SĐT lại trước gửi. Ca trùng tên/SĐT, anh em cùng SĐT và dữ liệu lỗi đạt test.
- Quyền send_comments có fallback khi thiếu khoá, chỉ none/write trên ma trận; changedPermissions chỉ gửi nhóm hợp lệ thay đổi, không gửi lectures. Điểm gửi cả lớp mobile/desktop có canSend; repository kiểm cả comments_reports, send_comments và phạm vi buổi.
- A chặn phiếu thang cũ, có xác nhận phiếu đã gửi/chờ gửi và cảnh báo câu sửa tay ở đường thao tác thường. Phần gõ thêm được giữ khi toggle thường.
- CSS mới đã đọc dùng token cho màu, cỡ chữ, khoảng cách chính và selected state; không phát hiện màu hoặc khoảng cách bố cục mới ghi cứng trong các file đã đọc. Chưa kiểm chứng giao diện bằng trình duyệt hay thiết bị thật.
- Không thấy log tên/SĐT/nội dung nhận xét trong các đường nhập và lưu đã đọc. Không chạy env/printenv/ps/lsof, không đọc hay in credential.

## Giới hạn

Các lỗi UI/race được xác định bằng nhánh mã cụ thể, chưa tạo test mới vì yêu cầu review chỉ đọc. Chưa xác minh E2E, backend thực, retry sau lỗi REST chưa rõ kết quả, hoặc ma trận quyền khi đổi vai trò ngay trong lúc hộp thoại mở. Chưa kết luận các phần này hoạt động hoàn chỉnh.
