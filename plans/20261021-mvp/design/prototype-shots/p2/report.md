# Báo cáo P2 · Tài khoản prototype

Ngày: 2026-10-21 · Thư mục chính `design/prototype`; giữ nguyên các thay đổi P1 và dữ liệu seed dùng chung.

## Đã hoàn thiện

- Luồng đăng nhập SĐT/mật khẩu giả lập cục bộ, đăng ký giáo viên, đổi mật khẩu bắt buộc cho phụ huynh, quên mật khẩu, chọn vai trò và cài đặt tài khoản. Ô SĐT hiển thị nhóm `900 000 001` và chuẩn hoá về 9 số trước khi đăng nhập.
- Tắt `legacyInvites`, `staffing`, `tuition`, `scoreReports`; giữ code/test, chặn đường dẫn trực tiếp. Sidebar desktop hiện đúng sáu mục: Lớp, Điểm danh, Điểm số, Học sinh, Báo cáo, Cài đặt.
- Thêm `design/prototype/README.md` ghi rõ thông tin/mật khẩu demo là giả. Không ghi thông tin đăng nhập vào log.
- Cập nhật fixture và kỳ vọng test cũ bị ảnh hưởng bởi phiên đăng nhập SĐT và các cờ ngoài MVP; thêm kiểm tra redirect route cũ và menu MVP.

## Ảnh chụp

`01`–`13` là các trạng thái mobile 390×844; `14`–`24` là các trạng thái web 1360×934; `25-web-sidebar-mvp.png` là sidebar desktop 1360×934. Đã kiểm tra đủ 25 PNG: 13 ảnh mobile và 12 ảnh desktop; đối chiếu trực quan với ảnh cùng số tại `plans/20261021-mvp/design/auth-r4/`.

## Khác biệt còn lại so với ảnh auth-r4

| Màn | 390×844 | 1360×934 | Trạng thái / lý do |
|---|---|---|---|
| Đăng nhập, sai thông tin, khoá tạm (01–03, 14–16) | Bố cục, thông báo và SĐT đã nhóm khớp ảnh | Bố cục/trạng thái khớp; kích thước màn web theo ảnh | Không thấy khác biệt nội dung đáng kể sau khi chụp lại với SĐT định dạng. |
| Đăng ký giáo viên (04, 17) | Các ô tên/mật khẩu đang để trống, ảnh mẫu có giá trị demo điền sẵn | Tương tự mobile | Trạng thái nội dung ảnh chụp khác; không ảnh hưởng cấu trúc form/validation. |
| Đổi mật khẩu bắt buộc (05–06, 18–19) | 05 để trống trong khi ảnh mẫu có mật khẩu; 06 thể hiện lỗi trùng mật khẩu nhưng độ mạnh/độ dài giá trị che khác ảnh | 18 để trống; 19 có lỗi trùng mật khẩu với giá trị/độ mạnh che khác ảnh | Trạng thái nhập liệu của ảnh tham chiếu khác; luồng và câu lỗi được giữ. |
| Quên mật khẩu (07–08, 20–21) | Nội dung hướng dẫn theo đúng vai trò; số điện thoại chỉ đọc đã nhóm | Nội dung hướng dẫn theo đúng vai trò; số điện thoại chỉ đọc đã nhóm | Không thấy khác biệt nội dung đáng kể. |
| Chọn vai trò (09, 22) | Hai lựa chọn và bố cục khớp; nhãn phụ hiện `Bé Gia Bảo` thay vì ảnh `Bé Minh Anh` | Hai lựa chọn; dữ liệu vai trò phụ huynh theo seed hiện có | Khác dữ liệu liên kết phụ huynh P1. Không sửa membership/seed dùng chung vì các test và màn P1 đang dựa trên đó. |
| Cài đặt tài khoản (10–11, 23) | Hồ sơ phụ huynh/con hiển thị theo membership seed hiện có, tên/lớp không hoàn toàn trùng ảnh mẫu | 23 hiện vai trò phụ huynh `Bé Gia Bảo (6A), Bé Bảo Ngọc (6A)`; ảnh mẫu là `Bé Minh Anh` | Khác dữ liệu mẫu. Không thay seed P1; thông tin tên và SĐT hồ sơ vẫn chỉ đọc. |
| Đổi mật khẩu trong Cài đặt (12) | Ảnh chụp hiện để trống các trường; ảnh mẫu có giá trị che và mức mạnh | — | Khác trạng thái nhập liệu trong ảnh; form hiện đúng nội dung/chỉ báo. |
| Đăng xuất bị chặn (13, 24) | Có hộp thoại chặn khi còn thay đổi chưa đồng bộ | Có hộp thoại chặn khi còn thay đổi chưa đồng bộ | Nội dung/điều khiển theo prototype; ảnh chụp không trùng từng trạng thái focus/nền mờ của ảnh thiết kế. |
| Sidebar MVP (25) | — | Đúng sáu mục đã yêu cầu; không còn lối vào menu ngoài MVP | Khớp phạm vi P2. |

## Kiểm chứng

```text
$ cd design/prototype && npm test
Test Files  55 passed (55)
     Tests  541 passed (541)

$ npm run build
tsc --noEmit && vite build
✓ built in 2.89s
```

`srcwalk discover 'Mời,OTP,kích hoạt,link mời' --match any --as text --scope design/prototype/src/features/auth` chỉ tìm thấy `OTP` trong ba comment giải thích; không có các chuỗi đó trong giao diện auth. `legacyInviteRoutes` dưới cờ tắt chuyển các đường dẫn cũ về trang đầu theo phiên; `payrollFlag.test.tsx` kiểm tra route cũ cho phiên đăng nhập và chưa đăng nhập, cùng trạng thái các cờ ngoài MVP. Những màn Nhân sự/Mời cũ vẫn còn code/test nhưng không có lối vào khi cờ tắt.

Status: DONE_WITH_CONCERNS
Summary: Đã hoàn thiện prototype Tài khoản, ẩn lối vào ngoài MVP, chụp đủ 25 ảnh đúng kích thước; test 541/541 và build đều xanh. Còn khác biệt ảnh ở trạng thái nhập liệu mẫu và dữ liệu con theo seed P1 hiện có, được liệt kê trong bảng trên và giữ nguyên để không làm lệch dữ liệu/test P1.
