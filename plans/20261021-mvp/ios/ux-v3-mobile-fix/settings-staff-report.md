# iOS: lỗi màn Nhân sự và nút Xoá tài khoản (2026-10-29)

## 1. Màn Nhân sự báo "Không thể kết nối dịch vụ"
- Request: `GET /staff` (200). Không phải lỗi mạng. Tái hiện bằng tài khoản admin workspace QA iOS trên staging, không đăng ký mới.
- Nguyên nhân thật: nhân sự đã đặt mật khẩu nhưng tài khoản chưa có tên được máy chủ trả `display_name: null` (kind member). `StaffMember.displayName` khai báo `String` bắt buộc nên decode hỏng (`APIFailure.decoding`), và `StaffStore.message(for:)` gộp mọi lỗi không phải server/offline thành "Không thể kết nối dịch vụ". Các trường còn lại khớp hợp đồng.
- Sửa (iOS, không cần đổi backend): `display_name` null hoặc rỗng là "Chưa đặt tên" (chữ muted, chuỗi localize), dòng phụ vẫn SĐT che, avatar dùng icon `person.fill`; nhân sự không tên xếp sau nhân sự có tên cùng trạng thái; `class_ids`, `is_self` thiếu thì mặc định; lỗi decode có thông báo riêng "Không đọc được danh sách nhân sự. Vui lòng cập nhật ứng dụng hoặc thử lại sau."
- Ghi chú hợp đồng cho BE (không bắt buộc): `display_name` của staff list nên nêu rõ nullable trong api-spec mục 11.
- Test mới (StaffStoreTests): danh sách có thành viên `display_name` null và rỗng vẫn tải được và được đánh dấu không tên; xếp sau; lỗi decode không bị báo như lỗi kết nối.

## 2. Xoá tài khoản
Nút lớn nền đỏ nhạt thay bằng nút chữ nhỏ dưới "Đăng xuất" (`AppText.muted`, `AppColors.muted`, không nền, vùng bấm `AppMetrics.tap`, khoảng cách `AppSpace.s8`). Một màn cho cả giáo viên và phụ huynh; vẫn mở sheet xác nhận rồi mở `DELETE_ACCOUNT_FORM_URL` (hiện là `https://forms.gle/PENDING`, cần URL thật trước khi nộp).

## Kiểm chứng
- Full suite (Staging, iPhone 16): 346 test, 0 lỗi, 2 skip.
- Ảnh trong `shots/20261029-settings-staff/`: `01` Cài đặt giáo viên và `02` phụ huynh (dữ liệu demo giả), `03` màn Nhân sự tải thật từ staging (SĐT đã che), `04` hàng nhân sự không tên sau khi chỉnh ("Chưa đặt tên" và icon người).
- Simulator đã tắt.

Commit mvp-ios: `6693cd2` (sửa chính), commit riêng cho hàng không tên ở bước sau.
