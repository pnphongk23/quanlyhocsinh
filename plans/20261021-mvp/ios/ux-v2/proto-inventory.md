# Prototype ux-v2 · kiểm kê màn hình

Nguồn: `https://quanlyhocsinh-proto.pages.dev` (dữ liệu demo), mã theo `screen-codes.md`. Ảnh `proto-*` là viewport web 390×844; ba ảnh `se-proto-*` là 375×667. Đường đi dưới đây là thao tác trong giao diện prototype. Inventory chỉ ghi nhãn và trạng thái, không chép số liên hệ hay nội dung nhận xét.

## Giáo viên

### `gv-login`
- Đường đi: mở `/dang-nhap`.
- Thấy: prototype bỏ qua đăng nhập và chuyển thẳng tới Chọn vai trò; không có form đăng nhập để chụp riêng.
- Trạng thái: không có ảnh đúng mã; luồng chuyển hướng được xác nhận.

### `gv-classes`
- Đường đi: Chọn vai trò → Giáo viên.
- Cấu trúc/nhãn: tiêu đề “Lớp của tôi”; thẻ hôm nay; buổi kế tiếp; việc còn dở; thẻ lớp; nút tạo lớp; thanh Lớp/Lịch/Cài đặt.
- Trạng thái: ngày hiện tại không có buổi, EmptyState có Mít; mục Lớp đang được chọn.
- Ảnh: [proto-gv-classes.png](shots/proto/proto-gv-classes.png)

### `gv-schedule`
- Đường đi: thanh dưới → Lịch.
- Cấu trúc/nhãn: chọn phạm vi lớp, ngày trước/sau, các nhóm lịch trong ngày.
- Trạng thái: “Tất cả lớp” selected fill; có nhóm “Không có buổi học”, “Chưa điểm danh”, “Sắp tới”.
- Ảnh: [proto-gv-schedule.png](shots/proto/proto-gv-schedule.png)

### `gv-class-detail`
- Đường đi: Lớp của tôi → thẻ lớp.
- Cấu trúc/nhãn: header tên lớp, menu tuỳ chọn, tab Buổi học/Bài kiểm tra/Điểm/Học sinh/Báo cáo; danh sách buổi hiện tại và đã qua.
- Trạng thái: route mặc định dẫn thẳng tới Buổi học, không có trang tổng quan lớp riêng trong prototype.
- Ảnh: [proto-gv-class-detail.png](shots/proto/proto-gv-class-detail.png)

### `gv-sessions`
- Đường đi: Lớp của tôi → thẻ lớp → tab Buổi học.
- Cấu trúc/nhãn: buổi hiện tại, danh sách buổi đã qua, nút thêm buổi.
- Trạng thái: buổi tương lai và buổi đã huỷ được gắn nhãn; tab Buổi học đang chọn.
- Ảnh: [proto-gv-sessions.png](shots/proto/proto-gv-sessions.png)

### `gv-session-attendance`
- Đường đi: Buổi học → chọn buổi 9.
- Cấu trúc/nhãn: tiêu đề có ngày dạy “Buổi 9 · 19/10”; tab Điểm danh/Nhận xét/Bài tập về nhà; người dạy; danh sách học sinh; hành động Lưu điểm danh.
- Trạng thái: trạng thái hiện diện trong ảnh chính; ngày dạy hiện ngay ở tiêu đề. Ảnh SE cũng chụp cùng buổi.
- Ảnh: [proto-gv-session-attendance.png](shots/proto/proto-gv-session-attendance.png) · [se-proto-gv-session-attendance.png](shots/proto/se-proto-gv-session-attendance.png)

### `gv-session-comments`
- Đường đi: trong Buổi 9 → tab Nhận xét.
- Cấu trúc/nhãn: bộ lọc tất cả/chưa chọn sao/chưa gửi, danh sách phiếu theo học sinh, nút gửi phiếu cả lớp.
- Trạng thái: “Tất cả” selected fill; các phiếu hiện Chưa gửi và Chưa chọn sao.
- Ảnh: [proto-gv-session-comments.png](shots/proto/proto-gv-session-comments.png)

### `gv-session-homework`
- Đường đi: trong Buổi 9 → tab Bài tập về nhà.
- Cấu trúc/nhãn: bài tập buổi này/buổi trước, danh sách bài và kết quả chấm.
- Trạng thái: tab Bài tập về nhà đang chọn; lọc Bài tập buổi trước được chọn.
- Ảnh: [proto-gv-session-homework.png](shots/proto/proto-gv-session-homework.png)

### `gv-tests`
- Đường đi: lớp → tab Bài kiểm tra.
- Cấu trúc/nhãn: nút Bài mới và danh sách bài kiểm tra theo tên/ngày/trạng thái chấm.
- Trạng thái: có bài còn thiếu điểm và các bài đã đủ điểm; tab Bài kiểm tra đang chọn.
- Ảnh: [proto-gv-tests.png](shots/proto/proto-gv-tests.png)

### `gv-scores`
- Đường đi: lớp → tab Điểm.
- Cấu trúc/nhãn: bảng điểm theo học sinh và bài kiểm tra, điều hướng nội dung lớp.
- Trạng thái: ô chưa có điểm hiển thị theo mẫu rỗng của bảng; tab Điểm đang chọn.
- Ảnh: [proto-gv-scores.png](shots/proto/proto-gv-scores.png)

### `gv-students`
- Đường đi: lớp → tab Học sinh.
- Cấu trúc/nhãn: thống kê số học sinh và danh sách thẻ học sinh; nút tuỳ chọn ở từng thẻ; nút thêm học sinh.
- Trạng thái: danh sách có dữ liệu; tab Học sinh đang chọn.
- Ảnh: [proto-gv-students.png](shots/proto/proto-gv-students.png)

### `gv-student-detail`
- Đường đi: lớp → Học sinh → thử mở thẻ.
- Trạng thái: **không có** màn chi tiết riêng ở prototype mobile; thẻ chỉ có tuỳ chọn, không mở route chi tiết. Không có ảnh.

### `gv-report-month`
- Đường đi: lớp → tab Báo cáo.
- Cấu trúc/nhãn: tổng hợp tháng, các nhóm số liệu chuyên cần/điểm/buổi và nội dung báo cáo.
- Trạng thái: dữ liệu tháng demo đã có; tab Báo cáo đang chọn.
- Ảnh: [proto-gv-report-month.png](shots/proto/proto-gv-report-month.png)

### `gv-settings`
- Đường đi: thanh dưới → Cài đặt.
- Cấu trúc/nhãn: Hồ sơ, Tài khoản, Đổi mật khẩu, Đổi vai trò, Đăng xuất, Đặt lại dữ liệu mẫu.
- Trạng thái: hồ sơ demo, không có thông báo lỗi.
- Ảnh: [proto-gv-settings.png](shots/proto/proto-gv-settings.png)

### `gv-empty-classes`
- Đường đi: Chọn vai trò → Giáo viên; quan sát thẻ hôm nay trên trang Lớp của tôi.
- Cấu trúc/nhãn: thẻ hôm nay với tiêu đề “Hôm nay không có buổi học”.
- Trạng thái: EmptyState có Mít, không phải lớp trống.
- Ảnh: [proto-gv-empty-classes.png](shots/proto/proto-gv-empty-classes.png)

### `gv-state-saving`
- Đường đi: Buổi 9 → đổi điểm danh → Lưu điểm danh.
- Trạng thái: thao tác lưu thực hiện được nhưng trạng thái ngắn không còn hiện khi ảnh chụp trả về; không có ảnh riêng.

### `gv-state-saved`
- Đường đi: Buổi 9 → đổi điểm danh → Lưu điểm danh.
- Trạng thái: sau lưu, nút trở về disabled và hiện “Chưa có thay đổi để lưu”; nhãn “Đã lưu” không còn thấy tại thời điểm chụp. Không xác nhận được thời gian giữ success bằng ảnh.
- Ảnh sau thao tác: [proto-gv-state-saved.png](shots/proto/proto-gv-state-saved.png)

### `gv-state-error`, `gv-state-pending-sync`, `gv-state-offline`
- Đường đi thử: màn điểm danh và các hành động lưu trong phiên demo.
- Trạng thái: không kích hoạt được lỗi, chờ đồng bộ hoặc offline bằng điều khiển hiển thị của prototype; không có ảnh riêng.

## Phụ huynh

### `ph-login`
- Đường đi: mở `/dang-nhap` rồi chọn Phụ huynh.
- Trạng thái: đăng nhập bị bỏ qua trong prototype; `/dang-nhap` chuyển tới Chọn vai trò. Không có form đăng nhập riêng để chụp.

### `ph-register`
- Đường đi: mở `/dang-ky`.
- Cấu trúc/nhãn: màn “Tạo không gian làm việc” với form tạo tài khoản và hành động tiếp tục.
- Trạng thái: form trống.
- Ảnh: [proto-ph-register.png](shots/proto/proto-ph-register.png)

### `ph-no-child`
- Đường đi: chọn Phụ huynh với tài khoản demo hiện có.
- Trạng thái: **không có** trạng thái chưa liên kết con trong tài khoản demo; tài khoản được chọn đã liên kết một con. Không có ảnh.

### `ph-class`
- Đường đi: Chọn vai trò → Phụ huynh → tab Lớp học của con.
- Cấu trúc/nhãn: chip chọn con và avatar tài khoản; lớp/lịch/giáo viên; thẻ chuyên cần và bài kiểm tra; lối vào Điểm/Báo cáo tháng; danh sách buổi theo tháng; thanh tab hai mục.
- Trạng thái: buổi có các nhãn Sắp học/Có mặt/Đã huỷ; tab Lớp học của con đang chọn.
- Ảnh: [proto-ph-class.png](shots/proto/proto-ph-class.png) · [se-proto-ph-class.png](shots/proto/se-proto-ph-class.png)

### `ph-scores`
- Đường đi: Lớp học của con → lối vào Điểm.
- Cấu trúc/nhãn: tiêu đề Điểm số; chọn tháng; danh sách Điểm từng bài với tên bài, ngày và điểm.
- Trạng thái: tháng 10 được chọn; chỉ hiển thị điểm từng bài, không tính điểm trung bình.
- Ảnh: [proto-ph-scores.png](shots/proto/proto-ph-scores.png)

### `ph-comments`
- Đường đi: tab dưới → Nhận xét của cô.
- Cấu trúc/nhãn: timeline theo tháng, phiếu nhận xét và mục Lời cô của báo cáo tháng; tab dưới hai mục.
- Trạng thái: mục nhận xét mới nhất có Mít; tab Nhận xét của cô đang chọn.
- Ảnh: [proto-ph-comments.png](shots/proto/proto-ph-comments.png) · [se-proto-ph-comments.png](shots/proto/se-proto-ph-comments.png)

### `ph-ticket`
- Đường đi: tab Nhận xét của cô → mở một mục; hoặc tab Lớp học của con → mở buổi.
- Cấu trúc/nhãn: phiếu nhận xét, điểm danh của con và kết quả/bài tập về nhà trong cùng trang Buổi học.
- Trạng thái: dữ liệu demo đã phát hành; không chép nội dung nhận xét vào inventory.
- Ảnh: [proto-ph-ticket.png](shots/proto/proto-ph-ticket.png)

### `ph-report`
- Đường đi: Lớp học của con → Báo cáo tháng.
- Cấu trúc/nhãn: nội dung báo cáo tháng và hành động tải PDF.
- Trạng thái: báo cáo tháng demo có dữ liệu.
- Ảnh: [proto-ph-report.png](shots/proto/proto-ph-report.png)

### `ph-settings`
- Đường đi: avatar tài khoản → Cài đặt.
- Cấu trúc/nhãn: Hồ sơ/Tài khoản, đổi mật khẩu, đổi vai trò, đăng xuất.
- Trạng thái: hồ sơ demo.
- Ảnh: [proto-ph-settings.png](shots/proto/proto-ph-settings.png)

### `ph-change-password`
- Đường đi: Cài đặt → Đổi mật khẩu.
- Cấu trúc/nhãn: form mật khẩu hiện tại/mới và hành động lưu.
- Trạng thái: form trống, chưa gửi.
- Ảnh: [proto-ph-change-password.png](shots/proto/proto-ph-change-password.png)

### `ph-empty-<màn>` và `ph-state-*`
- Trạng thái: không có EmptyState/trạng thái lưu, lỗi, chờ đồng bộ hoặc offline riêng nào được kích hoạt với tài khoản demo có dữ liệu. Không có ảnh riêng.

## Kiểm tra

- Đã kiểm tra danh sách ảnh và kích thước: 22 ảnh 390×844, 3 ảnh SE 375×667.
- Đã mở ngẫu nhiên `proto-gv-tests.png`, `proto-ph-ticket.png`, `se-proto-ph-comments.png`; đều đúng màn và khung ảnh.
- Đã mở `proto-ph-scores.png`, xác nhận route `/ph/diem`, tiêu đề “Điểm số” và khung 390×844.
- Đã đối chiếu `screen-codes.md`, `design/ux-v2/rules.md` và `design/ux-v2/guardian-ia.md`.
