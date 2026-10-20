# Prompt Claude Design: bài giảng, role, nhân sự

Gửi vào project "Import design folder vào Claude".

---

Thêm các màn hình mới vào bộ board hiện có của app "Quản lý lớp tiếng Anh" cho các nghiệp vụ mới bên dưới. BẮT BUỘC dùng đúng design system đã có trong project: màu, font, cỡ chữ, bo góc, khoảng cách, bóng đổ, chip, nút, thẻ, tab, sheet/modal, FAB, trạng thái rỗng và lỗi. Không thêm màu, font hay kiểu component mới; không đổi các màn đã có. Nếu thiếu component thì ghép từ component sẵn có. Giữ nguyên cách đặt tên board ("GV · ...", "Web · ...", "PH · ..."), tiếng Việt, vùng chạm tối thiểu 44px, một tay trên iPhone 390px. Ngoại trừ ghi chú sau cùng, trạng thái đồng bộ không hiện trên giao diện (chỉ hiện lỗi).

## Nghiệp vụ mới (tóm tắt)
- Một workspace có nhiều người dùng. Mỗi người có role; Admin tạo role và tick quyền.
- Quyền theo 6 nhóm: Lớp, Học sinh, Buổi học và điểm danh, Điểm, Bài giảng, Nhận xét và báo cáo. Mỗi nhóm 3 mức: Không, Đọc, Sửa.
- Quản trị chỉ Admin: mời nhân sự, tạo/sửa role, gán lớp, vô hiệu hoá tài khoản.
- Role mặc định: Admin (cố định), Giáo viên, Trợ giảng, Phụ huynh. Role có LOẠI: nhân sự (thấy lớp được gán) hoặc phụ huynh (thấy con được liên kết; luôn chỉ mức Đọc, Admin chỉ bật/tắt nhóm được đọc).
- Một SĐT có thể có nhiều role. Khi có nhiều role, người dùng chọn vai trò muốn dùng và đổi được trong Cài đặt.
- Bài giảng: thư viện chung của workspace. Một bài giảng có nhiều phần; mỗi phần gồm tên, mô tả, tệp đính kèm (không hoặc nhiều). Buổi học có hoặc không có bài giảng, dùng được nhiều bài giảng; một bài giảng dùng cho nhiều buổi của nhiều lớp. Sửa bài giảng thì mọi buổi đang dùng đổi theo. Người tạo luôn thấy bài giảng của mình. Bài giảng đã dùng thì lưu trữ, không xoá cứng.

## Màn cần thiết kế

### A. Bài giảng (mobile giáo viên, kèm bản web cho màn thư viện và soạn)
1. **Thư viện bài giảng**: danh sách thẻ (tên, số phần, số buổi đang dùng, người tạo), ô tìm kiếm, bộ lọc "Của tôi / Tất cả / Đã lưu trữ", FAB "+" tạo bài giảng. Trạng thái rỗng.
2. **Soạn / sửa bài giảng**: tên bài giảng; danh sách phần có thể thêm, sắp xếp thứ tự, xoá; mỗi phần có Tên, Mô tả, khu vực tệp đính kèm (thêm tệp, danh sách tệp với tên, dung lượng, nút gỡ). Nút Lưu. Biến thể: tệp đang tải lên, lỗi tải tệp, đang offline (tệp cần mạng, phần chữ vẫn soạn được).
3. **Chi tiết bài giảng (chỉ xem)**: các phần, mô tả, tệp bấm mở được; dòng "Đang dùng ở N buổi" mở danh sách buổi; menu "..." gồm Sửa, Lưu trữ.
4. **Gắn bài giảng vào buổi**: trong màn chi tiết buổi thêm khu "Bài giảng" (danh sách bài giảng đã gắn, có thứ tự, nút gỡ liên kết) và sheet chọn bài giảng từ thư viện (chọn nhiều, tìm kiếm). Trạng thái buổi chưa có bài giảng: một dòng nhắc nhẹ, không bắt buộc.
5. **Phụ huynh xem bài giảng** (mobile): trong chi tiết buổi của con, khu "Bài giảng của buổi" chỉ đọc, mở phần và tải tệp. Ẩn hoàn toàn khi role phụ huynh bị tắt nhóm Bài giảng.

### B. Nhân sự và role (Admin; mobile và web)
6. **Nhân sự**: danh sách thành viên (tên, SĐT che bớt, role, số lớp được gán, trạng thái Hoạt động / Đã mời / Vô hiệu hoá), nút mời (FAB trên mobile), tìm kiếm.
7. **Mời nhân sự**: form SĐT, chọn role, chọn lớp được gán (chọn nhiều); xác nhận link mời (dùng một lần, hết hạn 7 ngày) với hành động gửi lại và huỷ lời mời.
8. **Chi tiết thành viên**: role hiện tại, lớp được gán (thêm/gỡ), vô hiệu hoá tài khoản (có xác nhận, ghi rõ không xoá dữ liệu).
9. **Danh sách role**: các role mặc định và tuỳ chỉnh, nhãn loại (Nhân sự / Phụ huynh), số người đang dùng, nút tạo role.
10. **Tạo / sửa role với ma trận quyền**: tên role, chọn loại (không đổi được sau khi tạo, hiện khoá khi sửa), ma trận 6 nhóm × 3 mức (Không / Đọc / Sửa) dạng control phân đoạn dễ chạm trên mobile; role phụ huynh chỉ có Không / Đọc và hiện ghi chú "Phụ huynh chỉ xem con được liên kết". Role Admin hiện ở chế độ chỉ đọc với chú thích "Cố định". Cảnh báo khi thay đổi ảnh hưởng người đang dùng role.

### C. Tài khoản
11. **Chọn vai trò sau đăng nhập** (chỉ hiện khi có nhiều role): danh sách thẻ vai trò (tên role, workspace, loại). Kèm mục **Đổi vai trò** trong Cài đặt.
12. **Trạng thái không đủ quyền**: màn/nút bị khoá theo role (nút ẩn hoặc mờ kèm giải thích), màn "Bạn không có quyền xem mục này", và thông báo khi quyền bị thu hồi lúc mở app ("Vai trò của bạn đã thay đổi, dữ liệu đã được ẩn").

### D. Ngoại lệ trạng thái
13. Sau khi giáo viên bấm "Gửi nhận xét" lúc mất mạng: một thông báo ngắn (toast) "Sẽ gửi khi có mạng". Đây là ngoại lệ duy nhất; không thêm chip đồng bộ nào khác.

## Yêu cầu xuất
- Mỗi màn có bản mobile 390px; màn 1, 2, 6, 9, 10 có thêm bản web desktop.
- Đủ các trạng thái: bình thường, rỗng, đang tải, lỗi, và các biến thể đã nêu.
- Dùng dữ liệu mẫu tiếng Việt thực tế (lớp Tiếng Anh giao tiếp 6A, IELTS 7.0; bài giảng như "Unit 3: Present Perfect", "Từ vựng chủ đề Travel"; role "Giáo viên", "Trợ giảng", "Phụ huynh").
- Thêm các board mới vào cuối bộ hiện có, gom theo nhóm A, B, C, D. Liệt kê danh sách board đã thêm ở cuối phản hồi.
