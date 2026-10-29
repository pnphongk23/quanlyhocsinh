# Web C: Nhập danh sách học sinh

Phần của bạn: scope-1.2.md mục "C. Nhập danh sách học sinh" (6 điểm) + tiêu chí xong C. Đọc `src/features/students/*`, `src/data/repositories/students.ts` (`createStudent`, REST qua API client; kiểm API tạo học sinh nhận `id` UUID client: `POST /classes/{id}/students` body `{id?, name, parent_phone?, enrolled_at}` ở `src/data/api/client.ts`), nơi chuẩn hoá SĐT +84 hiện có (grep trong `src/data/auth` và `src/shared`, dùng lại, không viết lại), `AddStudentModal.tsx` cho phong cách.

Sở hữu file: `src/features/students/**` (thêm `ImportStudentsDialog.tsx`/sheet, `importModel.ts`, css, test), `src/data/repositories/students.ts` (chỉ thêm hàm). KHÔNG sửa `src/features/comments`, `src/features/staff`.

Yêu cầu:
1. Điểm vào "Nhập danh sách" ở tab Học sinh (mobile: sheet toàn màn; desktop: dialog). CHỈ hiện khi quyền Học sinh = Sửa và lớp được gán (ẩn hẳn, không khoá). Mất mạng: nút Thêm khoá, ghi "Cần có mạng".
2. Ô dán nhiều dòng (kể cả từ Excel/Google Sheets dạng tab) + nút chọn tệp `.csv` (đọc bằng FileReader trên máy). Bộ phân tích thuần (importModel.ts, không I/O): bỏ số thứ tự đầu dòng ("1.", "1)", "01 -") và dòng trống, gộp khoảng trắng, viết hoa chữ đầu mỗi từ (tiếng Việt, giữ dấu), nhận SĐT (+84/84/0, có dấu cách/chấm/gạch) và chuẩn hoá +84 như đăng ký hiện tại; cột dạng SĐT → SĐT phụ huynh, cột còn lại → tên. Tách cột theo tab, `;` hoặc `,` (CSV có ngoặc kép), ưu tiên dấu thấy trong dòng đầu.
3. Xem trước dạng bảng (desktop) / danh sách thẻ (mobile): sửa từng dòng (tên, SĐT), bỏ dòng; đánh dấu nghi ngờ (SĐT sai định dạng, tên có số/ký tự lạ, trùng trong chính danh sách dán). Hiện SĐT đầy đủ.
4. Quy tắc trùng với học sinh đang có trong lớp (so tên chuẩn hoá: bỏ dấu, `đ→d`, không phân biệt hoa thường): cùng tên VÀ cùng SĐT → mặc định bỏ qua "Đã có trong lớp", cho buộc thêm; cùng tên khác/thiếu SĐT → cảnh báo, mặc định vẫn thêm; cùng SĐT khác tên → hợp lệ, không cảnh báo. SĐT sai bị đánh dấu và KHÔNG tạo âm thầm (loại khỏi lô cho đến khi sửa hoặc bỏ dòng).
5. Lớp có ≥20 học sinh (hoặc vượt 20 sau khi thêm): chỉ cảnh báo trước khi tạo, không chặn.
6. "Thêm N học sinh": gọi REST tạo học sinh LẦN LƯỢT, mỗi dòng sinh UUID client (`crypto.randomUUID()`) giữ nguyên qua các lần thử lại (gửi lại không tạo trùng), ngày vào lớp = hôm nay (`todayISO`). Màn tiến độ "đã tạo k/N", lỗi từng dòng (không in tên/SĐT vào log), nút "Thử lại phần còn lại" chỉ gửi dòng chưa tạo. Mất mạng giữa chừng → dừng, giữ trạng thái. Sau khi xong cập nhật store như `createStudent` hiện có.
7. Riêng tư: đoạn dán thô, nội dung tệp, kết quả khớp chỉ ở state của component, xoá khi Lưu/Huỷ/đóng, không lưu bền, không vào log/Sentry/thông báo lỗi.
8. Test: `importModel.test.ts` (20 dòng có số thứ tự và SĐT nhiều dạng, CSV có ngoặc kép, dán từ Excel dạng tab, chuẩn hoá tên, ba ca trùng, SĐT sai bị đánh dấu), test repository/luồng tạo (id client ổn định khi thử lại, không tạo trùng, dừng khi lỗi, đếm đúng số request), test UI (ẩn khi thiếu quyền, nút khoá khi offline, cảnh báo ≥20).
Báo cáo chi tiết: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261028-ai-features/briefs-web/report-C.md`.
