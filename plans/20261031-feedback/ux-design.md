# Phản hồi 31/10: thiết kế UX (GL, đã chốt với người dùng)

Ảnh người dùng gửi: web PWA trên iPhone, màn lớp S19A, chi tiết buổi T7 31/10 (tab BTVN) và T3 27/10 (tab Nhận xét).
Mọi giá trị giao diện lấy từ `design/tokens/` và theo `design/ux-v2/rules.md`. Thiếu token thì thêm vào nguồn chuẩn trước.

## 1. Ẩn thanh điều hướng dưới ở màn con (web, chỉ khung mobile)

- Mục tiêu người dùng: đang làm việc trong một lớp/buổi, cần thêm chỗ cho nội dung và thanh hành động.
- Mẫu: màn con dạng push (như iOS ẩn tab bar khi đi sâu), Back ở đầu màn là lối ra.
- Ẩn bottom nav (Lớp/Lịch/Cài đặt) ở: chi tiết lớp (mọi tab) và chi tiết buổi (mọi tab). Danh sách lớp, Lịch, Cài đặt vẫn hiện.
- Chỉ khung mobile (cùng breakpoint đang đổi sang layout desktop). Desktop giữ sidebar.
- Thanh hành động đáy (Gửi phiếu cả lớp, Lưu điểm danh, …) và nút + nổi đặt sát đáy, cộng safe-area.
- Người dùng chốt 2026-11-01: thanh hành động LUÔN ghim đáy màn trên mobile, không phụ thuộc độ dài danh sách (danh sách ngắn vẫn giữ thanh ở đáy, không trôi lên giữa màn); vùng cuộn đệm đáy bằng `--sticky-clearance` để hàng cuối không bị che. Desktop giữ nguyên (nút ở hàng hành động trên cùng).
  - Vị trí thanh (đo 390×844): danh sách ngắn hoặc cuộn hết → cách đáy `--sticky-bottom` + `--page-bottom` (16px; có safe-area 34px thì 50px). Đang cuộn giữa danh sách dài, thanh dính đúng `--sticky-bottom` (0px; có safe-area: 34px). Chênh nhau đúng `--page-bottom`; giữ `--sticky-clearance` nên chấp nhận khoảng chênh này thay vì bỏ đệm trang.
  - Còn tồn: pill `SaveStatus` ở đầu khung giáo viên nằm trong luồng nên khi hiện (Chờ đồng bộ/Lỗi lưu) trang cao thêm ~40px, có thể gây cuộn thừa; chưa sửa vì cần đổi sang lớp phủ và kiểm lại trên máy thật.
- Back của trình duyệt và nút back ở đầu màn đều quay đúng màn trước; thanh dưới hiện lại khi về màn gốc.

## 2. Thẻ "Buổi hiện tại": nút "Xem buổi" bên phải

- Bố cục ngang: trái là ngày/thứ + giờ (2 dòng), phải là nút chính "Xem buổi" rộng theo nội dung, căn giữa theo chiều dọc (rules.md: nút trong thẻ theo nội dung).
- Vùng chạm tối thiểu theo token target size; chữ dài/cỡ chữ lớn thì nút vẫn theo nội dung, khối ngày tự xuống dòng.
- Chạm cả thẻ cũng mở buổi (như hàng buổi đã qua), nút là hành động rõ ràng.

## 3. Nhận xét chỉ mở khi điểm danh xong; gán mặc định bỏ qua em Vắng (web + iOS + máy chủ)

### Quy tắc (người dùng chốt 31/10, thay spec mục Nhận xét 2026-10-26)
- "Điểm danh xong" = mọi học sinh đang học của buổi đều có trạng thái Có mặt/Muộn/Vắng đã lưu.
- Chưa điểm danh xong: tab Nhận xét CHỈ XEM. Không mở phiếu để soạn, không "Gán tất cả mặc định", không gửi (lẻ hay cả lớp), cả hai chế độ Theo học sinh và Theo tiêu chí.
- Điểm danh xong:
  - "Gán tất cả mặc định" chỉ tác động em Có mặt/Muộn; bỏ qua em Vắng (không tạo, không đổi phiếu của em Vắng).
  - "Gửi phiếu cả lớp" chỉ gửi phiếu chưa gửi của em Có mặt/Muộn; bỏ qua em Vắng kể cả khi em đó đã có phiếu.
  - Em Vắng: giáo viên vẫn mở phiếu, soạn và bấm Gửi lẻ nếu muốn.
- Máy chủ chặn thật: từ chối lưu/gửi phiếu của buổi chưa điểm danh xong; gửi cả lớp bỏ em Vắng. Quyền "Gửi nhận xét" giữ nguyên.

### Giao diện khi chưa điểm danh xong
- Đầu tab: một khối thông báo dùng component trạng thái chung (tông thông tin, không phải lỗi): tiêu đề "Điểm danh xong để nhận xét", dòng phụ "Còn N em chưa điểm danh.", nút phụ "Đến Điểm danh" chuyển sang tab Điểm danh của cùng buổi.
- Danh sách học sinh vẫn hiện (sao, trạng thái phiếu) để xem, hàng không chạm được: bỏ mũi tên, dùng `--state-disabled-opacity`.
- "Gán tất cả mặc định" và "Gửi phiếu cả lớp" ở trạng thái disabled theo rules.md (nền `--color-neutral-soft`, chữ `--color-muted`, `aria-disabled`); không mở hộp xác nhận.
- Chế độ Theo tiêu chí: cùng khối thông báo, chip tiêu chí disabled.

### Giao diện khi điểm danh xong
- Danh sách: em Có mặt/Muộn ở trên như hiện tại; em Vắng dồn xuống cuối dưới tiêu đề nhóm "Vắng buổi này"; mỗi dòng ghi nhãn "Vắng" và trạng thái phiếu ("Chưa nhận xét" hoặc như hiện tại), vẫn chạm được để soạn/gửi lẻ.
- Số trên nút "Gửi phiếu cả lớp (N)" và hộp xác nhận chỉ đếm em Có mặt/Muộn có phiếu chưa gửi.
- Hộp xác nhận "Gán tất cả mặc định": "Gán mặc định cho N em có mặt? Em vắng không được gán. Phiếu đã gửi không đổi."
- Bộ lọc "Chưa gửi" giữ cả em Vắng có phiếu chưa gửi (để không quên gửi lẻ).
- Chế độ Theo tiêu chí: em Vắng nằm cuối mỗi nhóm, nhãn "Vắng", không tự tích.

### Trạng thái
- Đang tải: khung xương như hiện tại.
- Offline: khoá dựa trên điểm danh trên máy (kể cả bản đang chờ đồng bộ); gửi phiếu vẫn cần mạng như spec. Máy chủ từ chối vì điểm danh chưa tới máy chủ: báo "Điểm danh chưa đồng bộ xong, thử lại sau." và giữ phiếu.
- Thêm học sinh vào lớp sau khi đã điểm danh: buổi đó thành "chưa điểm danh xong" lại cho tới khi điểm danh em mới.
- Lỗi gửi: như hiện tại (giữ phiếu, báo lỗi dòng).

## 4. "Theo tiêu chí": mỗi tiêu chí mở/thu gọn

- Đầu mỗi tiêu chí là một hàng chạm được: tên tiêu chí, badge "đạt x/N", mũi tên xoay khi mở; cả hàng là vùng chạm, `aria-expanded`, bàn phím Enter/Space.
- Mặc định: mở tiêu chí đầu tiên, các tiêu chí khác thu gọn; mở nhiều cái cùng lúc được. Nhớ trạng thái mở trong phiên của buổi đó (bộ nhớ, không lưu máy chủ).
- Chuyển động: mở/thu theo token thời lượng; reduced motion thì đổi ngay.
- Badge cập nhật ngay khi tích/bỏ tích.

## Kiểm chứng bắt buộc
- Ảnh trước/sau ở 390×844 (mobile) và 1440 (desktop) cho từng mục; mục 3 chụp cả hai trạng thái (chưa xong/đã xong, có em Vắng).
- Test: khoá khi thiếu điểm danh; gán mặc định bỏ em Vắng; gửi cả lớp bỏ em Vắng; gửi lẻ em Vắng được; máy chủ từ chối khi chưa điểm danh xong.
- Cập nhật `docs/spec.md` (mục Nhận xét/Phiếu buổi học dòng "Gán tất cả mặc định", "Gửi phiếu cả lớp") trong cùng thay đổi.
