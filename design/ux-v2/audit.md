# Kiểm toán UX prototype (2026-10-23)

Ảnh hiện trạng: `design/prototype-shots/ux-v2/before/` (`m-` = 390×844, `d-` = 1440×900; `gv` giáo viên, `ph` phụ huynh). Chụp bằng Playwright, điều hướng trong SPA sau khi chọn vai trò.

## Chung (cả app)
- Không có chuyển động: chuyển trang, đổi tab (thanh tab lớp, segmented Điểm danh/Nhận xét/BTVN), mở/đóng sheet và dialog đều bật tắt tức thì. Cả `src/` chỉ có `@keyframes spin` và 3 `transition`.
- Mở rộng/thu gọn (`aria-expanded` ở ClassSpaceLayout, SessionsTab/SessionsDesktop, TestsDesktop, StudentsDesktop, ReportsPage, ClassDesktopHeader) hiện/ẩn tức thì.
- `prefers-reduced-motion` mới có ở 4 file; chưa có quy ước chung.
- Nút `size="lg"` mặc định `width: 100%` ở mọi khổ màn → trên desktop thành thanh dài (Tạo lớp, Lưu mật khẩu, nút trong panel).

## Desktop giáo viên (1440×900)
| Màn | Vấn đề |
|---|---|
| Tất cả lớp (`d-gv-lop`) | Một thẻ lớp 360px góc trái, còn lại trống; ô tìm + nút căn phải xa tiêu đề. Nên lưới 2–3 cột thẻ, thẻ có thêm lịch học/buổi tới; hàng hành động gần tiêu đề. |
| Tạo lớp (`d-gv-lop_moi`) | Form 520px dính trái, 2/3 màn trống; nút "Tạo lớp" kéo hết chiều rộng form; nút quay lại lệch dòng với tiêu đề. Nên form trong thẻ căn giữa (≤ 640px), nút theo nội dung căn phải cùng "Huỷ". |
| Buổi học chi tiết (`d-gv-…session-8`) | Bảng điểm danh rộng nhưng cột "Giờ đến" trống chiếm ~25%; nhóm 4 nút trạng thái dính sát; hàng chú thích cuối trang mờ, lặp thông tin. Panel "Người dạy" tốt. |
| Bài kiểm tra (`d-gv-…bai-kiem-tra`) | Cột tên chiếm 55% bảng; bảng 4 hàng giữa nửa màn trống — chấp nhận được, chỉ cần giới hạn rộng bảng hoặc panel chi tiết bên phải khi chọn bài. |
| Học sinh (`d-gv-…hoc-sinh`) | Thẻ thống kê "9 đang học" kéo hết chiều ngang với một con số; cột "Lớp đang học" lặp tên lớp mọi hàng. |
| Báo cáo (`d-gv-…bao-cao`) | Bố cục danh sách + panel tốt; nút "Xem trước PDF"/"Phát hành" kéo giãn chia đôi panel; viền chọn hàng đè chữ (padding 0). |
| Cài đặt (`d-gv-cai-dat`) | Hai cột ổn; ô mật khẩu kéo rộng ~500px, nút Lưu căn phải nhưng lệch lề ô. |
| Shell | Sidebar ổn; vùng nội dung không có `max-width` → ở 1920px+ bảng và tiêu đề trải quá rộng. |

## Mobile giáo viên (390×844)
- Nhìn chung đúng mẫu; thiếu chuyển động khi đổi tab buổi học và mở sheet nhận xét.
- Buổi chưa tới: nút "Điểm danh" xám kéo dài cả hàng dù đã có thông báo khoá phía trên — thừa.

## Phụ huynh
| Màn | Vấn đề |
|---|---|
| Thanh tab (mọi màn) | 5 tab (Tổng quan, Điểm danh, Điểm số, Nhận xét, Báo cáo) trong khi phụ huynh chỉ cần 2 việc; người dùng yêu cầu 2 tab. |
| Desktop (`d-ph-*`) | Cột 480px giữa màn, thanh tab dưới cũng 480px nổi giữa màn rộng; không có điều hướng kiểu desktop. |
| Tổng quan (`m-ph-ph`) | Thẻ "Đi học 3/4" một mình nửa hàng; trộn nhiều nhóm (chuyên cần, lời cô, nhận xét, điểm) không có lối vào lớp/buổi. |
| Nhận xét (`m-ph-ph_nhan-xet`) | Danh sách theo buổi, chưa nhóm theo ngày/tháng; ảnh Mít lặp mỗi thẻ làm danh sách dài. |
| Phiếu buổi (`m-ph-…6a-session-7`) | Nội dung tốt (nhận xét, kết quả BTVN, BTVN mới); thiếu điểm danh của con trong buổi; khối "Buổi bù · Đã huỷ" nằm trong BTVN mới gây rối. |
| Cài đặt (`m-ph-cai-dat`) | Chỉ vào được từ đường dẫn; không có lối vào trong khung phụ huynh. |
