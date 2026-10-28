# Phân quyền và vai trò (bản 1.1): phạm vi đã duyệt

Trạng thái: ĐÃ DUYỆT 2026-10-28 (người dùng), đã ghi vào `docs/spec.md` mục 8 "Bản 1.1". Chốt hướng 2026-10-28: phương án A (gọn), nhân sự đăng nhập như phụ huynh, màn quản lý có ở cả web và iOS, nộp App Store 1.0 trước rồi làm ở 1.1 trên nhánh riêng, cho phép một SĐT thuộc nhiều workspace, trợ giảng dùng ma trận sẵn có.

## Làm
1. **Danh sách nhân sự** (chỉ Admin): tên, SĐT che một phần, role, số lớp được gán, trạng thái (Đang hoạt động / Đã vô hiệu hoá).
2. **Thêm nhân sự bằng SĐT**: nhập tên + SĐT, chọn role Giáo viên hoặc Trợ giảng, chọn lớp (tuỳ chọn). Không có luồng mời, không gửi SMS.
   - Số chưa có tài khoản: lần đầu nhập SĐT ở màn đăng nhập → vào màn tự đặt mật khẩu (như phụ huynh), không bị đưa sang đăng ký workspace.
   - Số đã có tài khoản (ở workspace khác hoặc là phụ huynh): dùng mật khẩu cũ, được thêm vai trò mới.
3. **Sửa nhân sự**: đổi role (Giáo viên ↔ Trợ giảng), gán/gỡ lớp, vô hiệu hoá / bật lại. Có hiệu lực ngay ở máy chủ, không xoá dữ liệu người đó đã tạo. Không tự vô hiệu hoá hay hạ quyền Admin cuối cùng.
4. **Ma trận quyền** của 2 role Giáo viên và Trợ giảng: 5 nhóm đang có tính năng (Lớp; Học sinh; Buổi học và điểm danh; Điểm; Nhận xét và báo cáo) × Không/Đọc/Sửa. Nhóm Bài giảng ẩn vì chưa có tính năng. Role Admin cố định, không sửa. Role Phụ huynh giữ nguyên, không có màn chỉnh.
   - Mặc định Giáo viên: Sửa cả 5 nhóm.
   - Mặc định Trợ giảng: Buổi học và điểm danh Sửa; Nhận xét và báo cáo Sửa (gồm gửi phiếu, phát hành báo cáo); Điểm, Học sinh, Lớp Đọc.
5. **Chọn và đổi vai trò**: người có nhiều vai trò (nhiều workspace, hoặc vừa nhân sự vừa phụ huynh) chọn sau đăng nhập, đổi trong Cài đặt; mỗi lúc một vai trò. Dùng API `PUT /v1/session/membership` đã có.
6. **Hiện đúng quyền** ở web và iOS: ẩn hoặc khoá nút theo quyền của vai trò đang dùng; nhân sự chỉ thấy lớp được gán; lớp mới do nhân sự tạo tự gán cho người tạo.
7. **Bị thu hồi khi offline**: lần đồng bộ kế tiếp phát hiện thì ẩn cache của vai trò đó; lệnh chờ bị từ chối giữ lại và hiện lỗi (spec mục 4 đã viết).

## Không làm
Role tuỳ chỉnh, đổi loại role, phân công giáo viên chính/trợ giảng từng lớp, dạy thay, lịch dạy, lương, học phí, luồng mời, chỉnh quyền role phụ huynh, nhật ký quản trị.

## Mặc định đã duyệt cùng phạm vi
- Admin xem được SĐT đầy đủ của nhân sự không? Mặc định: có, chỉ Admin.
- Nhân sự bị vô hiệu hoá đang đăng nhập: bị đăng xuất khỏi vai trò đó ngay lần gọi API kế tiếp. Mặc định: có.

## Tiêu chí xong
- Admin thêm trợ giảng bằng SĐT mới → trợ giảng đặt mật khẩu, chỉ thấy lớp được gán, sửa được điểm danh, không sửa được điểm (máy chủ trả 403, giao diện khoá nút).
- Admin vô hiệu hoá → lần gọi kế tiếp của người đó bị từ chối; dữ liệu cũ còn nguyên.
- Một SĐT là Admin workspace A và trợ giảng workspace B đổi qua lại được, quyền đúng theo vai trò đang dùng.
- Web và iOS đều làm được mục 1–6; test backend cho mọi đường kiểm quyền; QA chạy kịch bản trên staging.
