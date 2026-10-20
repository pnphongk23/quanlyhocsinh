# Prompt Claude Design: sửa lệch và dọn các màn cũ

Gửi vào project "Import design folder vào Claude".

---

Rà soát và cập nhật TOÀN BỘ file "Tat ca man hinh" cho khớp nghiệp vụ và prototype hiện tại. Dùng đúng design system đã có (màu, font, bo góc, khoảng cách, chip, nút, thẻ, tab, sheet, FAB, trạng thái rỗng và lỗi). Không thêm màu, font hay kiểu component mới. Giữ tên board theo quy ước "GV · ...", "Web · ...", "PH · ...". Chưa xoá hẳn board nào: board lỗi thời, trùng hoặc đã gộp thì chuyển vào một nhóm cuối canvas tên "Lưu trữ (cũ)" để tôi duyệt sau.

## 1. Sửa các lỗi trên board mới
1. Role Phụ huynh (mobile và web, tạo và sửa): ma trận chỉ gồm 4 nhóm Điểm, Buổi học và điểm danh, Nhận xét và báo cáo, Bài giảng, mỗi nhóm chỉ Không / Đọc. BỎ nhóm Lớp và Học sinh khỏi role phụ huynh. Role nhân sự có đủ 6 nhóm: Lớp, Học sinh, Buổi học và điểm danh, Điểm, Bài giảng, Nhận xét và báo cáo, mỗi nhóm Không / Đọc / Sửa.
2. Lối vào các màn mới trên mobile: trong Cài đặt thêm mục "Bài giảng", "Nhân sự", "Vai trò" (hai mục sau chỉ hiện với Admin) và mục "Đổi vai trò" (chỉ khi có nhiều role). Bài giảng cũng có lối vào từ tab Buổi học hoặc chi tiết buổi.
3. FAB ở màn con không có tab bar: đặt cách đáy 24px và nêu thành quy tắc chung, FAB màn có tab bar cách tab bar 16px.
4. Màn Điểm danh phải nằm trong khung chi tiết buổi: header là nút quay lại, "Buổi 9 · 18/10" và tên lớp nhỏ phía trên; hai tab "Điểm danh" và "Nhận xét"; bên dưới là danh sách. Không còn tab bar dưới với tab Lớp/Lịch/Cài đặt đang kèm sai. Giữ vuốt phải = Vắng, vuốt trái = Muộn, bấm = xoay vòng Có mặt → Vắng → Muộn → Có phép.
5. Bỏ banner "Đang offline, dữ liệu sẽ lưu khi có mạng". Giữ trạng thái mất mạng nhưng chỉ ở dạng cảnh báo lỗi gọn khi thao tác cần mạng (OTP, mời, gửi nhận xét, tải tệp). Ngoại lệ duy nhất: toast "Sẽ gửi khi có mạng" sau khi bấm Gửi nhận xét lúc mất mạng.
6. Nút "Thêm phần" ở board soạn bài giảng không bị cắt: thêm vùng cuộn hoặc để nút dính đáy.

## 2. Dọn các màn cũ cho khớp nghiệp vụ mới
Áp dụng cho MỌI board cũ, kể cả khi tôi không liệt kê:
- Không còn chip, hàng hay nhãn trạng thái "Đã đồng bộ", "Chưa lưu", "Đã lưu trên máy", "N thay đổi chờ". Chỉ hiện dòng lỗi khi có lỗi. Giữ hộp thoại hỏi khi rời màn đang nhập dở chưa bấm Lưu.
- Nút thêm mới đầu trang (Thêm buổi, Thêm học sinh, Tạo bài kiểm tra, Tạo lớp...) đổi thành FAB.
- Không còn hệ số điểm, "TB lớp" / trung bình lớp, thang điểm tuỳ chỉnh, học phí, chat. Thang điểm cố định 10, trung bình cộng đơn giản; phụ huynh chỉ thấy điểm của con.
- Màn kích hoạt phụ huynh: thay luồng "nhập mã + đặt mật khẩu" bằng link mời một lần (hết hạn 7 ngày) + OTP đúng SĐT; tên con chỉ hiện sau OTP đúng. Form thêm học sinh có ô SĐT phụ huynh; có màn duyệt yêu cầu từ link chung của lớp (giáo viên duyệt bằng 1 chạm).
- Màn Danh sách lớp và Chi tiết lớp đúng như đã chỉnh trước: thẻ lớp bấm mở thẳng, không chip lịch, không "Mở lớp"; header chỉ tên lớp, không dropdown chuyển lớp, sửa lịch nằm trong menu "...".
- Mọi chỗ nói "giáo viên" như người sở hữu duy nhất: dùng đúng khái niệm nhiều người dùng và role. Menu, nút, màn bị ẩn hoặc khoá theo quyền của role (Không / Đọc / Sửa). Phụ huynh chỉ xem.
- Tab Lịch: xem theo ngày và theo tháng. Buổi học chia "buổi hiện tại" và "các buổi đã qua". Chỉ điểm danh được từ ngày học trở đi (buổi chưa tới chỉ xem hoặc hủy).
- Điểm: vắng thi và chưa nhập điểm hiện "chưa có điểm" và không tính trung bình. Sửa điểm sau phát hành: báo cáo ghi "điểm có cập nhật, cần phát hành lại".
- Báo cáo: theo tháng, xem trước, phát hành, PDF.

## 3. Gộp và dọn board
- Gộp các board trùng chức năng hoặc chỉ khác nhau chút xíu thành một board có biến thể (ví dụ nhiều bản của cùng một màn).
- Board nào không còn khớp nghiệp vụ mới và không sửa được nhanh thì chuyển vào "Lưu trữ (cũ)".
- Sắp lại thứ tự canvas theo luồng: Đăng nhập và kích hoạt → Lớp → Buổi học và điểm danh → Điểm → Nhận xét và báo cáo → Học sinh → Bài giảng → Nhân sự và role → Cài đặt → Trạng thái chung (rỗng, lỗi, mất mạng, không đủ quyền); chia theo nhóm GV · di động, Web, PH · di động.
- Tiêu đề nhóm cùng cỡ chữ với nhau.

## 4. Báo cáo cuối
Cuối phản hồi liệt kê: (a) board đã sửa và sửa gì, (b) board đã gộp (gộp vào board nào), (c) board chuyển vào "Lưu trữ (cũ)" và lý do, (d) điểm còn nghi ngờ cần tôi quyết.
