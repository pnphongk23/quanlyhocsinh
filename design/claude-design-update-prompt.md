# Prompt cập nhật design cho Claude Design

Dán nguyên văn phần dưới vào Claude Design (kèm các board hiện có của dự án).

---

Cập nhật các board thiết kế của app "Quản lý lớp tiếng Anh" (giáo viên dạy lớp riêng tại Việt Nam, ưu tiên iPhone 390px, có thêm web desktop) cho khớp với prototype đã chỉnh. Giữ nguyên design system, màu, font và toàn bộ nội dung tiếng Việt hiện có. Chỉ sửa đúng các điểm dưới đây, các phần khác không đổi.

## A. Áp dụng cho MỌI màn hình
- Bỏ hết chip, nhãn hoặc hàng trạng thái "Đã đồng bộ", "Chưa lưu", "Đã lưu trên máy" và "N thay đổi chờ". Đồng bộ là việc ngầm của app, người dùng không cần thấy.
- Chỉ hiện một dòng cảnh báo gọn khi có LỖI lưu (ví dụ "Lỗi lưu, vui lòng thử lại"). Thêm một biến thể màn hình hoặc component ở trạng thái lỗi để thể hiện.
- Dọn khoảng trống thừa ở đầu màn hình sau khi bỏ hàng trạng thái.
- Nút thêm mới ở đầu trang (Thêm buổi, Thêm học sinh) chuyển thành FAB tròn 56px, màu chính, dấu "+", đặt góc dưới bên phải, nằm trên tab bar (cách đáy tab bar khoảng 16px).

## B. Màn "Tất cả lớp" (web desktop và mobile)
- Cả thẻ lớp bấm được và mở thẳng lớp đó (thêm hover và focus ring cho thẻ).
- Mỗi thẻ chỉ còn: tên lớp, số học sinh, chuyên cần.
- Bỏ: chip lịch học ("Thứ Hai, Thứ Tư · 18:00 · Đã học 8 buổi"), badge "Thứ Hai tới", chip "Buổi tiếp: ...", nút "Mở lớp".
- Bỏ hẳn khối giải thích "Mỗi lớp là một không gian riêng ...".

## C. Khung chi tiết lớp (mobile)
- Header chỉ gồm nút quay lại, TÊN LỚP và nút "...". Không còn dropdown hay mũi tên chuyển lớp, không còn dòng "9 học sinh" phía trên tên.
- Bỏ hàng "Lịch lặp" và nút "Sửa lịch". Việc sửa lịch nằm trong menu "..." (mục "Sửa lịch học").
- Hàng tab giữ nguyên: Buổi học, Bài kiểm tra, Điểm, Học sinh, Báo cáo.

## D. Tab "Buổi học" (mobile)
- Bỏ dòng giới thiệu "Theo dõi buổi học và điểm danh đúng hạn." và nút "+ Thêm buổi" ở đầu. Thay bằng FAB góc dưới phải.
- Trong thẻ "Buổi sắp tới" bỏ chip "Đã đồng bộ".

## E. Chi tiết buổi, tab "Điểm danh" (mobile)
- Phía trên cùng chỉ có tên lớp cỡ nhỏ (thay cho chip "Đã đồng bộ" và "0 thay đổi chờ"). Bỏ chip "Đã đồng bộ" ở cuối màn hình, phía trên nút "Lưu điểm danh".
- Mỗi dòng học sinh hỗ trợ vuốt ngang: vuốt TRÁI = Muộn, vuốt PHẢI = Vắng. Vẽ trạng thái đang kéo: nền màu và nhãn lộ ra phía sau dòng (Vắng ở bên trái, Muộn ở bên phải).
- Bấm vào nút trạng thái thì xoay vòng: Có mặt → Vắng → Muộn → Có phép → Có mặt. Thể hiện đủ 4 trạng thái bằng màu và nhãn khác nhau.
- Thêm một dòng hướng dẫn nhỏ, ví dụ "Vuốt phải: vắng · Vuốt trái: muộn".

## F. Tab "Học sinh" (mobile)
- Bỏ header trong trang ("Lớp ... / Học sinh") và nút "+ Thêm học sinh". Thay bằng FAB góc dưới phải.
- Gộp thống kê thành MỘT hàng chữ phụ nhỏ (muted) ngay dưới hàng tab, ví dụ "9 đang học · 1 đã nghỉ · 1 vắng 2 buổi liền". Bỏ kiểu số to ba cột.
- Bỏ nút "Đánh dấu nghỉ" hiện sẵn trên từng thẻ. Thêm nút "..." (vùng chạm 44px) ở cuối mỗi thẻ học sinh, mở menu có "Đánh dấu nghỉ". Vẽ thêm bảng menu này.

Yêu cầu chung: vùng chạm tối thiểu 44px, thiết kế cho một tay trên iPhone. Xuất lại các board đã sửa, giữ tên board như cũ.
