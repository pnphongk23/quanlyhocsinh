# Web B: Nhập từ ghi chú

Đọc `briefs-web/common.md` trước, rồi scope-1.2.md mục "B. Nhận xét chung → phiếu từng em" (12 điểm) và `briefs-web/report-A.md` (mục A đã xong, commit ab79a88: `CriteriaMode` có prop `preview` chưa dùng).

Bộ ca vàng (nguồn chuẩn của thuật toán): `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261028-ai-features/golden-notes-cases.json` (23 ca; khoá `rules` và `dictionary` mô tả thuật toán). Test phân tích PHẢI đọc thẳng file JSON này bằng đường dẫn tuyệt đối (không chép, không sửa). Ca nào mâu thuẫn scope-1.2.md: dừng ở ca đó, ghi vào báo cáo, không sửa file ca.

Sở hữu file (mới): `src/features/comments/notesParser.ts` (+ test đọc JSON vàng), `NotesImportDialog.tsx`, `notesImport.module.css`, test UI/repo; thêm hàm vào `src/data/repositories/comments.ts` (chỉ thêm); sửa `CriteriaMode.tsx`/`.module.css` (áp `preview`: chip chọn sẵn + banner "Gợi ý từ ghi chú, kiểm tra rồi Lưu", số "N phiếu sẽ đổi, M phiếu mới", nút Lưu/Huỷ) và thêm nút "Nhập từ ghi chú" vào `CommentsPanel.tsx`/`CommentsDesktop.tsx` (chỉ thêm điểm vào). KHÔNG sửa `src/features/staff`, `src/data/api/types.ts`, `access.ts`, hay logic nút Gửi (worker D đang sửa song song: không đụng `TicketEditor` phần gửi, `sendSessionTicketsDurable` hay nút "Gửi phiếu cả lớp").

Yêu cầu chính:
1. Parser thuần (không UI): `cụm lý do: tên, tên`, tách tên theo `, ; và /`; khớp tên theo tầng trong `rules` của JSON; ứng viên chỉ gồm `studentsOnSession`; trùng tên không tự chọn; không khớp/viết tắt báo và gợi ý; cụm không ánh xạ tiêu chí vào phần gõ thêm với cờ "Cần xem"; từ khoá cả lớp/tất cả/còn lại chỉ cảnh báo; em Vắng có cảnh báo nhỏ.
2. Xem trước = `CriteriaMode` với `preview`; chip và tiêu chí từng cụm đổi được; KHÔNG ghi gì tới khi bấm Lưu.
3. Ô tick sẵn "Tạo phiếu mặc định cho các em còn lại" (bỏ qua Vắng; em chưa điểm danh vẫn tạo) tái dùng `planAssignDefaultSlips`; nối phần gõ thêm không trùng (so sau chuẩn hoá), chạy lại chỉ bỏ tích thêm, không tự tích lại; bỏ qua phiếu đã gửi/chờ gửi/thang 3 (hiện "N phiếu bỏ qua", đã gửi/chờ gửi cho bật lại, thang cũ không).
4. Lưu: gom mọi thay đổi thành các lệnh `slip.set`, ghi cục bộ một lần qua `composePlans`/`runDurably`, đẩy sync trong MỘT request, chia lô ≤50 lệnh ở client. Lệnh bị từ chối giữ lại và hiện lỗi theo cơ chế sẵn có; màn kết quả "đã lưu N, M phiếu lỗi", không in tên/nội dung vào log. Test đếm số request mạng (lớp 20 em = 1 request; 120 lệnh = 3 lô; không có request theo từng em).
5. Quyền: nút chỉ hiện khi Nhận xét và báo cáo = Sửa và lớp được gán (dùng đúng cách `CriteriaMode`/A đang ẩn điểm vào).
6. Test: parser trên 23 ca vàng, UI (xem trước không ghi khi chưa Lưu, Lưu ghi đúng, ẩn khi thiếu quyền), đếm request.
Báo cáo chi tiết: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261028-ai-features/briefs-web/report-B.md`.
