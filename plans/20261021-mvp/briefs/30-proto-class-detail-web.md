# Việc P1: prototype · Web Chi tiết lớp (desktop) khớp thiết kế

Người giao: General Lead. Bạn là worker. Thư mục làm việc: `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype` (THƯ MỤC CHÍNH, không worktree, vì có thay đổi chưa commit của người dùng cần giữ). KHÔNG `git checkout/reset/stash/commit/push`, KHÔNG xoá hay hoàn tác thay đổi đang có (xem `git status`); chỉ sửa tại chỗ. Dùng `srcwalk` thay `rg/grep/cat`; bắt đầu bằng `srcwalk guide`.

## Đọc

1. `AGENTS.md`, `docs/spec.md` (nguồn chuẩn; spec thắng khi lệch ảnh), `docs/architecture.md` mục 1, 3 (web desktop thuộc Bản đầu).
2. `plans/20261021-mvp/design/decisions.md` (mọi quyết định đã chốt, kể cả mục "Vòng 4").
3. Ảnh thiết kế đã duyệt (nguồn chính, khớp bố cục, chữ, trạng thái): `plans/20261021-mvp/design/round-4/` gồm 01-buoi-hoc, 02-buoi-hoc-menu-dong, 03-diem-danh, 04-nhan-xet, 05-btvn-cham, 06-btvn-giao, 07-btvn-chua-co, 08-bai-kiem-tra, 09-kiem-tra-tao, 10-kiem-tra-sua, 11-kiem-tra-xoa-chua-diem, 12-kiem-tra-xoa-co-diem, 13-diem, 14-hoc-sinh, 15-bao-cao (2x, khung 1360). BỎ QUA `04b-nhan-xet-1-sao.png` (màn sai).
4. Prototype hiện có: `design/prototype/src` (đặc biệt `features/class-space`, `features/scores`, `features/comments`, `features/homework`, `features/reports`, `features/students`, `app/TeacherShell.tsx`, `app/routes.tsx`, `shared/styles/tokens.css`). Hiện bản web desktop chỉ kéo giãn bản mobile; nhiệm vụ là làm layout desktop thật.

## Làm

Tạo layout web desktop (từ breakpoint desktop, ví dụ ≥ 1024 px; chọn breakpoint theo cách prototype đang làm responsive nếu có) cho nhóm màn "Chi tiết lớp", giữ NGUYÊN hành vi và giao diện mobile (mobile không đổi, test mobile cũ vẫn xanh). Dùng lại dữ liệu và repository hiện có (`src/data/repositories`), không viết lại logic nghiệp vụ. Màu chính dùng token `--color-primary` (`#2F5BEA`), không thêm màu cứng mới nếu đã có token.

Khung chung: breadcrumb, tiêu đề lớp, phụ đề (số học sinh, lịch, hôm nay), nút "…" (Sửa lớp, Sửa lịch học, Lưu trữ lớp) và nút chính theo từng tab; hàng tab Buổi học / Bài kiểm tra / Điểm / Học sinh / Báo cáo, tab đang chọn rõ.

Các màn (mỗi màn khớp ảnh tương ứng):
- Buổi học (01, 02): hai cột. Trái "Các buổi đã qua" (cột Buổi, Giờ, Điểm danh, Phiếu, BTVN, menu "…" mỗi dòng với Sửa buổi lẻ / Hủy buổi). Phải rộng ~360 px: thẻ "Buổi hiện tại" (Xem buổi, Hủy buổi), thẻ "Buổi lẻ sắp tới" (chip Buổi lẻ; Xem buổi, Sửa buổi lẻ, Hủy buổi; chỉ hiện khi có buổi lẻ sắp tới), thẻ "Lịch lặp". Số buổi: dùng đúng `sessionNumber`/`sessionPrefix` hiện có (buổi hủy không có số, ghi "Buổi đã hủy"; các buổi sau đánh số liên tục).
- Chi tiết buổi (03 đến 07): 3 tab Điểm danh / Nhận xét / Bài tập về nhà. Điểm danh: bảng 4 nút Có mặt / Muộn / Có phép / Vắng, ô giờ đến khi Muộn, dòng đếm, nút "Tất cả có mặt" và "Lưu điểm danh", thẻ "Người dạy" CHỈ ĐỌC (không có nút đổi người dạy). Nhận xét: danh sách em + khung soạn phiếu cạnh nhau (KHÔNG bottom sheet trên desktop), ba mức sao với câu mẫu cố định đúng nguyên văn `docs/spec.md` mục 4 (kể cả 🌟, ba mức đều hiện đúng khi chọn), ghi chú tùy chọn, khối "Kết quả BTVN buổi trước · chỉ đọc", bộ lọc Tất cả / Chưa chọn sao / Chưa gửi, nút "Gửi phiếu cả lớp (n)". BTVN: "Bài tập buổi trước" (chấm: chọn phần ở trái, danh sách cả lớp ở phải, 3 mức, "Chưa chấm", đánh dấu cả lớp) và "Bài tập hôm nay" (giao: tối đa 4 phần mỗi loại một, khung sửa phần bên cạnh danh sách, khoá xoá khi đã chấm); biến thể buổi chưa có BTVN.
- Bài kiểm tra (08 đến 12): bảng (tên, ngày, điểm tối đa, số em đã có điểm), tạo/sửa bằng hộp thoại (điểm tối đa 1..1000, mặc định 15), xoá: hộp xác nhận nói rõ "xoá hẳn" (chưa có điểm) hoặc "lưu trữ" (đã có điểm).
- Điểm (13): bảng học sinh × bài kiểm tra, tiêu đề cột ghi "/điểm tối đa" từng bài, ô nhập trực tiếp, ô trống "Chưa có điểm", ghim cột học sinh khi cuộn ngang, nút "Lưu điểm". KHÔNG điểm trung bình ở bất kỳ đâu.
- Học sinh (14): bảng có cột Học sinh (tên, người nhận + SĐT phụ huynh), Lớp đang học, Chuyên cần, "Tài khoản phụ huynh" với ba trạng thái "Chưa cấp mật khẩu" (nút nhỏ "Cấp mật khẩu"), "Đã cấp · chờ đổi" (nút nhỏ "Cấp lại"), "Đang dùng"; menu "…" mỗi dòng: Sửa số điện thoại, Cấp lại mật khẩu, Đánh dấu nghỉ; thống kê trên bảng "n đang học / n đang dùng / n chờ đổi mật khẩu / n chưa cấp mật khẩu"; chú thích dưới bảng đúng chữ ở ảnh. Cấp mật khẩu: luồng này là ĐỀ XUẤT chờ người dùng xác nhận; làm đơn giản bằng dữ liệu giả cục bộ: bấm "Cấp mật khẩu" mở hộp thoại hiện một mật khẩu tạm GIẢ (ngẫu nhiên, đánh dấu rõ là prototype, hiện một lần, có nút sao chép) rồi chuyển trạng thái sang "Đã cấp · chờ đổi". Không có màn "mời", không "Thêm từ lớp khác". Nút chính "+ Thêm học sinh" dùng form hiện có.
- Báo cáo (15): chọn tháng một lựa chọn "‹ Tháng 10/2026 ›" (không có "3 tháng gần nhất"), danh sách học sinh với trạng thái (Đã phát hành, Nháp, Thiếu dữ liệu, Cần phát hành lại), thẻ chi tiết (Chuyên cần, "Kiểm tra gần nhất" lấy từ dữ liệu thật: tên bài + điểm/điểm tối đa, nhận xét chung với gợi ý theo số buổi 3/2/1 sao, nút "Dùng gợi ý làm bản nháp", "Xem trước PDF", "Phát hành n báo cáo"). Dùng dữ liệu và logic báo cáo hiện có; không điểm trung bình.

Khớp chữ và bố cục với ảnh; số liệu mẫu không cần giống từng con số nếu seed hiện có khác, nhưng không được mâu thuẫn nội bộ giữa các màn. Nếu seed dễ chỉnh để giống ảnh (lớp 6A, 10 học sinh, Buổi 9/10/11) thì chỉnh.

## Ràng buộc

- Chỉ file dưới `design/prototype/` (kể cả test mới). Có thể thêm file mới theo cấu trúc hiện có (`features/…`, CSS Modules). Không động `docs/`, `plans/` (trừ báo cáo và ảnh chụp của bạn, xem dưới).
- Không làm bài giảng, học phí, lương, nhân sự, mời (cờ `features` hiện có phải giữ tắt chúng); không điểm trung bình, không "Vắng thi".
- Không in/ghi SĐT thật, mật khẩu thật; mật khẩu tạm trong prototype là chuỗi giả.
- Phạm vi test: thêm test cho các hành vi mới (ví dụ: thẻ Buổi lẻ sắp tới hiện/ẩn, hộp thoại xoá nói đúng "xoá hẳn/lưu trữ", ba câu mẫu sao, cột tài khoản phụ huynh, báo cáo chỉ chọn tháng). Test cũ không được hỏng; không làm yếu test để qua.

## Xác minh (bắt buộc, dán lệnh và kết quả)

1. `cd design/prototype && npm test` và `npm run build` đều xanh; ghi số test và kết quả.
2. Chạy dev server (hoặc preview) và chụp từng màn desktop (viewport 1360×934) vào `plans/20261021-mvp/design/prototype-shots/p1/` đặt tên như ảnh thiết kế (01-buoi-hoc.png …); tự so từng ảnh với ảnh thiết kế, lập bảng khác biệt còn lại (màn, khác gì, lý do). Chụp được thì xác nhận cả mobile (390 px) không đổi so với trước.
3. Không tìm thấy từ "trung bình", "Vắng thi", "Mời", "OTP" trong giao diện các màn trên (tìm bằng srcwalk trong `src/features` phần liên quan và nói rõ kết quả).

Ghi báo cáo ngắn (đã làm, bảng khác biệt, kết quả test/build, vấn đề) vào `plans/20261021-mvp/design/prototype-shots/p1/report.md`. Không mở vòng review, không tạo agent khác. Không hoàn thành nếu chưa chạy test và build. Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
